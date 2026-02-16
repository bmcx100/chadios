import { createClient } from "@/lib/supabase/server"

interface GameRow {
  gameNumber: string
  date: string
  venue: string
  homeTeamRaw: string
  homeExternalId: string | null
  homeScore: number
  awayTeamRaw: string
  awayExternalId: string | null
  awayScore: number
}

async function resolveTeamId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: string,
  externalId: string | null,
  level: string,
  skillLevel: string
): Promise<string> {
  // Try external_id match first
  if (externalId) {
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("external_id", externalId)
      .single()
    if (data) return data.id
  }

  // Try name match
  const cleanName = raw.replace(/#\S+\s*/g, "").replace(/\s+NYH\S+/g, "").replace(/\s*\(\d+\)\s*$/, "").trim()
  const { data: byName } = await supabase
    .from("teams")
    .select("id")
    .ilike("name", `%${cleanName}%`)
    .limit(1)
    .single()
  if (byName) return byName.id

  // Create team
  const { data: newTeam } = await supabase
    .from("teams")
    .insert({
      name: cleanName,
      external_id: externalId,
      level,
      skill_level: skillLevel,
    })
    .select("id")
    .single()

  if (!newTeam) throw new Error(`Failed to create team: ${cleanName}`)
  return newTeam.id
}

export async function POST(req: Request) {
  const { tournamentId, rows, level, skillLevel, stage } = await req.json() as {
    tournamentId: string
    rows: GameRow[]
    level: string
    skillLevel: string
    stage: string
  }

  if (!tournamentId || !rows?.length) {
    return Response.json({ error: "tournamentId and rows required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Cache resolved team IDs
  const teamCache = new Map<string, string>()

  async function getTeamId(raw: string, externalId: string | null): Promise<string> {
    const key = externalId ?? raw
    if (teamCache.has(key)) return teamCache.get(key)!
    const id = await resolveTeamId(supabase, raw, externalId, level, skillLevel)
    teamCache.set(key, id)
    return id
  }

  let imported = 0
  const skippedGames: string[] = []
  const errors: string[] = []

  for (const row of rows) {
    try {
      const homeTeamId = await getTeamId(row.homeTeamRaw, row.homeExternalId)
      const awayTeamId = await getTeamId(row.awayTeamRaw, row.awayExternalId)

      // Check for duplicate by game_number
      const { data: existing } = await supabase
        .from("games")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("game_number", row.gameNumber)
        .limit(1)
        .single()

      if (existing) {
        skippedGames.push(`#${row.gameNumber} (duplicate game number)`)
        continue
      }

      // Also check by date + teams to catch duplicates without game numbers
      const { data: dupByTeams } = await supabase
        .from("games")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("home_team_id", homeTeamId)
        .eq("away_team_id", awayTeamId)
        .gte("start_datetime", row.date.slice(0, 10) + "T00:00:00")
        .lte("start_datetime", row.date.slice(0, 10) + "T23:59:59")
        .limit(1)
        .single()

      if (dupByTeams) {
        const dateShort = new Date(row.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
        skippedGames.push(`#${row.gameNumber} ${dateShort} (same teams & date)`)
        continue
      }

      const isCompleted = row.homeScore >= 0 && row.awayScore >= 0
      const homeWon = row.homeScore > row.awayScore
      const awayWon = row.awayScore > row.homeScore

      const { error } = await supabase.from("games").insert({
        tournament_id: tournamentId,
        game_number: row.gameNumber,
        stage,
        start_datetime: row.date,
        venue: row.venue,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        final_score_home: isCompleted ? row.homeScore : null,
        final_score_away: isCompleted ? row.awayScore : null,
        status: isCompleted ? "completed" : "scheduled",
        result_type: isCompleted ? "regulation" : null,
      })

      if (error) {
        errors.push(`Game ${row.gameNumber}: ${error.message}`)
      } else {
        imported++
      }
    } catch (err) {
      errors.push(`Game ${row.gameNumber}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  // Cross-check: compare game-derived W/L/T against standings snapshot
  const mismatches: string[] = []

  const { data: standingsSnapshot } = await supabase
    .from("season_standings")
    .select("team_id, gp, w, l, t, teams(name)")
    .eq("tournament_id", tournamentId)

  if (standingsSnapshot && standingsSnapshot.length > 0) {
    // Fetch all completed games for this event
    const { data: allGames } = await supabase
      .from("games")
      .select("home_team_id, away_team_id, final_score_home, final_score_away, status")
      .eq("tournament_id", tournamentId)
      .eq("status", "completed")

    // Calculate W/L/T per team from games
    const gameStats = new Map<string, { w: number; l: number; t: number; gp: number }>()

    for (const g of allGames ?? []) {
      if (g.final_score_home == null || g.final_score_away == null) continue

      for (const side of ["home", "away"] as const) {
        const teamId = side === "home" ? g.home_team_id : g.away_team_id
        if (!teamId) continue

        const myScore = side === "home" ? g.final_score_home : g.final_score_away
        const oppScore = side === "home" ? g.final_score_away : g.final_score_home

        if (!gameStats.has(teamId)) gameStats.set(teamId, { w: 0, l: 0, t: 0, gp: 0 })
        const stats = gameStats.get(teamId)!
        stats.gp++
        if (myScore > oppScore) stats.w++
        else if (myScore < oppScore) stats.l++
        else stats.t++
      }
    }

    // Compare against snapshot
    for (const snap of standingsSnapshot) {
      const teamName = (snap.teams as unknown as { name: string })?.name ?? snap.team_id
      const calc = gameStats.get(snap.team_id)

      if (!calc) {
        mismatches.push(`${teamName}: No games found (standings show ${snap.gp}GP ${snap.w}W ${snap.l}L ${snap.t}T)`)
        continue
      }

      const diffs: string[] = []
      if (calc.gp !== snap.gp) diffs.push(`GP: ${calc.gp} vs ${snap.gp}`)
      if (calc.w !== snap.w) diffs.push(`W: ${calc.w} vs ${snap.w}`)
      if (calc.l !== snap.l) diffs.push(`L: ${calc.l} vs ${snap.l}`)
      if (calc.t !== snap.t) diffs.push(`T: ${calc.t} vs ${snap.t}`)

      if (diffs.length > 0) {
        mismatches.push(`${teamName}: ${diffs.join(", ")} (games vs standings)`)
      }
    }
  }

  return Response.json({
    success: errors.length === 0,
    imported,
    skipped: skippedGames,
    errors,
    mismatches,
  })
}

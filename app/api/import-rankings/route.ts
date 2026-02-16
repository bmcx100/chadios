import { createClient } from "@/lib/supabase/server"

interface MhrGame {
  date: string
  time: string
  opponent: string
  opponentClean: string
  opponentExternalId: string | null
  venue: string
  venueClean: string
  result: "W" | "L" | "T"
  nepeanScore: number
  opponentScore: number
  resultType: "regulation" | "overtime" | "shootout"
  gameType: string
  symbol: string
}

interface TournamentCluster {
  name: string
  eventType: string
  games: MhrGame[]
  startDate: string
  endDate: string
  location: string | null
}

interface MatchResult {
  game: MhrGame
  status: "matched" | "conflict" | "new" | "imported" | "error"
  detail: string
  existingGameId?: string
}

function classifySymbol(symbol: string): { gameType: string; eventType: string; stage: string } {
  switch (symbol) {
    case "‡":
      return { gameType: "National Championship", eventType: "tournament", stage: "pool_play" }
    case "^^":
      return { gameType: "District Tournament", eventType: "tournament", stage: "pool_play" }
    case "^":
      return { gameType: "Provincial", eventType: "provincial", stage: "pool_play" }
    case "††":
    case "†":
      return { gameType: "Playoff", eventType: "playoff", stage: "playoff" }
    case "**":
      return { gameType: "Tournament", eventType: "tournament", stage: "pool_play" }
    case "*":
      return { gameType: "League", eventType: "regular_season", stage: "regular_season" }
    default:
      return { gameType: "Exhibition", eventType: "exhibition", stage: "pool_play" }
  }
}

function parseSymbol(name: string): { clean: string; symbol: string } {
  // Check for multi-char symbols first, then single
  const symbolPatterns = ["‡", "^^", "^", "††", "†", "**", "*"]
  for (const sym of symbolPatterns) {
    if (name.endsWith(sym)) {
      return { clean: name.slice(0, -sym.length).trim(), symbol: sym }
    }
  }
  return { clean: name.trim(), symbol: "" }
}

function extractExternalId(name: string): { clean: string; externalId: string | null } {
  const match = name.match(/\(#(\d+)\)\s*/)
  if (match) {
    return {
      clean: name.replace(match[0], "").trim(),
      externalId: `#${match[1]}`,
    }
  }
  return { clean: name, externalId: null }
}

function cleanVenue(raw: string): string {
  return raw
    .replace(/^Watch at\s+/i, "")
    .replace(/^at\s+/i, "")
    .trim()
}

function clusterTournamentGames(games: MhrGame[]): TournamentCluster[] {
  if (games.length === 0) return []

  // Sort by date
  const sorted = [...games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const clusters: TournamentCluster[] = []
  let current: MhrGame[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(current[current.length - 1].date)
    const thisDate = new Date(sorted[i].date)
    const dayDiff = (thisDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

    if (dayDiff <= 4) {
      current.push(sorted[i])
    } else {
      clusters.push(buildCluster(current))
      current = [sorted[i]]
    }
  }
  clusters.push(buildCluster(current))

  return clusters
}

function buildCluster(games: MhrGame[]): TournamentCluster {
  const dates = games.map((g) => g.date).sort()
  const venues = games
    .map((g) => g.venueClean)
    .filter((v) => v && v !== "Add Rink")
  const location = venues.length > 0 ? venues[0] : null

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  // Generate name from date range and location
  const start = new Date(startDate)
  const end = new Date(endDate)
  const monthDay = start.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
  const endDay = end.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
  const dateRange = startDate === endDate ? monthDay : `${monthDay}-${endDay}`
  const name = location
    ? `Tournament @ ${location} (${dateRange})`
    : `Tournament (${dateRange})`

  return {
    name,
    eventType: games[0].gameType === "Provincial" ? "provincial" : "tournament",
    games,
    startDate,
    endDate,
    location,
  }
}

export async function POST(req: Request) {
  const { games, teamName, teamId: nepeanTeamId, regularSeasonEventId, doImport } = await req.json() as {
    games: MhrGame[]
    teamName: string
    teamId: string
    regularSeasonEventId: string | null
    doImport: boolean
  }

  if (!games?.length || !nepeanTeamId) {
    return Response.json({ error: "games and teamId required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Group games by type
  const leagueGames = games.filter((g) => g.symbol === "*")
  const tournamentGames = games.filter((g) => g.symbol === "**")
  const playoffGames = games.filter((g) => g.symbol === "†" || g.symbol === "††")
  const provincialGames = games.filter((g) => g.symbol === "^")
  const districtGames = games.filter((g) => g.symbol === "^^")
  const nationalGames = games.filter((g) => g.symbol === "‡")
  const exhibitionGames = games.filter((g) => !g.symbol)

  // Cluster tournaments
  const tournamentClusters = clusterTournamentGames(tournamentGames)
  const provincialClusters = clusterTournamentGames(provincialGames)
  const districtClusters = clusterTournamentGames(districtGames)
  const nationalClusters = clusterTournamentGames(nationalGames)
  const playoffClusters = clusterTournamentGames(playoffGames)
  const exhibitionClusters = clusterTournamentGames(exhibitionGames)

  // Cache for team resolution
  const teamCache = new Map<string, string>()
  teamCache.set(teamName, nepeanTeamId)

  async function resolveOpponent(game: MhrGame): Promise<string> {
    const key = game.opponentExternalId ?? game.opponentClean
    if (teamCache.has(key)) return teamCache.get(key)!

    // Try external_id
    if (game.opponentExternalId) {
      const { data } = await supabase
        .from("teams")
        .select("id")
        .eq("external_id", game.opponentExternalId)
        .single()
      if (data) {
        teamCache.set(key, data.id)
        return data.id
      }
    }

    // Try name match — strip U13 A etc for matching
    const nameForSearch = game.opponentClean
      .replace(/\s+U\d+\s+\w+$/, "")
      .replace(/\s+\d+U$/, "")
      .trim()

    const { data: byName } = await supabase
      .from("teams")
      .select("id")
      .ilike("name", `%${nameForSearch}%`)
      .limit(1)
      .single()

    if (byName) {
      teamCache.set(key, byName.id)
      return byName.id
    }

    // Create team
    const { data: newTeam } = await supabase
      .from("teams")
      .insert({
        name: game.opponentClean,
        external_id: game.opponentExternalId,
        level: "U13",
        skill_level: "A",
      })
      .select("id")
      .single()

    if (!newTeam) throw new Error(`Failed to create team: ${game.opponentClean}`)
    teamCache.set(key, newTeam.id)
    return newTeam.id
  }

  // Cross-reference league games against existing regular season games
  const leagueResults: MatchResult[] = []

  if (regularSeasonEventId) {
    // Get all existing games for the regular season event
    const { data: existingGames } = await supabase
      .from("games")
      .select("id, start_datetime, home_team_id, away_team_id, final_score_home, final_score_away, status, venue")
      .eq("tournament_id", regularSeasonEventId)

    for (const game of leagueGames) {
      const opponentId = await resolveOpponent(game)
      const gameDate = game.date.slice(0, 10)

      // Find matching game by date + teams (either home or away)
      const match = (existingGames ?? []).find((eg) => {
        const existingDate = eg.start_datetime?.slice(0, 10)
        if (existingDate !== gameDate) return false
        const teamsMatch =
          (eg.home_team_id === nepeanTeamId && eg.away_team_id === opponentId) ||
          (eg.away_team_id === nepeanTeamId && eg.home_team_id === opponentId)
        return teamsMatch
      })

      if (match) {
        // Check for score conflicts
        if (match.status === "completed" && match.final_score_home != null) {
          const isNepeanHome = match.home_team_id === nepeanTeamId
          const existNepScore = isNepeanHome ? match.final_score_home : match.final_score_away
          const existOppScore = isNepeanHome ? match.final_score_away : match.final_score_home

          if (existNepScore === game.nepeanScore && existOppScore === game.opponentScore) {
            leagueResults.push({
              game,
              status: "matched",
              detail: `${game.date.slice(5, 10)} vs ${game.opponentClean}: scores match (${game.nepeanScore}-${game.opponentScore})`,
              existingGameId: match.id,
            })
          } else {
            leagueResults.push({
              game,
              status: "conflict",
              detail: `${game.date.slice(5, 10)} vs ${game.opponentClean}: MHR says ${game.nepeanScore}-${game.opponentScore}, existing has ${existNepScore}-${existOppScore}`,
              existingGameId: match.id,
            })
          }
        } else {
          // Existing game has no score — we could update it
          leagueResults.push({
            game,
            status: "matched",
            detail: `${game.date.slice(5, 10)} vs ${game.opponentClean}: exists (no score yet)`,
            existingGameId: match.id,
          })
        }
      } else {
        leagueResults.push({
          game,
          status: "new",
          detail: `${game.date.slice(5, 10)} vs ${game.opponentClean}: ${game.nepeanScore}-${game.opponentScore} (not in existing games)`,
        })
      }
    }
  } else {
    for (const game of leagueGames) {
      leagueResults.push({
        game,
        status: "new",
        detail: `${game.date.slice(5, 10)} vs ${game.opponentClean}: ${game.nepeanScore}-${game.opponentScore}`,
      })
    }
  }

  // If doImport, actually create events and insert games
  const importResults: { imported: number; errors: string[]; createdEvents: string[] } = {
    imported: 0,
    errors: [],
    createdEvents: [],
  }

  if (doImport) {
    // Helper to determine home/away based on venue
    // Wildcats home rinks: Minto Recreation Complex, Nepean Sportsplex, Walter Baker, Bell Centennial
    const HOME_RINKS = ["minto", "nepean sportsplex", "walter baker", "bell centennial"]

    function determineHomeAway(game: MhrGame, nepId: string, oppId: string) {
      const venueStr = game.venueClean.toLowerCase()
      const nepeanHome = HOME_RINKS.some((rink) => venueStr.includes(rink))

      if (nepeanHome) {
        return { homeId: nepId, awayId: oppId, homeScore: game.nepeanScore, awayScore: game.opponentScore }
      }
      // Default: Nepean is away (visiting opponent's venue or neutral)
      return { homeId: oppId, awayId: nepId, homeScore: game.opponentScore, awayScore: game.nepeanScore }
    }

    async function importGameToEvent(
      game: MhrGame,
      eventId: string,
      stage: string
    ): Promise<boolean> {
      try {
        const opponentId = await resolveOpponent(game)
        const { homeId, awayId, homeScore, awayScore } = determineHomeAway(game, nepeanTeamId, opponentId)

        const isCompleted = game.nepeanScore >= 0 && game.opponentScore >= 0
        const datetime = game.time
          ? `${game.date}T${game.time}:00`
          : `${game.date}T00:00:00`

        // Dedup check — search ALL events, not just this one
        // (a game may already exist under a different event, e.g. tournament imported from DWGHA)
        const { data: dup } = await supabase
          .from("games")
          .select("id")
          .or(`and(home_team_id.eq.${homeId},away_team_id.eq.${awayId}),and(home_team_id.eq.${awayId},away_team_id.eq.${homeId})`)
          .gte("start_datetime", game.date + "T00:00:00")
          .lte("start_datetime", game.date + "T23:59:59")
          .limit(1)
          .single()

        if (dup) return false // Already exists, skip silently

        const { error } = await supabase.from("games").insert({
          tournament_id: eventId,
          stage,
          start_datetime: datetime,
          venue: game.venueClean || null,
          home_team_id: homeId,
          away_team_id: awayId,
          final_score_home: isCompleted ? homeScore : null,
          final_score_away: isCompleted ? awayScore : null,
          status: isCompleted ? "completed" : "scheduled",
          result_type: isCompleted ? game.resultType : null,
        })

        if (error) {
          importResults.errors.push(`${game.date.slice(5, 10)} vs ${game.opponentClean}: ${error.message}`)
          return false
        }
        return true
      } catch (err) {
        importResults.errors.push(
          `${game.date.slice(5, 10)} vs ${game.opponentClean}: ${err instanceof Error ? err.message : "Unknown"}`
        )
        return false
      }
    }

    // Import new league games to regular season event
    if (regularSeasonEventId) {
      for (const lr of leagueResults) {
        if (lr.status === "new") {
          const ok = await importGameToEvent(lr.game, regularSeasonEventId, "regular_season")
          if (ok) {
            lr.status = "imported"
            importResults.imported++
          }
        }
      }
    }

    // Import tournament clusters
    async function importCluster(cluster: TournamentCluster, eventType: string, stage: string) {
      // Try to find existing event by overlapping dates
      const { data: existingByDate } = await supabase
        .from("tournaments")
        .select("id, name")
        .eq("event_type", eventType)
        .lte("start_date", cluster.endDate)
        .gte("end_date", cluster.startDate)
        .limit(1)
        .single()

      // Also try by name match
      const { data: existingByName } = !existingByDate
        ? await supabase
            .from("tournaments")
            .select("id, name")
            .eq("name", cluster.name)
            .limit(1)
            .single()
        : { data: null }

      const existing = existingByDate ?? existingByName

      let eventId: string
      if (existing) {
        eventId = existing.id
      } else {
        const { data: newEvent } = await supabase
          .from("tournaments")
          .insert({
            name: cluster.name,
            start_date: cluster.startDate,
            end_date: cluster.endDate,
            location: cluster.location,
            event_type: eventType,
            level: "U13",
            skill_level: "A",
          })
          .select("id")
          .single()

        if (!newEvent) {
          importResults.errors.push(`Failed to create event: ${cluster.name}`)
          return
        }
        eventId = newEvent.id
        importResults.createdEvents.push(cluster.name)
      }

      for (const game of cluster.games) {
        const ok = await importGameToEvent(game, eventId, stage)
        if (ok) importResults.imported++
      }
    }

    for (const c of tournamentClusters) await importCluster(c, "tournament", "pool_play")
    for (const c of provincialClusters) await importCluster(c, "provincial", "pool_play")
    for (const c of districtClusters) await importCluster(c, "tournament", "pool_play")
    for (const c of nationalClusters) await importCluster(c, "tournament", "pool_play")
    for (const c of playoffClusters) await importCluster(c, "playoff", "playoff")
    for (const c of exhibitionClusters) await importCluster(c, "exhibition", "pool_play")
  }

  return Response.json({
    summary: {
      total: games.length,
      league: leagueGames.length,
      tournament: tournamentGames.length,
      playoff: playoffGames.length,
      provincial: provincialGames.length,
      district: districtGames.length,
      national: nationalGames.length,
      exhibition: exhibitionGames.length,
    },
    leagueResults,
    tournamentClusters: tournamentClusters.map((c) => ({
      name: c.name,
      eventType: c.eventType,
      gameCount: c.games.length,
      startDate: c.startDate,
      endDate: c.endDate,
      location: c.location,
      games: c.games.map((g) => `${g.date.slice(5, 10)} vs ${g.opponentClean} (${g.nepeanScore}-${g.opponentScore})`),
    })),
    provincialClusters: provincialClusters.map((c) => ({
      name: c.name,
      gameCount: c.games.length,
      games: c.games.map((g) => `${g.date.slice(5, 10)} vs ${g.opponentClean} (${g.nepeanScore}-${g.opponentScore})`),
    })),
    playoffClusters: playoffClusters.map((c) => ({
      name: c.name,
      gameCount: c.games.length,
      games: c.games.map((g) => `${g.date.slice(5, 10)} vs ${g.opponentClean} (${g.nepeanScore}-${g.opponentScore})`),
    })),
    exhibitionGames: exhibitionGames.map((g) => ({
      date: g.date,
      opponent: g.opponentClean,
      score: `${g.nepeanScore}-${g.opponentScore}`,
      venue: g.venueClean,
    })),
    importResults: doImport ? importResults : null,
  })
}

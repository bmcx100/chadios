import { createClient } from "@/lib/supabase/server"

interface StandingsRow {
  teamName: string
  externalId: string | null
  gp: number
  w: number
  l: number
  t: number
  otl: number
  sol: number
  pts: number
  gf: number
  ga: number
  diff: number
  pim: number
  pct: number
}

export async function POST(req: Request) {
  const { tournamentId, rows, level, skillLevel } = await req.json() as {
    tournamentId: string
    rows: StandingsRow[]
    level: string
    skillLevel: string
  }

  if (!tournamentId || !rows?.length) {
    return Response.json({ error: "tournamentId and rows required" }, { status: 400 })
  }

  const supabase = await createClient()
  const results: { teamName: string; teamId: string; created: boolean }[] = []

  for (const row of rows) {
    let teamId: string | null = null
    let created = false

    // Try to match by external_id first
    if (row.externalId) {
      const { data: existing } = await supabase
        .from("teams")
        .select("id")
        .eq("external_id", row.externalId)
        .single()

      if (existing) teamId = existing.id
    }

    // If not found, try matching by name
    if (!teamId) {
      const { data: byName } = await supabase
        .from("teams")
        .select("id")
        .ilike("name", `%${row.teamName.replace(/#\S+/, "").trim()}%`)
        .limit(1)
        .single()

      if (byName) teamId = byName.id
    }

    // Create team if not found
    if (!teamId) {
      const cleanName = row.teamName.replace(/#\S+\s*/, "").replace(/\s+NYH\S+/, "").trim()
      const { data: newTeam, error } = await supabase
        .from("teams")
        .insert({
          name: cleanName,
          external_id: row.externalId,
          level,
          skill_level: skillLevel,
        })
        .select("id")
        .single()

      if (error || !newTeam) {
        return Response.json(
          { error: `Failed to create team: ${cleanName} — ${error?.message}` },
          { status: 500 }
        )
      }
      teamId = newTeam.id
      created = true
    }

    // Upsert standings record
    const { error: upsertError } = await supabase
      .from("season_standings")
      .upsert(
        {
          tournament_id: tournamentId,
          team_id: teamId,
          gp: row.gp,
          w: row.w,
          l: row.l,
          t: row.t,
          otl: row.otl,
          sol: row.sol,
          pts: row.pts,
          gf: row.gf,
          ga: row.ga,
          gd: row.diff,
          pim: row.pim,
          pct: row.pct,
        },
        { onConflict: "tournament_id,team_id" }
      )

    if (upsertError) {
      return Response.json(
        { error: `Failed to upsert standings for ${row.teamName}: ${upsertError.message}` },
        { status: 500 }
      )
    }

    results.push({ teamName: row.teamName, teamId: teamId!, created })
  }

  return Response.json({ success: true, results })
}

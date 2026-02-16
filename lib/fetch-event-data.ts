import { createClient } from "@/lib/supabase/server"
import { calculateStandings } from "@/lib/standings-engine"
import type { Game, TiebreakerRule, RankingsMap, EventType } from "@/lib/types"
import type { TeamStanding } from "@/lib/standings-engine"

export interface PoolStanding {
  pool: {
    id: string
    name: string
    advancement_count: number
  }
  standings: TeamStanding[]
}

export interface EventData {
  eventId: string
  name: string
  startDate: string | null
  endDate: string | null
  location: string | null
  eventType: EventType
  poolStandings: PoolStanding[]
  allGames: Game[]
  rankings: RankingsMap
  myTeamPoolId: string | undefined
  bracketGames: {
    semi1: Game | null
    semi2: Game | null
    finalGame: Game | null
  }
  hasPools: boolean
  hasBracket: boolean
}

export async function fetchEventData(eventId: string, teamId: string): Promise<EventData> {
  const supabase = await createClient()

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("name, start_date, end_date, location, goal_differential_cap, event_type")
    .eq("id", eventId)
    .single()

  // Fallback if event_type column doesn't exist
  const tournamentData = tErr && tErr.message?.includes("event_type")
    ? (await supabase
        .from("tournaments")
        .select("name, start_date, end_date, location, goal_differential_cap")
        .eq("id", eventId)
        .single()
      ).data
    : tournament

  const { data: pointStructure } = await supabase
    .from("tournament_point_structure")
    .select("win_points, tie_points, loss_points")
    .eq("tournament_id", eventId)
    .single()

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, advancement_count")
    .eq("tournament_id", eventId)
    .order("name")

  const poolIds = (pools ?? []).map((p) => p.id)

  const { data: poolTeamsData } = poolIds.length > 0
    ? await supabase
        .from("pool_teams")
        .select("pool_id, team_id, teams(id, name)")
        .in("pool_id", poolIds)
    : { data: [] }

  const { data: allGamesRaw } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, external_id, level, skill_level, division, short_location, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, external_id, level, skill_level, division, short_location, short_name),
      pool:pools!games_pool_id_fkey(id, tournament_id, name, advancement_count)
    `)
    .eq("tournament_id", eventId)
    .order("start_datetime")

  const allGames = (allGamesRaw ?? []) as Game[]

  const { data: tiebreakerRules } = await supabase
    .from("tiebreaker_rules")
    .select("*")
    .eq("tournament_id", eventId)
    .order("priority_order")

  const { data: rankingsData } = await supabase
    .from("provincial_rankings")
    .select("team_id, rank")
    .order("date_recorded", { ascending: false })

  const rankings: RankingsMap = {}
  for (const r of rankingsData ?? []) {
    if (!(r.team_id in rankings)) {
      rankings[r.team_id] = r.rank
    }
  }

  const myTeamPool = (poolTeamsData ?? []).find(
    (pt) => pt.team_id === teamId
  )
  const myTeamPoolId = myTeamPool?.pool_id ?? undefined

  const goalDiffCap = (tournamentData as Record<string, unknown>)?.goal_differential_cap as number ?? 5
  const pts = pointStructure ?? { win_points: 2, tie_points: 1, loss_points: 0 }

  const poolPlayGames = allGames.filter((g) => g.stage === "pool_play")

  const poolStandings = (pools ?? []).map((pool) => {
    const teamsInPool = (poolTeamsData ?? [])
      .filter((pt) => pt.pool_id === pool.id)
      .map((pt) => {
        const team = pt.teams as unknown as { id: string; name: string }
        return { teamId: team.id, teamName: team.name }
      })

    const poolGames = poolPlayGames.filter(
      (g) => g.pool_id === pool.id
    )

    const standings = calculateStandings(
      teamsInPool,
      poolGames,
      (tiebreakerRules ?? []) as TiebreakerRule[],
      pts,
      goalDiffCap
    )

    return { pool, standings }
  })

  // Bracket data
  const bracketStages = ["semifinal", "final"]
  const bracketGamesRaw = allGames.filter((g) => bracketStages.includes(g.stage))

  // Build standings map for placeholder resolution
  const standingsMap = new Map<string, { teamId: string; teamName: string }[]>()
  for (const ps of poolStandings) {
    standingsMap.set(
      `Pool ${ps.pool.name}`,
      ps.standings.map((s) => ({ teamId: s.teamId, teamName: s.teamName }))
    )
  }

  function resolvePlaceholder(game: Game | null): Game | null {
    if (!game) return null
    const resolved = { ...game }
    const pattern = /^(1st|2nd|3rd|4th)\s+(.+)$/i

    for (const side of ["home", "away"] as const) {
      const teamKey = `${side}_team_id` as keyof Game
      const placeholderKey = `${side}_placeholder` as keyof Game
      const teamObjKey = `${side}_team` as keyof Game

      if (!resolved[teamKey] && resolved[placeholderKey]) {
        const match = (resolved[placeholderKey] as string).match(pattern)
        if (match) {
          const rank = ["1st", "2nd", "3rd", "4th"].indexOf(match[1].toLowerCase())
          const poolTeams = standingsMap.get(match[2])
          if (poolTeams && rank >= 0 && rank < poolTeams.length) {
            const team = poolTeams[rank]
            ;(resolved as Record<string, unknown>)[teamKey] = team.teamId
            ;(resolved as Record<string, unknown>)[teamObjKey] = {
              id: team.teamId,
              name: team.teamName,
              external_id: null,
              level: null,
              skill_level: null,
              division: null,
              short_location: null,
              short_name: null,
            }
          }
        }
      }
    }
    return resolved
  }

  const semi1 = resolvePlaceholder(
    bracketGamesRaw.find((g) => g.stage === "semifinal" && g.game_number === "365") ?? null
  )
  const semi2 = resolvePlaceholder(
    bracketGamesRaw.find((g) => g.stage === "semifinal" && g.game_number === "372") ?? null
  )
  const finalGame = resolvePlaceholder(
    bracketGamesRaw.find((g) => g.stage === "final") ?? null
  )

  const hasBracket = bracketGamesRaw.length > 0
  const hasPools = (pools ?? []).length > 0

  return {
    eventId,
    name: (tournamentData as Record<string, unknown>)?.name as string ?? "Event",
    startDate: (tournamentData as Record<string, unknown>)?.start_date as string | null ?? null,
    endDate: (tournamentData as Record<string, unknown>)?.end_date as string | null ?? null,
    location: (tournamentData as Record<string, unknown>)?.location as string | null ?? null,
    eventType: ((tournamentData as Record<string, unknown>)?.event_type as EventType) ?? "regular_season",
    poolStandings,
    allGames,
    rankings,
    myTeamPoolId,
    bracketGames: { semi1, semi2, finalGame },
    hasPools,
    hasBracket,
  }
}

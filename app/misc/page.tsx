import { createClient } from "@/lib/supabase/server"
import { TOURNAMENT_ID } from "@/lib/constants"
import { calculateStandings } from "@/lib/standings-engine"
import { MiscView } from "@/components/misc/MiscView"
import type { Game, TiebreakerRule, RankingsMap } from "@/lib/types"

export default async function MiscPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name, goal_differential_cap")
    .eq("id", TOURNAMENT_ID)
    .single()

  const { data: bracketGames } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, external_id),
      away_team:teams!games_away_team_id_fkey(id, name, external_id)
    `)
    .eq("tournament_id", TOURNAMENT_ID)
    .in("stage", ["semifinal", "final"])
    .order("start_datetime")

  const games = (bracketGames ?? []) as Game[]
  const semi1 = games.find((g) => g.stage === "semifinal" && g.game_number === "365") ?? null
  const semi2 = games.find((g) => g.stage === "semifinal" && g.game_number === "372") ?? null
  const finalGame = games.find((g) => g.stage === "final") ?? null

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, advancement_count")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("name")

  const { data: poolTeamsData } = await supabase
    .from("pool_teams")
    .select("pool_id, team_id, teams(id, name)")
    .in("pool_id", (pools ?? []).map((p) => p.id))

  const { data: poolGames } = await supabase
    .from("games")
    .select("*")
    .eq("tournament_id", TOURNAMENT_ID)
    .eq("stage", "pool_play")

  const { data: tiebreakerRules } = await supabase
    .from("tiebreaker_rules")
    .select("*")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("priority_order")

  const { data: pointStructure } = await supabase
    .from("tournament_point_structure")
    .select("win_points, tie_points, loss_points")
    .eq("tournament_id", TOURNAMENT_ID)
    .single()

  const goalDiffCap = tournament?.goal_differential_cap ?? 5
  const pts = pointStructure ?? { win_points: 2, tie_points: 1, loss_points: 0 }

  const standingsMap = new Map<string, { teamId: string; teamName: string }[]>()
  for (const pool of pools ?? []) {
    const teamsInPool = (poolTeamsData ?? [])
      .filter((pt) => pt.pool_id === pool.id)
      .map((pt) => {
        const team = pt.teams as unknown as { id: string; name: string }
        return { teamId: team.id, teamName: team.name }
      })

    const standings = calculateStandings(
      teamsInPool,
      (poolGames ?? []).filter((g) => g.pool_id === pool.id) as Game[],
      (tiebreakerRules ?? []) as TiebreakerRule[],
      pts,
      goalDiffCap
    )

    standingsMap.set(
      pool.name,
      standings.map((s) => ({ teamId: s.teamId, teamName: s.teamName }))
    )
  }

  function resolvePlaceholder(game: Game | null): Game | null {
    if (!game) return null

    const resolved = { ...game }
    const placeholderPattern = /^(1st|2nd|3rd|4th)\s+(.+)$/i

    if (!resolved.home_team_id && resolved.home_placeholder) {
      const match = resolved.home_placeholder.match(placeholderPattern)
      if (match) {
        const rank = ["1st", "2nd", "3rd", "4th"].indexOf(match[1].toLowerCase())
        const poolTeams = standingsMap.get(match[2])
        if (poolTeams && rank >= 0 && rank < poolTeams.length) {
          const team = poolTeams[rank]
          resolved.home_team_id = team.teamId
          resolved.home_team = { id: team.teamId, name: team.teamName, external_id: null, level: null, skill_level: null, division: null, short_location: null, short_name: null }
        }
      }
    }

    if (!resolved.away_team_id && resolved.away_placeholder) {
      const match = resolved.away_placeholder.match(placeholderPattern)
      if (match) {
        const rank = ["1st", "2nd", "3rd", "4th"].indexOf(match[1].toLowerCase())
        const poolTeams = standingsMap.get(match[2])
        if (poolTeams && rank >= 0 && rank < poolTeams.length) {
          const team = poolTeams[rank]
          resolved.away_team_id = team.teamId
          resolved.away_team = { id: team.teamId, name: team.teamName, external_id: null, level: null, skill_level: null, division: null, short_location: null, short_name: null }
        }
      }
    }

    return resolved
  }

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

  return (
    <div className="misc-page">
      <div className="misc-header">
        <div className="page-brand-row">
          <h1 className="page-brand">Chadiós</h1>
          <span className="page-tagline">Adiós a los Datos Básicos</span>
        </div>
        <p className="page-tournament">{tournament?.name}</p>
      </div>

      <MiscView
        semi1={resolvePlaceholder(semi1)}
        semi2={resolvePlaceholder(semi2)}
        finalGame={resolvePlaceholder(finalGame)}
        rankings={rankings}
      />
    </div>
  )
}

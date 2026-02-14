import { createClient } from "@/lib/supabase/server"
import { TOURNAMENT_ID, MY_TEAM_ID } from "@/lib/constants"
import { calculateStandings } from "@/lib/standings-engine"
import { StandingsView } from "@/components/standings/StandingsView"
import type { Game, TiebreakerRule, RankingsMap } from "@/lib/types"

export default async function StandingsPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name, goal_differential_cap")
    .eq("id", TOURNAMENT_ID)
    .single()

  const { data: pointStructure } = await supabase
    .from("tournament_point_structure")
    .select("win_points, tie_points, loss_points")
    .eq("tournament_id", TOURNAMENT_ID)
    .single()

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, advancement_count")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("name")

  const { data: poolTeamsData } = await supabase
    .from("pool_teams")
    .select("pool_id, team_id, teams(id, name)")
    .in("pool_id", (pools ?? []).map((p) => p.id))

  const { data: allGames } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_location, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_location, short_name),
      pool:pools!games_pool_id_fkey(id, name)
    `)
    .eq("tournament_id", TOURNAMENT_ID)

  const games = (allGames ?? []).filter(
    (g) => g.stage === "pool_play"
  )

  const { data: tiebreakerRules } = await supabase
    .from("tiebreaker_rules")
    .select("*")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("priority_order")

  // Fetch provincial rankings
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

  // Find which pool has my team
  const myTeamPool = (poolTeamsData ?? []).find(
    (pt) => pt.team_id === MY_TEAM_ID
  )
  const myTeamPoolId = myTeamPool?.pool_id ?? undefined

  const goalDiffCap = tournament?.goal_differential_cap ?? 5
  const pts = pointStructure ?? { win_points: 2, tie_points: 1, loss_points: 0 }

  const poolStandings = (pools ?? []).map((pool) => {
    const teamsInPool = (poolTeamsData ?? [])
      .filter((pt) => pt.pool_id === pool.id)
      .map((pt) => {
        const team = pt.teams as unknown as { id: string; name: string }
        return { teamId: team.id, teamName: team.name }
      })

    const poolGames = games.filter(
      (g) => g.pool_id === pool.id
    ) as Game[]

    const standings = calculateStandings(
      teamsInPool,
      poolGames,
      (tiebreakerRules ?? []) as TiebreakerRule[],
      pts,
      goalDiffCap
    )

    return {
      pool,
      standings,
    }
  })

  return (
    <div className="standings-page">
      <div className="standings-header">
        <div className="page-brand-row">
          <h1 className="page-brand">Chadiós</h1>
          <span className="page-tagline">Adiós a los Datos Básicos</span>
        </div>
        <p className="page-tournament">{tournament?.name}</p>
        <a
          href="https://tournkey.app/live/2026-dwgha-bolts-and-hearts#LiveResults"
          target="_blank"
          rel="noopener noreferrer"
          className="standings-link"
        >
          Live Results on Tournkey
        </a>
      </div>

      <StandingsView
        poolStandings={poolStandings}
        rankings={rankings}
        myTeamPoolId={myTeamPoolId}
        games={(allGames ?? []) as Game[]}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/juststanding.png"
        alt="Just standing"
        className="standings-footer-img"
      />
    </div>
  )
}

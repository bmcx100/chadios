import { createClient } from "@/lib/supabase/server"
import { TOURNAMENT_ID } from "@/lib/constants"
import { ScheduleWithScoreEntry } from "@/components/schedule/ScheduleWithScoreEntry"
import type { Game, Pool, RankingsMap } from "@/lib/types"

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("name, start_date, end_date")
    .eq("id", TOURNAMENT_ID)
    .single()

  const { data: pools } = await supabase
    .from("pools")
    .select("id, tournament_id, name, advancement_count")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("name")

  const { data: games } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, external_id, level, skill_level, division, short_location, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, external_id, level, skill_level, division, short_location, short_name),
      pool:pools!games_pool_id_fkey(id, tournament_id, name, advancement_count)
    `)
    .eq("tournament_id", TOURNAMENT_ID)
    .order("start_datetime")

  // Fetch provincial rankings for all tournament teams
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
    <div className="schedule-page">
      <ScheduleWithScoreEntry
        games={(games as Game[]) ?? []}
        pools={(pools as Pool[]) ?? []}
        rankings={rankings}
        tournamentName={tournament?.name}
      />
    </div>
  )
}

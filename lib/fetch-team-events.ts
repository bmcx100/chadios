import { createClient } from "@/lib/supabase/server"
import type { EventType, Game } from "@/lib/types"

export interface TeamEvent {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  location: string | null
  event_type: EventType
  record: { w: number; l: number; t: number }
  status: "active" | "upcoming" | "completed"
}

export async function fetchTeamEvents(teamId: string): Promise<TeamEvent[]> {
  const supabase = await createClient()

  // Find all tournaments this team is in via pool_teams
  const { data: poolTeams } = await supabase
    .from("pool_teams")
    .select("pools(tournament_id)")
    .eq("team_id", teamId)

  const tournamentIds = [
    ...new Set(
      (poolTeams ?? [])
        .map((pt) => (pt.pools as unknown as { tournament_id: string })?.tournament_id)
        .filter(Boolean)
    ),
  ]

  // Also check games table for non-pool events (regular season, etc.)
  const { data: gameEvents } = await supabase
    .from("games")
    .select("tournament_id")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .not("tournament_id", "is", null)

  const gameEventIds = [
    ...new Set(
      (gameEvents ?? [])
        .map((g) => g.tournament_id as string)
        .filter(Boolean)
    ),
  ]

  const allEventIds = [...new Set([...tournamentIds, ...gameEventIds])]

  if (allEventIds.length === 0) return []

  return fetchEventsById(supabase, allEventIds, teamId)
}

async function fetchEventsById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventIds: string[],
  teamId: string
): Promise<TeamEvent[]> {
  // Try with event_type, fall back without it if column doesn't exist
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name, start_date, end_date, location, event_type")
    .in("id", eventIds)
    .order("start_date", { ascending: false })

  let tournamentsData: Record<string, unknown>[] | null = tournaments as unknown as Record<string, unknown>[] | null
  if (error && error.message?.includes("event_type")) {
    const { data: fallback } = await supabase
      .from("tournaments")
      .select("id, name, start_date, end_date, location")
      .in("id", eventIds)
      .order("start_date", { ascending: false })
    tournamentsData = fallback as unknown as Record<string, unknown>[] | null
  }

  if (!tournamentsData) return []

  // Fetch all games for this team across these events
  const { data: allGames } = await supabase
    .from("games")
    .select("tournament_id, status, final_score_home, final_score_away, home_team_id, away_team_id")
    .in("tournament_id", eventIds)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)

  const games = (allGames ?? []) as Pick<Game, "tournament_id" | "status" | "final_score_home" | "final_score_away" | "home_team_id" | "away_team_id">[]

  const today = new Date().toISOString().slice(0, 10)

  return tournamentsData.map((t: Record<string, unknown>) => {
    const eventGames = games.filter((g) => g.tournament_id === t.id)
    const completed = eventGames.filter((g) => g.status === "completed")

    let w = 0, l = 0, tie = 0
    for (const g of completed) {
      const isHome = g.home_team_id === teamId
      const myScore = isHome ? g.final_score_home : g.final_score_away
      const oppScore = isHome ? g.final_score_away : g.final_score_home
      if (myScore != null && oppScore != null) {
        if (myScore > oppScore) w++
        else if (myScore < oppScore) l++
        else tie++
      }
    }

    const startDate = t.start_date as string | null
    const endDate = t.end_date as string | null

    let status: "active" | "upcoming" | "completed" = "upcoming"
    if (startDate && endDate) {
      if (today >= startDate && today <= endDate) status = "active"
      else if (today > endDate) status = "completed"
    } else if (startDate) {
      if (today >= startDate) status = "active"
    }

    return {
      id: t.id as string,
      name: t.name as string,
      start_date: startDate,
      end_date: endDate,
      location: (t.location as string | null) ?? null,
      event_type: ((t.event_type as EventType) ?? "regular_season"),
      record: { w, l, t: tie },
      status,
    }
  })
}

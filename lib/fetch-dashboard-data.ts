import { createClient } from "@/lib/supabase/server"
import type { EventType, Game } from "@/lib/types"
import type { TeamEvent } from "./fetch-team-events"

export interface UpcomingGame {
  id: string
  start_datetime: string
  venue: string | null
  opponent: {
    id: string
    name: string
    short_location: string | null
    short_name: string | null
  } | null
  opponent_placeholder: string | null
  is_home: boolean
  event_type: EventType
  tournament_id: string | null
}

export interface DashboardData {
  team: {
    id: string
    name: string
    short_location: string | null
    level: string | null
    skill_level: string | null
  }
  seasonRecord: { w: number; l: number; t: number } | null
  streak: string | null
  nextGames: UpcomingGame[]
  activeEvents: TeamEvent[]
  upcomingEvents: TeamEvent[]
  completedEvents: TeamEvent[]
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function discoverEventIds(supabase: SupabaseClient, teamId: string): Promise<string[]> {
  const { data: poolTeams } = await supabase
    .from("pool_teams")
    .select("pools(tournament_id)")
    .eq("team_id", teamId)

  const poolIds = (poolTeams ?? [])
    .map((pt) => (pt.pools as unknown as { tournament_id: string })?.tournament_id)
    .filter(Boolean)

  const { data: gameEvents } = await supabase
    .from("games")
    .select("tournament_id")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .not("tournament_id", "is", null)

  const gameIds = (gameEvents ?? [])
    .map((g) => g.tournament_id as string)
    .filter(Boolean)

  return [...new Set([...poolIds, ...gameIds])]
}

function computeRecord(
  games: Pick<Game, "status" | "final_score_home" | "final_score_away" | "home_team_id" | "away_team_id">[],
  teamId: string
): { w: number; l: number; t: number } {
  let w = 0, l = 0, t = 0
  for (const g of games) {
    if (g.status !== "completed") continue
    const isHome = g.home_team_id === teamId
    const my = isHome ? g.final_score_home : g.final_score_away
    const opp = isHome ? g.final_score_away : g.final_score_home
    if (my == null || opp == null) continue
    if (my > opp) w++
    else if (my < opp) l++
    else t++
  }
  return { w, l, t }
}

function computeStreak(
  games: Pick<Game, "status" | "final_score_home" | "final_score_away" | "home_team_id" | "away_team_id" | "start_datetime">[],
  teamId: string
): string | null {
  const completed = games
    .filter((g) => g.status === "completed")
    .sort((a, b) => b.start_datetime.localeCompare(a.start_datetime))

  if (completed.length === 0) return null

  let streakType: "W" | "L" | "T" | null = null
  let count = 0

  for (const g of completed) {
    const isHome = g.home_team_id === teamId
    const my = isHome ? g.final_score_home : g.final_score_away
    const opp = isHome ? g.final_score_away : g.final_score_home
    if (my == null || opp == null) continue

    let result: "W" | "L" | "T"
    if (my > opp) result = "W"
    else if (my < opp) result = "L"
    else result = "T"

    if (streakType === null) {
      streakType = result
      count = 1
    } else if (result === streakType) {
      count++
    } else {
      break
    }
  }

  return streakType ? `${streakType}${count}` : null
}

function determineStatus(
  startDate: string | null,
  endDate: string | null,
  today: string
): "active" | "upcoming" | "completed" {
  if (startDate && endDate) {
    if (today >= startDate && today <= endDate) return "active"
    if (today > endDate) return "completed"
  } else if (startDate) {
    if (today >= startDate) return "active"
  }
  return "upcoming"
}

export async function fetchDashboardData(teamId: string): Promise<DashboardData> {
  const supabase = await createClient()

  // Fetch team info
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, short_location, level, skill_level")
    .eq("id", teamId)
    .single()

  if (!team) {
    return {
      team: { id: teamId, name: "Unknown", short_location: null, level: null, skill_level: null },
      seasonRecord: null,
      streak: null,
      nextGames: [],
      activeEvents: [],
      upcomingEvents: [],
      completedEvents: [],
    }
  }

  // Discover all event IDs
  const eventIds = await discoverEventIds(supabase, teamId)
  if (eventIds.length === 0) {
    return {
      team,
      seasonRecord: null,
      streak: null,
      nextGames: [],
      activeEvents: [],
      upcomingEvents: [],
      completedEvents: [],
    }
  }

  // Fetch tournament metadata
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, start_date, end_date, location, event_type")
    .in("id", eventIds)
    .order("start_date", { ascending: false })

  const tournamentsData = (tournaments ?? []) as Record<string, unknown>[]

  // Fetch all games for this team across all events
  const { data: allGames } = await supabase
    .from("games")
    .select("id, tournament_id, status, final_score_home, final_score_away, home_team_id, away_team_id, start_datetime, venue")
    .in("tournament_id", eventIds)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)

  const games = (allGames ?? []) as Pick<
    Game,
    "id" | "tournament_id" | "status" | "final_score_home" | "final_score_away" | "home_team_id" | "away_team_id" | "start_datetime" | "venue"
  >[]

  // Identify regular season event
  const regSeasonEvent = tournamentsData.find((t) => t.event_type === "regular_season")
  const regSeasonId = regSeasonEvent?.id as string | undefined

  // Calculate season record and streak
  const regSeasonGames = regSeasonId
    ? games.filter((g) => g.tournament_id === regSeasonId)
    : []

  const seasonRecord = regSeasonGames.length > 0
    ? computeRecord(regSeasonGames, teamId)
    : null

  const streak = regSeasonGames.length > 0
    ? computeStreak(regSeasonGames, teamId)
    : null

  // Find next 3 upcoming games from regular_season + playoff + playdown events
  const mergedTypes = new Set(["regular_season", "playoff", "playdown"])
  const mergedEventIds = tournamentsData
    .filter((t) => mergedTypes.has(t.event_type as string))
    .map((t) => t.id as string)

  const now = new Date().toISOString()
  const scheduledGames = games
    .filter((g) =>
      g.status === "scheduled" &&
      mergedEventIds.includes(g.tournament_id!) &&
      g.start_datetime >= now
    )
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
    .slice(0, 3)

  // Resolve opponent info for upcoming games
  const opponentIds = scheduledGames
    .map((g) => g.home_team_id === teamId ? g.away_team_id : g.home_team_id)
    .filter(Boolean) as string[]

  const uniqueOpponentIds = [...new Set(opponentIds)]
  let opponentMap = new Map<string, { id: string; name: string; short_location: string | null; short_name: string | null }>()

  if (uniqueOpponentIds.length > 0) {
    const { data: opponents } = await supabase
      .from("teams")
      .select("id, name, short_location, short_name")
      .in("id", uniqueOpponentIds)

    for (const opp of opponents ?? []) {
      opponentMap.set(opp.id, opp)
    }
  }

  // Build event type lookup
  const eventTypeMap = new Map<string, EventType>()
  for (const t of tournamentsData) {
    eventTypeMap.set(t.id as string, (t.event_type as EventType) ?? "regular_season")
  }

  const nextGames: UpcomingGame[] = scheduledGames.map((g) => {
    const isHome = g.home_team_id === teamId
    const oppId = isHome ? g.away_team_id : g.home_team_id
    return {
      id: g.id,
      start_datetime: g.start_datetime,
      venue: g.venue ?? null,
      opponent: oppId ? opponentMap.get(oppId) ?? null : null,
      opponent_placeholder: null,
      is_home: isHome,
      event_type: eventTypeMap.get(g.tournament_id!) ?? "regular_season",
      tournament_id: g.tournament_id ?? null,
    }
  })

  // Build event lists (exclude regular_season from cards)
  const today = new Date().toISOString().slice(0, 10)
  const activeEvents: TeamEvent[] = []
  const upcomingEvents: TeamEvent[] = []
  const completedEvents: TeamEvent[] = []

  for (const t of tournamentsData) {
    const eventType = (t.event_type as EventType) ?? "regular_season"
    if (eventType === "regular_season") continue

    const eventGames = games.filter((g) => g.tournament_id === t.id)
    const record = computeRecord(eventGames, teamId)
    const status = determineStatus(t.start_date as string | null, t.end_date as string | null, today)

    const event: TeamEvent = {
      id: t.id as string,
      name: t.name as string,
      start_date: (t.start_date as string | null) ?? null,
      end_date: (t.end_date as string | null) ?? null,
      location: (t.location as string | null) ?? null,
      event_type: eventType,
      record,
      status,
    }

    if (status === "active") activeEvents.push(event)
    else if (status === "upcoming") upcomingEvents.push(event)
    else completedEvents.push(event)
  }

  return {
    team,
    seasonRecord,
    streak,
    nextGames,
    activeEvents,
    upcomingEvents,
    completedEvents,
  }
}

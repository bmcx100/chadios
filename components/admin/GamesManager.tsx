"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { GameEditSheet } from "./GameEditSheet"
import { AddGameSheet } from "./AddGameSheet"
import type { Game } from "@/lib/types"

interface EventOption {
  id: string
  name: string
}

interface GameRow {
  id: string
  tournament_id: string | null
  start_datetime: string
  venue: string | null
  status: string
  final_score_home: number | null
  final_score_away: number | null
  result_type: string | null
  home_team: { name: string } | null
  away_team: { name: string } | null
  home_placeholder: string | null
  away_placeholder: string | null
}

interface GamesManagerProps {
  teamId?: string | null
}

export function GamesManager({ teamId }: GamesManagerProps) {
  const [games, setGames] = useState<GameRow[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [filterEvent, setFilterEvent] = useState("")
  const [loading, setLoading] = useState(true)
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const fetchGames = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from("games")
      .select("id, tournament_id, start_datetime, venue, status, final_score_home, final_score_away, result_type, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name), home_placeholder, away_placeholder, home_team_id, away_team_id")
      .order("start_datetime", { ascending: false })
      .limit(200)

    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    }

    if (filterEvent) {
      query = query.eq("tournament_id", filterEvent)
    }

    const { data } = await query
    setGames((data ?? []) as unknown as GameRow[])
    setLoading(false)
  }, [filterEvent, teamId])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("tournaments")
      .select("id, name")
      .order("name")
      .then(({ data }) => setEvents(data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchGames()
  }, [fetchGames])

  function handleGameTap(row: GameRow) {
    setEditGame({
      id: row.id,
      tournament_id: row.tournament_id,
      pool_id: null,
      season_id: null,
      game_number: null,
      stage: "pool_play",
      start_datetime: row.start_datetime,
      venue: row.venue,
      home_team_id: null,
      away_team_id: null,
      home_placeholder: row.home_placeholder,
      away_placeholder: row.away_placeholder,
      bracket_source_game_1_id: null,
      bracket_source_game_2_id: null,
      final_score_home: row.final_score_home,
      final_score_away: row.final_score_away,
      goals_by_period_home: null,
      goals_by_period_away: null,
      penalty_minutes_home: null,
      penalty_minutes_away: null,
      fastest_goal_seconds_home: null,
      fastest_goal_seconds_away: null,
      result_type: row.result_type,
      end_reason: null,
      overtime_winner_team_id: null,
      shootout_winner_team_id: null,
      status: row.status as "scheduled" | "completed" | "in_progress",
      entered_by: null,
      home_team: row.home_team ? { id: "", name: row.home_team.name, external_id: null, level: null, skill_level: null, division: null, short_location: null, short_name: null } : null,
      away_team: row.away_team ? { id: "", name: row.away_team.name, external_id: null, level: null, skill_level: null, division: null, short_location: null, short_name: null } : null,
      pool: null,
    })
    setEditOpen(true)
  }

  function handleSaved() {
    fetchGames()
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Toronto",
    })
  }

  const eventName = (id: string | null) =>
    events.find((e) => e.id === id)?.name ?? "—"

  return (
    <div className="admin-manager">
      <div className="admin-manager__toolbar">
        <select
          className="team-picker__select"
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
        >
          <option value="">All Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
        <Button onClick={() => setAddOpen(true)}>Add Game</Button>
      </div>

      {loading && <p className="team-picker__loading">Loading games...</p>}

      {!loading && games.length === 0 && (
        <p className="team-picker__empty">No games found</p>
      )}

      {!loading && games.length > 0 && (
        <div className="admin-manager__list">
          {games.map((g) => {
            const home = g.home_team?.name ?? g.home_placeholder ?? "TBD"
            const away = g.away_team?.name ?? g.away_placeholder ?? "TBD"
            const score = g.final_score_home != null
              ? `${g.final_score_home} - ${g.final_score_away}`
              : "—"

            return (
              <div
                key={g.id}
                className="admin-manager__row"
                onClick={() => handleGameTap(g)}
              >
                <span className="admin-manager__date">{formatDate(g.start_datetime)}</span>
                <span className="admin-manager__matchup">{home} vs {away}</span>
                <span className="admin-manager__score">{score}</span>
                <span className="admin-manager__event">{eventName(g.tournament_id)}</span>
              </div>
            )
          })}
        </div>
      )}

      <GameEditSheet
        game={editGame}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />

      <AddGameSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}

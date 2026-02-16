"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EventOption {
  id: string
  name: string
  event_type: string | null
  total_teams: number | null
  qualifying_count: number | null
}

interface TeamOption {
  id: string
  name: string
}

interface PlaydownStanding {
  teamId: string
  teamName: string
  gp: number
  w: number
  l: number
  t: number
  pts: number
  gf: number
  ga: number
}

interface GameRow {
  id: string
  start_datetime: string
  venue: string | null
  home_team_id: string | null
  away_team_id: string | null
  final_score_home: number | null
  final_score_away: number | null
  status: string
}

interface PlaydownSetupProps {
  teamId?: string | null
  regularSeasonId?: string | null
}

export function PlaydownSetup({ teamId, regularSeasonId }: PlaydownSetupProps) {
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEvent, setSelectedEvent] = useState("")
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [games, setGames] = useState<GameRow[]>([])
  const [standings, setStandings] = useState<PlaydownStanding[]>([])
  const [loading, setLoading] = useState(false)

  // New event form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTotalTeams, setNewTotalTeams] = useState("3")
  const [newQualifying, setNewQualifying] = useState("2")
  const [creating, setCreating] = useState(false)

  // Schedule generation
  const [gamesPerMatchup, setGamesPerMatchup] = useState("2")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("tournaments")
      .select("id, name, event_type, total_teams, qualifying_count")
      .eq("event_type", "playdown")
      .order("name")
      .then(({ data }) => setEvents((data ?? []) as EventOption[]))
  }, [])

  // Load only regular season opponents (not all teams)
  useEffect(() => {
    if (!teamId || !regularSeasonId) return

    const supabase = createClient()
    supabase
      .from("games")
      .select("home_team_id, away_team_id")
      .eq("tournament_id", regularSeasonId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .then(async ({ data: gameData }) => {
        const opponentIds = new Set<string>()
        for (const g of gameData ?? []) {
          if (g.home_team_id && g.home_team_id !== teamId) opponentIds.add(g.home_team_id)
          if (g.away_team_id && g.away_team_id !== teamId) opponentIds.add(g.away_team_id)
        }
        // Include the active team + all opponents
        const allIds = [teamId, ...opponentIds]
        if (allIds.length === 0) {
          setTeams([])
          return
        }
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", allIds)
          .order("name")
        setTeams(teamData ?? [])
      })
  }, [teamId, regularSeasonId])

  const fetchPlaydownData = useCallback(async (eventId: string) => {
    setLoading(true)
    const supabase = createClient()

    const { data: gameData } = await supabase
      .from("games")
      .select("id, start_datetime, venue, home_team_id, away_team_id, final_score_home, final_score_away, status")
      .eq("tournament_id", eventId)
      .order("start_datetime")

    const rows = (gameData ?? []) as GameRow[]
    setGames(rows)

    // Get unique team IDs from games
    const teamIds = new Set<string>()
    for (const g of rows) {
      if (g.home_team_id) teamIds.add(g.home_team_id)
      if (g.away_team_id) teamIds.add(g.away_team_id)
    }

    // Calculate standings
    const statsMap = new Map<string, PlaydownStanding>()
    for (const tid of teamIds) {
      const team = teams.find((t) => t.id === tid)
      statsMap.set(tid, {
        teamId: tid,
        teamName: team?.name ?? "Unknown",
        gp: 0, w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0,
      })
    }

    for (const g of rows) {
      if (g.status !== "completed" || g.final_score_home == null || g.final_score_away == null) continue

      const home = statsMap.get(g.home_team_id!)
      const away = statsMap.get(g.away_team_id!)
      if (!home || !away) continue

      home.gp++
      away.gp++
      home.gf += g.final_score_home
      home.ga += g.final_score_away
      away.gf += g.final_score_away
      away.ga += g.final_score_home

      if (g.final_score_home > g.final_score_away) {
        home.w++
        home.pts += 2
        away.l++
      } else if (g.final_score_away > g.final_score_home) {
        away.w++
        away.pts += 2
        home.l++
      } else {
        home.t++
        away.t++
        home.pts += 1
        away.pts += 1
      }
    }

    setStandings(
      [...statsMap.values()].sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga))
    )
    setSelectedTeams([...teamIds])
    setLoading(false)
  }, [teams])

  useEffect(() => {
    if (selectedEvent) fetchPlaydownData(selectedEvent)
  }, [selectedEvent, fetchPlaydownData])

  async function handleCreateEvent() {
    if (!newName) return
    setCreating(true)

    try {
      const res = await fetch("/api/admin-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          eventType: "playdown",
          totalTeams: parseInt(newTotalTeams) || null,
          qualifyingCount: parseInt(newQualifying) || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        const newEvent: EventOption = {
          id: data.id,
          name: newName,
          event_type: "playdown",
          total_teams: parseInt(newTotalTeams) || null,
          qualifying_count: parseInt(newQualifying) || null,
        }
        setEvents((prev) => [...prev, newEvent])
        setSelectedEvent(data.id)
        setShowCreate(false)
        setNewName("")
      }
    } catch {
      alert("Failed to create event")
    } finally {
      setCreating(false)
    }
  }

  async function handleGenerateSchedule() {
    if (selectedTeams.length < 2 || !selectedEvent) return
    setGenerating(true)

    const perMatchup = parseInt(gamesPerMatchup) || 2
    const gamesToCreate: { homeTeamId: string; awayTeamId: string }[] = []

    // Round-robin: each pair plays perMatchup times, alternating home/away
    for (let i = 0; i < selectedTeams.length; i++) {
      for (let j = i + 1; j < selectedTeams.length; j++) {
        for (let k = 0; k < perMatchup; k++) {
          if (k % 2 === 0) {
            gamesToCreate.push({ homeTeamId: selectedTeams[i], awayTeamId: selectedTeams[j] })
          } else {
            gamesToCreate.push({ homeTeamId: selectedTeams[j], awayTeamId: selectedTeams[i] })
          }
        }
      }
    }

    let created = 0
    for (const g of gamesToCreate) {
      try {
        const res = await fetch("/api/add-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: selectedEvent,
            stage: "playdown",
            startDatetime: new Date().toISOString().slice(0, 10) + "T00:00:00",
            venue: "",
            homeTeamId: g.homeTeamId,
            awayTeamId: g.awayTeamId,
            finalScoreHome: null,
            finalScoreAway: null,
            resultType: null,
          }),
        })
        if (res.ok) created++
      } catch {
        // continue
      }
    }

    alert(`Created ${created} game slots`)
    fetchPlaydownData(selectedEvent)
    setGenerating(false)
  }

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    )
  }

  const currentEvent = events.find((e) => e.id === selectedEvent)
  const qualifyingCount = currentEvent?.qualifying_count ?? 0

  return (
    <div className="admin-manager">
      <div className="admin-manager__toolbar">
        <select
          className="team-picker__select"
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
        >
          <option value="">Select playdown event...</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => setShowCreate(!showCreate)}>
          New
        </Button>
      </div>

      {showCreate && (
        <div className="playdown-create">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playdown name"
          />
          <div className="playdown-create__row">
            <div className="playdown-create__field">
              <label className="admin-sheet__label">Teams</label>
              <Input type="number" value={newTotalTeams} onChange={(e) => setNewTotalTeams(e.target.value)} />
            </div>
            <div className="playdown-create__field">
              <label className="admin-sheet__label">Qualify</label>
              <Input type="number" value={newQualifying} onChange={(e) => setNewQualifying(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleCreateEvent} disabled={creating}>
            {creating ? "Creating..." : "Create Playdown"}
          </Button>
        </div>
      )}

      {selectedEvent && !loading && (
        <>
          <div className="playdown-section">
            <h3 className="playdown-section__title">Teams in Loop</h3>
            <div className="playdown-teams">
              {teams.map((t) => (
                <label key={t.id} className="playdown-team-check">
                  <input
                    type="checkbox"
                    checked={selectedTeams.includes(t.id)}
                    onChange={() => toggleTeam(t.id)}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="playdown-section">
            <h3 className="playdown-section__title">Generate Schedule</h3>
            <div className="playdown-generate">
              <label className="admin-sheet__label">Games per matchup</label>
              <Input
                type="number"
                value={gamesPerMatchup}
                onChange={(e) => setGamesPerMatchup(e.target.value)}
                className="playdown-generate__input"
              />
              <Button onClick={handleGenerateSchedule} disabled={generating || selectedTeams.length < 2}>
                {generating ? "Generating..." : "Generate Game Slots"}
              </Button>
            </div>
          </div>

          {standings.length > 0 && (
            <div className="playdown-section">
              <h3 className="playdown-section__title">Standings</h3>
              <div className="standings-table-wrap">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>GP</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PTS</th>
                      <th>GF</th>
                      <th>GA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr
                        key={s.teamId}
                        className={i < qualifyingCount ? "playdown-qualifying" : ""}
                      >
                        <td className="standings-cell--team">
                          <span className="standings-row__team-name">{s.teamName}</span>
                        </td>
                        <td>{s.gp}</td>
                        <td>{s.w}</td>
                        <td>{s.l}</td>
                        <td>{s.t}</td>
                        <td className="standings-cell--pts">{s.pts}</td>
                        <td>{s.gf}</td>
                        <td>{s.ga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {qualifyingCount > 0 && (
                <p className="playdown-qualify-note">
                  Top {qualifyingCount} advance to Provincials
                </p>
              )}
            </div>
          )}

          {games.length > 0 && (
            <div className="playdown-section">
              <h3 className="playdown-section__title">Games ({games.length})</h3>
              <div className="admin-manager__list">
                {games.map((g) => {
                  const home = teams.find((t) => t.id === g.home_team_id)?.name ?? "TBD"
                  const away = teams.find((t) => t.id === g.away_team_id)?.name ?? "TBD"
                  const score = g.final_score_home != null
                    ? `${g.final_score_home} - ${g.final_score_away}`
                    : "—"

                  return (
                    <div key={g.id} className="admin-manager__row">
                      <span className="admin-manager__matchup">{home} vs {away}</span>
                      <span className="admin-manager__score">{score}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {loading && <p className="team-picker__loading">Loading...</p>}
    </div>
  )
}

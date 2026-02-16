"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

interface TeamOption {
  id: string
  name: string
}

interface EventOption {
  id: string
  name: string
  event_type: string | null
}

interface AddGameSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEventId?: string
  onSaved?: () => void
}

export function AddGameSheet({ open, onOpenChange, defaultEventId, onSaved }: AddGameSheetProps) {
  const [events, setEvents] = useState<EventOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [eventId, setEventId] = useState(defaultEventId ?? "")
  const [homeTeamId, setHomeTeamId] = useState("")
  const [awayTeamId, setAwayTeamId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [venue, setVenue] = useState("")
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from("tournaments")
      .select("id, name, event_type")
      .order("name")
      .then(({ data }) => {
        setEvents(data ?? [])
        if (defaultEventId) setEventId(defaultEventId)
      })
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data }) => setTeams(data ?? []))
  }, [open, defaultEventId])

  function reset() {
    setHomeTeamId("")
    setAwayTeamId("")
    setDate("")
    setTime("")
    setVenue("")
    setHomeScore("")
    setAwayScore("")
    setError("")
  }

  async function handleSave() {
    if (!eventId || !homeTeamId || !awayTeamId || !date) {
      setError("Event, both teams, and date are required")
      return
    }
    if (homeTeamId === awayTeamId) {
      setError("Home and away teams must be different")
      return
    }

    setSaving(true)
    setError("")

    const startDatetime = time
      ? `${date}T${time}:00`
      : `${date}T00:00:00`

    const event = events.find((e) => e.id === eventId)
    const stage = event?.event_type === "regular_season" ? "regular_season" : "pool_play"

    try {
      const res = await fetch("/api/add-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: eventId,
          stage,
          startDatetime,
          venue,
          homeTeamId,
          awayTeamId,
          finalScoreHome: homeScore || null,
          finalScoreAway: awayScore || null,
          resultType: "regulation",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        reset()
        onOpenChange(false)
        onSaved?.()
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="admin-sheet">
        <SheetHeader>
          <SheetTitle>Add Game</SheetTitle>
        </SheetHeader>
        <div className="admin-sheet__body">
          <div className="admin-sheet__field-full">
            <label className="admin-sheet__label">Event</label>
            <select
              className="team-picker__select"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Select event...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-sheet__row">
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Home</label>
              <select
                className="team-picker__select"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Away</label>
              <select
                className="team-picker__select"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
              >
                <option value="">Select team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-sheet__row">
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Time</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="admin-sheet__field-full">
            <label className="admin-sheet__label">Venue</label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Optional" />
          </div>

          <div className="admin-sheet__row">
            <div className="admin-sheet__field">
              <label className="admin-sheet__label">Home Score</label>
              <Input
                type="number"
                className="admin-sheet__input"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="admin-sheet__field">
              <label className="admin-sheet__label">Away Score</label>
              <Input
                type="number"
                className="admin-sheet__input"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          {error && <p className="import-error">{error}</p>}

          <Button onClick={handleSave} disabled={saving} className="admin-sheet__save">
            {saving ? "Saving..." : "Add Game"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

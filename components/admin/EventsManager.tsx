"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface EventRow {
  id: string
  name: string
  event_type: string | null
  start_date: string | null
  end_date: string | null
  location: string | null
  total_teams: number | null
  qualifying_count: number | null
}

const EVENT_TYPES = [
  { value: "regular_season", label: "Regular Season" },
  { value: "tournament", label: "Tournament" },
  { value: "playoff", label: "Playoffs" },
  { value: "playdown", label: "Playdowns" },
  { value: "provincial", label: "Provincials" },
  { value: "exhibition", label: "Exhibition" },
]

export function EventsManager() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editEvent, setEditEvent] = useState<EventRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [eventType, setEventType] = useState("tournament")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [totalTeams, setTotalTeams] = useState("")
  const [qualifyingCount, setQualifyingCount] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const fetchEvents = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, event_type, start_date, end_date, location, total_teams, qualifying_count")
      .order("start_date", { ascending: false })

    setEvents((data ?? []) as EventRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  function openEdit(ev: EventRow) {
    setEditEvent(ev)
    setIsNew(false)
    setName(ev.name)
    setEventType(ev.event_type ?? "tournament")
    setStartDate(ev.start_date ?? "")
    setEndDate(ev.end_date ?? "")
    setLocation(ev.location ?? "")
    setTotalTeams(ev.total_teams != null ? String(ev.total_teams) : "")
    setQualifyingCount(ev.qualifying_count != null ? String(ev.qualifying_count) : "")
    setError("")
    setSheetOpen(true)
  }

  function openNew() {
    setEditEvent(null)
    setIsNew(true)
    setName("")
    setEventType("tournament")
    setStartDate("")
    setEndDate("")
    setLocation("")
    setTotalTeams("")
    setQualifyingCount("")
    setError("")
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!name) {
      setError("Name is required")
      return
    }
    setSaving(true)
    setError("")

    const body: Record<string, unknown> = {
      name,
      eventType,
      startDate,
      endDate,
      location,
      totalTeams: totalTeams ? parseInt(totalTeams) : null,
      qualifyingCount: qualifyingCount ? parseInt(qualifyingCount) : null,
    }

    if (!isNew && editEvent) {
      body.id = editEvent.id
    }

    try {
      const res = await fetch("/api/admin-events", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        setSheetOpen(false)
        fetchEvents()
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editEvent || !confirm(`Delete "${editEvent.name}" and all its games?`)) return
    setDeleting(true)
    setError("")

    try {
      const res = await fetch("/api/admin-events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editEvent.id }),
      })

      if (res.ok) {
        setSheetOpen(false)
        fetchEvents()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch {
      setError("Network error")
    } finally {
      setDeleting(false)
    }
  }

  const typeLabel = (t: string | null) =>
    EVENT_TYPES.find((et) => et.value === t)?.label ?? t ?? "—"

  const showPlaydownFields = eventType === "playdown"

  return (
    <div className="admin-manager">
      <div className="admin-manager__toolbar">
        <span className="admin-manager__count">{events.length} events</span>
        <Button onClick={openNew}>Add Event</Button>
      </div>

      {loading && <p className="team-picker__loading">Loading events...</p>}

      {!loading && events.length === 0 && (
        <p className="team-picker__empty">No events found</p>
      )}

      {!loading && events.length > 0 && (
        <div className="admin-manager__list">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="admin-manager__row"
              onClick={() => openEdit(ev)}
            >
              <span className="admin-manager__event-name">{ev.name}</span>
              <span className="admin-manager__event-type">{typeLabel(ev.event_type)}</span>
              <span className="admin-manager__date">
                {ev.start_date ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="admin-sheet">
          <SheetHeader>
            <SheetTitle>{isNew ? "Add Event" : "Edit Event"}</SheetTitle>
          </SheetHeader>
          <div className="admin-sheet__body">
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Type</label>
              <select
                className="team-picker__select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>

            <div className="admin-sheet__row">
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </div>

            {showPlaydownFields && (
              <div className="admin-sheet__row">
                <div className="admin-sheet__field-full">
                  <label className="admin-sheet__label">Total Teams</label>
                  <Input type="number" value={totalTeams} onChange={(e) => setTotalTeams(e.target.value)} placeholder="e.g. 3" />
                </div>
                <div className="admin-sheet__field-full">
                  <label className="admin-sheet__label">Qualifying Spots</label>
                  <Input type="number" value={qualifyingCount} onChange={(e) => setQualifyingCount(e.target.value)} placeholder="e.g. 2" />
                </div>
              </div>
            )}

            {error && <p className="import-error">{error}</p>}

            <Button onClick={handleSave} disabled={saving} className="admin-sheet__save">
              {saving ? "Saving..." : isNew ? "Create Event" : "Save Changes"}
            </Button>

            {!isNew && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="admin-sheet__delete"
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

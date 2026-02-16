"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface ParsedRow {
  teamName: string
  externalId: string | null
  gp: number
  w: number
  l: number
  t: number
  otl: number
  sol: number
  pts: number
  gf: number
  ga: number
  diff: number
  pim: number
  pct: number
}

interface EventOption {
  id: string
  name: string
  level: string | null
  skill_level: string | null
}

function parseStandingsData(raw: string): ParsedRow[] {
  const lines = raw.trim().split("\n").filter(Boolean)
  const rows: ParsedRow[] = []

  for (const line of lines) {
    const parts = line.split("\t").map((s) => s.trim())
    if (parts.length < 13) continue

    // Extract external ID from team name (e.g., "#2859")
    const teamRaw = parts[0]
    const idMatch = teamRaw.match(/#(\S+)/)
    const externalId = idMatch ? `#${idMatch[1]}` : null

    rows.push({
      teamName: teamRaw,
      externalId,
      gp: parseInt(parts[1]) || 0,
      w: parseInt(parts[2]) || 0,
      l: parseInt(parts[3]) || 0,
      t: parseInt(parts[4]) || 0,
      otl: parseInt(parts[5]) || 0,
      sol: parseInt(parts[6]) || 0,
      pts: parseInt(parts[7]) || 0,
      gf: parseInt(parts[8]) || 0,
      ga: parseInt(parts[9]) || 0,
      diff: parseInt(parts[10]) || 0,
      pim: parseInt(parts[11]) || 0,
      pct: parseFloat(parts[12]) || 0,
    })
  }

  return rows
}

export function StandingsImport() {
  const [rawText, setRawText] = useState("")
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEvent, setSelectedEvent] = useState("")
  const [loading, setLoading] = useState(false)
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const parsed = useMemo(() => parseStandingsData(rawText), [rawText])

  // Load regular season events
  async function loadEvents() {
    if (eventsLoaded) return
    const supabase = createClient()
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, level, skill_level")
      .eq("event_type", "regular_season")
      .order("name")
    setEvents(data ?? [])
    if (data?.length === 1) setSelectedEvent(data[0].id)
    setEventsLoaded(true)
  }

  async function handleImport() {
    if (!selectedEvent || parsed.length === 0) return
    setLoading(true)
    setResult(null)

    const event = events.find((e) => e.id === selectedEvent)

    try {
      const res = await fetch("/api/import-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: selectedEvent,
          rows: parsed,
          level: event?.level ?? "",
          skillLevel: event?.skill_level ?? "",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error })
      } else {
        const created = data.results.filter((r: { created: boolean }) => r.created).length
        setResult({
          success: true,
          message: `Imported ${data.results.length} teams. ${created > 0 ? `${created} new teams created.` : "All teams matched."}`,
        })
        setRawText("")
      }
    } catch (err) {
      setResult({ success: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="import-content">
      <div className="import-step">
        <label className="import-step__label">1. Select Event</label>
        <select
          className="team-picker__select"
          value={selectedEvent}
          onFocus={loadEvents}
          onChange={(e) => setSelectedEvent(e.target.value)}
        >
          <option value="">Select regular season...</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      <div className="import-step">
        <label className="import-step__label">2. Paste Standings</label>
        <p className="standings-import__hint">
          Copy the standings table from the league site and paste below.
        </p>
        <textarea
          className="standings-import__textarea"
          rows={8}
          placeholder="Paste tab-separated standings here..."
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value)
            setResult(null)
          }}
        />
      </div>

      {parsed.length > 0 && (
        <div className="import-step">
          <label className="import-step__label">
            3. Preview ({parsed.length} teams)
          </label>
          <div className="import-preview__table-wrap">
            <table className="import-preview__table">
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
                  <th>DIFF</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((row, i) => (
                  <tr key={i}>
                    <td className="standings-import__team-cell">{row.teamName}</td>
                    <td>{row.gp}</td>
                    <td>{row.w}</td>
                    <td>{row.l}</td>
                    <td>{row.t}</td>
                    <td>{row.pts}</td>
                    <td>{row.gf}</td>
                    <td>{row.ga}</td>
                    <td>{row.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <p className={result.success ? "import-success" : "import-error"}>
          {result.message}
        </p>
      )}

      <Button
        onClick={handleImport}
        disabled={!selectedEvent || parsed.length === 0 || loading}
      >
        {loading ? "Importing..." : `Import ${parsed.length} Standings`}
      </Button>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface ParsedGame {
  gameNumber: string
  date: string
  venue: string
  homeTeamRaw: string
  homeExternalId: string | null
  homeScore: number
  awayTeamRaw: string
  awayExternalId: string | null
  awayScore: number
}

interface EventOption {
  id: string
  name: string
  level: string | null
  skill_level: string | null
  event_type: string | null
}

function extractTeamAndScore(raw: string): { team: string; externalId: string | null; score: number } {
  const scoreMatch = raw.match(/\((\d+)\)\s*$/)
  const score = scoreMatch ? parseInt(scoreMatch[1]) : -1
  const team = raw.replace(/\s*\(\d+\)\s*$/, "").trim()
  const idMatch = team.match(/#(\S+)/)
  const externalId = idMatch ? `#${idMatch[1]}` : null
  return { team, externalId, score }
}

function parseDate(dateStr: string): string | null {
  // "Wed, Oct. 01, 2025 7:45 PM" → ISO datetime
  const cleaned = dateStr.replace(/\./g, "").trim()
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

function parseGamesData(raw: string): ParsedGame[] {
  // Join multi-line entries: lines that don't start with a number are continuations
  const joined = raw.replace(/\n(?!\d)/g, " ")
  const lines = joined.trim().split("\n").filter(Boolean)
  const games: ParsedGame[] = []

  for (const line of lines) {
    const parts = line.split("\t").map((s) => s.trim())
    if (parts.length < 5) continue

    // Skip noise lines
    const gameNumber = parts[0]
    if (!/^\d+$/.test(gameNumber)) continue

    const dateStr = parts[1]
    // Location might contain noise like "Game length: ..."
    let venue = parts[2]
    venue = venue.replace(/Game length:.*$/i, "").trim()

    const homeRaw = parts[3]
    const awayRaw = parts[4]

    if (!homeRaw || !awayRaw) continue

    const home = extractTeamAndScore(homeRaw)
    const away = extractTeamAndScore(awayRaw)
    const isoDate = parseDate(dateStr)
    if (!isoDate) continue

    games.push({
      gameNumber,
      date: isoDate,
      venue,
      homeTeamRaw: home.team,
      homeExternalId: home.externalId,
      homeScore: home.score,
      awayTeamRaw: away.team,
      awayExternalId: away.externalId,
      awayScore: away.score,
    })
  }

  return games
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function shortTeam(raw: string): string {
  return raw.replace(/#\S+\s*/g, "").replace(/\s+NYH\S+/g, "").trim()
}

export function GamesImport() {
  const [rawText, setRawText] = useState("")
  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEvent, setSelectedEvent] = useState("")
  const [loading, setLoading] = useState(false)
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    skipped?: string[]
    errors?: string[]
    mismatches?: string[]
  } | null>(null)

  const parsed = useMemo(() => parseGamesData(rawText), [rawText])

  async function loadEvents() {
    if (eventsLoaded) return
    const supabase = createClient()
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, level, skill_level, event_type")
      .order("name")
    setEvents(data ?? [])
    setEventsLoaded(true)
  }

  async function handleImport() {
    if (!selectedEvent || parsed.length === 0) return
    setLoading(true)
    setResult(null)

    const event = events.find((e) => e.id === selectedEvent)
    const stage = event?.event_type === "regular_season" ? "regular_season" : "pool_play"

    try {
      const res = await fetch("/api/import-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: selectedEvent,
          rows: parsed,
          level: event?.level ?? "",
          skillLevel: event?.skill_level ?? "",
          stage,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error })
      } else {
        const parts = [`${data.imported} imported`]
        if (data.skipped?.length > 0) parts.push(`${data.skipped.length} skipped`)
        if (data.errors?.length > 0) parts.push(`${data.errors.length} errors`)
        setResult({
          success: data.errors?.length === 0,
          message: parts.join(", "),
          skipped: data.skipped,
          errors: data.errors,
          mismatches: data.mismatches,
        })
        if (data.imported > 0) setRawText("")
      }
    } catch {
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
          <option value="">Select event...</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      <div className="import-step">
        <label className="import-step__label">2. Paste Games</label>
        <p className="standings-import__hint">
          Copy games from the league site and paste below.
        </p>
        <textarea
          className="standings-import__textarea"
          rows={8}
          placeholder="Paste tab-separated game data here..."
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
            3. Preview ({parsed.length} games)
          </label>
          <div className="import-preview__table-wrap">
            <table className="import-preview__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Home</th>
                  <th></th>
                  <th>Away</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((g, i) => (
                  <tr key={i}>
                    <td>{g.gameNumber}</td>
                    <td>{formatShortDate(g.date)}</td>
                    <td className="standings-import__team-cell">
                      {shortTeam(g.homeTeamRaw)}
                    </td>
                    <td>
                      {g.homeScore >= 0 ? `${g.homeScore}-${g.awayScore}` : "—"}
                    </td>
                    <td className="standings-import__team-cell">
                      {shortTeam(g.awayTeamRaw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="import-step">
          <p className={result.success ? "import-success" : "import-error"}>
            {result.message}
          </p>
          {result.skipped && result.skipped.length > 0 && (
            <details className="import-details">
              <summary className="import-details__summary">
                {result.skipped.length} skipped (duplicates)
              </summary>
              <ul className="import-details__list">
                {result.skipped.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </details>
          )}
          {result.errors && result.errors.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary import-error">
                {result.errors.length} errors
              </summary>
              <ul className="import-details__list">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
          {result.mismatches && result.mismatches.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary import-warning">
                {result.mismatches.length} standings mismatches
              </summary>
              <ul className="import-details__list">
                {result.mismatches.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </details>
          )}
          {result.mismatches && result.mismatches.length === 0 && result.success && (
            <p className="import-success">All teams match standings snapshot</p>
          )}
        </div>
      )}

      <Button
        onClick={handleImport}
        disabled={!selectedEvent || parsed.length === 0 || loading}
      >
        {loading ? "Importing..." : `Import ${parsed.length} Games`}
      </Button>
    </div>
  )
}

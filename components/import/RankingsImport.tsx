"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface MhrGame {
  date: string
  time: string
  opponent: string
  opponentClean: string
  opponentExternalId: string | null
  venue: string
  venueClean: string
  result: "W" | "L" | "T"
  nepeanScore: number
  opponentScore: number
  resultType: "regulation" | "overtime" | "shootout"
  gameType: string
  symbol: string
}

interface TeamOption {
  id: string
  name: string
}

interface EventOption {
  id: string
  name: string
  event_type: string | null
}

interface AnalysisResult {
  summary: {
    total: number
    league: number
    tournament: number
    playoff: number
    provincial: number
    district: number
    national: number
    exhibition: number
  }
  leagueResults: {
    game: MhrGame
    status: string
    detail: string
  }[]
  tournamentClusters: {
    name: string
    eventType: string
    gameCount: number
    startDate: string
    endDate: string
    location: string | null
    games: string[]
  }[]
  provincialClusters: {
    name: string
    gameCount: number
    games: string[]
  }[]
  playoffClusters: {
    name: string
    gameCount: number
    games: string[]
  }[]
  exhibitionGames: {
    date: string
    opponent: string
    score: string
    venue: string
  }[]
  importResults: {
    imported: number
    errors: string[]
    createdEvents: string[]
  } | null
}

const SYMBOL_PATTERNS = ["‡", "^^", "^", "††", "†", "**", "*"]

function parseSymbol(name: string): { clean: string; symbol: string } {
  for (const sym of SYMBOL_PATTERNS) {
    if (name.endsWith(sym)) {
      return { clean: name.slice(0, -sym.length).trim(), symbol: sym }
    }
  }
  return { clean: name.trim(), symbol: "" }
}

function extractExternalId(name: string): { clean: string; externalId: string | null } {
  const match = name.match(/\(#(\d+)\)\s*/)
  if (match) {
    return { clean: name.replace(match[0], "").trim(), externalId: `#${match[1]}` }
  }
  return { clean: name, externalId: null }
}

function classifySymbol(symbol: string): string {
  switch (symbol) {
    case "‡": return "National"
    case "^^": return "District"
    case "^": return "Provincial"
    case "††":
    case "†": return "Playoff"
    case "**": return "Tournament"
    case "*": return "League"
    default: return "Exhibition"
  }
}

function cleanVenue(raw: string): string {
  return raw
    .replace(/^Watch at\s+/i, "")
    .replace(/^at\s+/i, "")
    .trim()
}

function mapSeasonYear(month: number): number {
  // Sep(8)-Dec(11) = 2025, Jan(0)-Aug(7) = 2026
  return month >= 8 ? 2025 : 2026
}

function parseMhrData(raw: string): MhrGame[] {
  // Each line starts with comma from CSV format. Strip leading comma.
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^,\s*/, "").trim())

  const games: MhrGame[] = []
  let i = 0

  while (i < lines.length) {
    // Look for a date pattern: "Sep 3", "Oct 17", "Jan 30", etc.
    const dateMatch = lines[i]?.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/
    )
    if (!dateMatch) {
      i++
      continue
    }

    const dateStr = lines[i]
    i++

    // Time line
    const timeLine = lines[i] ?? ""
    const timeMatch = timeLine.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)
    const time = timeMatch ? timeLine : ""
    if (timeMatch) i++

    // Skip empty line(s)
    while (i < lines.length && lines[i] === "") i++

    // Opponent line
    const opponentRaw = lines[i] ?? ""
    i++

    // Venue line
    const venueRaw = lines[i] ?? ""
    i++

    // Result line (W, L, T)
    const resultLine = lines[i] ?? ""
    const result = resultLine.match(/^[WLT]$/)?.[0] as "W" | "L" | "T" | undefined
    if (result) i++

    // Score line: "2 - 2"
    const scoreLine = lines[i] ?? ""
    const scoreMatch = scoreLine.match(/^(\d+)\s*-\s*(\d+)$/)
    if (scoreMatch) i++

    // Optional OT/SO line
    let resultType: "regulation" | "overtime" | "shootout" = "regulation"
    if (i < lines.length) {
      const otLine = lines[i].toLowerCase()
      if (otLine.includes("ot") || otLine.includes("so")) {
        if (otLine.includes("so")) resultType = "shootout"
        else resultType = "overtime"
        i++
      }
    }

    if (!result || !scoreMatch) continue

    // Parse scores — first number is Nepean's, second is opponent's
    // based on W/L/T result indicator
    const score1 = parseInt(scoreMatch[1])
    const score2 = parseInt(scoreMatch[2])
    let nepeanScore: number
    let opponentScore: number

    if (result === "W") {
      nepeanScore = Math.max(score1, score2)
      opponentScore = Math.min(score1, score2)
    } else if (result === "L") {
      nepeanScore = Math.min(score1, score2)
      opponentScore = Math.max(score1, score2)
    } else {
      // Tie — scores are equal
      nepeanScore = score1
      opponentScore = score2
    }

    // Parse opponent: strip symbols, extract external ID
    const { clean: afterSymbol, symbol } = parseSymbol(opponentRaw)
    const { clean: opponentClean, externalId } = extractExternalId(afterSymbol)
    const gameType = classifySymbol(symbol)

    // Build ISO date
    const monthDay = dateStr.split(" ")
    const monthNames: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const month = monthNames[monthDay[0]]
    const day = parseInt(monthDay[1])
    const year = mapSeasonYear(month)
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    // Parse time to 24h
    let time24 = ""
    if (time) {
      const tMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
      if (tMatch) {
        let hours = parseInt(tMatch[1])
        const mins = tMatch[2]
        const ampm = tMatch[3].toUpperCase()
        if (ampm === "PM" && hours !== 12) hours += 12
        if (ampm === "AM" && hours === 12) hours = 0
        time24 = `${String(hours).padStart(2, "0")}:${mins}`
      }
    }

    games.push({
      date: isoDate,
      time: time24,
      opponent: opponentRaw,
      opponentClean,
      opponentExternalId: externalId,
      venue: venueRaw,
      venueClean: cleanVenue(venueRaw),
      result,
      nepeanScore,
      opponentScore,
      resultType,
      gameType,
      symbol,
    })
  }

  return games
}

function symbolBadge(symbol: string): string {
  switch (symbol) {
    case "*": return "LG"
    case "**": return "TN"
    case "†":
    case "††": return "PO"
    case "^": return "PR"
    case "^^": return "DT"
    case "‡": return "NC"
    default: return "EX"
  }
}

export function RankingsImport() {
  const [rawText, setRawText] = useState("")
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState("")
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [selectedRegSeason, setSelectedRegSeason] = useState("")
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [importing, setImporting] = useState(false)

  const parsed = useMemo(() => parseMhrData(rawText), [rawText])

  async function loadTeams() {
    if (teamsLoaded) return
    const supabase = createClient()
    const { data } = await supabase
      .from("teams")
      .select("id, name")
      .order("name")
    setTeams(data ?? [])
    setTeamsLoaded(true)
  }

  async function loadEvents() {
    if (eventsLoaded) return
    const supabase = createClient()
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, event_type")
      .order("name")
    setEvents(data ?? [])
    setEventsLoaded(true)
  }

  async function handleAnalyze() {
    if (!selectedTeam || parsed.length === 0) return
    setLoading(true)
    setAnalysis(null)

    const team = teams.find((t) => t.id === selectedTeam)

    try {
      const res = await fetch("/api/import-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: parsed,
          teamName: team?.name ?? "",
          teamId: selectedTeam,
          regularSeasonEventId: selectedRegSeason || null,
          doImport: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalysis(null)
        alert(data.error)
      } else {
        setAnalysis(data)
      }
    } catch {
      alert("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!selectedTeam || parsed.length === 0) return
    if (!confirm("Import all new games? This will create events and games.")) return
    setImporting(true)

    const team = teams.find((t) => t.id === selectedTeam)

    try {
      const res = await fetch("/api/import-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: parsed,
          teamName: team?.name ?? "",
          teamId: selectedTeam,
          regularSeasonEventId: selectedRegSeason || null,
          doImport: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error)
      } else {
        setAnalysis(data)
      }
    } catch {
      alert("Network error")
    } finally {
      setImporting(false)
    }
  }

  const regSeasonEvents = events.filter((e) => e.event_type === "regular_season")

  return (
    <div className="import-content">
      <div className="import-step">
        <label className="import-step__label">1. Select Your Team</label>
        <select
          className="team-picker__select"
          value={selectedTeam}
          onFocus={loadTeams}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="">Select team...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="import-step">
        <label className="import-step__label">2. Regular Season Event (for cross-reference)</label>
        <select
          className="team-picker__select"
          value={selectedRegSeason}
          onFocus={loadEvents}
          onChange={(e) => setSelectedRegSeason(e.target.value)}
        >
          <option value="">None (skip cross-check)</option>
          {regSeasonEvents.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      <div className="import-step">
        <label className="import-step__label">3. Paste MHR Schedule</label>
        <p className="standings-import__hint">
          Copy the schedule table from myhockeyrankings.com and paste below.
        </p>
        <textarea
          className="standings-import__textarea"
          rows={8}
          placeholder="Paste schedule data here..."
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value)
            setAnalysis(null)
          }}
        />
      </div>

      {parsed.length > 0 && (
        <div className="import-step">
          <label className="import-step__label">
            Preview ({parsed.length} games)
          </label>
          <div className="import-preview__table-wrap">
            <table className="import-preview__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th></th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((g, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`rankings-badge rankings-badge--${symbolBadge(g.symbol).toLowerCase()}`}>
                        {symbolBadge(g.symbol)}
                      </span>
                    </td>
                    <td>{new Date(g.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</td>
                    <td className="standings-import__team-cell">{g.opponentClean}</td>
                    <td className={`rankings-result rankings-result--${g.result.toLowerCase()}`}>
                      {g.result}
                    </td>
                    <td>{g.nepeanScore}-{g.opponentScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rankings-import__actions">
        <Button
          onClick={handleAnalyze}
          disabled={!selectedTeam || parsed.length === 0 || loading}
          variant="outline"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
        <Button
          onClick={handleImport}
          disabled={!selectedTeam || parsed.length === 0 || importing || !analysis}
        >
          {importing ? "Importing..." : "Import New Games"}
        </Button>
      </div>

      {analysis && (
        <div className="import-step rankings-analysis">
          <label className="import-step__label">Analysis</label>

          <div className="rankings-summary">
            <span>{analysis.summary.total} total</span>
            {analysis.summary.league > 0 && <span className="rankings-badge rankings-badge--lg">{analysis.summary.league} League</span>}
            {analysis.summary.tournament > 0 && <span className="rankings-badge rankings-badge--tn">{analysis.summary.tournament} Tournament</span>}
            {analysis.summary.playoff > 0 && <span className="rankings-badge rankings-badge--po">{analysis.summary.playoff} Playoff</span>}
            {analysis.summary.provincial > 0 && <span className="rankings-badge rankings-badge--pr">{analysis.summary.provincial} Provincial</span>}
            {analysis.summary.exhibition > 0 && <span className="rankings-badge rankings-badge--ex">{analysis.summary.exhibition} Exhibition</span>}
          </div>

          {analysis.leagueResults.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary">
                League Games ({analysis.leagueResults.length})
              </summary>
              <ul className="import-details__list">
                {analysis.leagueResults.map((lr, i) => (
                  <li key={i} className={`rankings-match--${lr.status}`}>
                    {lr.detail}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {analysis.tournamentClusters.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary">
                Tournaments ({analysis.tournamentClusters.length} events)
              </summary>
              {analysis.tournamentClusters.map((c, i) => (
                <div key={i} className="rankings-cluster">
                  <p className="rankings-cluster__name">{c.name} ({c.gameCount} games)</p>
                  <ul className="import-details__list">
                    {c.games.map((g, j) => (
                      <li key={j}>{g}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          )}

          {analysis.provincialClusters.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary">
                Provincials ({analysis.provincialClusters.length} events)
              </summary>
              {analysis.provincialClusters.map((c, i) => (
                <div key={i} className="rankings-cluster">
                  <p className="rankings-cluster__name">{c.name} ({c.gameCount} games)</p>
                  <ul className="import-details__list">
                    {c.games.map((g, j) => (
                      <li key={j}>{g}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          )}

          {analysis.playoffClusters.length > 0 && (
            <details className="import-details" open>
              <summary className="import-details__summary">
                Playoffs ({analysis.playoffClusters.length} events)
              </summary>
              {analysis.playoffClusters.map((c, i) => (
                <div key={i} className="rankings-cluster">
                  <p className="rankings-cluster__name">{c.name} ({c.gameCount} games)</p>
                  <ul className="import-details__list">
                    {c.games.map((g, j) => (
                      <li key={j}>{g}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </details>
          )}

          {analysis.exhibitionGames.length > 0 && (
            <details className="import-details">
              <summary className="import-details__summary">
                Exhibition ({analysis.exhibitionGames.length} games)
              </summary>
              <ul className="import-details__list">
                {analysis.exhibitionGames.map((g, i) => (
                  <li key={i}>
                    {new Date(g.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} vs {g.opponent} ({g.score}) — {g.venue}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {analysis.importResults && (
            <div className="rankings-import-results">
              <p className={analysis.importResults.errors.length === 0 ? "import-success" : "import-error"}>
                {analysis.importResults.imported} games imported
                {analysis.importResults.errors.length > 0 && `, ${analysis.importResults.errors.length} errors`}
              </p>
              {analysis.importResults.createdEvents.length > 0 && (
                <details className="import-details" open>
                  <summary className="import-details__summary">
                    Created {analysis.importResults.createdEvents.length} events
                  </summary>
                  <ul className="import-details__list">
                    {analysis.importResults.createdEvents.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
              {analysis.importResults.errors.length > 0 && (
                <details className="import-details" open>
                  <summary className="import-details__summary import-error">
                    {analysis.importResults.errors.length} errors
                  </summary>
                  <ul className="import-details__list">
                    {analysis.importResults.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

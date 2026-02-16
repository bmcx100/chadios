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
import type { Game } from "@/lib/types"

interface GameEditSheetProps {
  game: Game | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

function toDateValue(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

function toTimeValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  })
}

export function GameEditSheet({ game, open, onOpenChange, onSaved }: GameEditSheetProps) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [venue, setVenue] = useState("")
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [resultType, setResultType] = useState("regulation")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (game) {
      setDate(toDateValue(game.start_datetime))
      setTime(toTimeValue(game.start_datetime))
      setVenue(game.venue ?? "")
      setHomeScore(game.final_score_home != null ? String(game.final_score_home) : "")
      setAwayScore(game.final_score_away != null ? String(game.final_score_away) : "")
      setResultType(game.result_type ?? "regulation")
      setError("")
    }
  }, [game])

  const homeName = game?.home_team?.name ?? game?.home_placeholder ?? "Home"
  const awayName = game?.away_team?.name ?? game?.away_placeholder ?? "Away"

  async function handleSave() {
    if (!game) return
    setSaving(true)
    setError("")

    const startDatetime = time
      ? `${date}T${time}:00`
      : `${date}T00:00:00`

    try {
      const res = await fetch("/api/edit-game", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: game.id,
          startDatetime,
          venue,
          finalScoreHome: homeScore === "" ? null : homeScore,
          finalScoreAway: awayScore === "" ? null : awayScore,
          resultType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        onOpenChange(false)
        onSaved?.()
      }
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!game || !confirm("Delete this game?")) return
    setDeleting(true)
    setError("")

    try {
      const res = await fetch("/api/edit-game", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: game.id }),
      })

      if (res.ok) {
        onOpenChange(false)
        onSaved?.()
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

  if (!game) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="admin-sheet">
        <SheetHeader>
          <SheetTitle>Edit Game</SheetTitle>
        </SheetHeader>
        <div className="admin-sheet__body">
          <div className="admin-sheet__matchup">
            <span>{homeName}</span>
            <span className="admin-sheet__vs">vs</span>
            <span>{awayName}</span>
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
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>

          <div className="admin-sheet__row">
            <div className="admin-sheet__field">
              <label className="admin-sheet__label">{homeName} Score</label>
              <Input
                type="number"
                className="admin-sheet__input"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="admin-sheet__field">
              <label className="admin-sheet__label">{awayName} Score</label>
              <Input
                type="number"
                className="admin-sheet__input"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="admin-sheet__field-full">
            <label className="admin-sheet__label">Result Type</label>
            <select
              className="team-picker__select"
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
            >
              <option value="regulation">Regulation</option>
              <option value="overtime">Overtime</option>
              <option value="shootout">Shootout</option>
            </select>
          </div>

          {error && <p className="import-error">{error}</p>}

          <Button onClick={handleSave} disabled={saving} className="admin-sheet__save">
            {saving ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="admin-sheet__delete"
          >
            {deleting ? "Deleting..." : "Delete Game"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

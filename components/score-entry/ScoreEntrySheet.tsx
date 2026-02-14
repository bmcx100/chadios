"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Game, RankingsMap } from "@/lib/types"

interface ScoreEntrySheetProps {
  game: Game | null
  rankings?: RankingsMap
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface InitialValues {
  homeScore: string
  awayScore: string
  homePeriods: string[]
  awayPeriods: string[]
  homePims: string
  awayPims: string
  homeFirstGoalMin: string
  homeFirstGoalSec: string
  awayFirstGoalMin: string
  awayFirstGoalSec: string
  resultType: string
  otWinner: "home" | "away" | ""
}

export function ScoreEntrySheet({
  game,
  rankings,
  open,
  onOpenChange,
  onSaved,
}: ScoreEntrySheetProps) {
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [homePeriods, setHomePeriods] = useState(["", "", ""])
  const [awayPeriods, setAwayPeriods] = useState(["", "", ""])
  const [homePims, setHomePims] = useState("")
  const [awayPims, setAwayPims] = useState("")
  const [homeFirstGoalMin, setHomeFirstGoalMin] = useState("")
  const [homeFirstGoalSec, setHomeFirstGoalSec] = useState("")
  const [awayFirstGoalMin, setAwayFirstGoalMin] = useState("")
  const [awayFirstGoalSec, setAwayFirstGoalSec] = useState("")
  const [resultType, setResultType] = useState("regulation")
  const [otWinner, setOtWinner] = useState<"home" | "away" | "">("")
  const [saving, setSaving] = useState(false)
  const [periodWarning, setPeriodWarning] = useState("")

  const initialRef = useRef<InitialValues | null>(null)

  useEffect(() => {
    if (game) {
      const hs = game.final_score_home?.toString() ?? ""
      const as_ = game.final_score_away?.toString() ?? ""
      const hp = game.goals_by_period_home?.map(String) ?? ["", "", ""]
      const ap = game.goals_by_period_away?.map(String) ?? ["", "", ""]
      const hPims = game.penalty_minutes_home?.toString() ?? ""
      const aPims = game.penalty_minutes_away?.toString() ?? ""
      const rt = game.result_type ?? "regulation"

      let ow: "home" | "away" | "" = ""
      if (game.overtime_winner_team_id === game.home_team_id) ow = "home"
      else if (game.overtime_winner_team_id === game.away_team_id) ow = "away"
      else if (game.shootout_winner_team_id === game.home_team_id) ow = "home"
      else if (game.shootout_winner_team_id === game.away_team_id) ow = "away"

      let hfgMin = ""
      let hfgSec = ""
      if (game.fastest_goal_seconds_home != null) {
        hfgMin = Math.floor(game.fastest_goal_seconds_home / 60).toString()
        hfgSec = (game.fastest_goal_seconds_home % 60).toString().padStart(2, "0")
      }
      let afgMin = ""
      let afgSec = ""
      if (game.fastest_goal_seconds_away != null) {
        afgMin = Math.floor(game.fastest_goal_seconds_away / 60).toString()
        afgSec = (game.fastest_goal_seconds_away % 60).toString().padStart(2, "0")
      }

      setHomeScore(hs)
      setAwayScore(as_)
      setHomePeriods(hp)
      setAwayPeriods(ap)
      setHomePims(hPims)
      setAwayPims(aPims)
      setResultType(rt)
      setOtWinner(ow)
      setHomeFirstGoalMin(hfgMin)
      setHomeFirstGoalSec(hfgSec)
      setAwayFirstGoalMin(afgMin)
      setAwayFirstGoalSec(afgSec)
      setShowDetails(false)

      initialRef.current = {
        homeScore: hs,
        awayScore: as_,
        homePeriods: [...hp],
        awayPeriods: [...ap],
        homePims: hPims,
        awayPims: aPims,
        homeFirstGoalMin: hfgMin,
        homeFirstGoalSec: hfgSec,
        awayFirstGoalMin: afgMin,
        awayFirstGoalSec: afgSec,
        resultType: rt,
        otWinner: ow,
      }
    }
  }, [game])

  const isDirty = useMemo(() => {
    const init = initialRef.current
    if (!init) return false
    return (
      homeScore !== init.homeScore ||
      awayScore !== init.awayScore ||
      homePims !== init.homePims ||
      awayPims !== init.awayPims ||
      homeFirstGoalMin !== init.homeFirstGoalMin ||
      homeFirstGoalSec !== init.homeFirstGoalSec ||
      awayFirstGoalMin !== init.awayFirstGoalMin ||
      awayFirstGoalSec !== init.awayFirstGoalSec ||
      resultType !== init.resultType ||
      otWinner !== init.otWinner ||
      homePeriods.some((v, i) => v !== init.homePeriods[i]) ||
      awayPeriods.some((v, i) => v !== init.awayPeriods[i])
    )
  }, [
    homeScore, awayScore, homePims, awayPims,
    homeFirstGoalMin, homeFirstGoalSec, awayFirstGoalMin, awayFirstGoalSec,
    resultType, otWinner, homePeriods, awayPeriods,
  ])

  useEffect(() => {
    if (!showDetails || !homeScore || !awayScore) {
      setPeriodWarning("")
      return
    }
    const hSum = homePeriods.reduce((s, v) => s + (parseInt(v) || 0), 0)
    const aSum = awayPeriods.reduce((s, v) => s + (parseInt(v) || 0), 0)
    const hasPeriodData = homePeriods.some((v) => v !== "") || awayPeriods.some((v) => v !== "")
    if (
      hasPeriodData &&
      (hSum !== parseInt(homeScore) || aSum !== parseInt(awayScore))
    ) {
      setPeriodWarning("Period scores don't match the final score")
    } else {
      setPeriodWarning("")
    }
  }, [homeScore, awayScore, homePeriods, awayPeriods, showDetails])

  if (!game) return null

  const homeFull = game.home_team?.name ?? game.home_placeholder ?? "Home"
  const awayFull = game.away_team?.name ?? game.away_placeholder ?? "Away"
  const homeLoc = game.home_team?.short_location ?? null
  const homeShort = game.home_team?.short_name ?? homeFull
  const awayLoc = game.away_team?.short_location ?? null
  const awayShort = game.away_team?.short_name ?? awayFull
  const homeRank = game.home_team_id ? rankings?.[game.home_team_id] : undefined
  const awayRank = game.away_team_id ? rankings?.[game.away_team_id] : undefined

  function toSeconds(min: string, sec: string): number | null {
    const m = parseInt(min)
    const s = parseInt(sec)
    if (isNaN(m) && isNaN(s)) return null
    return (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s)
  }

  async function handleSaveScore() {
    if (!homeScore || !awayScore) return
    setSaving(true)
    const supabase = createClient()

    const hasPeriodData =
      homePeriods.some((v) => v !== "") || awayPeriods.some((v) => v !== "")

    const update: Record<string, unknown> = {
      final_score_home: parseInt(homeScore),
      final_score_away: parseInt(awayScore),
      status: "completed",
      result_type: resultType,
      entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (hasPeriodData) {
      update.goals_by_period_home = homePeriods.map((v) => parseInt(v) || 0)
      update.goals_by_period_away = awayPeriods.map((v) => parseInt(v) || 0)
    }

    if (homePims) update.penalty_minutes_home = parseInt(homePims)
    if (awayPims) update.penalty_minutes_away = parseInt(awayPims)

    const hGoal = toSeconds(homeFirstGoalMin, homeFirstGoalSec)
    const aGoal = toSeconds(awayFirstGoalMin, awayFirstGoalSec)
    if (hGoal !== null) update.fastest_goal_seconds_home = hGoal
    if (aGoal !== null) update.fastest_goal_seconds_away = aGoal

    if (resultType === "overtime" && otWinner) {
      update.overtime_winner_team_id =
        otWinner === "home" ? game!.home_team_id : game!.away_team_id
      update.end_reason = "OT"
    } else if (resultType === "shootout" && otWinner) {
      update.shootout_winner_team_id =
        otWinner === "home" ? game!.home_team_id : game!.away_team_id
      update.end_reason = "shootout"
    } else {
      update.end_reason = "regulation"
    }

    await supabase.from("games").update(update).eq("id", game!.id)

    setSaving(false)
    onSaved?.()
    onOpenChange(false)
  }

  function updatePeriod(
    side: "home" | "away",
    index: number,
    value: string
  ) {
    if (side === "home") {
      const next = [...homePeriods]
      next[index] = value
      setHomePeriods(next)
    } else {
      const next = [...awayPeriods]
      next[index] = value
      setAwayPeriods(next)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="score-entry__sheet">
        <SheetHeader>
          <SheetTitle>
            {game.status === "completed" ? "Edit Score" : "Enter Score"}
          </SheetTitle>
        </SheetHeader>

        <div className="score-entry">
          {/* Collapsible Details Toggle */}
          <button
            type="button"
            className="score-entry__details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide details" : "More details ···"}
          </button>

          {/* Collapsible Details */}
          {showDetails && (
            <div className="score-entry__details">
              {/* Period Scores */}
              <div className="score-entry__section">
                <span className="score-entry__section-title">Period Scores</span>
                <div className="score-entry__periods-grid">
                  {["P1", "P2", "P3"].map((label, i) => (
                    <div key={label} className="score-entry__period-row">
                      <span className="score-entry__period-label">{label}</span>
                      <Input
                        type="number"
                        min="0"
                        value={homePeriods[i]}
                        onChange={(e) => updatePeriod("home", i, e.target.value)}
                        className="score-entry__period-input"
                        placeholder="0"
                      />
                      <span className="score-entry__divider">-</span>
                      <Input
                        type="number"
                        min="0"
                        value={awayPeriods[i]}
                        onChange={(e) => updatePeriod("away", i, e.target.value)}
                        className="score-entry__period-input"
                        placeholder="0"
                      />
                    </div>
                  ))}
                  {periodWarning && (
                    <p className="score-entry__warning">{periodWarning}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Penalty Minutes */}
              <div className="score-entry__section">
                <span className="score-entry__section-title">
                  Penalty Minutes
                </span>
                <div className="score-entry__stat-row">
                  <span className="score-entry__stat-label" title={homeFull}>{homeShort}</span>
                  <Input
                    type="number"
                    min="0"
                    value={homePims}
                    onChange={(e) => setHomePims(e.target.value)}
                    className="score-entry__stat-input"
                    placeholder="0"
                  />
                </div>
                <div className="score-entry__stat-row">
                  <span className="score-entry__stat-label" title={awayFull}>{awayShort}</span>
                  <Input
                    type="number"
                    min="0"
                    value={awayPims}
                    onChange={(e) => setAwayPims(e.target.value)}
                    className="score-entry__stat-input"
                    placeholder="0"
                  />
                </div>
              </div>

              <Separator />

              {/* First Goal Time */}
              <div className="score-entry__section">
                <span className="score-entry__section-title">
                  First Goal Time
                </span>
                <div className="score-entry__stat-row">
                  <span className="score-entry__stat-label" title={homeFull}>{homeShort}</span>
                  <div className="score-entry__time-group">
                    <Input
                      type="number"
                      min="0"
                      value={homeFirstGoalMin}
                      onChange={(e) => setHomeFirstGoalMin(e.target.value)}
                      className="score-entry__time-input"
                      placeholder="mm"
                    />
                    <span className="score-entry__time-sep">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={homeFirstGoalSec}
                      onChange={(e) => setHomeFirstGoalSec(e.target.value)}
                      className="score-entry__time-input"
                      placeholder="ss"
                    />
                  </div>
                </div>
                <div className="score-entry__stat-row">
                  <span className="score-entry__stat-label" title={awayFull}>{awayShort}</span>
                  <div className="score-entry__time-group">
                    <Input
                      type="number"
                      min="0"
                      value={awayFirstGoalMin}
                      onChange={(e) => setAwayFirstGoalMin(e.target.value)}
                      className="score-entry__time-input"
                      placeholder="mm"
                    />
                    <span className="score-entry__time-sep">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={awayFirstGoalSec}
                      onChange={(e) => setAwayFirstGoalSec(e.target.value)}
                      className="score-entry__time-input"
                      placeholder="ss"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Score — always visible above save */}
          <div className="score-entry__teams">
            <div className="score-entry__team-col" title={homeFull}>
              {homeLoc && (
                <span className="score-entry__team-location">{homeLoc}</span>
              )}
              <span className="score-entry__team-name">
                {homeShort}
                {homeRank != null && (
                  <span className="score-entry__team-rank"> #{homeRank}</span>
                )}
              </span>
              <Input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="score-entry__score-input"
                placeholder="0"
              />
            </div>
            <span className="score-entry__divider">-</span>
            <div className="score-entry__team-col" title={awayFull}>
              {awayLoc && (
                <span className="score-entry__team-location">{awayLoc}</span>
              )}
              <span className="score-entry__team-name">
                {awayShort}
                {awayRank != null && (
                  <span className="score-entry__team-rank"> #{awayRank}</span>
                )}
              </span>
              <Input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="score-entry__score-input"
                placeholder="0"
              />
            </div>
          </div>

          {/* Sticky Save */}
          <div className="score-entry__actions">
            <Button
              className={cn(
                "score-entry__save-btn",
                isDirty && "score-entry__save-btn--dirty"
              )}
              onClick={handleSaveScore}
              disabled={saving || !homeScore || !awayScore}
            >
              {saving ? "Saving..." : "Save Score"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

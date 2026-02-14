"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ScheduleView } from "./ScheduleView"
import { ScoreEntrySheet } from "@/components/score-entry/ScoreEntrySheet"
import { TeamGamesSheet } from "./TeamGamesSheet"
import type { Game, Pool, RankingsMap } from "@/lib/types"

interface ScheduleWithScoreEntryProps {
  games: Game[]
  pools: Pool[]
  rankings?: RankingsMap
  tournamentName?: string
}

export function ScheduleWithScoreEntry({
  games,
  pools,
  rankings,
  tournamentName,
}: ScheduleWithScoreEntryProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamSheetOpen, setTeamSheetOpen] = useState(false)
  const router = useRouter()

  const handleGameTap = useCallback((game: Game) => {
    setSelectedGame(game)
    setSheetOpen(true)
  }, [])

  const handleTeamTap = useCallback((id: string) => {
    setTeamId(id)
    setTeamSheetOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      <ScheduleView
        games={games}
        pools={pools}
        rankings={rankings}
        tournamentName={tournamentName}
        onGameTap={handleGameTap}
        onTeamTap={handleTeamTap}
      />
      <ScoreEntrySheet
        game={selectedGame}
        rankings={rankings}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={handleSaved}
      />
      <TeamGamesSheet
        teamId={teamId}
        games={games}
        rankings={rankings}
        open={teamSheetOpen}
        onOpenChange={setTeamSheetOpen}
      />
    </>
  )
}

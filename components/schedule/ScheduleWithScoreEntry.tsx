"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ScheduleView } from "./ScheduleView"
import { ScoreEntrySheet } from "@/components/score-entry/ScoreEntrySheet"
import type { Game, Pool, RankingsMap } from "@/lib/types"

interface ScheduleWithScoreEntryProps {
  games: Game[]
  pools: Pool[]
  rankings?: RankingsMap
}

export function ScheduleWithScoreEntry({
  games,
  pools,
  rankings,
}: ScheduleWithScoreEntryProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const router = useRouter()

  const handleGameTap = useCallback((game: Game) => {
    setSelectedGame(game)
    setSheetOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      <ScheduleView games={games} pools={pools} rankings={rankings} onGameTap={handleGameTap} />
      <ScoreEntrySheet
        game={selectedGame}
        rankings={rankings}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={handleSaved}
      />
    </>
  )
}

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GameCard } from "./GameCard"
import type { Game, Pool, RankingsMap } from "@/lib/types"

interface ScheduleViewProps {
  games: Game[]
  pools: Pool[]
  rankings?: RankingsMap
  tournamentName?: string
  onGameTap?: (game: Game) => void
  onTeamTap?: (teamId: string) => void
}

type PoolFilter = "all" | string

const DAY_LABELS: Record<string, string> = {
  "2026-02-13": "Friday",
  "2026-02-14": "Saturday",
  "2026-02-15": "Sunday",
}

function getDateKey(datetime: string) {
  return new Date(datetime).toLocaleDateString("en-CA")
}

export function ScheduleView({
  games,
  pools,
  rankings,
  tournamentName,
  onGameTap,
  onTeamTap,
}: ScheduleViewProps) {
  const days = Object.keys(DAY_LABELS)
  const today = new Date().toLocaleDateString("en-CA")
  const [activeDay, setActiveDay] = useState(
    days.includes(today) ? today : days[0]
  )
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all")
  const [aboveCount, setAboveCount] = useState(0)
  const [belowCount, setBelowCount] = useState(0)

  const navRef = useRef<HTMLDivElement>(null)
  const gamesRef = useRef<HTMLDivElement>(null)
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const aboveRef = useRef(0)
  const belowRef = useRef(0)

  const filteredGames = games.filter((game) => {
    const matchesDay = getDateKey(game.start_datetime) === activeDay
    if (!matchesDay) return false
    if (poolFilter === "all") return true
    if (poolFilter === "elimination") return !game.pool_id
    return game.pool_id === poolFilter
  })

  const sortedGames = [...filteredGames].sort(
    (a, b) =>
      new Date(a.start_datetime).getTime() -
      new Date(b.start_datetime).getTime()
  )

  const firstUnplayedIndex = sortedGames.findIndex(
    (g) => g.status !== "completed"
  )

  // Auto-scroll to first unplayed game
  useEffect(() => {
    if (scrollTargetRef.current) {
      requestAnimationFrame(() => {
        scrollTargetRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    }
  }, [activeDay, poolFilter])

  // Track games above/below viewport
  const updateCounts = useCallback(() => {
    const container = gamesRef.current
    const nav = navRef.current
    if (!container || !nav) return

    const navBottom = nav.getBoundingClientRect().bottom
    const cards = container.querySelectorAll("[data-game-card]")

    let above = 0
    let below = 0
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect()
      if (rect.bottom < navBottom) above++
      else if (rect.top > window.innerHeight) below++
    })

    if (above !== aboveRef.current || below !== belowRef.current) {
      aboveRef.current = above
      belowRef.current = below
      setAboveCount(above)
      setBelowCount(below)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", updateCounts, { passive: true })
    const timer = setTimeout(updateCounts, 600)
    return () => {
      window.removeEventListener("scroll", updateCounts)
      clearTimeout(timer)
    }
  }, [updateCounts, sortedGames])

  return (
    <div>
      <div className="schedule-nav" ref={navRef}>
        <div className="schedule-nav__header">
          <div className="page-brand-row">
            <h1 className="page-brand">Chadiós</h1>
            <span className="page-tagline">Adiós a los Datos Básicos</span>
          </div>
          {tournamentName && (
            <p className="page-tournament">{tournamentName}</p>
          )}
        </div>

        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="w-full">
            {days.map((day) => (
              <TabsTrigger key={day} value={day} className="flex-1">
                {DAY_LABELS[day]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="pool-filter">
          <Button
            variant={poolFilter === "all" ? "default" : "outline"}
            size="sm"
            className="pool-filter__button"
            onClick={() => setPoolFilter("all")}
          >
            All
          </Button>
          {pools.map((pool) => (
            <Button
              key={pool.id}
              variant={poolFilter === pool.id ? "default" : "outline"}
              size="sm"
              className="pool-filter__button"
              onClick={() => setPoolFilter(pool.id)}
            >
              Pool {pool.name}
            </Button>
          ))}
          {activeDay === "2026-02-15" && (
            <Button
              variant={poolFilter === "elimination" ? "default" : "outline"}
              size="sm"
              className="pool-filter__button"
              onClick={() => setPoolFilter("elimination")}
            >
              Elimination
            </Button>
          )}
        </div>
      </div>

      {aboveCount > 0 && (
        <div className="scroll-indicator scroll-indicator--above">
          <span className="scroll-indicator__arrow">&#8593;</span>
          {aboveCount} completed
        </div>
      )}

      <div className="schedule-games" ref={gamesRef}>
        {sortedGames.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No games scheduled
          </p>
        ) : (
          sortedGames.map((game, i) => (
            <div
              key={game.id}
              data-game-card
              ref={i === firstUnplayedIndex ? scrollTargetRef : undefined}
            >
              <GameCard
                game={game}
                rankings={rankings}
                onTap={onGameTap}
                onTeamTap={onTeamTap}
              />
            </div>
          ))
        )}
      </div>

      {belowCount > 0 && (
        <div className="scroll-indicator scroll-indicator--below">
          {belowCount} more
          <span className="scroll-indicator__arrow">&#8595;</span>
        </div>
      )}
    </div>
  )
}

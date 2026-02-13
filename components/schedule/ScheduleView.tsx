"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GameCard } from "./GameCard"
import type { Game, Pool, RankingsMap } from "@/lib/types"

interface ScheduleViewProps {
  games: Game[]
  pools: Pool[]
  rankings?: RankingsMap
  onGameTap?: (game: Game) => void
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

export function ScheduleView({ games, pools, rankings, onGameTap }: ScheduleViewProps) {
  const days = Object.keys(DAY_LABELS)
  const [activeDay, setActiveDay] = useState(days[0])
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all")

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

  return (
    <div>
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

      <div className="schedule-games">
        {sortedGames.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No games scheduled
          </p>
        ) : (
          sortedGames.map((game) => (
            <GameCard key={game.id} game={game} rankings={rankings} onTap={onGameTap} />
          ))
        )}
      </div>
    </div>
  )
}

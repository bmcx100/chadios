"use client"

import { cn } from "@/lib/utils"
import type { UpcomingGame } from "@/lib/fetch-dashboard-data"

interface NextGamesProps {
  games: UpcomingGame[]
}

const typeLabels: Record<string, string> = {
  regular_season: "League",
  playoff: "Playoff",
  playdown: "Playdown",
}

function formatGameTime(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString("en-CA", { weekday: "short" })
  const time = d.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Toronto",
  })
  return `${day} ${time}`
}

export function NextGames({ games }: NextGamesProps) {
  if (games.length === 0) {
    return <p className="next-games__empty">No upcoming games</p>
  }

  return (
    <div className="next-games">
      {games.map((g) => {
        const prefix = g.is_home ? "vs" : "@"
        const oppName = g.opponent?.short_name ?? g.opponent?.name ?? g.opponent_placeholder ?? "TBD"

        return (
          <div key={g.id} className="next-game">
            <span className="next-game__datetime">
              {formatGameTime(g.start_datetime)}
            </span>
            <span className="next-game__opponent">
              {prefix} {oppName}
            </span>
            {g.venue && (
              <span className="next-game__venue">{g.venue}</span>
            )}
            <span
              className={cn(
                "next-game__badge",
                `next-game__badge--${g.event_type}`
              )}
            >
              {typeLabels[g.event_type] ?? g.event_type}
            </span>
          </div>
        )
      })}
    </div>
  )
}

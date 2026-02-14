"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { MY_TEAM_ID } from "@/lib/constants"
import type { Game, RankingsMap } from "@/lib/types"

interface TeamGamesSheetProps {
  teamId: string | null
  games: Game[]
  rankings?: RankingsMap
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function TeamGamesSheet({
  teamId,
  games,
  rankings,
  open,
  onOpenChange,
}: TeamGamesSheetProps) {
  if (!teamId) return null

  const teamGames = games
    .filter(
      (g) => g.home_team_id === teamId || g.away_team_id === teamId
    )
    .sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime()
    )

  const team = teamGames[0]?.home_team_id === teamId
    ? teamGames[0]?.home_team
    : teamGames[0]?.away_team

  const teamName = team?.name ?? "Team"
  const isMyTeam = teamId === MY_TEAM_ID

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="team-games-sheet">
        <SheetHeader>
          <SheetTitle className={cn(isMyTeam && "text-red-400")}>
            {teamName}
          </SheetTitle>
        </SheetHeader>

        <div className="team-games">
          {teamGames.map((game) => {
            const isHome = game.home_team_id === teamId
            const opponent = isHome ? game.away_team : game.home_team
            const opponentName = opponent?.short_name ?? opponent?.name ?? game[isHome ? "away_placeholder" : "home_placeholder"] ?? "TBD"
            const opponentLoc = opponent?.short_location
            const opponentRank = opponent?.id ? rankings?.[opponent.id] : undefined
            const isCompleted = game.status === "completed"

            const teamScore = isHome ? game.final_score_home : game.final_score_away
            const oppScore = isHome ? game.final_score_away : game.final_score_home

            const won = isCompleted && teamScore != null && oppScore != null && teamScore > oppScore
            const lost = isCompleted && teamScore != null && oppScore != null && teamScore < oppScore

            return (
              <div key={game.id} className="team-game-row">
                <div className="team-game-row__meta">
                  <span className="team-game-row__date">
                    {formatDate(game.start_datetime)}
                  </span>
                  <span className="team-game-row__time">
                    {formatTime(game.start_datetime)}
                  </span>
                </div>

                <span className="team-game-row__side">
                  {isHome ? "vs" : "@"}
                </span>

                <div className="team-game-row__opponent">
                  {opponentLoc && (
                    <span className="team-game-row__opp-location">{opponentLoc}</span>
                  )}
                  <span className="team-game-row__opp-name">
                    {opponentName}
                    {opponentRank != null && (
                      <span className="team-game-row__rank"> #{opponentRank}</span>
                    )}
                  </span>
                </div>

                <div className="team-game-row__result">
                  {isCompleted ? (
                    <>
                      <span className={cn(
                        "team-game-row__score",
                        won && "team-game-row__score--win",
                        lost && "team-game-row__score--loss"
                      )}>
                        {teamScore} - {oppScore}
                      </span>
                      <span className={cn(
                        "team-game-row__wl",
                        won && "team-game-row__wl--win",
                        lost && "team-game-row__wl--loss"
                      )}>
                        {won ? "W" : lost ? "L" : "T"}
                      </span>
                    </>
                  ) : (
                    <span className="team-game-row__upcoming">—</span>
                  )}
                </div>
              </div>
            )
          })}

          {teamGames.length === 0 && (
            <p className="team-games__empty">No games found</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

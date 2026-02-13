"use client"

import { cn } from "@/lib/utils"
import { MY_TEAM_ID } from "@/lib/constants"
import type { Game, RankingsMap } from "@/lib/types"

interface GameCardProps {
  game: Game
  rankings?: RankingsMap
  onTap?: (game: Game) => void
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function GameCard({ game, rankings, onTap }: GameCardProps) {
  const isMyTeam =
    game.home_team_id === MY_TEAM_ID || game.away_team_id === MY_TEAM_ID
  const isInProgress = game.status === "in_progress"
  const isCompleted = game.status === "completed"

  const homeName = game.home_team?.name ?? game.home_placeholder ?? "TBD"
  const awayName = game.away_team?.name ?? game.away_placeholder ?? "TBD"
  const homeRank = game.home_team_id ? rankings?.[game.home_team_id] : undefined
  const awayRank = game.away_team_id ? rankings?.[game.away_team_id] : undefined

  return (
    <button
      type="button"
      className={cn(
        "game-card",
        isMyTeam && "game-card--my-team",
        isInProgress && "game-card--in-progress",
        isCompleted && "game-card--completed"
      )}
      onClick={() => onTap?.(game)}
    >
      <div className="game-card__top-row">
        <span className="game-card__time">
          {formatTime(game.start_datetime)}
        </span>
        {game.game_number && (
          <span className="game-card__game-number">#{game.game_number}</span>
        )}
        <span className="game-card__venue">{game.venue}</span>
        {isInProgress && (
          <span className="game-card__status-badge">
            <span className="game-card__live-dot" />
            LIVE
          </span>
        )}
      </div>

      <div className="game-card__matchup">
        <span
          className={cn(
            "game-card__team game-card__team--home",
            game.home_team_id === MY_TEAM_ID && "game-card__team--highlight"
          )}
        >
          {homeName}
          {homeRank != null && (
            <span className="game-card__rank"> #{homeRank}</span>
          )}
        </span>

        {isCompleted ? (
          <span className="game-card__score">
            {game.final_score_home} - {game.final_score_away}
          </span>
        ) : (
          <span className="game-card__vs">vs</span>
        )}

        <span
          className={cn(
            "game-card__team game-card__team--away",
            game.away_team_id === MY_TEAM_ID && "game-card__team--highlight"
          )}
        >
          {awayName}
          {awayRank != null && (
            <span className="game-card__rank"> #{awayRank}</span>
          )}
        </span>
      </div>
    </button>
  )
}

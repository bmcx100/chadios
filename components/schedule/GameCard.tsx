"use client"

import { cn } from "@/lib/utils"
import { MY_TEAM_ID } from "@/lib/constants"
import type { Game, Team, RankingsMap } from "@/lib/types"

interface GameCardProps {
  game: Game
  rankings?: RankingsMap
  onTap?: (game: Game) => void
  onTeamTap?: (teamId: string) => void
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function TeamDisplay({
  team,
  placeholder,
  rank,
  isHome,
  onTeamTap,
}: {
  team: Team | null
  placeholder: string | null
  rank: number | undefined
  isHome?: boolean
  onTeamTap?: (teamId: string) => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (team && onTeamTap) {
      e.stopPropagation()
      onTeamTap(team.id)
    }
  }

  if (!team) {
    return <span className="game-card__team-name">{placeholder ?? "TBD"}</span>
  }

  const fullName = team.name
  const rankEl = rank != null ? <span className="game-card__rank">#{rank} </span> : null

  if (team.short_location && team.short_name) {
    return (
      <span
        className="game-card__team-wrap"
        title={fullName}
        onClick={handleClick}
      >
        <span className="game-card__team-location">{team.short_location}</span>
        <span className="game-card__team-name">
          {isHome && rankEl}
          {team.short_name}
          {!isHome && rank != null && <span className="game-card__rank"> #{rank}</span>}
        </span>
      </span>
    )
  }

  return (
    <span
      className="game-card__team-wrap"
      title={fullName}
      onClick={handleClick}
    >
      <span className="game-card__team-name">
        {isHome && rankEl}
        {team.name}
        {!isHome && rank != null && <span className="game-card__rank"> #{rank}</span>}
      </span>
    </span>
  )
}

export function GameCard({ game, rankings, onTap, onTeamTap }: GameCardProps) {
  const isMyTeam =
    game.home_team_id === MY_TEAM_ID || game.away_team_id === MY_TEAM_ID
  const isInProgress = game.status === "in_progress"
  const isCompleted = game.status === "completed"

  const homeRank = game.home_team_id ? rankings?.[game.home_team_id] : undefined
  const awayRank = game.away_team_id ? rankings?.[game.away_team_id] : undefined

  return (
    <div
      className={cn(
        "game-card",
        isMyTeam && "game-card--my-team",
        isInProgress && "game-card--in-progress",
        isCompleted && "game-card--completed"
      )}
    >
      <div className="game-card__info">
        <span className="game-card__time">
          {formatTime(game.start_datetime)}
        </span>
        <span className="game-card__venue" title={game.venue ?? undefined}>{game.venue}</span>
        {isInProgress && (
          <span className="game-card__status-badge">
            <span className="game-card__live-dot" />
            LIVE
          </span>
        )}
      </div>

      <div
        className={cn(
          "game-card__team game-card__team--home",
          game.home_team_id === MY_TEAM_ID && "game-card__team--highlight"
        )}
      >
        <TeamDisplay
          team={game.home_team}
          placeholder={game.home_placeholder}
          rank={homeRank}
          isHome
          onTeamTap={onTeamTap}
        />
      </div>

      {isCompleted ? (
        <button
          type="button"
          className="game-card__score"
          onClick={() => onTap?.(game)}
        >
          {game.final_score_home} - {game.final_score_away}
        </button>
      ) : (
        <button
          type="button"
          className="game-card__vs"
          onClick={() => onTap?.(game)}
        >
          vs
        </button>
      )}

      <div
        className={cn(
          "game-card__team",
          game.away_team_id === MY_TEAM_ID && "game-card__team--highlight"
        )}
      >
        <TeamDisplay
          team={game.away_team}
          placeholder={game.away_placeholder}
          rank={awayRank}
          onTeamTap={onTeamTap}
        />
      </div>
    </div>
  )
}

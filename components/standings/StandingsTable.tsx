"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MY_TEAM_ID } from "@/lib/constants"
import type { TeamStanding } from "@/lib/standings-engine"
import type { RankingsMap } from "@/lib/types"

interface StandingsTableProps {
  poolName: string
  standings: TeamStanding[]
  advancementCount: number
  rankings?: RankingsMap
  onTeamTap?: (teamId: string) => void
}

export function StandingsTable({
  poolName,
  standings,
  advancementCount,
  rankings,
  onTeamTap,
}: StandingsTableProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="standings-pool">
      <div className="standings-pool__header">
        <button
          type="button"
          className="standings-details-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide details" : "Details"}
        </button>
      </div>
      <div className="standings-table-wrap">
        <table
          className={cn(
            "standings-table",
            expanded && "standings-table--expanded"
          )}
        >
          <thead>
            <tr>
              <th>Prov</th>
              <th className="standings-cell--team">Team</th>
              <th>PTS</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th className="standings-detail-cell">GF</th>
              <th className="standings-detail-cell">GA</th>
              <th className="standings-detail-cell">GD</th>
              <th className="standings-detail-cell">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => {
              const isMyTeam = team.teamId === MY_TEAM_ID
              const isAdvancing = team.rank <= advancementCount

              return (
                <tr
                  key={team.teamId}
                  className={cn(
                    "standings-row",
                    isMyTeam && "standings-row--my-team",
                    isAdvancing && "standings-row--advancing"
                  )}
                >
                  <td>
                    {rankings?.[team.teamId] != null && (
                      <span className="standings-row__prov-rank">
                        #{rankings[team.teamId]}
                      </span>
                    )}
                  </td>
                  <td className="standings-cell--team">
                    <button
                      type="button"
                      className="standings-row__team-name standings-row__team-name--clickable"
                      onClick={() => onTeamTap?.(team.teamId)}
                    >
                      {team.teamName}
                    </button>
                  </td>
                  <td className="standings-cell--pts">{team.pts}</td>
                  <td>{team.gp}</td>
                  <td>{team.w}</td>
                  <td>{team.l}</td>
                  <td>{team.t}</td>
                  <td className="standings-detail-cell">{team.gf}</td>
                  <td className="standings-detail-cell">{team.ga}</td>
                  <td className="standings-detail-cell">
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </td>
                  <td className="standings-detail-cell">
                    {team.gfRatio.toFixed(3)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

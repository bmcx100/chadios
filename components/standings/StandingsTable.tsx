"use client"

import { cn } from "@/lib/utils"
import { MY_TEAM_ID } from "@/lib/constants"
import type { TeamStanding } from "@/lib/standings-engine"
import type { RankingsMap } from "@/lib/types"

interface StandingsTableProps {
  poolName: string
  standings: TeamStanding[]
  advancementCount: number
  rankings?: RankingsMap
}

export function StandingsTable({
  poolName,
  standings,
  advancementCount,
  rankings,
}: StandingsTableProps) {
  return (
    <div className="standings-pool">
      <h2 className="standings-pool__title">Pool {poolName}</h2>
      <div className="standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>PR</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PTS</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Ratio</th>
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
                    <div className="standings-row__team-cell">
                      <span className="standings-row__rank">{team.rank}</span>
                      <span className="standings-row__team-name">
                        {team.teamName}
                      </span>
                      {team.tiebreakerUsed && !team.coinTossNeeded && (
                        <span className="standings-row__tiebreaker">
                          TB: {team.tiebreakerUsed}
                        </span>
                      )}
                      {team.coinTossNeeded && (
                        <span className="standings-row__coin-toss">
                          Coin Toss
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {rankings?.[team.teamId] != null && (
                      <span className="standings-row__rank">#{rankings[team.teamId]}</span>
                    )}
                  </td>
                  <td>{team.gp}</td>
                  <td>{team.w}</td>
                  <td>{team.l}</td>
                  <td>{team.t}</td>
                  <td className="font-bold">{team.pts}</td>
                  <td>{team.gf}</td>
                  <td>{team.ga}</td>
                  <td>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                  <td>{team.gfRatio.toFixed(3)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

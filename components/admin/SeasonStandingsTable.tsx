"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { StandingsEditSheet } from "./StandingsEditSheet"

interface StandingsRow {
  id: string
  teamName: string
  gp: number
  w: number
  l: number
  t: number
  otl: number
  sol: number
  pts: number
  gf: number
  ga: number
  gd: number
  pim: number
  pct: number
}

interface SeasonStandingsTableProps {
  tournamentId: string
}

export function SeasonStandingsTable({ tournamentId }: SeasonStandingsTableProps) {
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState<StandingsRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fetchStandings = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("season_standings")
      .select("*, teams(name)")
      .eq("tournament_id", tournamentId)
      .order("pts", { ascending: false })

    setRows(
      (data ?? []).map((r) => ({
        id: r.id,
        teamName: (r.teams as unknown as { name: string })?.name ?? "Unknown",
        gp: r.gp,
        w: r.w,
        l: r.l,
        t: r.t,
        otl: r.otl,
        sol: r.sol,
        pts: r.pts,
        gf: r.gf,
        ga: r.ga,
        gd: r.gd,
        pim: r.pim,
        pct: r.pct,
      }))
    )
    setLoading(false)
  }, [tournamentId])

  useEffect(() => {
    fetchStandings()
  }, [fetchStandings])

  function handleRowTap(row: StandingsRow) {
    setEditRow(row)
    setSheetOpen(true)
  }

  if (loading) return <p className="team-picker__loading">Loading standings...</p>
  if (rows.length === 0) return <p className="team-picker__empty">No standings imported yet</p>

  return (
    <>
      <div className="standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>GP</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PTS</th>
              <th>GF</th>
              <th>GA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="standings-row"
                onClick={() => handleRowTap(r)}
                style={{ cursor: "pointer" }}
              >
                <td className="standings-cell--team">
                  <span className="standings-row__team-name">{r.teamName}</span>
                </td>
                <td>{r.gp}</td>
                <td>{r.w}</td>
                <td>{r.l}</td>
                <td>{r.t}</td>
                <td className="standings-cell--pts">{r.pts}</td>
                <td>{r.gf}</td>
                <td>{r.ga}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StandingsEditSheet
        row={editRow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={fetchStandings}
      />
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

interface StandingsEditSheetProps {
  row: StandingsRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function StandingsEditSheet({ row, open, onOpenChange, onSaved }: StandingsEditSheetProps) {
  const [gp, setGp] = useState("")
  const [w, setW] = useState("")
  const [l, setL] = useState("")
  const [t, setT] = useState("")
  const [otl, setOtl] = useState("")
  const [sol, setSol] = useState("")
  const [pts, setPts] = useState("")
  const [gf, setGf] = useState("")
  const [ga, setGa] = useState("")
  const [gd, setGd] = useState("")
  const [pim, setPim] = useState("")
  const [pct, setPct] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (row) {
      setGp(String(row.gp))
      setW(String(row.w))
      setL(String(row.l))
      setT(String(row.t))
      setOtl(String(row.otl))
      setSol(String(row.sol))
      setPts(String(row.pts))
      setGf(String(row.gf))
      setGa(String(row.ga))
      setGd(String(row.gd))
      setPim(String(row.pim))
      setPct(String(row.pct))
    }
  }, [row])

  async function handleSave() {
    if (!row) return
    setSaving(true)
    try {
      const res = await fetch("/api/edit-standings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          gp: parseInt(gp) || 0,
          w: parseInt(w) || 0,
          l: parseInt(l) || 0,
          t: parseInt(t) || 0,
          otl: parseInt(otl) || 0,
          sol: parseInt(sol) || 0,
          pts: parseInt(pts) || 0,
          gf: parseInt(gf) || 0,
          ga: parseInt(ga) || 0,
          gd: parseInt(gd) || 0,
          pim: parseInt(pim) || 0,
          pct: parseFloat(pct) || 0,
        }),
      })
      if (res.ok) {
        onOpenChange(false)
        onSaved?.()
      }
    } finally {
      setSaving(false)
    }
  }

  if (!row) return null

  const fields = [
    { label: "GP", value: gp, set: setGp },
    { label: "W", value: w, set: setW },
    { label: "L", value: l, set: setL },
    { label: "T", value: t, set: setT },
    { label: "OTL", value: otl, set: setOtl },
    { label: "SOL", value: sol, set: setSol },
    { label: "PTS", value: pts, set: setPts },
    { label: "GF", value: gf, set: setGf },
    { label: "GA", value: ga, set: setGa },
    { label: "DIFF", value: gd, set: setGd },
    { label: "PIM", value: pim, set: setPim },
    { label: "Win%", value: pct, set: setPct },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="admin-sheet">
        <SheetHeader>
          <SheetTitle>{row.teamName}</SheetTitle>
        </SheetHeader>
        <div className="admin-sheet__body">
          <div className="admin-sheet__grid">
            {fields.map((f) => (
              <div key={f.label} className="admin-sheet__field">
                <label className="admin-sheet__label">{f.label}</label>
                <Input
                  className="admin-sheet__input"
                  type="number"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving} className="admin-sheet__save">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

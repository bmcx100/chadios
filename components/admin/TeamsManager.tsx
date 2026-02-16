"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface TeamRow {
  id: string
  name: string
  level: string | null
  skill_level: string | null
  division: string | null
  short_location: string | null
  short_name: string | null
}

export function TeamsManager() {
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [allTeams, setAllTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [level, setLevel] = useState("")
  const [skillLevel, setSkillLevel] = useState("")
  const [division, setDivision] = useState("")
  const [shortLocation, setShortLocation] = useState("")
  const [shortName, setShortName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Filter
  const [filterLevel, setFilterLevel] = useState("")
  const [uniqueLevels, setUniqueLevels] = useState<string[]>([])

  const fetchTeams = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("teams")
      .select("id, name, level, skill_level, division, short_location, short_name")
      .order("name")

    const rows = (data ?? []) as TeamRow[]
    setAllTeams(rows)

    // Build unique levels from actual data
    const levels = [...new Set(rows.map((t) => t.level).filter(Boolean))] as string[]
    levels.sort()
    setUniqueLevels(levels)

    // Client-side filter so we can catch both null and empty string for "no level"
    if (filterLevel === "none") {
      setTeams(rows.filter((t) => !t.level))
    } else if (filterLevel) {
      setTeams(rows.filter((t) => t.level === filterLevel))
    } else {
      setTeams(rows)
    }
    setLoading(false)
  }, [filterLevel])

  useEffect(() => {
    setLoading(true)
    fetchTeams()
  }, [fetchTeams])

  function openEdit(team: TeamRow) {
    setEditTeam(team)
    setName(team.name)
    setLevel(team.level ?? "")
    setSkillLevel(team.skill_level ?? "")
    setDivision(team.division ?? "")
    setShortLocation(team.short_location ?? "")
    setShortName(team.short_name ?? "")
    setError("")
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!editTeam || !name) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/edit-team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTeam.id,
          name,
          level,
          skillLevel,
          division,
          shortLocation,
          shortName,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
      } else {
        setSheetOpen(false)
        fetchTeams()
      }
    } catch (err) {
      setError("Network error: " + String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkSetLevel() {
    if (!confirm("Set all teams without a level to U13?")) return

    try {
      const res = await fetch("/api/edit-team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "U13" }),
      })

      if (res.ok) {
        fetchTeams()
      } else {
        const data = await res.json()
        alert("Error: " + (data.error || "Unknown error"))
      }
    } catch {
      alert("Network error")
    }
  }

  const noLevelCount = allTeams.filter((t) => !t.level).length

  return (
    <div className="admin-manager">
      <div className="admin-manager__toolbar">
        <select
          className="team-picker__select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="">All Teams ({allTeams.length})</option>
          <option value="none">No Level Set ({noLevelCount})</option>
          {uniqueLevels.map((lv) => (
            <option key={lv} value={lv}>{lv}</option>
          ))}
        </select>
        {noLevelCount > 0 && (
          <Button variant="outline" onClick={handleBulkSetLevel}>
            Set {noLevelCount} to U13
          </Button>
        )}
      </div>

      {loading && <p className="team-picker__loading">Loading teams...</p>}

      {!loading && teams.length === 0 && (
        <p className="team-picker__empty">No teams found</p>
      )}

      {!loading && teams.length > 0 && (
        <div className="admin-manager__list">
          {teams.map((t) => (
            <div
              key={t.id}
              className="admin-manager__row"
              onClick={() => openEdit(t)}
            >
              <span className="admin-manager__team-name">{t.name}</span>
              <span className="admin-manager__team-level">{t.level || "—"}</span>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="admin-sheet">
          <SheetHeader>
            <SheetTitle>Edit Team</SheetTitle>
          </SheetHeader>
          <div className="admin-sheet__body">
            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="admin-sheet__row">
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">Level</label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. U13A" />
              </div>
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">Skill Level</label>
                <Input value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} placeholder="e.g. A" />
              </div>
            </div>

            <div className="admin-sheet__field-full">
              <label className="admin-sheet__label">Division</label>
              <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Optional" />
            </div>

            <div className="admin-sheet__row">
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">Short Location</label>
                <Input value={shortLocation} onChange={(e) => setShortLocation(e.target.value)} placeholder="e.g. NEP" />
              </div>
              <div className="admin-sheet__field-full">
                <label className="admin-sheet__label">Short Name</label>
                <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. Wildcats" />
              </div>
            </div>

            {error && <p className="import-error">{error}</p>}

            <Button onClick={handleSave} disabled={saving} className="admin-sheet__save">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTeam } from "@/components/team/TeamProvider"
import { Heart, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface TeamRow {
  id: string
  name: string
  short_location: string | null
  short_name: string | null
  level: string | null
  skill_level: string | null
  division: string | null
}

interface RankingRow {
  team_id: string
  rank: number
}

export function TeamPicker() {
  const router = useRouter()
  const { activeTeamId, favouriteTeamIds, setActiveTeam, addFavourite, removeFavourite } = useTeam()
  const [allTeams, setAllTeams] = useState<TeamRow[]>([])
  const [rankings, setRankings] = useState<Record<string, number>>({})
  const [showTeamSelector, setShowBrowser] = useState(false)
  const [levelFilter, setLevelFilter] = useState("")
  const [skillFilter, setSkillFilter] = useState("")
  const [teamFilter, setTeamFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("teams")
      .select("id, name, short_location, short_name, level, skill_level, division")
      .in("short_location", ["Nepean", "Ottawa"])
      .in("level", ["U13", "U15"])
      .in("skill_level", ["BB", "A", "AA"])
      .order("name")
      .then(({ data }) => {
        setAllTeams(data ?? [])
        setLoading(false)
      })

    supabase
      .from("provincial_rankings")
      .select("team_id, rank")
      .order("date_recorded", { ascending: false })
      .then(({ data }) => {
        const map: Record<string, number> = {}
        for (const r of (data ?? []) as RankingRow[]) {
          if (!(r.team_id in map)) map[r.team_id] = r.rank
        }
        setRankings(map)
      })
  }, [])

  const favouriteTeams = useMemo(
    () => allTeams.filter((t) => favouriteTeamIds.includes(t.id)),
    [allTeams, favouriteTeamIds]
  )

  const levels = useMemo(
    () => [...new Set(allTeams.map((t) => t.level).filter(Boolean))].sort(),
    [allTeams]
  )

  const skillOrder = ["C", "B", "BB", "A", "AA"]

  const skillLevels = useMemo(
    () => [...new Set(allTeams.map((t) => t.skill_level).filter(Boolean))]
      .sort((a, b) => skillOrder.indexOf(a!) - skillOrder.indexOf(b!)),
    [allTeams]
  )

  const teamNames = useMemo(
    () => [...new Set(allTeams.map((t) => t.short_location).filter(Boolean))].sort(),
    [allTeams]
  )

  const filteredTeams = useMemo(() => {
    return allTeams
      .filter((t) => {
        if (levelFilter && t.level !== levelFilter) return false
        if (skillFilter && t.skill_level !== skillFilter) return false
        if (teamFilter && t.short_location !== teamFilter) return false
        return true
      })
      .sort((a, b) => {
        const aFav = favouriteTeamIds.includes(a.id) ? 0 : 1
        const bFav = favouriteTeamIds.includes(b.id) ? 0 : 1
        if (aFav !== bFav) return aFav - bFav
        const levelCmp = (a.level ?? "").localeCompare(b.level ?? "")
        if (levelCmp !== 0) return levelCmp
        return skillOrder.indexOf(a.skill_level ?? "") - skillOrder.indexOf(b.skill_level ?? "")
      })
  }, [allTeams, favouriteTeamIds, levelFilter, skillFilter, teamFilter])

  function handleSelect(teamId: string) {
    setActiveTeam(teamId)
    router.push("/dashboard")
  }

  function toggleFavourite(teamId: string) {
    if (favouriteTeamIds.includes(teamId)) {
      removeFavourite(teamId)
    } else {
      addFavourite(teamId)
    }
  }

  const listRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const checkScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 4)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    return () => el.removeEventListener("scroll", checkScroll)
  }, [checkScroll, filteredTeams])

  const autoShowSelector = favouriteTeamIds.length === 0 && !loading

  useEffect(() => {
    if (autoShowSelector) setShowBrowser(true)
  }, [autoShowSelector])

  if (!showTeamSelector && favouriteTeams.length > 0) {
    return (
      <div className="team-picker team-picker--home">
        <div className="team-picker__your-teams">
          {favouriteTeams.map((team) => {
            const bannerMap: Record<string, string> = {
              "Ottawa": "/images/ice_short_banner.png",
              "Nepean": "/images/wildcats_short_banner.png",
            }
            const banner = bannerMap[team.short_location ?? ""] ?? bannerMap["Nepean"]
            return (
              <div
                key={team.id}
                className="team-picker__row"
                style={{ backgroundImage: `url(${banner})`, cursor: "pointer" }}
                onClick={() => handleSelect(team.id)}
              >
                <div className="team-picker__row-main" />
                <span className="team-picker__row-division">
                  {team.level} {team.skill_level}
                </span>
              </div>
            )
          })}
        </div>
        <button
          className="team-picker__add-teams-btn"
          onClick={() => setShowBrowser(true)}
        >
          Add Teams
        </button>
      </div>
    )
  }

  return (
    <div className="team-picker">

      <div className="team-picker__selector">
          <div className="team-picker__filters">
            <div className="team-picker__filter-row">
              <select
                className="team-picker__select"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="">Age</option>
                {levels.map((l) => (
                  <option key={l} value={l!}>{l}</option>
                ))}
              </select>
              <select
                className="team-picker__select"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
              >
                <option value="">Level</option>
                {skillLevels.map((s) => (
                  <option key={s} value={s!}>{s}</option>
                ))}
              </select>
              <select
                className="team-picker__select"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="">Team</option>
                {teamNames.map((t) => (
                  <option key={t} value={t!}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="team-picker__list-wrap">
            {canScrollUp && (
              <div className="team-picker__scroll-hint team-picker__scroll-hint--top">
                <ChevronUp className="team-picker__scroll-hint-icon" />
              </div>
            )}
            <div className="team-picker__list" ref={listRef}>
              {loading && <p className="team-picker__loading">Loading teams...</p>}
              {!loading && filteredTeams.length === 0 && (
                <p className="team-picker__empty">No teams found</p>
              )}
              {filteredTeams.map((team) => {
                const isFav = favouriteTeamIds.includes(team.id)
                const bannerMap: Record<string, string> = {
                  "Ottawa": "/images/ice_short_banner.png",
                  "Nepean": "/images/wildcats_short_banner.png",
                }
                const banner = bannerMap[team.short_location ?? ""] ?? bannerMap["Nepean"]
                return (
                  <div
                    key={team.id}
                    className={cn("team-picker__row", !isFav && "team-picker__row--unselected")}
                    style={{ backgroundImage: `url(${banner})` }}
                  >
                    <button
                      className={cn(
                        "team-picker__fav-btn",
                        isFav && "team-picker__fav-btn--active"
                      )}
                      onClick={(e) => { e.stopPropagation(); toggleFavourite(team.id) }}
                    >
                      <Heart className="team-picker__fav-icon" />
                    </button>
                    <button
                      className="team-picker__row-main"
                      onClick={() => handleSelect(team.id)}
                      aria-label={team.name}
                    />
                    <button
                      className="team-picker__row-division"
                      onClick={() => handleSelect(team.id)}
                    >
                      {team.level} {team.skill_level}
                    </button>
                  </div>
                )
              })}
            </div>
            {canScrollDown && (
              <div className="team-picker__scroll-hint team-picker__scroll-hint--bottom">
                <ChevronDown className="team-picker__scroll-hint-icon" />
              </div>
            )}
          </div>
        </div>

      {favouriteTeamIds.length > 0 && (
        <button
          className="team-picker__done-btn"
          onClick={() => setShowBrowser(false)}
        >
          Done
        </button>
      )}
    </div>
  )
}

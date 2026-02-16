"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  getActiveTeamId as getStoredTeamId,
  setActiveTeamId as storeTeamId,
  getFavouriteTeamIds,
  setFavouriteTeamIds,
  addFavouriteTeamId,
  removeFavouriteTeamId,
} from "@/lib/team-context"

interface TeamContextValue {
  activeTeamId: string | null
  activeTournamentId: string | null
  favouriteTeamIds: string[]
  setActiveTeam: (teamId: string) => void
  addFavourite: (teamId: string) => void
  removeFavourite: (teamId: string) => void
  loading: boolean
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null)
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null)
  const [favourites, setFavourites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setActiveTeamIdState(getStoredTeamId())
    setFavourites(getFavouriteTeamIds())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!activeTeamId) {
      setActiveTournamentId(null)
      return
    }

    const supabase = createClient()
    supabase
      .from("pool_teams")
      .select("pool_id, pools(tournament_id)")
      .eq("team_id", activeTeamId)
      .limit(1)
      .single()
      .then(({ data }) => {
        const pool = data?.pools as unknown as { tournament_id: string } | null
        const tournamentId = pool?.tournament_id ?? null
        setActiveTournamentId(tournamentId)

        document.cookie = `active_team_id=${activeTeamId}; path=/; max-age=31536000`
        if (tournamentId) {
          document.cookie = `active_tournament_id=${tournamentId}; path=/; max-age=31536000`
        }
      })
  }, [activeTeamId])

  const setActiveTeam = useCallback((teamId: string) => {
    storeTeamId(teamId)
    setActiveTeamIdState(teamId)
    // Set cookie immediately so server-side reads pick it up on navigation
    document.cookie = `active_team_id=${teamId}; path=/; max-age=31536000`
    if (!getFavouriteTeamIds().includes(teamId)) {
      addFavouriteTeamId(teamId)
      setFavourites(getFavouriteTeamIds())
    }
  }, [])

  const addFav = useCallback((teamId: string) => {
    addFavouriteTeamId(teamId)
    setFavourites(getFavouriteTeamIds())
  }, [])

  const removeFav = useCallback((teamId: string) => {
    removeFavouriteTeamId(teamId)
    setFavourites(getFavouriteTeamIds())
  }, [])

  return (
    <TeamContext.Provider
      value={{
        activeTeamId,
        activeTournamentId,
        favouriteTeamIds: favourites,
        setActiveTeam,
        addFavourite: addFav,
        removeFavourite: removeFav,
        loading,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error("useTeam must be used within TeamProvider")
  return ctx
}

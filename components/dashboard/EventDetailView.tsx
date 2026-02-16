"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StandingsView } from "@/components/standings/StandingsView"
import { ScheduleWithScoreEntry } from "@/components/schedule/ScheduleWithScoreEntry"
import { BracketView } from "@/components/bracket/BracketView"
import { SeasonStandingsTable } from "@/components/admin/SeasonStandingsTable"
import { AddGameSheet } from "@/components/admin/AddGameSheet"
import type { EventData } from "@/lib/fetch-event-data"
import type { Pool } from "@/lib/types"

interface EventDetailViewProps {
  data: EventData
}

export function EventDetailView({ data }: EventDetailViewProps) {
  const router = useRouter()
  const [addGameOpen, setAddGameOpen] = useState(false)

  const pools: Pool[] = data.poolStandings.map((ps) => ({
    id: ps.pool.id,
    tournament_id: data.eventId,
    name: ps.pool.name,
    advancement_count: ps.pool.advancement_count,
  }))

  const isRegularSeason = data.eventType === "regular_season"
  const defaultTab = isRegularSeason
    ? "standings"
    : data.hasPools ? "standings" : "schedule"

  const handleSaved = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="event-detail">
      <div className="event-detail__header">
        <Link href="/dashboard" className="event-detail__back">
          <ArrowLeft className="event-detail__back-icon" />
        </Link>
        <div className="event-detail__info">
          <h1 className="event-detail__name">{data.name}</h1>
          {data.location && (
            <p className="event-detail__location">{data.location}</p>
          )}
        </div>
        <button
          className="event-detail__add-btn"
          onClick={() => setAddGameOpen(true)}
          aria-label="Add game"
        >
          <Plus className="event-detail__add-icon" />
        </button>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="event-detail__tabs">
          <TabsList className="w-full">
            <TabsTrigger value="standings" className="flex-1">
              Standings
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">
              Schedule
            </TabsTrigger>
            {data.hasBracket && (
              <TabsTrigger value="bracket" className="flex-1">
                Bracket
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="standings">
          {isRegularSeason ? (
            <div className="event-detail__season-standings">
              <SeasonStandingsTable tournamentId={data.eventId} />
            </div>
          ) : data.hasPools ? (
            <StandingsView
              poolStandings={data.poolStandings}
              rankings={data.rankings}
              myTeamPoolId={data.myTeamPoolId}
              games={data.allGames}
            />
          ) : (
            <p className="team-picker__empty">No standings available</p>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleWithScoreEntry
            games={data.allGames}
            pools={pools}
            rankings={data.rankings}
            tournamentName={data.name}
          />
        </TabsContent>

        {data.hasBracket && (
          <TabsContent value="bracket">
            <BracketView
              semi1={data.bracketGames.semi1}
              semi2={data.bracketGames.semi2}
              final={data.bracketGames.finalGame}
              rankings={data.rankings}
            />
          </TabsContent>
        )}
      </Tabs>

      <AddGameSheet
        open={addGameOpen}
        onOpenChange={setAddGameOpen}
        defaultEventId={data.eventId}
        onSaved={handleSaved}
      />

    </div>
  )
}

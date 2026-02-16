"use client"

import { useTeam } from "@/components/team/TeamProvider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GamesManager } from "./GamesManager"
import { EventsManager } from "./EventsManager"
import { PlaydownSetup } from "./PlaydownSetup"
import { SeasonStandingsTable } from "./SeasonStandingsTable"
import { StandingsImport } from "@/components/import/StandingsImport"
import { TeamsManager } from "./TeamsManager"
import { GamesImport } from "@/components/import/GamesImport"
import { RankingsImport } from "@/components/import/RankingsImport"

interface AdminViewProps {
  regularSeasonId: string | null
}

export function AdminView({ regularSeasonId }: AdminViewProps) {
  const { activeTeamId } = useTeam()

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Admin</h1>

      <Tabs defaultValue="games">
        <div className="admin-page__tabs">
          <TabsList className="w-full">
            <TabsTrigger value="games" className="flex-1">Games</TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
            <TabsTrigger value="playdowns" className="flex-1">Playdowns</TabsTrigger>
            <TabsTrigger value="standings" className="flex-1">Standings</TabsTrigger>
            <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="games">
          <GamesManager teamId={activeTeamId} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsManager />
        </TabsContent>

        <TabsContent value="events">
          <EventsManager />
        </TabsContent>

        <TabsContent value="playdowns">
          <PlaydownSetup teamId={activeTeamId} regularSeasonId={regularSeasonId} />
        </TabsContent>

        <TabsContent value="standings">
          <div className="admin-page__standings-section">
            {regularSeasonId ? (
              <SeasonStandingsTable tournamentId={regularSeasonId} />
            ) : (
              <p className="team-picker__empty">No regular season event found</p>
            )}
          </div>
          <div className="admin-page__import-section">
            <h3 className="admin-page__section-title">Import Standings</h3>
            <StandingsImport />
          </div>
        </TabsContent>

        <TabsContent value="import">
          <Tabs defaultValue="games-import">
            <TabsList className="w-full">
              <TabsTrigger value="games-import" className="flex-1">Games</TabsTrigger>
              <TabsTrigger value="rankings-import" className="flex-1">Rankings</TabsTrigger>
            </TabsList>

            <TabsContent value="games-import">
              <GamesImport />
            </TabsContent>

            <TabsContent value="rankings-import">
              <RankingsImport />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}

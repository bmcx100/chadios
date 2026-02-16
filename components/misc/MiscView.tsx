"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BracketView } from "@/components/bracket/BracketView"
import { CsvImport } from "@/components/import/CsvImport"
import { StandingsImport } from "@/components/import/StandingsImport"
import { GamesImport } from "@/components/import/GamesImport"
import { RankingsImport } from "@/components/import/RankingsImport"
import type { Game, RankingsMap } from "@/lib/types"

interface MiscViewProps {
  semi1: Game | null
  semi2: Game | null
  finalGame: Game | null
  rankings?: RankingsMap
}

export function MiscView({ semi1, semi2, finalGame, rankings }: MiscViewProps) {
  return (
    <div>
      <Tabs defaultValue="bracket">
        <div className="misc-tabs">
          <TabsList className="w-full">
            <TabsTrigger value="bracket" className="flex-1">
              Bracket
            </TabsTrigger>
            <TabsTrigger value="standings-import" className="flex-1">
              Standings
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              Games
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex-1">
              Rankings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bracket">
          <BracketView
            semi1={semi1}
            semi2={semi2}
            final={finalGame}
            rankings={rankings}
          />
        </TabsContent>

        <TabsContent value="standings-import">
          <div className="misc-import-wrap">
            <StandingsImport />
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="misc-import-wrap">
            <GamesImport />
          </div>
        </TabsContent>

        <TabsContent value="rankings">
          <div className="misc-import-wrap">
            <RankingsImport />
          </div>
        </TabsContent>

        <TabsContent value="csv-import">
          <div className="misc-import-wrap">
            <CsvImport />
          </div>
          <div className="misc-import-footer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/garbage.jpeg"
              alt="Garbage time"
              className="misc-import-footer__bg"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/twomins.png"
              alt="Two minutes"
              className="misc-import-footer__overlay"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

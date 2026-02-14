"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BracketView } from "@/components/bracket/BracketView"
import { CsvImport } from "@/components/import/CsvImport"
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
            <TabsTrigger value="import" className="flex-1">
              Import
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

        <TabsContent value="import">
          <div className="misc-import-wrap">
            <CsvImport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

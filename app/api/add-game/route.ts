import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const body = await req.json()
  const {
    tournamentId,
    stage,
    startDatetime,
    venue,
    homeTeamId,
    awayTeamId,
    finalScoreHome,
    finalScoreAway,
    resultType,
  } = body

  if (!tournamentId || !homeTeamId || !awayTeamId || !startDatetime) {
    return Response.json(
      { error: "tournamentId, homeTeamId, awayTeamId, and startDatetime required" },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const hasScore = finalScoreHome != null && finalScoreAway != null
    && finalScoreHome !== "" && finalScoreAway !== ""

  const { data, error } = await supabase
    .from("games")
    .insert({
      tournament_id: tournamentId,
      stage: stage || "regular_season",
      start_datetime: startDatetime,
      venue: venue || null,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      final_score_home: hasScore ? parseInt(finalScoreHome) : null,
      final_score_away: hasScore ? parseInt(finalScoreAway) : null,
      status: hasScore ? "completed" : "scheduled",
      result_type: hasScore ? (resultType || "regulation") : null,
    })
    .select("id")
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, id: data.id })
}

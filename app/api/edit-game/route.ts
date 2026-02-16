import { createClient } from "@/lib/supabase/server"

export async function PUT(req: Request) {
  const body = await req.json()
  const {
    id,
    stage,
    startDatetime,
    venue,
    homeTeamId,
    awayTeamId,
    finalScoreHome,
    finalScoreAway,
    resultType,
    status,
  } = body

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 })
  }

  const supabase = await createClient()

  const hasScore = finalScoreHome != null && finalScoreAway != null
    && finalScoreHome !== "" && finalScoreAway !== ""

  const update: Record<string, unknown> = {}
  if (stage !== undefined) update.stage = stage
  if (startDatetime !== undefined) update.start_datetime = startDatetime
  if (venue !== undefined) update.venue = venue || null
  if (homeTeamId !== undefined) update.home_team_id = homeTeamId
  if (awayTeamId !== undefined) update.away_team_id = awayTeamId

  if (hasScore) {
    update.final_score_home = parseInt(finalScoreHome)
    update.final_score_away = parseInt(finalScoreAway)
    update.status = status || "completed"
    update.result_type = resultType || "regulation"
  } else if (finalScoreHome === "" || finalScoreHome === null) {
    update.final_score_home = null
    update.final_score_away = null
    update.status = "scheduled"
    update.result_type = null
  }

  const { error } = await supabase
    .from("games")
    .update(update)
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

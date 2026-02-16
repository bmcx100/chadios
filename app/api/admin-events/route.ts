import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { name, eventType, startDate, endDate, location, level, skillLevel, totalTeams, qualifyingCount } = await req.json()

  if (!name || !eventType) {
    return Response.json({ error: "Name and event type required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name,
      event_type: eventType,
      start_date: startDate || null,
      end_date: endDate || null,
      location: location || null,
      level: level || null,
      skill_level: skillLevel || null,
      total_teams: totalTeams || null,
      qualifying_count: qualifyingCount || null,
    })
    .select("id")
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}

export async function PUT(req: Request) {
  const { id, name, eventType, startDate, endDate, location, totalTeams, qualifyingCount } = await req.json()

  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (eventType !== undefined) updates.event_type = eventType
  if (startDate !== undefined) updates.start_date = startDate || null
  if (endDate !== undefined) updates.end_date = endDate || null
  if (location !== undefined) updates.location = location || null
  if (totalTeams !== undefined) updates.total_teams = totalTeams || null
  if (qualifyingCount !== undefined) updates.qualifying_count = qualifyingCount || null

  const { error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()

  if (!id) return Response.json({ error: "id required" }, { status: 400 })

  const supabase = await createClient()

  // Delete games first
  await supabase.from("games").delete().eq("tournament_id", id)

  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

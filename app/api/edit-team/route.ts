import { createClient } from "@/lib/supabase/server"

export async function PUT(req: Request) {
  const body = await req.json()
  const { id, name, level, skillLevel, division, shortLocation, shortName } = body

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 })
  }

  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (name !== undefined) update.name = name
  if (level !== undefined) update.level = level || null
  if (skillLevel !== undefined) update.skill_level = skillLevel || null
  if (division !== undefined) update.division = division || null
  if (shortLocation !== undefined) update.short_location = shortLocation || null
  if (shortName !== undefined) update.short_name = shortName || null

  const { error } = await supabase
    .from("teams")
    .update(update)
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function PATCH(req: Request) {
  // Bulk update: set level on all teams where level is null
  const body = await req.json()
  const { level } = body

  if (!level) {
    return Response.json({ error: "level required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Update teams where level is null
  const { error: err1 } = await supabase
    .from("teams")
    .update({ level })
    .is("level", null)

  // Also update teams where level is empty string
  const { error: err2 } = await supabase
    .from("teams")
    .update({ level })
    .eq("level", "")

  if (err1 || err2) {
    return Response.json({ error: (err1 || err2)!.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

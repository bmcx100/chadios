import { createClient } from "@/lib/supabase/server"

export async function PUT(req: Request) {
  const { id, gp, w, l, t, otl, sol, pts, gf, ga, gd, pim, pct } = await req.json()

  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("season_standings")
    .update({ gp, w, l, t, otl, sol, pts, gf, ga, gd, pim, pct })
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
    .from("season_standings")
    .delete()
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

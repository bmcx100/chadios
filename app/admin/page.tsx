import { createClient } from "@/lib/supabase/server"
import { AdminView } from "@/components/admin/AdminView"

export default async function AdminPage() {
  const supabase = await createClient()

  // Find the regular season event for the standings tab
  const { data } = await supabase
    .from("tournaments")
    .select("id")
    .eq("event_type", "regular_season")
    .limit(1)
    .single()

  return <AdminView regularSeasonId={data?.id ?? null} />
}

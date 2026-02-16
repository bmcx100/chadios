import { getActiveTeamId } from "@/lib/active-team"
import { fetchDashboardData } from "@/lib/fetch-dashboard-data"
import { DashboardView } from "@/components/dashboard/DashboardView"

export default async function DashboardPage() {
  const teamId = await getActiveTeamId()
  const data = await fetchDashboardData(teamId)

  return <DashboardView data={data} />
}

import { getActiveTeamId } from "@/lib/active-team"
import { fetchEventData } from "@/lib/fetch-event-data"
import { EventDetailView } from "@/components/dashboard/EventDetailView"

interface EventPageProps {
  params: Promise<{ eventId: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params
  const teamId = await getActiveTeamId()
  const data = await fetchEventData(eventId, teamId)

  return <EventDetailView data={data} />
}

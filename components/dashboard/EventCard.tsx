"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { EventType } from "@/lib/types"

interface EventCardProps {
  eventId: string
  name: string
  startDate: string | null
  endDate: string | null
  location: string | null
  eventType: EventType
  record?: { w: number; l: number; t: number }
  status?: "active" | "upcoming" | "completed"
}

const typeLabels: Record<EventType, string> = {
  regular_season: "Regular Season",
  tournament: "Tournament",
  playoff: "Playoffs",
  playdown: "Playdowns",
  provincial: "Provincials",
  exhibition: "Exhibition",
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return ""
  const s = new Date(start + "T00:00:00")
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const startStr = s.toLocaleDateString("en-CA", opts)
  if (!end || start === end) return startStr
  const e = new Date(end + "T00:00:00")
  const endStr = e.toLocaleDateString("en-CA", opts)
  return `${startStr} - ${endStr}`
}

export function EventCard({
  eventId,
  name,
  startDate,
  endDate,
  location,
  eventType,
  record,
  status = "upcoming",
}: EventCardProps) {
  const dateRange = formatDateRange(startDate, endDate)

  return (
    <Link
      href={`/event/${eventId}`}
      className={cn(
        "event-card",
        status === "active" && "event-card--active",
        status === "completed" && "event-card--completed"
      )}
    >
      <div className="event-card__top">
        <span className={cn("event-card__badge", `event-card__badge--${eventType}`)}>
          {typeLabels[eventType]}
        </span>
        {status === "active" && (
          <span className="event-card__live-dot" />
        )}
      </div>
      <h3 className="event-card__name">{name}</h3>
      <div className="event-card__meta">
        {dateRange && <span className="event-card__dates">{dateRange}</span>}
        {location && <span className="event-card__location">{location}</span>}
      </div>
      {record && (
        <div className="event-card__record">
          {record.w}W {record.l}L {record.t}T
        </div>
      )}
    </Link>
  )
}

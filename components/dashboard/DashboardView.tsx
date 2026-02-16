"use client"

import { TeamBanner } from "./TeamBanner"
import { NextGames } from "./NextGames"
import { EventCard } from "./EventCard"
import type { DashboardData } from "@/lib/fetch-dashboard-data"

interface DashboardViewProps {
  data: DashboardData
}

export function DashboardView({ data }: DashboardViewProps) {
  const hasEvents =
    data.activeEvents.length > 0 ||
    data.upcomingEvents.length > 0 ||
    data.completedEvents.length > 0

  return (
    <div className="dashboard">
      <TeamBanner
        shortLocation={data.team.short_location}
        level={data.team.level}
        skillLevel={data.team.skill_level}
        record={data.seasonRecord}
        streak={data.streak}
      />

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Next Games</h2>
        <NextGames games={data.nextGames} />
      </section>

      {data.activeEvents.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Active Now</h2>
          <div className="dashboard__cards">
            {data.activeEvents.map((e) => (
              <EventCard
                key={e.id}
                eventId={e.id}
                name={e.name}
                startDate={e.start_date}
                endDate={e.end_date}
                location={e.location}
                eventType={e.event_type}
                record={e.record}
                status={e.status}
              />
            ))}
          </div>
        </section>
      )}

      {data.upcomingEvents.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Upcoming</h2>
          <div className="dashboard__cards">
            {data.upcomingEvents.map((e) => (
              <EventCard
                key={e.id}
                eventId={e.id}
                name={e.name}
                startDate={e.start_date}
                endDate={e.end_date}
                location={e.location}
                eventType={e.event_type}
                record={e.record}
                status={e.status}
              />
            ))}
          </div>
        </section>
      )}

      {data.completedEvents.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Completed</h2>
          <div className="dashboard__cards dashboard__cards--compact">
            {data.completedEvents.map((e) => (
              <EventCard
                key={e.id}
                eventId={e.id}
                name={e.name}
                startDate={e.start_date}
                endDate={e.end_date}
                location={e.location}
                eventType={e.event_type}
                record={e.record}
                status={e.status}
              />
            ))}
          </div>
        </section>
      )}

      {!hasEvents && data.nextGames.length === 0 && !data.seasonRecord && (
        <p className="dashboard__empty">No events found for this team yet.</p>
      )}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface TeamBannerProps {
  shortLocation: string | null
  level: string | null
  skillLevel: string | null
  record: { w: number; l: number; t: number } | null
  streak: string | null
}

const bannerMap: Record<string, string> = {
  Ottawa: "/images/ice_short_banner.png",
  Nepean: "/images/wildcats_short_banner.png",
}

export function TeamBanner({ shortLocation, level, skillLevel, record, streak }: TeamBannerProps) {
  const banner = bannerMap[shortLocation ?? ""] ?? bannerMap["Nepean"]

  const streakType = streak?.[0] as "W" | "L" | "T" | undefined

  return (
    <div
      className="team-banner"
      style={{ backgroundImage: `url(${banner})` }}
    >
      <div className="team-banner__overlay">
        <span className="team-banner__division">
          {level} {skillLevel}
        </span>
        <div className="team-banner__bottom">
          {record && (
            <span className="team-banner__record">
              {record.w}W - {record.l}L - {record.t}T
            </span>
          )}
          {streak && (
            <span
              className={cn(
                "team-banner__streak",
                streakType === "W" && "team-banner__streak--win",
                streakType === "L" && "team-banner__streak--loss",
                streakType === "T" && "team-banner__streak--tie"
              )}
            >
              {streak}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

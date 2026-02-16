"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTeam } from "@/components/team/TeamProvider"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, Ellipsis, MessageSquare, ArrowLeftRight, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/misc", label: "Misc", icon: Ellipsis },
]

export function TopNav() {
  const pathname = usePathname()
  const { activeTeamId } = useTeam()
  const [teamName, setTeamName] = useState("")

  useEffect(() => {
    if (!activeTeamId) return
    const supabase = createClient()
    supabase
      .from("teams")
      .select("short_name, name")
      .eq("id", activeTeamId)
      .single()
      .then(({ data }) => {
        if (data) setTeamName(data.short_name ?? data.name)
      })
  }, [activeTeamId])

  return (
    <nav className="top-nav">
      <div className="top-nav__left">
        <Link href="/dashboard" className="top-nav__brand">
          <span className="top-nav__brand-name">Stat in Stand</span>
        </Link>
        {teamName && (
          <Link href="/?pick" className="top-nav__team-badge">
            <ArrowLeftRight className="top-nav__team-badge-icon" />
            <span>{teamName}</span>
          </Link>
        )}
      </div>
      <Link
          href="/admin"
          className={cn(
            "top-nav__gear",
            pathname.startsWith("/admin") && "top-nav__gear--active"
          )}
          aria-label="Admin"
        >
          <Settings className="top-nav__gear-icon" />
        </Link>
      <div className="top-nav__links">
        {navItems.map((item) => {
          const isActive = pathname === item.href
            || (item.href === "/dashboard" && pathname.startsWith("/event/"))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "top-nav__link",
                isActive && "top-nav__link--active"
              )}
            >
              <Icon className="top-nav__link-icon" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

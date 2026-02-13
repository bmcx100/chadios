"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, Trophy, GitBranch, Upload, MessageSquare } from "lucide-react"

const navItems = [
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/bracket", label: "Bracket", icon: GitBranch },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/chat", label: "Chat", icon: MessageSquare },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="top-nav">
      <Link href="/schedule" className="top-nav__brand">
        digi_Chad
      </Link>
      <div className="top-nav__links">
        {navItems.map((item) => {
          const isActive = pathname === item.href
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

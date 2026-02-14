"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, Trophy, Ellipsis, MessageSquare } from "lucide-react"

const navItems = [
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/misc", label: "Misc", icon: Ellipsis },
  { href: "/chat", label: "Chat", icon: MessageSquare },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <nav className="top-nav">
      <Link href="/standings" className="top-nav__brand">
        <span className="top-nav__brand-name">Chadiós</span>
        <span className="top-nav__brand-tagline"> — Adiós a los Datos Básicos</span>
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

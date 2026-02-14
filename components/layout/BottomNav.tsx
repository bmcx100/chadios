"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Calendar, Trophy, Ellipsis, MessageSquare } from "lucide-react"

const navItems = [
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/misc", label: "Misc", icon: Ellipsis },
  { href: "/chat", label: "Chat", icon: MessageSquare },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "bottom-nav__item",
              isActive && "bottom-nav__item--active"
            )}
          >
            <Icon className="bottom-nav__icon" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

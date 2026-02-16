"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Ellipsis, MessageSquare, ArrowLeftRight, Settings } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/misc", label: "Misc", icon: Ellipsis },
  { href: "/admin", label: "Admin", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      <Link
        href="/?pick"
        className={cn(
          "bottom-nav__item",
          pathname === "/" && "bottom-nav__item--active"
        )}
      >
        <ArrowLeftRight className="bottom-nav__icon" />
        <span>Team</span>
      </Link>
      {navItems.map((item) => {
        const isActive = pathname === item.href
          || (item.href === "/dashboard" && pathname.startsWith("/event/"))
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

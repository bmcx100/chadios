"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTeam } from "@/components/team/TeamProvider"
import { TeamPicker } from "@/components/team/TeamPicker"

export function TeamPickerGate() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeTeamId, loading } = useTeam()
  const [ready, setReady] = useState(false)

  const isAutoRedirect = searchParams.get("pick") === null

  useEffect(() => {
    if (loading) return
    if (activeTeamId && isAutoRedirect) {
      router.replace("/dashboard")
    } else {
      setReady(true)
    }
  }, [activeTeamId, loading, router, isAutoRedirect])

  if (loading || !ready) return null

  return <TeamPicker />
}

'use client'

import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'

export function DashboardAuthNav() {
  const { user, ready, sessionSyncing, signOut, configError } = usePaperTradingAuth()

  if (configError) {
    return (
      <span className="text-xs text-amber-600 max-w-[140px] truncate" title={configError}>
        Auth not configured
      </span>
    )
  }

  if (!ready || sessionSyncing) {
    return <span className="text-xs text-muted-foreground">…</span>
  }

  if (!user) {
    return (
      <span className="text-xs text-muted-foreground hidden sm:inline">Not signed in</span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground max-w-[160px] truncate hidden sm:inline" title={user.email}>
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Sign out
      </button>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
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
      <Link
        href="/account"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-muted/60 text-foreground shadow-sm transition-colors hover:bg-muted hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Account profile"
        title={user.email}
      >
        <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} aria-hidden />
      </Link>
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

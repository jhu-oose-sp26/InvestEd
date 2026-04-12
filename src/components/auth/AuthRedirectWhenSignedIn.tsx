'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'

/** After Firebase + server session succeed, leave auth pages for the dashboard. */
export function AuthRedirectWhenSignedIn() {
  const router = useRouter()
  const { user, ready, sessionSyncing } = usePaperTradingAuth()

  useEffect(() => {
    if (ready && !sessionSyncing && user) {
      router.replace('/portfolio')
    }
  }, [ready, sessionSyncing, user, router])

  return null
}

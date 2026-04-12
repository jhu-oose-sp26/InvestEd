'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'

/** After Firebase + server session succeed, leave auth pages for the account profile. */
export function AuthRedirectWhenSignedIn() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, ready, sessionSyncing } = usePaperTradingAuth()

  useEffect(() => {
    if (ready && !sessionSyncing && user) {
      const fromRegister = pathname?.includes('/auth/register') ?? false
      router.replace(fromRegister ? '/account?welcome=1' : '/account')
    }
  }, [ready, sessionSyncing, user, router, pathname])

  return null
}

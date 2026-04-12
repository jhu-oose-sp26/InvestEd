'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebaseClient'

export type AppUser = {
  id: string
  email: string
  name: string | null
  firebaseUid: string | null
  /** ISO timestamp from Prisma `User.createdAt` */
  createdAt: string
}

type MeResponse = {
  user: AppUser
  portfolios: { id: string; name: string; cashBalance: string }[]
}

type PaperTradingAuthState = {
  firebaseUser: User | null
  user: AppUser | null
  portfolioId: string | null
  ready: boolean
  sessionSyncing: boolean
  configError: string | null
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const PaperTradingAuthContext = createContext<PaperTradingAuthState | null>(null)

async function syncServerSession(user: User): Promise<{
  user: AppUser
  portfolioId: string
}> {
  const idToken = await user.getIdToken()
  const sessionRes = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken }),
  })
  if (!sessionRes.ok) {
    const j = (await sessionRes.json().catch(() => ({}))) as { error?: string }
    throw new Error(typeof j.error === 'string' ? j.error : 'Could not create session')
  }

  const loadMe = async (): Promise<MeResponse> => {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' })
    if (!meRes.ok) {
      const j = (await meRes.json().catch(() => ({}))) as { error?: string }
      throw new Error(typeof j.error === 'string' ? j.error : 'Could not load profile')
    }
    return meRes.json() as Promise<MeResponse>
  }

  let data = await loadMe()
  if (data.portfolios.length === 0) {
    const createRes = await fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    if (!createRes.ok) {
      const j = (await createRes.json().catch(() => ({}))) as { error?: string }
      throw new Error(typeof j.error === 'string' ? j.error : 'Could not create portfolio')
    }
    data = await loadMe()
  }

  const first = data.portfolios[0]
  if (!first) {
    throw new Error('No portfolio available after setup')
  }
  return { user: data.user, portfolioId: first.id }
}

export function PaperTradingAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [portfolioId, setPortfolioId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [sessionSyncing, setSessionSyncing] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let auth: ReturnType<typeof getFirebaseAuth>
    try {
      auth = getFirebaseAuth()
    } catch {
      setConfigError('Firebase client is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.')
      setReady(true)
      return
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u)
      setError(null)
      if (!u) {
        setUser(null)
        setPortfolioId(null)
        setReady(true)
        return
      }
      setSessionSyncing(true)
      try {
        const { user: appUser, portfolioId: pid } = await syncServerSession(u)
        setUser(appUser)
        setPortfolioId(pid)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Session setup failed'
        setError(msg)
        setUser(null)
        setPortfolioId(null)
      } finally {
        setSessionSyncing(false)
        setReady(true)
      }
    })

    return () => unsub()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const auth = getFirebaseAuth()
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null)
    const auth = getFirebaseAuth()
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    const trimmedName = displayName?.trim()
    if (trimmedName) {
      await updateProfile(cred.user, { displayName: trimmedName })
    }
    await cred.user.getIdToken(true)
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' })
    } catch {
      /* still sign out of Firebase */
    }
    try {
      const auth = getFirebaseAuth()
      await firebaseSignOut(auth)
    } catch {
      /* config missing */
    }
    setUser(null)
    setPortfolioId(null)
    router.replace('/')
  }, [router])

  const value = useMemo<PaperTradingAuthState>(
    () => ({
      firebaseUser,
      user,
      portfolioId,
      ready,
      sessionSyncing,
      configError,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [
      firebaseUser,
      user,
      portfolioId,
      ready,
      sessionSyncing,
      configError,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    ]
  )

  return (
    <PaperTradingAuthContext.Provider value={value}>{children}</PaperTradingAuthContext.Provider>
  )
}

export function usePaperTradingAuth(): PaperTradingAuthState {
  const ctx = useContext(PaperTradingAuthContext)
  if (!ctx) {
    throw new Error('usePaperTradingAuth must be used within PaperTradingAuthProvider')
  }
  return ctx
}

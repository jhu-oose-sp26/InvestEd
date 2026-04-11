'use client'

import { useState } from 'react'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'

/**
 * Email/password sign-in for paper trading. After Firebase auth, the provider
 * calls POST /api/auth/session, GET /api/auth/me, and POST /api/portfolios if needed.
 */
export function PaperTradingSignInCard() {
  const { signIn, signUp, error, clearError, configError } = usePaperTradingAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const disabled = submitting || !email.trim() || !password

  const handleSignIn = async () => {
    setSubmitting(true)
    clearError()
    setFormError(null)
    try {
      await signIn(email, password)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUp = async () => {
    setSubmitting(true)
    clearError()
    setFormError(null)
    try {
      await signUp(email, password)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create account')
    } finally {
      setSubmitting(false)
    }
  }

  if (configError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm">
        {configError}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border bg-card p-6 space-y-4 shadow-sm">
      <h2 className="text-lg font-semibold">Sign in to trade</h2>
      <p className="text-sm text-muted-foreground">
        Use the email and password from Firebase Authentication (Email/Password provider).
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="pt-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="pt-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="pt-password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="pt-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      {(formError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError || error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleSignIn}
          disabled={disabled}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? '…' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={disabled}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Create account
        </button>
      </div>
    </div>
  )
}

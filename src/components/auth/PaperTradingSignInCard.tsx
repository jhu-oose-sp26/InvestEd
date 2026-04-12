'use client'

import { useState } from 'react'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'
import {
  getPasswordFieldState,
  validateEmailValue,
  validatePasswordSignIn,
  validatePasswordSignUp,
} from '@/lib/auth/emailPasswordValidation'
import { friendlyFirebaseAuthMessage } from '@/lib/auth/firebaseAuthMessages'
import { softenPublicErrorMessage } from '@/lib/userFacingMessages'

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
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [attemptedAction, setAttemptedAction] = useState<'signIn' | 'signUp' | null>(null)

  const showEmailMessages = emailTouched || attemptedAction !== null
  const showPasswordMessages = passwordTouched || attemptedAction !== null

  const emailError = showEmailMessages ? validateEmailValue(email) : null
  const passwordState = getPasswordFieldState(password, attemptedAction, showPasswordMessages)

  const emailOk = showEmailMessages && !emailError && email.trim().length > 0

  const disabled = submitting || !email.trim() || !password

  const runValidation = (mode: 'signIn' | 'signUp'): boolean => {
    const eErr = validateEmailValue(email)
    const pErr = mode === 'signUp' ? validatePasswordSignUp(password) : validatePasswordSignIn(password)
    setAttemptedAction(mode)
    setEmailTouched(true)
    setPasswordTouched(true)
    return !eErr && !pErr
  }

  const handleSignIn = async () => {
    clearError()
    setFormError(null)
    if (!runValidation('signIn')) return

    setSubmitting(true)
    try {
      await signIn(email, password)
      setAttemptedAction(null)
    } catch (e) {
      setAttemptedAction(null)
      setFormError(friendlyFirebaseAuthMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUp = async () => {
    clearError()
    setFormError(null)
    if (!runValidation('signUp')) return

    setSubmitting(true)
    try {
      await signUp(email, password)
      setAttemptedAction(null)
    } catch (e) {
      setAttemptedAction(null)
      setFormError(friendlyFirebaseAuthMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const contextMessage = error ? softenPublicErrorMessage(error) : null

  if (configError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm">
        {configError}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border bg-card p-6 space-y-5 shadow-sm">
      <p className="text-sm text-center text-muted-foreground">
        Log in with your email and password, or create an account.
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
            aria-invalid={emailError ? true : undefined}
            aria-describedby={showEmailMessages ? 'pt-email-help' : undefined}
            onBlur={() => setEmailTouched(true)}
            onChange={(e) => {
              setEmail(e.target.value)
              setAttemptedAction(null)
              setFormError(null)
              clearError()
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              emailError ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showEmailMessages && (
            <p
              id="pt-email-help"
              className={`mt-1 text-sm ${emailError ? 'text-red-700' : emailOk ? 'text-emerald-700' : 'text-muted-foreground'}`}
            >
              {emailError ?? (emailOk ? 'Looks good.' : '\u00a0')}
            </p>
          )}
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
            aria-invalid={passwordState.error ? true : undefined}
            aria-describedby={showPasswordMessages ? 'pt-password-help' : undefined}
            onBlur={() => setPasswordTouched(true)}
            onChange={(e) => {
              setPassword(e.target.value)
              setFormError(null)
              clearError()
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              passwordState.error ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showPasswordMessages && (
            <p
              id="pt-password-help"
              className={`mt-1 text-sm ${
                passwordState.error
                  ? 'text-red-700'
                  : passwordState.ok
                    ? 'text-emerald-700'
                    : 'text-muted-foreground'
              }`}
            >
              {passwordState.error ??
                passwordState.tip ??
                (passwordState.ok ? 'Meets the minimum length for a new account.' : '\u00a0')}
            </p>
          )}
        </div>
      </div>
      {(formError || contextMessage) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError || contextMessage}
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

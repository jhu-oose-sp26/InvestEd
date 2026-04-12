'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePaperTradingAuth } from '@/contexts/PaperTradingAuthContext'
import {
  getPasswordFieldState,
  validateDisplayName,
  validateEmailValue,
  validatePasswordConfirm,
  validatePasswordSignUp,
  validateUsernameOptional,
} from '@/lib/auth/emailPasswordValidation'
import { friendlyFirebaseAuthMessage } from '@/lib/auth/firebaseAuthMessages'
import { softenPublicErrorMessage } from '@/lib/userFacingMessages'

/**
 * Create account: name, email, password + confirmation. Uses Firebase sign-up
 * and server session (same flow as sign-in after auth state updates).
 */
export function PaperTradingRegisterCard() {
  const { signUp, error, clearError, configError } = usePaperTradingAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [nameTouched, setNameTouched] = useState(false)
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const showNameMessages = nameTouched || attemptedSubmit
  const showUsernameMessages = usernameTouched || attemptedSubmit
  const showEmailMessages = emailTouched || attemptedSubmit
  const showPasswordMessages = passwordTouched || attemptedSubmit
  const showConfirmMessages = confirmTouched || attemptedSubmit

  const nameError = showNameMessages ? validateDisplayName(name) : null
  const usernameError = showUsernameMessages ? validateUsernameOptional(username) : null
  const emailError = showEmailMessages ? validateEmailValue(email) : null
  const passwordState = getPasswordFieldState(password, 'signUp', showPasswordMessages)
  const confirmError =
    showConfirmMessages ? validatePasswordConfirm(password, confirmPassword) : null

  const nameOk = showNameMessages && !nameError && name.trim().length > 0
  const emailOk = showEmailMessages && !emailError && email.trim().length > 0

  const disabled =
    submitting || !name.trim() || !email.trim() || !password || !confirmPassword

  const runValidation = (): boolean => {
    setAttemptedSubmit(true)
    setNameTouched(true)
    setUsernameTouched(true)
    setEmailTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)
    const n = validateDisplayName(name)
    const u = validateUsernameOptional(username)
    const e = validateEmailValue(email)
    const p = validatePasswordSignUp(password)
    const c = validatePasswordConfirm(password, confirmPassword)
    return !n && !u && !e && !p && !c
  }

  const handleCreateAccount = async () => {
    clearError()
    setFormError(null)
    if (!runValidation()) return

    setSubmitting(true)
    try {
      await signUp(email, password, name.trim(), username.trim() || undefined)
      setAttemptedSubmit(false)
    } catch (err) {
      setFormError(friendlyFirebaseAuthMessage(err))
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
        Create your account with your name and email. Add an optional username for leaderboards, or we assign a
        unique account number.
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={name}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={showNameMessages ? 'reg-name-help' : undefined}
            onBlur={() => setNameTouched(true)}
            onChange={(e) => {
              setName(e.target.value)
              setFormError(null)
              clearError()
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              nameError ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showNameMessages && (
            <p
              id="reg-name-help"
              className={`mt-1 text-sm ${nameError ? 'text-red-700' : nameOk ? 'text-emerald-700' : 'text-muted-foreground'}`}
            >
              {nameError ?? (nameOk ? 'Looks good.' : '\u00a0')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-username" className="block text-sm font-medium mb-1">
            Username <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            value={username}
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={showUsernameMessages ? 'reg-username-help' : undefined}
            onBlur={() => setUsernameTouched(true)}
            onChange={(e) => {
              setUsername(e.target.value)
              setFormError(null)
              clearError()
            }}
            placeholder="letters, numbers, underscores"
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              usernameError ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showUsernameMessages && (
            <p
              id="reg-username-help"
              className={`mt-1 text-sm ${usernameError ? 'text-red-700' : 'text-muted-foreground'}`}
            >
              {usernameError ??
                (username.trim()
                  ? 'Shown on leaderboards instead of your account number.'
                  : 'Leave blank to use an auto-assigned account ID (e.g. IED-…).')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={showEmailMessages ? 'reg-email-help' : undefined}
            onBlur={() => setEmailTouched(true)}
            onChange={(e) => {
              setEmail(e.target.value)
              setFormError(null)
              clearError()
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              emailError ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showEmailMessages && (
            <p
              id="reg-email-help"
              className={`mt-1 text-sm ${emailError ? 'text-red-700' : emailOk ? 'text-emerald-700' : 'text-muted-foreground'}`}
            >
              {emailError ?? (emailOk ? 'Looks good.' : '\u00a0')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={passwordState.error ? true : undefined}
            aria-describedby={showPasswordMessages ? 'reg-password-help' : undefined}
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
              id="reg-password-help"
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
                (passwordState.ok ? 'Meets minimum length.' : '\u00a0')}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1">
            Confirm password
          </label>
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={showConfirmMessages ? 'reg-confirm-help' : undefined}
            onBlur={() => setConfirmTouched(true)}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setFormError(null)
              clearError()
            }}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              confirmError ? 'border-red-400 ring-1 ring-red-200' : ''
            }`}
          />
          {showConfirmMessages && (
            <p
              id="reg-confirm-help"
              className={`mt-1 text-sm ${confirmError ? 'text-red-700' : !confirmError && confirmPassword ? 'text-emerald-700' : 'text-muted-foreground'}`}
            >
              {confirmError ??
                (!confirmError && confirmPassword && password === confirmPassword
                  ? 'Passwords match.'
                  : '\u00a0')}
            </p>
          )}
        </div>
      </div>
      {(formError || contextMessage) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError || contextMessage}
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleCreateAccount()}
        disabled={disabled}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? '…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary underline underline-offset-4 hover:opacity-90"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

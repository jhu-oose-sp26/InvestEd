const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns a user-facing error message, or null if the value is valid. */
export function validateEmailValue(raw: string): string | null {
  const s = raw.trim()
  if (!s) return 'Enter your email address.'
  if (s.length > 254) return 'That email is too long.'
  if (!EMAIL_RE.test(s)) return 'Use a valid email address, like name@example.com.'
  return null
}

export function validatePasswordSignIn(raw: string): string | null {
  if (!raw) return 'Enter your password.'
  return null
}

export function validatePasswordSignUp(raw: string): string | null {
  if (!raw) return 'Choose a password.'
  if (raw.length < 6) return 'Use at least 6 characters.'
  if (raw.length > 128) return 'That password is too long.'
  return null
}

export type PasswordFieldState = {
  error: string | null
  /** Non-blocking hint when the password is too short for account creation */
  tip: string | null
  ok: boolean
}

/** Field messaging after blur or a submit attempt (attemptedAction may be null on blur-only). */
export function getPasswordFieldState(
  password: string,
  attemptedAction: 'signIn' | 'signUp' | null,
  showMessages: boolean
): PasswordFieldState {
  if (!showMessages) return { error: null, tip: null, ok: false }
  if (!password) {
    const msg = attemptedAction === 'signUp' ? 'Choose a password.' : 'Enter your password.'
    return { error: msg, tip: null, ok: false }
  }

  if (attemptedAction === 'signUp') {
    const err = validatePasswordSignUp(password)
    if (err) return { error: err, tip: null, ok: false }
    return { error: null, tip: null, ok: true }
  }

  if (password.length < 6) {
    return {
      error: null,
      tip: 'Use at least 6 characters if you’re creating a new account.',
      ok: false,
    }
  }
  return { error: null, tip: null, ok: true }
}

import { FirebaseError } from 'firebase/app'

export function isFirebaseAuthError(e: unknown): e is FirebaseError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as FirebaseError).code === 'string' &&
    (e as FirebaseError).code.startsWith('auth/')
  )
}

/** Plain-language message for sign-in / sign-up failures. */
export function friendlyFirebaseAuthMessage(e: unknown): string {
  if (isFirebaseAuthError(e)) {
    switch (e.code) {
      case 'auth/invalid-email':
        return 'Invalid email. Please try again.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'There is no account associated with this email and password. Please try again.'
      case 'auth/email-already-in-use':
        return 'This email is already in use.'
      case 'auth/weak-password':
        return 'Password too weak. Use at least 6 characters.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes, then try again.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      case 'auth/operation-not-allowed':
        return 'Account login isn’t available right now. Please try again later.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }
  if (e instanceof Error && e.message) {
    return e.message
  }
  return 'Something went wrong. Please try again.'
}

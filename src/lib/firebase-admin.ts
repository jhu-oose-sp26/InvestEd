import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app'

let app: App | null = null

function initFirebaseAdmin(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (json) {
    const credentials = JSON.parse(json) as Parameters<typeof cert>[0]
    app = initializeApp({ credential: cert(credentials) })
    return app
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    throw new Error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS (path to JSON)'
    )
  }

  app = initializeApp({ credential: applicationDefault() })
  return app
}

export function getFirebaseAdminApp(): App {
  try {
    return initFirebaseAdmin()
  } catch (e) {
    const hint =
      'Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON).'
    throw new Error(
      `Firebase Admin failed to initialize: ${e instanceof Error ? e.message : String(e)}. ${hint}`
    )
  }
}

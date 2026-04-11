import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app'

let app: App | null = null

/**
 * Strip optional surrounding " from .env and unescape \\n / \\".
 * Real newlines inside a quoted multiline PEM are kept as-is by the loader.
 */
function unwrapOptionalOuterQuotes(raw: string): string {
  const t = raw.trim().replace(/^\uFEFF/, '')
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
    return t
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
  }
  return t
}

function isPemPrivateKey(s: string): boolean {
  return s.includes('BEGIN PRIVATE KEY')
}

/**
 * Normalizes FIREBASE_SERVICE_ACCOUNT_KEY when it is full JSON in .env (quoted or not).
 */
function coerceServiceAccountJsonString(raw: string): string {
  let s = raw.trim().replace(/^\uFEFF/, '')

  if (s.startsWith('{')) {
    return s
  }

  if (s.startsWith('"')) {
    try {
      const parsed = JSON.parse(s)
      if (typeof parsed === 'string') {
        const inner = parsed.trim()
        if (inner.startsWith('{')) return inner
      }
    } catch {
      // continue
    }

    if (s.length >= 2 && s.endsWith('"')) {
      const inner = s
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\')
      if (inner.trim().startsWith('{')) {
        return inner.trim()
      }
    }
  }

  return s
}

function initFirebaseAdmin(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (raw) {
    const unwrapped = unwrapOptionalOuterQuotes(raw)

    // PEM-only (quoted multiline): needs project id + client email from same service account
    if (isPemPrivateKey(unwrapped)) {
      const projectId =
        process.env.FIREBASE_PROJECT_ID?.trim() ||
        process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
      const clientEmail =
        process.env.FIREBASE_CLIENT_EMAIL?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL?.trim()
      if (!projectId || !clientEmail) {
        const need: string[] = []
        if (!projectId) {
          need.push(
            'FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID (same as "project_id" in the service account .json)'
          )
        }
        if (!clientEmail) {
          need.push(
            'FIREBASE_CLIENT_EMAIL or NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL (same as "client_email" in that .json)'
          )
        }
        throw new Error(
          'Only the PEM is in FIREBASE_SERVICE_ACCOUNT_KEY. Firebase Admin also needs the project id and service account email from that same JSON file. Add to .env: ' +
            need.join('; ') +
            '.'
        )
      }
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: unwrapped,
        }),
      })
      return app
    }

    // Full service account JSON
    const jsonStr = coerceServiceAccountJsonString(raw)
    if (!jsonStr.startsWith('{')) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY must be PEM private key (with FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL) or full JSON starting with {.'
      )
    }
    let credentials: Parameters<typeof cert>[0]
    try {
      credentials = JSON.parse(jsonStr) as Parameters<typeof cert>[0]
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(
        `Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY: ${msg}. ` +
          'Use full .json contents, PEM + FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL, or GOOGLE_APPLICATION_CREDENTIALS=/path/to/file.json'
      )
    }
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
      'Use full service account .json as one variable, or PEM in FIREBASE_SERVICE_ACCOUNT_KEY plus FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL, or GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json'
    throw new Error(
      `Firebase Admin failed to initialize: ${e instanceof Error ? e.message : String(e)}. ${hint}`
    )
  }
}

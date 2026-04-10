import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { z } from 'zod'
import { getFirebaseAdminApp } from '@/lib/firebase-admin'
import {
  createSessionCookieFromIdToken,
  getOrCreateUserFromFirebase,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth/server'

export const runtime = 'nodejs'

const postBody = z.object({
  idToken: z.string().min(1, 'idToken is required'),
})

/**
 * POST — Exchange a fresh Firebase ID token for an HttpOnly session cookie (paper-trading sessions).
 * Client flow: sign in with Firebase Web SDK, then call this with { idToken }.
 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.json()
    const parsed = postBody.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { idToken } = parsed.data
    getFirebaseAdminApp()
    const auth = getAuth()
    const decoded = await auth.verifyIdToken(idToken)
    let user
    try {
      user = await getOrCreateUserFromFirebase(decoded.uid, decoded.email)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'EMAIL_CONFLICT' || msg === 'ACCOUNT_CONFLICT') {
        return NextResponse.json(
          { error: 'This email is already linked to another account' },
          { status: 409 }
        )
      }
      if (msg === 'NO_EMAIL') {
        return NextResponse.json(
          { error: 'Firebase account has no email' },
          { status: 400 }
        )
      }
      throw e
    }
    const sessionCookie = await createSessionCookieFromIdToken(idToken)

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, sessionCookieOptions())
    return res
  } catch (e) {
    console.error('POST /api/auth/session:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create session' },
      { status: 401 }
    )
  }
}

/** DELETE — Clear session cookie (sign out for server-side session). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  })
  return res
}

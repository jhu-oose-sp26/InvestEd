import { getAuth } from 'firebase-admin/auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getFirebaseAdminApp } from '@/lib/firebase-admin'

/** HttpOnly session cookie — use with POST /api/auth/session after client Firebase sign-in */
export const SESSION_COOKIE_NAME = 'invested_session'

/** Must stay within Firebase limits: 5 minutes … 14 days */
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

export function sessionCookieOptions(): {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: string
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  }
}

function getBearerToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  return h.slice(7).trim() || null
}

async function resolveDecodedUser(request: NextRequest) {
  getFirebaseAdminApp()
  const auth = getAuth()

  const bearer = getBearerToken(request)
  if (bearer) {
    const decoded = await auth.verifyIdToken(bearer)
    return decoded
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (session) {
    const decoded = await auth.verifySessionCookie(session, true)
    return decoded
  }

  return null
}

async function ensureEmail(uid: string, emailFromToken: string | undefined): Promise<string> {
  if (emailFromToken) return emailFromToken
  const auth = getAuth()
  const user = await auth.getUser(uid)
  if (user.email) return user.email
  throw new Error('NO_EMAIL')
}

/**
 * Links or creates a Prisma user for this Firebase account.
 * If an existing row has the same email but no firebaseUid, links it.
 */
export async function getOrCreateUserFromFirebase(
  uid: string,
  email: string | undefined,
  nameFromToken?: string | null
): Promise<User> {
  const emailNorm = await ensureEmail(uid, email)
  const nameNorm = nameFromToken?.trim() || null

  const byUid = await prisma.user.findUnique({ where: { firebaseUid: uid } })
  if (byUid) {
    if (emailNorm !== byUid.email) {
      const clash = await prisma.user.findUnique({ where: { email: emailNorm } })
      if (clash && clash.id !== byUid.id) {
        throw new Error('EMAIL_CONFLICT')
      }
      return prisma.user.update({
        where: { id: byUid.id },
        data: {
          email: emailNorm,
          ...(nameNorm && !byUid.name ? { name: nameNorm } : {}),
        },
      })
    }
    if (nameNorm && !byUid.name) {
      return prisma.user.update({
        where: { id: byUid.id },
        data: { name: nameNorm },
      })
    }
    return byUid
  }

  const byEmail = await prisma.user.findUnique({ where: { email: emailNorm } })
  if (byEmail) {
    if (byEmail.firebaseUid && byEmail.firebaseUid !== uid) {
      throw new Error('ACCOUNT_CONFLICT')
    }
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        firebaseUid: uid,
        ...(nameNorm && !byEmail.name ? { name: nameNorm } : {}),
      },
    })
  }

  return prisma.user.create({
    data: {
      firebaseUid: uid,
      email: emailNorm,
      name: nameNorm,
    },
  })
}

export type AuthSuccess = { ok: true; user: User }
export type AuthFailure = { ok: false; response: NextResponse }

export async function requireAuth(request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  try {
    const decoded = await resolveDecodedUser(request)
    if (!decoded?.uid) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Unauthorized — send a valid Bearer ID token or session cookie' },
          { status: 401 }
        ),
      }
    }
    const user = await getOrCreateUserFromFirebase(decoded.uid, decoded.email, decoded.name)
    return { ok: true, user }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'EMAIL_CONFLICT' || msg === 'ACCOUNT_CONFLICT') {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'This email is already linked to another account' },
          { status: 409 }
        ),
      }
    }
    if (msg === 'NO_EMAIL') {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Firebase account has no email — enable a provider that supplies email' },
          { status: 400 }
        ),
      }
    }
    console.error('requireAuth:', e)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
    }
  }
}

export async function assertPortfolioOwner(portfolioId: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    select: { id: true },
  })
  return portfolio
}

export async function createSessionCookieFromIdToken(idToken: string): Promise<string> {
  getFirebaseAdminApp()
  const auth = getAuth()
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS })
}

'use client'

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

/**
 * Browser Firebase app for sign-in / sign-up (Firebase JS SDK).
 * Env vars must use NEXT_PUBLIC_* — see .env.example.
 * After sign-in, call POST /api/auth/session with { idToken } to attach an HttpOnly session cookie for API routes.
 */
function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_* env vars for Firebase client')
  }
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }
}

let _app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app
  if (getApps().length) {
    _app = getApp()
    return _app
  }
  _app = initializeApp(getFirebaseConfig())
  return _app
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

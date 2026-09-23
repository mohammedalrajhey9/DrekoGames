import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCrZ0-JcYCC_pItuRI-u2nhQHk-04vdjeE',
  authDomain: 'dreko-games.firebaseapp.com',
  projectId: 'dreko-games',
  databaseURL: 'https://dreko-games-default-rtdb.firebaseio.com',
  storageBucket: 'dreko-games.firebasestorage.app',
  messagingSenderId: '151672330860',
  appId: '1:151672330860:web:28125238e981d08fd29649',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)

const rawEmulatorFlag = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_USE_FIREBASE_EMULATOR : undefined
const useEmulator = rawEmulatorFlag === 'true'
console.log('[firebase] mode:', useEmulator ? 'emulator' : 'live')

// Connect to local emulators only when explicitly enabled.
try {
  if (useEmulator) {
    try {
      connectFirestoreEmulator(db, '127.0.0.1', 18080)
      console.log('[firebase] connected Firestore emulator')
    } catch (e) {
      console.warn('[firebase] Firestore emulator unavailable. Run "npm run emulator:start" before login.', e)
    }
    try {
      connectDatabaseEmulator(rtdb, '127.0.0.1', 19000)
      console.log('[firebase] connected RTDB emulator')
    } catch (e) {
      console.warn('[firebase] RTDB emulator unavailable. Run "npm run emulator:start" before login.', e)
    }
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true })
      console.log('[firebase] connected Auth emulator')
    } catch (e) {
      console.warn('[firebase] Auth emulator unavailable. Run "npm run emulator:start" before login.', e)
    }
  }
} catch {}

export const firestoreConfig = {
  projectId: firebaseConfig.projectId,
  message: 'Firebase project ready for auth and Firestore.',
}


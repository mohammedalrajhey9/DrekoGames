const admin = require('firebase-admin')
const { getAuth } = require('firebase-admin/auth')
// Connect to emulator
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' })

const auth = getAuth()

async function run() {
  try {
    const user = await auth.createUser({
      email: 'admin@example.local',
      emailVerified: true,
      password: 'Password123!',
      displayName: 'Local Admin',
    })
    await auth.setCustomUserClaims(user.uid, { admin: true })
    console.log('Created admin user:', user.uid)
  } catch (err) {
    if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
      console.log('Admin user already exists')
    } else {
      console.error('Failed to create admin user', err)
      process.exit(1)
    }
  }
}

run()

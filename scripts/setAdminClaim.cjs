// Set custom admin claim for a specific user in Auth emulator
const admin = require('firebase-admin')
const { getAuth } = require('firebase-admin/auth')

process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' })
const auth = getAuth()

const uid = process.argv[2] || 'yurtcmg8jGX3tmRCyJFhCSU3Cobn'

async function run() {
  await auth.setCustomUserClaims(uid, { admin: true })
  console.log('Set admin claim for', uid)
}

run().catch((e) => { console.error(e); process.exit(1) })

// Reindex script for use with local Firestore emulator (no service account required)
const admin = require('firebase-admin')

// Ensure emulator host is set
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  // default emulator host used by `firebase emulators:start`
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
}

// Initialize admin SDK with only a projectId; when FIRESTORE_EMULATOR_HOST is set,
// admin.firestore() will connect to the emulator.
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' })

const { getFirestore } = require('firebase-admin/firestore')
const db = getFirestore()

async function run() {
  const usersRef = db.collection('users')
  const snapshot = await usersRef.get()
  console.log('Found', snapshot.size, 'users')
  let count = 0
  for (const doc of snapshot.docs) {
    const data = doc.data() || {}
    const displayName = (data.displayName || '').toString()
    const email = (data.email || '').toString()
    const updates = {}
    if (displayName) updates.displayNameLower = displayName.toLowerCase()
    if (email) updates.emailLower = email.toLowerCase()
    if (Object.keys(updates).length > 0) {
      await doc.ref.set(updates, { merge: true })
      count += 1
      if (count % 50 === 0) console.log('Processed', count)
    }
  }
  console.log('Done. Updated', count, 'documents.')
}

run().catch((err) => {
  console.error('Reindex failed', err)
  process.exit(1)
})

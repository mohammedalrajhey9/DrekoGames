// Node script to reindex existing Firestore users to add displayNameLower and emailLower fields.
// Usage:
// 1. Install dependencies: npm install firebase-admin
// 2. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
// 3. Run: node scripts/reindexDisplayName.js

const admin = require('firebase-admin')
const path = require('path')

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path before running this script.')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})

const db = admin.firestore()

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

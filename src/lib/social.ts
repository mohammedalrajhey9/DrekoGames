import { rtdb, db } from './firebase'
import { ref as rref, set as rset, onDisconnect, get as rget } from 'firebase/database'
import { collection, doc, setDoc, getDoc, query, onSnapshot, addDoc, serverTimestamp, orderBy, startAt, endAt, getDocs, where, deleteDoc } from 'firebase/firestore'

// Presence: write simple online/offline status in Realtime Database
export function setupPresence(uid: string) {
  try {
    const statusRef = rref(rtdb, `status/${uid}`)
    // mark online now
    rset(statusRef, { state: 'online', last_changed: Date.now() }).catch(() => {})
    // ensure offline on disconnect
    onDisconnect(statusRef).set({ state: 'offline', last_changed: Date.now() }).catch(() => {})

    // keep a listener open to update last_changed periodically (simple heartbeat)
    const interval = setInterval(() => {
      rset(statusRef, { state: 'online', last_changed: Date.now() }).catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  } catch (err) {
    return () => {}
  }
}

export async function getPresenceState(uid: string) {
  if (!uid) {
    return 'offline' as const
  }

  try {
    const statusRef = rref(rtdb, `status/${uid}`)
    const snapshot = await rget(statusRef)
    const state = snapshot.exists() ? snapshot.val()?.state : null
    return state === 'online' ? 'online' as const : 'offline' as const
  } catch {
    return 'offline' as const
  }
}

// Friend requests: write a request doc under collection 'friendRequests'
export async function sendFriendRequest(fromUid: string, toUid: string) {
  if (!fromUid || !toUid || fromUid === toUid) return null

  const targetSnap = await getDoc(doc(db, 'users', toUid))
  if (!targetSnap.exists()) {
    throw new Error('Target user not found.')
  }

  const requestSnap = await getDocs(collection(db, 'friendRequests'))
  const samePairDocs = requestSnap.docs.filter((d) => {
    const data = d.data() as any
    return (data.from === fromUid && data.to === toUid) || (data.from === toUid && data.to === fromUid)
  })

  const staleIds: string[] = []
  let hasActivePending = false

  for (const d of samePairDocs) {
    const data = d.data() as any
    if (data?.status === 'pending') {
      hasActivePending = true
      break
    }

    if (data?.status === 'accepted') {
      const fromFriendDoc = await getDoc(doc(db, `users/${fromUid}/friends/${toUid}`))
      const toFriendDoc = await getDoc(doc(db, `users/${toUid}/friends/${fromUid}`))

      if (fromFriendDoc.exists() && toFriendDoc.exists()) {
        hasActivePending = true
        break
      }

      staleIds.push(d.id)
      continue
    }

    staleIds.push(d.id)
  }

  if (hasActivePending) {
    return null
  }

  if (staleIds.length > 0) {
    await Promise.all(staleIds.map((id) => deleteDoc(doc(db, 'friendRequests', id))))
  }

  const col = collection(db, 'friendRequests')
  const docRef = await addDoc(col, {
    from: fromUid,
    to: toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function acceptFriendRequest(requestId: string) {
  const reqDoc = doc(db, 'friendRequests', requestId)
  const reqSnap = await getDoc(reqDoc)
  if (!reqSnap.exists()) return false
  const data = reqSnap.data() as any
  if (data.status !== 'pending') return false

  const senderUid = data.from
  const recipientUid = data.to

  await setDoc(doc(db, `users/${senderUid}/friends/${recipientUid}`), {
    uid: recipientUid,
    createdAt: serverTimestamp(),
  })

  await setDoc(doc(db, `users/${recipientUid}/friends/${senderUid}`), {
    uid: senderUid,
    createdAt: serverTimestamp(),
  })

  await setDoc(reqDoc, { status: 'accepted', respondedAt: serverTimestamp() }, { merge: true })
  return true
}

export async function removeFriend(uid: string, friendUid: string) {
  try {
    await deleteDoc(doc(db, `users/${uid}/friends/${friendUid}`))
    return true
  } catch {
    return false
  }
}

// Listen to friends list for a user (returns unsubscribe)
export function listenToFriends(uid: string, callback: (friends: Array<{ id: string; name?: string; status?: string; avatarUrl?: string }>) => void) {
  try {
    const friendsCol = collection(db, `users/${uid}/friends`)
    const unsub = onSnapshot(friendsCol as any, async (snapshot: any) => {
      try {
        const list: Array<{ id: string; name?: string; status?: string; avatarUrl?: string }> = []

        await Promise.all(snapshot.docs.map(async (docSnap: any) => {
          const fid = docSnap.id
          try {
            const [userDoc, presenceSnap] = await Promise.all([
              getDoc(doc(db, 'users', fid)),
              rget(rref(rtdb, `status/${fid}`)),
            ])

            const data = userDoc.exists() ? (userDoc.data() as any) : null
            const displayName = data?.displayName || ''
            const status = presenceSnap.exists() && presenceSnap.val()?.state === 'online' ? 'online' : 'offline'
            list.push({
              id: fid,
              name: displayName,
              status,
              avatarUrl: data?.avatarUrl || data?.photoURL || '',
            })
          } catch {
            list.push({ id: fid, name: '', status: 'offline', avatarUrl: '' })
          }
        }))

        callback(list)
      } catch (err) {
        console.warn('listenToFriends snapshot handler error', err)
      }
    }, (err: any) => {
      try { console.warn('listenToFriends onSnapshot error', err) } catch {}
    })
    return unsub
  } catch (err) {
    return () => {}
  }
}

// Search users by displayName prefix (case-sensitive-ish depending on stored names)
export async function searchUsersByName(qstr: string) {
  if (!qstr) return []
  const qlower = qstr.trim().toLowerCase()

  try {
    const usersCol = collection(db, 'users')
    const q1 = query(usersCol as any, orderBy('displayNameLower'), startAt(qlower), endAt(qlower + '\uf8ff'))
    const q2 = query(usersCol as any, orderBy('emailLower'), startAt(qlower), endAt(qlower + '\uf8ff'))
    const [snap1, snap2] = await Promise.all([getDocs(q1 as any), getDocs(q2 as any)])
    const map = new Map<string, any>()
    for (const d of snap1.docs) map.set(d.id, { uid: d.id, ...(d.data() as any) })
    for (const d of snap2.docs) map.set(d.id, { uid: d.id, ...(d.data() as any) })
    return Array.from(map.values())
  } catch {
    const usersSnap = await getDocs(collection(db, 'users'))
    return usersSnap.docs
      .map((docSnap) => ({ uid: docSnap.id, ...(docSnap.data() as any) }))
      .filter((user) => {
        const displayName = String(user.displayName || '').toLowerCase()
        const email = String(user.email || '').toLowerCase()
        return displayName.includes(qlower) || email.includes(qlower)
      })
      .slice(0, 12)
  }
}

export async function getUserProfile(uid: string) {
  if (!uid) return null
  const udoc = await getDoc(doc(db, 'users', uid))
  if (!udoc.exists()) return null
  const data = udoc.data() as any
  return {
    uid: udoc.id,
    ...data,
    avatarUrl: data?.avatarUrl || data?.photoURL || '',
    coverUrl: data?.coverUrl || '',
  }
}

export async function getFriendsOnce(uid: string) {
  if (!uid) return []

  try {
    const friendsCol = collection(db, `users/${uid}/friends`)
    const snap = await getDocs(friendsCol as any)
    const list: Array<any> = []
    for (const ds of snap.docs) {
      const fid = ds.id
      const userDoc = await getDoc(doc(db, 'users', fid))
      const udata = userDoc.exists() ? (userDoc.data() as any) : null
      const displayName = udata ? udata.displayName || '' : ''
      const avatarUrl = udata ? udata.avatarUrl || udata.photoURL || '' : ''
      list.push({ id: fid, name: displayName, avatarUrl })
    }
    return list
  } catch {
    return []
  }
}

export async function rejectFriendRequest(requestId: string) {
  try {
    const ref = doc(db, 'friendRequests', requestId)
    await deleteDoc(ref)
    return true
  } catch {
    return false
  }
}

export function listenIncomingFriendRequests(uid: string, callback: (requests: Array<{ id: string; from: string; to: string; createdAt?: any }>) => void) {
  try {
    const col = collection(db, 'friendRequests')
    const q = query(col as any, where('to', '==', uid), orderBy('createdAt'))
    const unsub = onSnapshot(q as any, async (snap: any) => {
        try {
          const items: Array<{ id: string; from: string; to: string; createdAt?: any }> = []
          for (const d of snap.docs) {
            try {
              const data = d.data() as any
              if (data && data.to === uid && data.status === 'pending') {
                items.push({ id: d.id, from: data.from, to: data.to, createdAt: data.createdAt })
              }
            } catch {
              // ignore malformed doc
            }
          }
          callback(items)
        } catch (err) {
          console.warn('listenIncomingFriendRequests snapshot handler error', err)
        }
    }, (err: any) => {
      try { console.warn('listenIncomingFriendRequests onSnapshot error', err) } catch {}
    })
    return unsub
  } catch {
    return () => {}
  }
}

export async function blockUser(uid: string, targetUid: string) {
  try {
    if (!uid || !targetUid) return false
    await setDoc(doc(db, `users/${uid}/blocks/${targetUid}`), { blockedAt: serverTimestamp() })
    return true
  } catch {
    return false
  }
}

export async function unblockUser(uid: string, targetUid: string) {
  try {
    if (!uid || !targetUid) return false
    await deleteDoc(doc(db, `users/${uid}/blocks/${targetUid}`))
    return true
  } catch {
    return false
  }
}

// Chat: create deterministic chat id for two users
export async function createOrGetChat(a: string, b: string) {
  const ids = [a, b].sort()
  const chatId = `${ids[0]}_${ids[1]}`
  const chatRef = doc(db, 'chats', chatId)
  const snap = await getDoc(chatRef)
  if (!snap.exists()) {
    await setDoc(chatRef, { participants: ids, createdAt: serverTimestamp() })
  }
  return chatId
}

export async function sendMessage(chatId: string, fromUid: string, text: string) {
  const messagesCol = collection(db, `chats/${chatId}/messages`)
  await addDoc(messagesCol, { from: fromUid, text, createdAt: serverTimestamp() })
}

export function listenToMessages(chatId: string, callback: (msgs: Array<{ id: string; from: string; text: string; ts: any }>) => void) {
  try {
    const messagesCol = collection(db, `chats/${chatId}/messages`)
    const q = query(messagesCol as any, orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q as any, (snap: any) => {
      try {
        const out: Array<{ id: string; from: string; text: string; createdAt: any }> = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))
        // normalize to ts field name expected by callers
        callback(out.map((o) => ({ id: o.id, from: (o as any).from, text: (o as any).text, ts: (o as any).createdAt })))
      } catch (err) {
        try { console.warn('listenToMessages snapshot handler error', err) } catch {}
      }
    }, (err: any) => {
      try { console.warn('listenToMessages onSnapshot error', err) } catch {}
    })
    return unsub
  } catch {
    return () => {}
  }
}

import { db } from '../firebase/config'
import {
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore'

const draftsCollection = (uid) => collection(db, `users/${uid}/drafts`)
const draftDoc = (uid, draftId) => doc(db, `users/${uid}/drafts/${draftId}`)

export async function saveDraft(uid, draft) {
  // Creates a new draft document
  const now = serverTimestamp()
  const docRef = await addDoc(draftsCollection(uid), {
    ...draft,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  })
  return docRef.id
}

export async function updateDraft(uid, draftId, draft) {
  await updateDoc(draftDoc(uid, draftId), {
    ...draft,
    status: 'draft',
    updatedAt: serverTimestamp()
  })
}

export async function getDraft(uid, draftId) {
  const snap = await getDoc(draftDoc(uid, draftId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function listDrafts(uid) {
  const q = query(draftsCollection(uid), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteDraft(uid, draftId) {
  await deleteDoc(draftDoc(uid, draftId))
}

import { db } from '../firebase/config'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

export async function listHostedQuizzes(uid, max = 50) {
  if (!uid) return []
  const quizzesRef = collection(db, 'quizzes')
  try {
    const q = query(
      quizzesRef,
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(max)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    const needsIndex = e?.code === 'failed-precondition' || (typeof e?.message === 'string' && e.message.includes('The query requires an index'))
    if (!needsIndex) throw e
    console.warn('Firestore composite index required for where(createdBy == uid) + orderBy(createdAt desc). Falling back to client-side sort. Consider creating the index in Firebase Console for better performance.', e?.message)

    const fallbackQ = query(quizzesRef, where('createdBy', '==', uid), limit(max))
    const snap = await getDocs(fallbackQ)
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    const toMillis = (v) => {
      if (!v) return 0
      try {
        if (typeof v?.toMillis === 'function') return v.toMillis()
        if (v?.seconds != null) return v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1e6 : 0)
        if (typeof v === 'string' || v instanceof Date) return new Date(v).getTime()
      } catch {}
      return 0
    }

    items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    return items
  }
}

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Generate a shareable link for a quiz
 * @param {string} quizId - The quiz ID (draft or completed)
 * @param {string} userId - The owner's user ID
 * @param {string} type - 'draft' or 'completed'
 * @returns {Promise<string>} - The share ID
 */
export const generateShareLink = async (quizId, userId, type = 'draft') => {
  try {
    // Generate a unique share ID
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create share document
    const shareData = {
      shareId,
      quizId,
      ownerId: userId,
      type, // 'draft' or 'completed'
      createdAt: serverTimestamp(),
      accessCount: 0,
      isActive: true
    }
    
    await setDoc(doc(db, 'quiz_shares', shareId), shareData)
    
    return shareId
  } catch (error) {
    console.error('Error generating share link:', error)
    throw new Error('Failed to generate share link')
  }
}

/**
 * Get quiz data from a share link
 * @param {string} shareId - The share ID from the URL
 * @returns {Promise<Object>} - Quiz data with share info
 */
export const getSharedQuiz = async (shareId) => {
  try {
    // Get share document
    const shareDoc = await getDoc(doc(db, 'quiz_shares', shareId))
    
    if (!shareDoc.exists()) {
      throw new Error('Share link not found or expired')
    }
    
    const shareData = shareDoc.data()
    
    if (!shareData.isActive) {
      throw new Error('Share link has been deactivated')
    }
    
    // Increment access count
    await updateDoc(doc(db, 'quiz_shares', shareId), {
      accessCount: shareData.accessCount + 1,
      lastAccessedAt: serverTimestamp()
    })
    
    // Get the actual quiz data
    let quizData = null
    
    if (shareData.type === 'draft') {
      // Get from drafts collection
      const draftDoc = await getDoc(doc(db, 'drafts', shareData.quizId))
      if (draftDoc.exists()) {
        quizData = { id: draftDoc.id, ...draftDoc.data() }
      }
    } else {
      // Get from quizzes collection
      const quizDoc = await getDoc(doc(db, 'quizzes', shareData.quizId))
      if (quizDoc.exists()) {
        quizData = { id: quizDoc.id, ...quizDoc.data() }
      }
    }
    
    if (!quizData) {
      throw new Error('Quiz not found')
    }
    
    return {
      ...quizData,
      shareInfo: {
        shareId: shareData.shareId,
        type: shareData.type,
        ownerId: shareData.ownerId,
        accessCount: shareData.accessCount + 1
      }
    }
  } catch (error) {
    console.error('Error getting shared quiz:', error)
    throw error
  }
}

/**
 * Create a copy of a shared quiz for editing
 * @param {string} originalQuizId - The original quiz ID
 * @param {string} newOwnerId - The new owner's user ID
 * @param {Object} quizData - The quiz data to copy
 * @returns {Promise<string>} - New draft ID
 */
export const createQuizCopy = async (originalQuizId, newOwnerId, quizData) => {
  try {
    const newDraftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create new draft with copied data
    const newDraftData = {
      ...quizData,
      id: newDraftId,
      createdBy: newOwnerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      originalQuizId, // Reference to original
      title: `${quizData.title} (Copy)`,
      status: 'draft'
    }
    
    // Remove share info from the copy
    delete newDraftData.shareInfo
    
    await setDoc(doc(db, 'drafts', newDraftId), newDraftData)
    
    return newDraftId
  } catch (error) {
    console.error('Error creating quiz copy:', error)
    throw new Error('Failed to create quiz copy')
  }
}

/**
 * Get all share links for a user's quizzes
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of share links
 */
export const getUserShareLinks = async (userId) => {
  try {
    const q = query(
      collection(db, 'quiz_shares'), 
      where('ownerId', '==', userId),
      where('isActive', '==', true)
    )
    
    const querySnapshot = await getDocs(q)
    const shareLinks = []
    
    querySnapshot.forEach((doc) => {
      shareLinks.push({ id: doc.id, ...doc.data() })
    })
    
    return shareLinks
  } catch (error) {
    console.error('Error getting user share links:', error)
    throw new Error('Failed to get share links')
  }
}

/**
 * Deactivate a share link
 * @param {string} shareId - The share ID to deactivate
 * @param {string} userId - The owner's user ID (for verification)
 * @returns {Promise<void>}
 */
export const deactivateShareLink = async (shareId, userId) => {
  try {
    const shareDoc = await getDoc(doc(db, 'quiz_shares', shareId))
    
    if (!shareDoc.exists()) {
      throw new Error('Share link not found')
    }
    
    const shareData = shareDoc.data()
    
    if (shareData.ownerId !== userId) {
      throw new Error('Unauthorized to deactivate this share link')
    }
    
    await updateDoc(doc(db, 'quiz_shares', shareId), {
      isActive: false,
      deactivatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error deactivating share link:', error)
    throw error
  }
}

/**
 * Generate full share URL
 * @param {string} shareId - The share ID
 * @returns {string} - Full shareable URL
 */
export const generateShareURL = (shareId) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/shared/${shareId}`
}

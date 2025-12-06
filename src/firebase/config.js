import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, collection, addDoc, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore'

// Your Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyADdBE6gn8_mkZQg-gjCwWrUQ8bCSGtHN0",
  authDomain: "quizverse-54259.firebaseapp.com",
  projectId: "quizverse-54259",
  storageBucket: "quizverse-54259.firebasestorage.app",
  messagingSenderId: "304440143780",
  appId: "1:304440143780:web:713b8693a2b2f0b3299b31",
  measurementId: "G-H4YKTDHGTK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

// Enhanced error handling for Firestore operations
const handleFirestoreError = (error, operation = 'Firestore operation') => {
  console.error(`${operation} failed:`, error)
  
  if (error.code === 'unavailable' || error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
    console.warn('🌐 Network unavailable. Operating in offline mode...')
    return true // Indicate retry should be attempted
  }
  
  if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    console.error('🚫 Request blocked by ad blocker or browser extension')
    console.log('💡 Try: Disable ad blockers or whitelist Firebase domains')
  }
  
  if (error.message?.includes('ERR_QUIC_PROTOCOL_ERROR')) {
    console.error('🌐 Network protocol error detected')
    console.log('💡 Try: Different network or disable QUIC in browser settings')
  }
  
  return false
}

// Retry wrapper for Firestore operations
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const shouldRetry = handleFirestoreError(error, `Attempt ${attempt}/${maxRetries}`)
      
      if (attempt === maxRetries || !shouldRetry) {
        throw error
      }
      
      console.log(`⏳ Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}

// Enhanced test function with retry logic
export const testFirebaseConnection = async () => {
  return withRetry(async () => {
    console.log('Testing Firebase connection...')
    const testRef = await addDoc(collection(db, 'test'), {
      test: true,
      timestamp: serverTimestamp()
    })
    console.log('Firebase connection successful! Test document ID:', testRef.id)
    return true
  })
}

export default app


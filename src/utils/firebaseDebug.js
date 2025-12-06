import { db } from '../firebase/config'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'

export class FirebaseDebugger {
  constructor() {
    this.connectionStatus = 'unknown'
    this.lastError = null
    this.retryCount = 0
    this.maxRetries = 3
  }

  // Test basic Firestore connectivity
  async testConnection() {
    console.log('🔍 Testing Firebase Firestore connection...')
    
    try {
      // Test write operation
      const testRef = await addDoc(collection(db, 'connectivity_test'), {
        timestamp: serverTimestamp(),
        test: 'connection_check',
        userAgent: navigator.userAgent
      })
      
      console.log('✅ Write test successful:', testRef.id)
      
      // Test read operation
      const snapshot = await getDocs(collection(db, 'connectivity_test'))
      console.log('✅ Read test successful, documents:', snapshot.size)
      
      this.connectionStatus = 'connected'
      this.lastError = null
      return { success: true, message: 'Firebase connection is working properly' }
      
    } catch (error) {
      console.error('❌ Firebase connection failed:', error)
      this.connectionStatus = 'failed'
      this.lastError = error
      
      return { 
        success: false, 
        error: error.code || error.message,
        details: this.analyzeError(error)
      }
    }
  }

  // Analyze common Firebase errors
  analyzeError(error) {
    const errorCode = error.code || error.message
    
    if (errorCode.includes('ERR_BLOCKED_BY_CLIENT')) {
      return {
        type: 'BLOCKED_BY_CLIENT',
        description: 'Request blocked by browser extension or ad blocker',
        solutions: [
          'Disable ad blockers (uBlock Origin, AdBlock Plus, etc.)',
          'Whitelist Firebase domains in your ad blocker',
          'Try in incognito/private browsing mode',
          'Check browser extensions that might block requests'
        ]
      }
    }
    
    if (errorCode.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      return {
        type: 'QUIC_PROTOCOL_ERROR',
        description: 'QUIC protocol error - network connectivity issue',
        solutions: [
          'Try disabling QUIC in Chrome: chrome://flags/#enable-quic',
          'Check your network firewall settings',
          'Try a different network connection',
          'Contact your network administrator if on corporate network'
        ]
      }
    }
    
    if (errorCode.includes('permission-denied')) {
      return {
        type: 'PERMISSION_DENIED',
        description: 'Firestore security rules are blocking the operation',
        solutions: [
          'Check Firestore security rules in Firebase Console',
          'Ensure user is properly authenticated',
          'Verify document path permissions'
        ]
      }
    }
    
    if (errorCode.includes('unavailable')) {
      return {
        type: 'SERVICE_UNAVAILABLE',
        description: 'Firebase service is temporarily unavailable',
        solutions: [
          'Wait a few minutes and try again',
          'Check Firebase Status page',
          'Implement retry logic with exponential backoff'
        ]
      }
    }
    
    return {
      type: 'UNKNOWN_ERROR',
      description: 'Unknown Firebase error',
      solutions: [
        'Check browser console for more details',
        'Verify Firebase configuration',
        'Check network connectivity'
      ]
    }
  }

  // Retry mechanism with exponential backoff
  async retryOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`)
        const result = await operation()
        console.log('✅ Operation successful on attempt', attempt)
        return result
      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error.message)
        
        if (attempt === maxRetries) {
          throw error
        }
        
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, attempt - 1) * 1000
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Check network connectivity
  async checkNetworkConnectivity() {
    console.log('🌐 Checking network connectivity...')
    
    try {
      // Test basic internet connectivity
      const response = await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache'
      })
      
      console.log('✅ Basic internet connectivity: OK')
      
      // Test Firebase specific domains
      const firebaseTests = [
        'https://firestore.googleapis.com',
        'https://firebase.googleapis.com'
      ]
      
      for (const url of firebaseTests) {
        try {
          await fetch(url, { mode: 'no-cors', cache: 'no-cache' })
          console.log(`✅ ${url}: Reachable`)
        } catch (error) {
          console.warn(`❌ ${url}: Not reachable -`, error.message)
        }
      }
      
    } catch (error) {
      console.error('❌ Network connectivity check failed:', error)
      return false
    }
    
    return true
  }

  // Generate diagnostic report
  async generateDiagnosticReport() {
    console.log('📋 Generating Firebase diagnostic report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionStatus: this.connectionStatus,
      lastError: this.lastError,
      tests: {}
    }
    
    // Run connectivity tests
    report.tests.networkConnectivity = await this.checkNetworkConnectivity()
    report.tests.firebaseConnection = await this.testConnection()
    
    console.log('📊 Diagnostic Report:', report)
    return report
  }
}

// Export singleton instance
export const firebaseDebugger = new FirebaseDebugger()

// Utility functions for common operations with retry logic
export const safeFirestoreOperation = async (operation, context = 'Firestore operation') => {
  try {
    return await firebaseDebugger.retryOperation(operation)
  } catch (error) {
    console.error(`${context} failed after retries:`, error)
    
    const analysis = firebaseDebugger.analyzeError(error)
    console.group('🔧 Troubleshooting suggestions:')
    analysis.solutions.forEach(solution => console.log(`• ${solution}`))
    console.groupEnd()
    
    throw error
  }
}

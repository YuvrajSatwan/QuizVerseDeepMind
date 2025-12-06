import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  reload
} from 'firebase/auth'
import { auth } from '../firebase/config'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Reload user to get latest emailVerified status
        await reload(user)
        setCurrentUser({
          ...user,
          emailVerified: user.emailVerified
        })
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (error) {
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      setAuthLoading(true)
      setEmailVerificationSent(false)
      
      // Create user account
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const user = result.user
      
      // Update user profile with display name
      if (displayName) {
        await updateProfile(user, { displayName })
      }
      
      // Send email verification
      await sendEmailVerification(user, {
        url: window.location.origin + '/create', // Redirect back to create page after verification
        handleCodeInApp: false
      })
      
      setEmailVerificationSent(true)
      return user
    } catch (error) {
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const signInWithEmail = async (email, password) => {
    try {
      setAuthLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)
      const user = result.user
      
      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.')
      }
      
      return user
    } catch (error) {
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const resendEmailVerification = async () => {
    try {
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser, {
          url: window.location.origin + '/create',
          handleCodeInApp: false
        })
        setEmailVerificationSent(true)
        return true
      }
      return false
    } catch (error) {
      throw error
    }
  }

  const resetPassword = async (email) => {
    try {
      setAuthLoading(true)
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/create',
        handleCodeInApp: false
      })
      return true
    } catch (error) {
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const refreshUser = async () => {
    try {
      if (currentUser && !currentUser.isGuest) {
        await reload(currentUser)
        const updatedUser = auth.currentUser
        setCurrentUser({
          ...updatedUser,
          emailVerified: updatedUser.emailVerified
        })
        return updatedUser
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const signInAsGuest = () => {
    // For guest users, we'll create a temporary user object
    const guestUser = {
      uid: `guest_${Date.now()}`,
      displayName: 'Guest User',
      email: null,
      isGuest: true
    }
    setCurrentUser(guestUser)
    return guestUser
  }

  const signOut = async () => {
    try {
      if (currentUser?.isGuest) {
        setCurrentUser(null)
      } else {
        await firebaseSignOut(auth)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    currentUser,
    signInWithGoogle,
    signInAsGuest,
    signUpWithEmail,
    signInWithEmail,
    resendEmailVerification,
    resetPassword,
    refreshUser,
    signOut,
    loading,
    authLoading,
    emailVerificationSent
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}


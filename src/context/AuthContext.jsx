import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase'
import { getFriendlyAuthErrorMessage } from '../utils/authErrors'

const AuthContext = createContext(null)

/**
 * Custom hook to access authentication context throughout the application.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(() => isFirebaseConfigured())
  const [authError, setAuthError] = useState(null)

  // Synchronize React state with Firebase Auth state via onAuthStateChanged
  useEffect(() => {
    // If Firebase isn't configured or auth is not initialized, warn developer and exit early
    if (!isFirebaseConfigured() || !auth) {
      console.warn(
        '[AuthContext] Firebase environment variables appear to be missing or incomplete. ' +
        'Please check your .env file.'
      )
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Expose safe, useful profile properties — never store or touch passwords
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          // Raw Firebase user reference if underlying token operations are needed
          firebaseUser: user
        })
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    }, (error) => {
      console.error('[AuthContext] onAuthStateChanged error:', error)
      setAuthError(getFriendlyAuthErrorMessage(error))
      setLoading(false)
    })

    // Unsubscribe from listener when provider unmounts
    return () => unsubscribe()
  }, [])

  /**
   * Triggers the Google OAuth sign-in popup.
   * Google handles identity verification; Firebase handles session & account provisioning.
   */
  const loginWithGoogle = async () => {
    setAuthError(null)

    if (!isFirebaseConfigured() || !auth || !googleProvider) {
      const errorMsg = 'Firebase configuration is missing or incomplete. Please add your credentials to the .env file.'
      setAuthError(errorMsg)
      throw new Error(errorMsg)
    }

    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (err) {
      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }

  /**
   * Signs the current user out of Firebase.
   */
  const logout = async () => {
    setAuthError(null)
    if (!auth) {
      setCurrentUser(null)
      return
    }
    try {
      await signOut(auth)
      setCurrentUser(null)
    } catch (err) {
      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }

  const clearAuthError = () => {
    setAuthError(null)
  }

  const value = {
    currentUser,
    loading,
    authError,
    loginWithGoogle,
    logout,
    clearAuthError,
    isConfigured: isFirebaseConfigured()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

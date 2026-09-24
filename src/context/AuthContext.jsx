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
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return sessionStorage.getItem('guestMode') === 'true'
    } catch {
      return false
    }
  })
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Authenticated Firebase session overrides guest mode
        sessionStorage.removeItem('guestMode')
        setIsGuest(false)

        // Expose safe, useful profile properties — never store or touch passwords
        const baseUserData = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          role: 'user',
          // Raw Firebase user reference if underlying token operations are needed
          firebaseUser: user
        }
        setCurrentUser(baseUserData)

        // Synchronize authenticated Firebase user with MongoDB backend
        try {
          const idToken = await user.getIdToken()
          const response = await fetch('http://localhost:5000/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
              name: user.displayName,
              email: user.email,
              photoURL: user.photoURL
            })
          })

          if (response.ok) {
            const data = await response.json()
            if (data?.user) {
              setCurrentUser((prev) => ({
                ...prev,
                role: data.user.role || 'user',
                mongoUser: data.user
              }))
            }
          } else {
            console.warn('[AuthContext] Backend sync returned status:', response.status)
          }
        } catch (syncErr) {
          // If backend is unavailable, do not break Firebase login itself
          console.warn('[AuthContext] Backend user sync unavailable (server may be offline):', syncErr.message)
        }
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
   * Activates Guest Mode for read-only browsing without Firebase Authentication.
   * Persists in sessionStorage so closing the browser/tab ends guest access.
   */
  const continueAsGuest = () => {
    try {
      sessionStorage.setItem('guestMode', 'true')
    } catch (e) {
      console.error('Failed to set guest session in sessionStorage', e)
    }
    setIsGuest(true)
    setAuthError(null)
  }

  /**
   * Exits Guest Mode and clears guest session.
   */
  const exitGuestMode = () => {
    try {
      sessionStorage.removeItem('guestMode')
    } catch (e) {
      console.error('Failed to clear guest session', e)
    }
    setIsGuest(false)
  }

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
      exitGuestMode()
      return result.user
    } catch (err) {
      const friendlyMessage = getFriendlyAuthErrorMessage(err)
      setAuthError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }

  /**
   * Signs the current user out of Firebase and clears guest mode.
   */
  const logout = async () => {
    setAuthError(null)
    exitGuestMode()

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
    isGuest,
    loading,
    authError,
    continueAsGuest,
    exitGuestMode,
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


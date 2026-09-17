import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

/**
 * National Weather Intelligence Platform (SIH-2)
 * Firebase Modular SDK v11+ Configuration
 * 
 * All sensitive configuration parameters are loaded strictly from environment
 * variables via Vite's `import.meta.env` to ensure zero hardcoded secrets.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

/**
 * Helper to check whether Firebase environment credentials have been properly set.
 * Returns true only when valid, non-empty, non-placeholder keys are present.
 */
export const isFirebaseConfigured = () => {
  const apiKey = firebaseConfig.apiKey
  const projectId = firebaseConfig.projectId

  return Boolean(
    apiKey &&
    projectId &&
    typeof apiKey === 'string' &&
    apiKey.trim() !== '' &&
    typeof projectId === 'string' &&
    projectId.trim() !== '' &&
    apiKey !== 'your_api_key_here' &&
    projectId !== 'your_project_id'
  )
}

// Safely initialize Firebase only when valid configuration is detected
// This prevents uncaught module-load exceptions (auth/invalid-api-key) when .env is pending
let app = null
let auth = null
let googleProvider = null

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    })
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error)
  }
} else {
  console.warn(
    '[Firebase] Configuration credentials are not set in .env. ' +
    'Add your VITE_FIREBASE_* variables to enable live Google authentication.'
  )
}

export { app, auth, googleProvider }
export default app

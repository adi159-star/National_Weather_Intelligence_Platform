/**
 * Translates Firebase Authentication error codes into human-friendly messages.
 * Prevents exposing raw, confusing technical exceptions directly to users.
 * 
 * @param {Error|object} error - The error thrown by Firebase Authentication
 * @returns {string} User-friendly error message
 */
export function getFriendlyAuthErrorMessage(error) {
  if (!error) return ''

  const errorCode = error.code || ''

  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before completing. Please try again.'
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please enable popups for this site.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled due to another popup opening. Please try again.'
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your internet connection and try again.'
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact platform administrators.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in the Firebase Console. Please enable Google under Authentication > Sign-in method.'
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.':
      return 'Invalid Firebase API Key. Please verify your .env configuration.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations. Add localhost to Authorized Domains in Firebase Console.'
    case 'auth/invalid-credential':
      return 'Authentication credentials were not recognized or have expired. Please try signing in again.'
    default:
      // If error already carries a user-crafted message
      if (error.message && !error.message.includes('Firebase:')) {
        return error.message
      }
      return 'Authentication failed. Please verify your internet connection and try again.'
  }
}

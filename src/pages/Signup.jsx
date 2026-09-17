import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CloudSunRain, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Signup Page — National Weather Intelligence Platform
 * 
 * In Firebase Authentication with Google OAuth, first-time Google sign-in
 * automatically registers and provisions the user record in Firebase Auth.
 * No custom account registration, fake role selector, or password creation is needed.
 */
export default function Signup() {
  const { loginWithGoogle, currentUser, authError, clearAuthError, isConfigured } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/user', { replace: true })
    }
  }, [currentUser, navigate])

  const handleGoogleSignup = async () => {
    try {
      setLocalError('')
      clearAuthError()
      setIsSubmitting(true)

      // Calls Google OAuth via Firebase Modular SDK
      await loginWithGoogle()

      // Redirect immediately to User Dashboard upon account creation/sign-in
      navigate('/user', { replace: true })
    } catch (err) {
      setLocalError(err.message || 'Google registration could not be completed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeError = localError || authError

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-950">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 mb-4">
            <CloudSunRain className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-sky-400 block mb-1">
            Join the Intelligence Network
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
            Get instant access to real-time Doppler radar feeds, disaster telemetry, and meteorological analytics.
          </p>
        </div>

        {/* Configuration Notice */}
        {!isConfigured && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-300">Firebase Setup Required</span>
              Configure your Firebase keys in <code className="bg-amber-950/60 px-1 py-0.5 rounded text-[11px] font-mono">.env</code> to activate Google registration.
            </div>
          </div>
        )}

        {/* Error Notification */}
        {activeError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-300">Registration Notice</span>
              <p className="mt-0.5 leading-relaxed">{activeError}</p>
            </div>
          </div>
        )}

        {/* Benefits list */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Instant verification via official Google OAuth 2.0</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>No passwords to memorize, leak, or manage</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Automatic profile synchronization (name, email, and photo)</span>
          </div>
        </div>

        {/* Primary Working Action: Sign up with Google */}
        <div className="space-y-4">
          <button
            id="google-signup-btn"
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{isSubmitting ? 'Registering with Google...' : 'Sign up with Google'}</span>
          </button>

          {/* Security note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Google authentication establishes verified identity. Platform roles (User / Admin) are managed securely on the server, not via client checkboxes.
            </span>
          </div>
        </div>

        {/* Existing User Redirect */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link
              to="/login"
              className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 transition-colors"
            >
              Sign in to your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CloudSunRain, AlertCircle, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Login Page — National Weather Intelligence Platform
 * Real Google OAuth 2.0 via Firebase Authentication + Guest Mode access.
 * 
 * Note: Google OAuth automatically handles account creation for new users
 * upon first sign-in. There is no need for a separate custom registration step.
 */
export default function Login() {
  const { 
    loginWithGoogle, 
    currentUser, 
    isGuest, 
    continueAsGuest, 
    authError, 
    clearAuthError, 
    isConfigured,
    loading
  } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already logged in or in guest mode
  useEffect(() => {
    if (loading) return
    if (isGuest) {
      navigate('/dashboard', { replace: true })
    } else if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [currentUser, isGuest, loading, navigate])

  const handleGoogleLogin = async () => {
    try {
      setLocalError('')
      clearAuthError()
      setIsSubmitting(true)

      // Initiates real Firebase Google Auth popup
      const user = await loginWithGoogle()

      // Determine authenticated role directly from verified MongoDB backend record
      if (user) {
        try {
          const idToken = await user.getIdToken()
          const syncRes = await fetch('http://localhost:5000/api/users/sync', {
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
          if (syncRes.ok) {
            const syncData = await syncRes.json()
            if (syncData?.user?.role === 'admin') {
              navigate('/admin', { replace: true })
              return
            }
          }
        } catch (syncErr) {
          console.warn('Backend sync check error:', syncErr)
        }
      }

      // Normal users redirect to /dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setLocalError(err.message || 'Google sign-in could not be completed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestLogin = () => {
    setLocalError('')
    clearAuthError()
    continueAsGuest()
    navigate('/dashboard', { replace: true })
  }

  const activeError = localError || authError

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-950">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 mb-4">
            <CloudSunRain className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-sky-400 block mb-1">
            National Weather Big Data Analytics Platform
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Sign in with your verified Google identity to access disaster feeds & telemetry
          </p>
        </div>

        {/* Configuration Notice (if .env is unpopulated) */}
        {!isConfigured && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-300">Firebase Setup Required</span>
              Add your Firebase credentials to <code className="bg-amber-950/60 px-1 py-0.5 rounded text-[11px] font-mono">.env</code> to activate live Google authentication.
            </div>
          </div>
        )}

        {/* Friendly Error Banner */}
        {activeError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-300">Sign-in Notice</span>
              <p className="mt-0.5 leading-relaxed">{activeError}</p>
            </div>
          </div>
        )}

        {/* Primary Working Auth Button: Continue with Google */}
        <div className="space-y-4">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              /* Google G Icon SVG */
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
            <span>{isSubmitting ? 'Authenticating with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Guest Access Option */}
          <button
            id="guest-signin-btn"
            type="button"
            onClick={handleGuestLogin}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700 font-medium text-xs sm:text-sm transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Continue as Guest (Read-Only Access)</span>
          </button>

          {/* Context Explanatory Note */}
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300">Identity Security:</span> Authentication uses Firebase's official OAuth 2.0 flow. Passwords are never collected or stored by this application.
          </div>

          {/* Visual Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium tracking-wider">
                Platform Access
              </span>
            </div>
          </div>

          {/* Visual-only traditional inputs (disabled/informational) */}
          <div className="space-y-3 opacity-60">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Institutional Email (Optional)
              </label>
              <input
                type="email"
                disabled
                placeholder="name@imd.gov.in"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Access Password
              </label>
              <input
                type="password"
                disabled
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Direct email/password login is reserved for future institutional SSO. Use Google above.
            </p>
          </div>
        </div>

        {/* Signup Redirect Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 transition-colors"
            >
              Sign up
            </Link>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            (Google automatically registers new accounts on first sign-in)
          </p>
        </div>
      </div>
    </div>
  )
}

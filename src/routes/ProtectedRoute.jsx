import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CloudSunRain, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute component.
 * 
 * 1. Waits while Firebase initial authentication state is resolving (loading === true).
 * 2. If unauthenticated (!currentUser) -> redirects user to /login, preserving target URL.
 * 3. If authenticated -> permits access to user routes.
 * 4. Includes clear structure for future backend role-checking (e.g. role === 'admin').
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // 1. Loading State: Display high-aesthetic meteorological loader while Firebase resolves auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/25 animate-pulse">
            <CloudSunRain className="w-8 h-8" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-sky-500/20 animate-spin pointer-events-none" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex items-center gap-2 text-sky-400 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing Identity with Satellite Ground Station...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Firebase Authentication Service
        </p>
      </div>
    )
  }

  // 2. Unauthenticated check: Redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Conceptual Role Verification Architecture for Admin Routes:
  //
  // Authenticated User
  //       ↓
  //   Check Role (Custom Claims / Backend DB)
  //       ↓
  //  role === 'admin'?
  //   ├── Yes ──> Render Admin Operations Center
  //   └── No  ──> Render Access Denied / Backend Connection Pending Notice
  //
  // In Phase 3, if requireAdmin is true, the user's verified token claims will be checked.
  // Currently, the AdminDashboard component itself gracefully communicates this requirement.
  if (requireAdmin && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

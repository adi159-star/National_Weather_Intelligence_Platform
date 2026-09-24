import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CloudSunRain, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * AdminRoute Component
 * 
 * Strict Role-Based Access Control (RBAC):
 * 1. Waits for authentication & MongoDB role synchronization to finish (loading === true).
 * 2. Unauthenticated visitors are redirected to /login.
 * 3. Guest observers are redirected to /dashboard.
 * 4. Authenticated normal users (currentUser.role !== 'admin') are redirected to /dashboard.
 * 5. ONLY users with verified MongoDB role === 'admin' and isGuest === false can access.
 */
export default function AdminRoute({ children }) {
  const { currentUser, isGuest, loading } = useAuth()
  const location = useLocation()

  // 1. Loading state: Do not redirect while Firebase & MongoDB sync are resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/25 animate-pulse">
            <CloudSunRain className="w-8 h-8" />
          </div>
          <div
            className="absolute -inset-2 rounded-3xl border border-amber-500/20 animate-spin pointer-events-none"
            style={{ animationDuration: '3s' }}
          />
        </div>
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying Administrative Authority...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Meteorological Access Control Service
        </p>
      </div>
    )
  }

  // 2. Unauthenticated visitors -> redirect to /login (preserving target path)
  if (!currentUser && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Guests -> redirect to /dashboard
  if (isGuest) {
    return <Navigate to="/dashboard" replace />
  }

  // 4. Authenticated users without admin role -> redirect to /dashboard
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // 5. Authorized Admin: allow access
  return children
}

import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { 
  CloudSunRain, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Database, 
  Lock, 
  CheckCircle2 
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

/**
 * Landing Page Component (Route: /)
 * Introduces the National Weather Big Data Analytics Platform with direct
 * access to authentication and dashboards.
 */
function HomePage() {
  const { currentUser, isGuest } = useAuth()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Hero Card */}
      <main className="relative z-10 max-w-3xl w-full bg-slate-900/70 border border-slate-800/80 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-2xl shadow-sky-950/20 text-center">
        
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs sm:text-sm font-medium tracking-wide mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Phase 2 — Real Google Authentication & Guest Access</span>
        </div>

        {/* Weather Icon */}
        <div className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25">
          <CloudSunRain className="w-10 h-10" />
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          National Weather Big Data Analytics Platform
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Real-time weather reports, crowdsourced ground observations, INSAT telemetry, and disaster intelligence for India.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          {currentUser ? (
            <Link
              to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>{currentUser.role === 'admin' ? 'Go to Admin Portal' : 'Go to User Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : isGuest ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Go to Dashboard (Guest Mode)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/signup"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all duration-200"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Admin Gateway link rendered ONLY for verified MongoDB admin users */}
          {currentUser?.role === 'admin' && !isGuest && (
            <Link
              to="/admin"
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-medium text-sm border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          )}
        </div>

        {/* Foundation Status Grid */}
        <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Identity Provider</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <CheckCircle2 className="w-4 h-4 text-sky-400" /> Firebase Modular SDK
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Authentication Flow</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Real Google OAuth 2.0
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Role Security</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Database className="w-4 h-4" /> Server RBAC Prepared
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-xs text-slate-400 tracking-wide text-center">
        Smart India Hackathon (SIH) — National Weather Intelligence Platform
      </footer>
    </div>
  )
}

/**
 * Root Application Layout and Router Configuration
 */
export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* State-aware navigation bar */}
        <Navbar />

        {/* Application Page Routing */}
        <div className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected User Dashboard Routes: permits authenticated users and read-only guests */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowGuest={true}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user"
              element={
                <ProtectedRoute allowGuest={true}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Route: strictly verified MongoDB role === 'admin' and isGuest === false */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Fallback wildcard redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  )
}

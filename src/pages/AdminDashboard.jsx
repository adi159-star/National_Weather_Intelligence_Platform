import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Lock, Server, KeyRound, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Admin Dashboard — Restricted Area
 * 
 * In a secure cloud architecture, client-side email matching (e.g. email === 'admin@gmail.com')
 * or client-side passwords are NOT secure because any client code can be bypassed in DevTools.
 * Real admin authorization requires verified server-side claims or database roles.
 */
export default function AdminDashboard() {
  const { currentUser } = useAuth()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
        
        {/* Lock / Security Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold mb-3">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Role-Based Access Control (RBAC)</span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          Admin Authorization Restricted
        </h1>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Admin authorization will be connected to the backend in the next phase.
        </p>

        {/* Security Architecture Explanation Card */}
        <div className="text-left p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 mb-6 text-xs text-slate-400">
          <div className="flex items-start gap-2.5">
            <Server className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block">Why is this route locked?</span>
              Google OAuth only authenticates <em className="text-sky-300">who</em> you are (Identity). It does not determine <em className="text-sky-300">what</em> privileges you hold (Authorization).
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block">Secure Token Verification</span>
              In Phase 3, our backend will verify user ID tokens and attach cryptographically signed Custom Claims (<code className="text-emerald-300 font-mono text-[11px]">role: "admin"</code>).
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block">Zero Hardcoded Secrets</span>
              No client-side admin passwords or email matching strings (<code className="text-rose-300 font-mono text-[11px]">email === "admin@..."</code>) exist in this application.
            </div>
          </div>
        </div>

        {currentUser && (
          <p className="text-xs text-slate-500 mb-5">
            Logged in as: <span className="text-slate-400 font-medium">{currentUser.email}</span> (Standard User)
          </p>
        )}

        <Link
          to="/user"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to User Dashboard</span>
        </Link>
      </div>
    </div>
  )
}

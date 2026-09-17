import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CloudSunRain, LogOut, User, Menu, X, BarChart3, FilePlus2, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Reusable Navbar for National Weather Big Data Analytics Platform.
 * Displays state-aware navigation links based on user authentication.
 */
export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
      setMobileMenuOpen(false)
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group transition-opacity hover:opacity-95"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
              <CloudSunRain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block leading-none">
                NWBDAP
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-sky-400 block mt-0.5">
                National Weather Intel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {currentUser ? (
              <>
                <Link
                  to="/user"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                    isActive('/user')
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                <a
                  href="#submit-report"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors inline-flex items-center gap-1.5"
                >
                  <FilePlus2 className="w-4 h-4" />
                  Submit Report
                </a>

                <a
                  href="#analytics"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors inline-flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </a>

                {/* Profile pill */}
                <div className="flex items-center gap-2.5 ml-2 pl-3 border-l border-slate-800">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User Profile'}
                      className="w-8 h-8 rounded-full border border-sky-500/40 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="hidden lg:block text-left max-w-[130px]">
                    <span className="text-xs font-semibold text-slate-200 truncate block">
                      {currentUser.displayName || 'Authenticated User'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                  title="Sign out of Firebase"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/login')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md shadow-sky-500/20 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            {currentUser && (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-sky-500/40">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Profile'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-full h-full p-1 text-slate-400" />
                )}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-5 space-y-2">
          {currentUser ? (
            <>
              <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 mb-3">
                <p className="text-sm font-semibold text-white truncate">
                  {currentUser.displayName || 'Observer'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {currentUser.email}
                </p>
              </div>

              <Link
                to="/user"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Dashboard
              </Link>
              <a
                href="#submit-report"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Submit Weather Report
              </a>
              <a
                href="#analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Analytics
              </a>

              <button
                onClick={handleLogout}
                className="w-full mt-2 text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 rounded-lg text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-400"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

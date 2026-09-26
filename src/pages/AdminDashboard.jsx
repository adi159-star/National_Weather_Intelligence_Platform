import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  MapPin, 
  AlertTriangle, 
  User, 
  LogOut, 
  ArrowLeft,
  Calendar,
  Copy,
  Radio,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL, safeFetchJson, authenticatedFetch } from '../config/api'
import WeatherMap from '../components/WeatherMap'
import AnalyticsCharts from '../components/AnalyticsCharts'

/**
 * AdminDashboard Component
 * 
 * Accessible ONLY to authenticated users with verified MongoDB role === 'admin'.
 * Provides real-time metrics, a pending report verification queue, and
 * a complete tabular registry of submitted crowdsourced observations.
 */
export default function AdminDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [visiblePendingCount, setVisiblePendingCount] = useState(5)
  const pendingQueueRef = useRef(null)

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError('')
      setVisiblePendingCount(5)
      const [reportsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/weather-reports`).then(safeFetchJson),
        fetch(`${API_BASE_URL}/api/analytics/summary`).then(safeFetchJson)
      ])

      if (!reportsRes.ok) {
        throw new Error(reportsRes.error || `Failed to load weather reports (Status: ${reportsRes.status})`)
      }

      if (reportsRes.data?.success && Array.isArray(reportsRes.data.reports)) {
        setReports(reportsRes.data.reports)
      } else {
        setReports([])
      }

      if (summaryRes.ok && summaryRes.data?.summary) {
        setSummary(summaryRes.data.summary)
      }
    } catch (err) {
      console.error('Error fetching admin reports & analytics:', err)
      setError(err.message || 'Unable to connect to weather reports service')
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async (reportId, status) => {
    try {
      setActionInProgress(reportId)

      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/weather-reports/${reportId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
          firebaseUser: currentUser?.firebaseUser
        }
      )

      const res = await safeFetchJson(response)
      if (!res.ok) {
        throw new Error(res.error || `Failed to update status (Status: ${res.status})`)
      }

      // Update local report verification status immediately
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, verificationStatus: status } : r))
      )

      // Refresh live MongoDB analytics metrics in background
      fetch(`${API_BASE_URL}/api/analytics/summary`)
        .then(safeFetchJson)
        .then((sRes) => {
          if (sRes.ok && sRes.data?.summary) {
            setSummary(sRes.data.summary)
          }
        })
        .catch((e) => console.warn('Summary refresh warning:', e))
    } catch (err) {
      console.error('Error updating status:', err)
      alert(err.message || 'Error updating status')
    } finally {
      setActionInProgress(null)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Admin logout error:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Calculate live verification & multi-source analytics statistics
  const totalCount = summary?.totalReports ?? reports.length
  const pendingCount = summary?.pendingReports ?? reports.filter((r) => r.verificationStatus === 'pending').length
  const verifiedCount = summary?.verifiedReports ?? reports.filter((r) => r.verificationStatus === 'verified').length
  const rejectedCount = summary?.rejectedReports ?? reports.filter((r) => r.verificationStatus === 'rejected').length
  const duplicateCount = summary?.duplicateReports ?? reports.filter((r) => r.isDuplicate === true).length
  const citizenCount = summary?.citizenReports ?? reports.filter((r) => !r.sourceType || r.sourceType === 'citizen').length
  const apiCount = summary?.weatherApiReports ?? reports.filter((r) => r.sourceType === 'weather_api').length
  const socialPublicCount = summary 
    ? (summary.socialReports || 0) + (summary.publicDatasetReports || 0)
    : reports.filter((r) => r.sourceType === 'social' || r.sourceType === 'public_dataset').length

  const pendingReports = reports.filter((r) => r.verificationStatus === 'pending')
  const totalPending = pendingReports.length
  const visiblePendingReports = pendingReports.slice(0, visiblePendingCount)

  const handleShowMorePending = () => {
    setVisiblePendingCount((prev) => Math.min(prev + 5, totalPending))
  }

  const handleShowLessPending = () => {
    setVisiblePendingCount(5)
    if (pendingQueueRef.current) {
      pendingQueueRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const formatLocation = (city, state) => {
    if (city && state) return `${city}, ${state}`
    if (city) return city
    if (state) return state
    return 'Location unavailable'
  }

  const formatEventType = (type) => {
    if (!type) return 'Other'
    const map = {
      rainfall: 'Rainfall',
      heavy_rain: 'Heavy Rain',
      thunderstorm: 'Thunderstorm',
      flooding: 'Flooding',
      heatwave: 'Heatwave',
      fog: 'Fog',
      dust_storm: 'Dust Storm',
      strong_wind: 'Strong Wind',
      other: 'Other'
    }
    const clean = type.toLowerCase()
    if (map[clean]) return map[clean]
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'N/A'
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Admin Banner */}
      <section className="bg-gradient-to-b from-amber-500/10 via-slate-900/60 to-transparent border-b border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Admin Identity Credentials */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Admin'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-amber-500/60 object-cover shadow-lg shadow-amber-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-9 h-9" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 bg-amber-500 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-slate-950" />
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>National Administration Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {currentUser?.displayName || 'Administrator'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                <span>{currentUser?.email}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Role: admin (Verified in MongoDB)
                </span>
              </p>
            </div>
          </div>

          {/* Action Links & Sign Out */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>User Dashboard</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Signing out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Metric Overview Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Report Verification Metrics
            </h2>
            <button
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {/* Total Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Total
                </span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {totalCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">All ingested records</p>
            </div>

            {/* Pending Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Pending
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400 tracking-tight">
                {pendingCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting verification</p>
            </div>

            {/* Verified Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Verified
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                {verifiedCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Ground-truth verified</p>
            </div>

            {/* Rejected Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Rejected
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-400 tracking-tight">
                {rejectedCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Flagged or invalid</p>
            </div>

            {/* Duplicate Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Duplicates
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Copy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-300 tracking-tight">
                {duplicateCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Detected & flagged</p>
            </div>

            {/* Citizen Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Citizen
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-indigo-300 tracking-tight">
                {citizenCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Crowdsourced</p>
            </div>

            {/* API Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  API Feeds
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Radio className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-teal-300 tracking-tight">
                {apiCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Open-Meteo & IMD</p>
            </div>

            {/* Social / Public Reports */}
            <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Social/Public
                </span>
                <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-fuchsia-300 tracking-tight">
                {socialPublicCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Social & Open Data</p>
            </div>
          </div>
        </section>

        {/* Section: Interactive India Weather Mapbox Map */}
        <section>
          <WeatherMap height="520px" />
        </section>

        {/* Section: Big Data Analytics & Trend Visualizations */}
        <section>
          <AnalyticsCharts />
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchReports}
              className="text-xs underline text-rose-300 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Section 1: Pending Verification Queue */}
        <section ref={pendingQueueRef} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Pending Verification Queue</h2>
                <p className="text-xs text-slate-400">Reports submitted by citizens awaiting admin authorization</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {pendingCount} Pending
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RotateCw className="w-5 h-5 text-amber-400 animate-spin mx-auto mb-2" />
              Loading pending verification queue...
            </div>
          ) : pendingReports.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-300 font-medium">All reports processed</p>
              <p className="text-slate-500 mt-0.5">There are currently no reports awaiting verification.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visiblePendingReports.map((report) => (
                  <div
                    key={report._id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Header: Location & Status */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{formatLocation(report.city, report.state)}</span>
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Pending Verification
                        </span>
                      </div>

                      {/* Meteorological Details & AI Metadata Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <span className="text-xs text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          Event: {formatEventType(report.eventType)}
                        </span>
                        <span className="text-xs text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          AI: {formatEventType(report.aiClassification || report.eventType)} ({report.aiConfidence !== null && report.aiConfidence !== undefined ? `${Math.round(report.aiConfidence * 100)}%` : 'Rule-based'})
                        </span>
                        <span className="text-xs text-slate-300 font-mono capitalize bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
                          Src: {(report.sourceType || 'citizen').replace('_', ' ')}
                        </span>
                        {report.isDuplicate ? (
                          <span className="text-[10px] font-semibold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Duplicate
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                            Original Report
                          </span>
                        )}
                      </div>

                      {/* Ground Description */}
                      <p className="text-xs text-slate-300 mb-3 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                        "{report.description}"
                      </p>

                      {/* Metadata Footer (No user email exposed) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {report.userName || 'Anonymous Observer'}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDateTime(report.reportedAt || report.createdAt)}
                        </span>
                      </div>

                      {report.latitude && report.longitude && (
                        <div className="mt-1.5 text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                          <span>GPS: {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}</span>
                        </div>
                      )}
                    </div>

                    {/* Functional Action Buttons */}
                    <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => updateReportStatus(report._id, 'rejected')}
                        disabled={actionInProgress === report._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-rose-500/50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{actionInProgress === report._id ? 'Updating...' : 'Reject'}</span>
                      </button>
                      <button
                        onClick={() => updateReportStatus(report._id, 'verified')}
                        disabled={actionInProgress === report._id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-emerald-500/50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{actionInProgress === report._id ? 'Updating...' : 'Verify'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls: Show More / Show Less */}
              {!loading && totalPending > 5 && (
                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Showing {visiblePendingReports.length} of {totalPending} pending reports
                  </span>

                  <div className="flex items-center gap-2">
                    {visiblePendingCount > 5 && (
                      <button
                        type="button"
                        onClick={handleShowLessPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                        id="show-less-pending-btn"
                      >
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {visiblePendingCount < totalPending && (
                      <button
                        type="button"
                        onClick={handleShowMorePending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                        id="show-more-pending-btn"
                      >
                        <span>Show More</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Section 2: Complete Weather Reports Registry Table */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Weather Reports Registry</h2>
                <p className="text-xs text-slate-400">Complete database records from all reporting channels</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Records: {reports.length}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RotateCw className="w-5 h-5 text-sky-400 animate-spin mx-auto mb-2" />
              Loading database registry...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
              <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p>No weather reports recorded in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Observer</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Phenomenon</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Coordinates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {reports.map((report) => {
                    const status = report.verificationStatus || 'pending'
                    const statusBadge =
                      status === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

                    return (
                      <tr key={report._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {formatDateTime(report.reportedAt || report.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                          {report.userName || 'Anonymous'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono text-slate-300 capitalize">
                            {(report.sourceType || 'citizen').replace('_', ' ')}
                          </span>
                          {report.isDuplicate && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              DUP
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatLocation(report.city, report.state)}
                        </td>
                        <td className="py-3 px-4 text-sky-400 font-medium whitespace-nowrap">
                          {formatEventType(report.eventType)}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate" title={report.description}>
                          {report.description}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {report.latitude && report.longitude
                            ? `${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)}`
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          {status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateReportStatus(report._id, 'verified')}
                                disabled={actionInProgress === report._id}
                                title="Authorize report"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Verify</span>
                              </button>
                              <button
                                onClick={() => updateReportStatus(report._id, 'rejected')}
                                disabled={actionInProgress === report._id}
                                title="Dismiss report"
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3 text-rose-400" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : status === 'verified' ? (
                            <span className="text-[11px] text-emerald-400/90 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-400/90 font-medium inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Radio,
  LogOut,
  FileText,
  Send,
  BarChart2,
  User,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertTriangle,
  Compass,
  LogIn,
  Lock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { API_BASE_URL, safeFetchJson, authenticatedFetch } from '../config/api'
import WeatherMap from '../components/WeatherMap'

/**
 * User Dashboard — National Weather Intelligence Platform
 * Supports both verified Google identity users and read-only Guest observers.
 */
export default function UserDashboard() {
  const { currentUser, isGuest, logout, exitGuestMode } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Weather Reports Feed State
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState(null)
  const [reportsLoading, setReportsLoading] = useState(true)
  const [reportsError, setReportsError] = useState("")

  // Feed Pagination & Filter State (Confined View: 5 Initial Reports)
  const INITIAL_VISIBLE_COUNT = 5
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [eventFilter, setEventFilter] = useState('all')
  const weatherReportsRef = useRef(null)

  const fetchReports = async () => {
    try {
      setReportsLoading(true)
      setReportsError('')
      // Reset visible count to 5 on new data refresh
      setVisibleCount(INITIAL_VISIBLE_COUNT)
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
      console.error('Error fetching weather reports & analytics:', err)
      setReportsError(err.message || 'Unable to connect to weather reports service')
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleFilterChange = (filter) => {
    setEventFilter(filter)
    setVisibleCount(INITIAL_VISIBLE_COUNT)
  }

  // Filter compatibility: filter reports first, then apply visible limit
  const filteredReports = reports.filter((report) => {
    if (eventFilter === 'all') return true
    return (report.eventType || '').toLowerCase() === eventFilter.toLowerCase()
  })

  // Performance optimization: only render the currently visible subset (0 to visibleCount)
  const visibleReports = filteredReports.slice(0, visibleCount)
  const totalCount = filteredReports.length

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, filteredReports.length))
  }

  const handleShowLess = () => {
    setVisibleCount(5)
    if (weatherReportsRef.current) {
      weatherReportsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const formatReportTime = (dateStr) => {
    if (!dateStr) return 'Just now'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffSec = Math.floor((now - date) / 1000)

      if (diffSec < 60) return 'Just now'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return 'Recent'
    }
  }

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'verified':
        return {
          label: 'Verified',
          className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }
      case 'pending':
      default:
        return {
          label: 'Pending',
          className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }
    }
  }

  // Weather Report Form State
  const [showReportForm, setShowReportForm] = useState(false)
  const [eventType, setEventType] = useState('rainfall')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  const handleGetLocation = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        let msg = 'Unable to retrieve location coordinates.'
        if (error.code === 1) {
          msg = 'Location access denied. Please allow location permissions in your browser.'
        } else if (error.code === 2) {
          msg = 'Location position unavailable.'
        } else if (error.code === 3) {
          msg = 'Location request timed out.'
        }
        setLocationError(msg)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCloseForm = () => {
    setShowReportForm(false)
    setSubmitError(null)
    setSubmitSuccess(null)
    setLocationError(null)
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!currentUser || !currentUser.firebaseUser) {
      setSubmitError('Authentication required. Please sign in to submit a report.')
      return
    }

    if (!eventType.trim()) {
      setSubmitError('Please select a valid event type.')
      return
    }

    if (!description.trim()) {
      setSubmitError('Please enter a description for the weather observation.')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        eventType: eventType.trim(),
        description: description.trim(),
        city: city.trim(),
        state: state.trim(),
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined
      }

      // Automatically handles token expiration, auto-refresh via getIdToken(true), and 401 retry
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/weather-reports`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          firebaseUser: currentUser?.firebaseUser
        }
      )

      const res = await safeFetchJson(response)

      if (!res.ok) {
        throw new Error(res.error || res.data?.message || 'Failed to submit weather report')
      }

      setSubmitSuccess('Weather report submitted successfully. It is now pending verification.')


      // Refresh live reports feed
      fetchReports()

      // Reset form fields
      setEventType('rainfall')
      setDescription('')
      setCity('')
      setState('')
      setLatitude('')
      setLongitude('')
      setLocationError(null)

      // Automatically close form after short delay
      setTimeout(() => {
        setShowReportForm(false)
        setSubmitSuccess(null)
      }, 3500)
    } catch (err) {
      console.error('Error submitting weather report:', err)
      setSubmitError(err.message || 'An error occurred while submitting the report.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      if (isGuest) {
        exitGuestMode()
      } else {
        await logout()
      }
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleExitGuest = () => {
    exitGuestMode()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Banner / Welcome Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-transparent border-b border-slate-800/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

          {/* User / Guest Profile Card */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {isGuest ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/90 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <Compass className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
              ) : currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google Profile'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-sky-500/50 object-cover shadow-lg shadow-sky-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
                  <User className="w-8 h-8" />
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${isGuest ? 'bg-emerald-500' : 'bg-emerald-500'
                }`}>
                <CheckCircle2 className="w-3 h-3 text-slate-950" />
              </span>
            </div>

            <div>
              {isGuest ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-1">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Guest Mode (Read-Only)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Welcome, Guest Observer
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Viewing real-time public weather telemetry. Sign in to file ground-truth reports.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Verified Google Identity</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Welcome, {currentUser?.displayName || 'Meteorological Analyst'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{currentUser?.email}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      UID: {currentUser?.uid ? `${currentUser.uid.slice(0, 10)}...` : 'N/A'}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action Button: Logout or Exit Guest Mode */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            {isGuest ? (
              <button
                onClick={handleExitGuest}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Account</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Log Out'}</span>
              </button>
            )}
          </div>
        </div>
      </section>


      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {/* Real-time Telemetry Stat Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              National Ingestion Metrics
            </h2>
            <span className="text-xs text-slate-400">Updated Real-Time via Satellite</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Ground Stations Active"
              value="4,821"
              change="+18 today"
              trend="up"
              icon={Radio}
              description="IMD and automated weather sensor networks"
            />
            <StatCard
              title="Citizen Reports Filed"
              value="14,290"
              change="+312% vs avg"
              trend="up"
              icon={FileText}
              description="Crowdsourced ground-truth observations"
            />
            <StatCard
              title="Active Severe Alerts"
              value="7 Alerts"
              change="Bay of Bengal"
              trend="warning"
              icon={AlertTriangle}
              description="Pre-monsoon cyclonic depression tracking"
            />
            <StatCard
              title="Doppler Radar Uptime"
              value="99.94%"
              change="Optimal"
              trend="neutral"
              icon={Layers}
              description="S-Band dual polarization telemetry"
            />
          </div>
        </section>

        {/* Dashboard Operational Grid (Placeholders as specified) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Section 1: Weather Reports */}
          <section
            ref={weatherReportsRef}
            className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white">Weather Reports</h2>
                      {!reportsLoading && !reportsError && (
                        <span className="text-[11px] font-mono text-slate-400">
                          ({filteredReports.length})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Recent verified observation feeds from field observers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={eventFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-sky-500 transition-colors cursor-pointer"
                    aria-label="Filter weather reports by event"
                  >
                    <option value="all">All Events ({reports.length})</option>
                    <option value="rainfall">Rainfall</option>
                    <option value="thunderstorm">Thunderstorm</option>
                    <option value="flooding">Flooding</option>
                    <option value="heatwave">Heatwave</option>
                    <option value="fog">Fog</option>
                    <option value="dust_storm">Dust Storm</option>
                    <option value="strong_wind">Strong Wind</option>
                    <option value="snowfall">Snowfall</option>
                    <option value="weather_observation">Observation</option>
                    <option value="other">Other</option>
                  </select>
                  <span className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 text-slate-300 shrink-0">
                    Live Feed
                  </span>
                </div>
              </div>

              {/* Weather Reports Feed List */}
              <div className="space-y-3">
                {reportsLoading ? (
                  <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <div className="inline-block w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-slate-400">Loading live weather reports...</p>
                  </div>
                ) : reportsError ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{reportsError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchReports}
                      className="text-[11px] underline text-rose-300 hover:text-white cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs">
                    <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p>{eventFilter === 'all' ? 'No weather reports submitted yet.' : `No reports found for ${eventFilter.replace('_', ' ')}.`}</p>
                  </div>
                ) : (
                  visibleReports.map((report) => {
                    const badge = getVerificationBadge(report.verificationStatus)
                    return (
                      <div
                        key={report._id}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700/80 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">
                                {formatLocation(report.city, report.state)}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                              {report.severity && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300">
                                  {report.severity}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-sky-400/90 font-medium mt-0.5">
                              {formatEventType(report.eventType)}
                            </p>
                            {report.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {report.temp && (
                            <span className="text-sm font-bold text-slate-200 block">
                              {report.temp}
                            </span>
                          )}
                          <span className="block text-[11px] text-slate-500">
                            {formatReportTime(report.reportedAt || report.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Pagination Controls: Show More / Show Less */}
            {!reportsLoading && !reportsError && totalCount > 5 && (
              <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing {visibleReports.length} of {totalCount} reports
                </span>

                <div className="flex items-center gap-2">
                  {visibleCount > 5 && (
                    <button
                      type="button"
                      onClick={handleShowLess}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                      id="show-less-reports-btn"
                    >
                      <span>Show Less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {visibleCount < totalCount && (
                    <button
                      type="button"
                      onClick={handleShowMore}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/50 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
                      id="show-more-reports-btn"
                    >
                      <span>Show More</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Submit Weather Report */}
          <section id="submit-report" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Submit Weather Report</h2>
                    <p className="text-xs text-slate-400">Crowdsourced ground-truth data entry</p>
                  </div>
                </div>
                {showReportForm && !isGuest && (
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isGuest ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300 block mb-0.5">
                        Verified Identity Required
                      </span>
                      <p className="text-amber-200/90 text-[11px] leading-relaxed">
                        Ground-truth reports require an authenticated Google identity to maintain meteorological data integrity.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 opacity-60">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>GPS Geolocation Tag:</span>
                      <span className="text-slate-500 font-mono text-[11px]">Requires sign-in</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>Reporter Identity:</span>
                      <span className="text-slate-500 font-mono text-[11px]">Guest (Read-Only)</span>
                    </div>
                  </div>
                </div>
              ) : showReportForm ? (
                /* Report Submission Form */
                <form onSubmit={handleSubmitReport} className="space-y-3.5 mt-1">
                  {submitSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{submitSuccess}</p>
                        <button
                          type="button"
                          onClick={handleCloseForm}
                          className="mt-1 text-[11px] underline text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        >
                          Close Form
                        </button>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="font-medium flex-1">{submitError}</p>
                    </div>
                  )}

                  {/* Event Type Select */}
                  <div>
                    <label htmlFor="report-event-type" className="block text-xs font-medium text-slate-300 mb-1">
                      Event Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="report-event-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      required
                    >
                      <option value="rainfall">Rainfall</option>
                      <option value="thunderstorm">Thunderstorm</option>
                      <option value="flooding">Flooding</option>
                      <option value="heatwave">Heatwave</option>
                      <option value="fog">Fog</option>
                      <option value="dust_storm">Dust Storm</option>
                      <option value="strong_wind">Strong Wind</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label htmlFor="report-description" className="block text-xs font-medium text-slate-300 mb-1">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      id="report-description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Observed conditions (e.g. intense downpour, localized waterlogging, gale gusts)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
                      required
                    />
                  </div>

                  {/* City and State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="report-city" className="block text-xs font-medium text-slate-300 mb-1">
                        City / District
                      </label>
                      <input
                        id="report-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Prayagraj"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="report-state" className="block text-xs font-medium text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        id="report-state"
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Uttar Pradesh"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Latitude and Longitude with Browser Geolocation button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">
                        GPS Coordinates
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{isLocating ? 'Detecting...' : 'Use my current location'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        id="report-latitude"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="Latitude (e.g. 25.4358)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                      <input
                        id="report-longitude"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="Longitude (e.g. 81.8463)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    {locationError && (
                      <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{locationError}</span>
                      </p>
                    )}
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      disabled={submitting}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Authenticated Observer Intro Card */
                <>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    As a verified observer (<span className="text-sky-400 font-medium">{currentUser?.displayName || 'User'}</span>), your submission will be cross-correlated against INSAT-3D satellite feeds and nearby AWS telemetry.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>GPS Geolocation Tag:</span>
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Auto-detected via Browser
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>Reporter Identity:</span>
                      <span className="text-slate-200 truncate max-w-[150px]">{currentUser?.email}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isGuest ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-3 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Sign in to submit a weather report</span>
              </button>
            ) : !showReportForm ? (
              <button
                type="button"
                onClick={() => setShowReportForm(true)}
                className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Launch Field Reporting Form</span>
              </button>
            ) : null}
          </section>


          {/* Section 3: Interactive Weather Map */}
          <div className="lg:col-span-2">
            <WeatherMap height="450px" />
          </div>

          {/* Section 4: Analytics Overview */}
          <section id="analytics" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Live Telemetry Analytics</h2>
                  <p className="text-xs text-slate-400">Multi-source ingest & ground-truth validation</p>
                </div>
              </div>

              {/* Live analytics distribution */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Ground-Truth Ingested</span>
                    <span className="text-sky-400 font-semibold font-mono">{summary?.totalReports ?? reports.length} Records</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Verified Observations</span>
                    <span className="text-emerald-400 font-semibold font-mono">
                      {summary?.verifiedReports ?? reports.filter(r => r.verificationStatus === 'verified').length} Verified
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.round(((summary?.verifiedReports || 0) / Math.max(1, summary?.totalReports || 1)) * 100))}%` 
                      }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Citizen Crowdsourced</span>
                    <span className="text-indigo-400 font-semibold font-mono">
                      {summary?.citizenReports ?? 0} Reports
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.round(((summary?.citizenReports || 0) / Math.max(1, summary?.totalReports || 1)) * 100))}%` 
                      }} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Weather API & Sensor Feeds</span>
                    <span className="text-teal-400 font-semibold font-mono">
                      {summary?.weatherApiReports ?? 0} Feeds
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.round(((summary?.weatherApiReports || 0) / Math.max(1, summary?.totalReports || 1)) * 100))}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-purple-400 font-medium">Big Data Ingestion:</span>
              <span className="text-emerald-400 font-mono text-[11px]">Active • Synchronized</span>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

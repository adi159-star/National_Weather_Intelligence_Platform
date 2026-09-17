import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Radio, 
  LogOut, 
  FileText, 
  Send, 
  BarChart2, 
  Map as MapIcon, 
  User, 
  CheckCircle2, 
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'

/**
 * User Dashboard — National Weather Intelligence Platform
 * Displayed for authenticated users with Google identity verification.
 */
export default function UserDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
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
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Banner / Welcome Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-transparent border-b border-slate-800/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* User Profile Card */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {currentUser?.photoURL ? (
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
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-slate-950" />
              </span>
            </div>

            <div>
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
            </div>
          </div>

          {/* Action Button: Logout */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
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
          <section className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Weather Reports</h2>
                  <p className="text-xs text-slate-400">Recent verified observation feeds from field observers</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                Live Feed
              </span>
            </div>

            {/* Weather Reports Feed List Placeholder */}
            <div className="space-y-3">
              {[
                { location: 'Visakhapatnam, AP', event: 'Heavy Gusts & Torrential Rain', severity: 'Severe', time: '12m ago', temp: '26°C' },
                { location: 'Pune, MH', event: 'Localized Cloudburst Activity', severity: 'Moderate', time: '28m ago', temp: '24°C' },
                { location: 'Bhubaneswar, OD', event: 'Coastal High Tide Surge Warning', severity: 'Watch', time: '45m ago', temp: '29°C' }
              ].map((report, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700/80 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-sky-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{report.location}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          report.severity === 'Severe' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {report.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{report.event}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-200">{report.temp}</span>
                    <span className="block text-[11px] text-slate-500">{report.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Submit Weather Report */}
          <section id="submit-report" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Submit Weather Report</h2>
                  <p className="text-xs text-slate-400">Crowdsourced ground-truth data entry</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                As a verified observer (<span className="text-sky-400 font-medium">{currentUser?.displayName || 'User'}</span>), your submission will be cross-correlated against INSAT-3D satellite feeds and nearby AWS telemetry.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>GPS Geolocation Tag:</span>
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Auto-detected
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Reporter Identity:</span>
                  <span className="text-slate-200 truncate max-w-[150px]">{currentUser?.email}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Launch Field Reporting Form</span>
            </button>
          </section>

          {/* Section 3: Interactive Weather Map */}
          <section className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Weather Map & Radar GIS</h2>
                  <p className="text-xs text-slate-400">Spatial visualization of precipitation, cloud cover & storm paths</p>
                </div>
              </div>
              <span className="text-xs text-sky-400 font-mono">INSAT-3DR Multispectral</span>
            </div>

            {/* Map Placeholder Graphic */}
            <div className="w-full h-64 rounded-xl bg-slate-950 border border-slate-800/80 relative overflow-hidden flex flex-col items-center justify-center text-center p-6 group">
              {/* Decorative grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                  <MapIcon className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Interactive GIS Weather Map (Phase 3 Integration)
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Leaflet / Mapbox GIS engine will render real-time Doppler radar reflectivity contours, cyclone tracks, and AWS sensor clusters.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Analytics Overview */}
          <section id="analytics" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Analytics</h2>
                  <p className="text-xs text-slate-400">Big Data anomaly detection</p>
                </div>
              </div>

              {/* Mini analytics progress bars */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Data Stream Validation</span>
                    <span className="text-emerald-400 font-semibold">98.4%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Cyclone Path ML Accuracy</span>
                    <span className="text-sky-400 font-semibold">94.1%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '94.1%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Flood Inundation Warning Index</span>
                    <span className="text-amber-400 font-semibold">72.0%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="text-purple-400 font-semibold">Big Data Pipeline:</span> Connected to automated telemetry queue.
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

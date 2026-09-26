import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, MapPin, RefreshCw, AlertCircle } from 'lucide-react'
import { API_BASE_URL, safeFetchJson } from '../config/api'

const SOURCE_COLORS = {
  citizen: '#38bdf8', // sky-400
  weather_api: '#34d399', // emerald-400
  social: '#c084fc', // purple-400
  public_dataset: '#fbbf24' // amber-400
}

const PIE_FALLBACK_COLORS = ['#38bdf8', '#34d399', '#c084fc', '#fbbf24', '#f87171', '#818cf8']

// Custom dark theme tooltip for all charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl backdrop-blur-md text-xs">
        <p className="font-semibold text-slate-200 capitalize mb-1">{label || payload[0]?.name}</p>
        <p className="text-sky-400 font-mono">
          Count: <span className="font-bold text-white">{payload[0]?.value}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function AnalyticsCharts() {
  const [events, setEvents] = useState([])
  const [trends, setTrends] = useState([])
  const [sources, setSources] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError('')

      const [evRes, trRes, srcRes, locRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/analytics/events`).then(safeFetchJson),
        fetch(`${API_BASE_URL}/api/analytics/trends`).then(safeFetchJson),
        fetch(`${API_BASE_URL}/api/analytics/sources`).then(safeFetchJson),
        fetch(`${API_BASE_URL}/api/analytics/locations`).then(safeFetchJson)
      ])

      if (evRes.ok && evRes.data?.events) setEvents(evRes.data.events)
      if (trRes.ok && trRes.data?.trends) setTrends(trRes.data.trends)
      if (srcRes.ok && srcRes.data?.sources) setSources(srcRes.data.sources)
      if (locRes.ok && locRes.data?.locations) setLocations(locRes.data.locations.slice(0, 7)) // Top 7 states
    } catch (err) {
      console.error('Error loading analytics data:', err)
      setError('Failed to load chart metrics from analytics service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const formattedSources = sources.map((s) => ({
    name: s.sourceType.replace('_', ' ').toUpperCase(),
    value: s.count,
    color: SOURCE_COLORS[s.sourceType] || '#94a3b8'
  }))

  const formattedEvents = events.map((e) => ({
    name: e.eventType.replace('_', ' ').charAt(0).toUpperCase() + e.eventType.slice(1),
    count: e.count
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Big Data Distribution & Trends</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time event frequency, multi-source contribution, and chronological analytics
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Charts</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 2x2 Responsive Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Reports by Event Type (Bar Chart) */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Reports by Event Type</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Categorized by AI</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>
            ) : formattedEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No events recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedEvents} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Reports Over Time (Line Chart) */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Reports Over Time (Chronological Trend)</h3>
            </div>
            <span className="text-[11px] text-indigo-400 font-mono">Daily Ingestion Rate</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>
            ) : trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No historical records</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#a5b4fc' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Reports by Source (Donut / Pie Chart) */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Reports by Data Source</h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">Multi-Channel Ratio</span>
          </div>

          <div className="h-64 w-full flex items-center">
            {loading ? (
              <div className="w-full text-center text-xs text-slate-500">Loading chart...</div>
            ) : formattedSources.length === 0 ? (
              <div className="w-full text-center text-xs text-slate-500">No source data</div>
            ) : (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formattedSources}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {formattedSources.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="space-y-2 text-xs">
                  {formattedSources.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-300 text-[11px]">{s.name}</span>
                      </div>
                      <span className="font-mono font-bold text-white text-[11px]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Reports by State (Bar Chart) */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Reports by State (Top Geographical Clusters)</h3>
            </div>
            <span className="text-[11px] text-teal-400 font-mono">State Level Distribution</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>
            ) : locations.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">No state data recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locations} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="state" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#2dd4bf" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

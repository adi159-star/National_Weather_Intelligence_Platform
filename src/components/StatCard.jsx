import React from 'react'

/**
 * Reusable StatCard component for displaying key weather and telemetry metrics.
 */
export default function StatCard({ title, value, change, trend = 'neutral', icon: Icon, description }) {
  const trendColors = {
    up: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    down: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    neutral: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm rounded-xl p-5 hover:border-slate-700/80 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-sky-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">
          {value}
        </span>
        {change && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${trendColors[trend]}`}>
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-slate-400 line-clamp-1">
          {description}
        </p>
      )}
    </div>
  )
}

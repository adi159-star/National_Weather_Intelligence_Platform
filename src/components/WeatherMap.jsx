import React, { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Filter, Layers, MapPin, RefreshCw, AlertCircle, AlertTriangle, Key, ExternalLink } from 'lucide-react'
import { API_BASE_URL, safeFetchJson } from '../config/api'

// Read Mapbox public token from Vite environment (starts with pk.eyJ...)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Meteorological color accents by event type
const EVENT_COLORS = {
  rainfall: '#38bdf8',
  heavy_rain: '#0284c7',
  thunderstorm: '#c084fc',
  flooding: '#3b82f6',
  heatwave: '#f87171',
  fog: '#94a3b8',
  dust_storm: '#fbbf24',
  strong_wind: '#2dd4bf',
  snowfall: '#67e8f9',
  cold_wave: '#818cf8',
  weather_observation: '#34d399',
  other: '#94a3b8'
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
    snowfall: 'Snowfall',
    cold_wave: 'Cold Wave',
    weather_observation: 'Weather Observation',
    other: 'Other'
  }
  return map[type.toLowerCase()] || type
}

// Convert backend reports to GeoJSON FeatureCollection with numeric coordinates
function reportsToGeoJSON(reports) {
  const valid = reports.filter(
    (r) =>
      r &&
      r.latitude !== null &&
      r.latitude !== undefined &&
      r.longitude !== null &&
      r.longitude !== undefined &&
      !isNaN(Number(r.latitude)) &&
      !isNaN(Number(r.longitude))
  )

  return {
    type: 'FeatureCollection',
    features: valid.map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(r.longitude), Number(r.latitude)]
      },
      properties: {
        id: r._id,
        eventType: (r.eventType || 'other').toLowerCase(),
        aiClassification: r.aiClassification || '',
        aiConfidence:
          r.aiConfidence !== null && r.aiConfidence !== undefined && !isNaN(Number(r.aiConfidence))
            ? Number(r.aiConfidence)
            : null,
        city: r.city || '',
        state: r.state || '',
        verificationStatus: r.verificationStatus || 'pending',
        isDuplicate: Boolean(r.isDuplicate),
        sourceType: r.sourceType || 'citizen',
        reportedAt: r.reportedAt || r.createdAt || '',
        description: r.description || ''
      }
    }))
  }
}

/**
 * WeatherMap Component
 * High-performance India Weather Map powered by Mapbox GL JS.
 * Features GeoJSON clustering, event-color markers, interactive popups, and multi-parameter filters.
 */
export default function WeatherMap({ height = '520px' }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const isMapLoadedRef = useRef(false)

  const [mapReports, setMapReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [mapError, setMapError] = useState('')

  // Filter state
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filteredReportsRef = useRef([])

  const hasValidToken = useMemo(() => {
    return Boolean(
      MAPBOX_TOKEN &&
      typeof MAPBOX_TOKEN === 'string' &&
      MAPBOX_TOKEN.trim().length > 10 &&
      !MAPBOX_TOKEN.includes('your_mapbox_public_token_here')
    )
  }, [])

  // Fetch report coordinates from backend
  const fetchMapReports = async () => {
    try {
      setLoading(true)
      setApiError('')
      const response = await fetch(`${API_BASE_URL}/api/analytics/map`)
      const res = await safeFetchJson(response)

      if (!res.ok) {
        throw new Error(res.error || `Failed to fetch map telemetry (${res.status})`)
      }

      if (res.data?.success && Array.isArray(res.data.reports)) {
        setMapReports(res.data.reports)
      } else {
        setMapReports([])
      }
    } catch (err) {
      console.error('Error fetching map points:', err)
      setApiError('Unable to load weather reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMapReports()
  }, [])

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    return mapReports.filter((report) => {
      if (selectedEvent !== 'all') {
        const currentEv = (report.eventType || report.aiClassification || 'other').toLowerCase()
        if (currentEv !== selectedEvent.toLowerCase()) return false
      }
      if (selectedSource !== 'all') {
        if ((report.sourceType || 'citizen') !== selectedSource) return false
      }
      if (selectedStatus !== 'all') {
        if ((report.verificationStatus || 'pending') !== selectedStatus) return false
      }
      return true
    })
  }, [mapReports, selectedEvent, selectedSource, selectedStatus])

  // Keep filteredReportsRef in sync
  useEffect(() => {
    filteredReportsRef.current = filteredReports
  }, [filteredReports])

  // Initialize Mapbox GL instance if token is configured
  useEffect(() => {
    if (!hasValidToken || !mapContainerRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN.trim()

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 22.5937], // Centered on India [longitude, latitude]
      zoom: 4.5,
      minZoom: 3.5,
      maxZoom: 16
    })

    // Navigation zoom/pitch controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')

    // Disable scroll zoom initially so hovering and mouse-wheel scrolling scrolls the webpage
    map.scrollZoom.disable()

    // Enable scroll zoom when user clicks on map/container
    const enableScrollZoom = () => {
      if (map && map.scrollZoom && !map.scrollZoom.isEnabled()) {
        map.scrollZoom.enable()
      }
    }

    map.on('click', enableScrollZoom)
    const mapContainerEl = mapContainerRef.current
    if (mapContainerEl) {
      mapContainerEl.addEventListener('click', enableScrollZoom)
    }

    // Disable scroll zoom when clicking anywhere outside the map
    const handleDocumentClick = (event) => {
      if (mapContainerRef.current && !mapContainerRef.current.contains(event.target)) {
        if (map && map.scrollZoom && map.scrollZoom.isEnabled()) {
          map.scrollZoom.disable()
        }
      }
    }

    document.addEventListener('click', handleDocumentClick)

    map.on('error', (e) => {
      console.warn('Mapbox internal event:', e?.error?.message || e)
      if (e?.error?.status === 401 || (e?.error?.message && e.error.message.includes('Forbidden'))) {
        setMapError('Invalid Mapbox access token. Please verify VITE_MAPBOX_TOKEN in your .env file.')
      }
    })

    map.on('load', () => {
      isMapLoadedRef.current = true

      const geojsonData = reportsToGeoJSON(filteredReportsRef.current)

      // Add clustered GeoJSON source
      map.addSource('weather-reports', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      })

      // Cluster circles layer
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'weather-reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#38bdf8', // Blue (< 10 reports)
            10,
            '#f59e0b', // Amber (10 - 25 reports)
            25,
            '#ef4444' // Red (> 25 reports)
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            10,
            24,
            25,
            30
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#0f172a',
          'circle-opacity': 0.92
        }
      })

      // Cluster count number label
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'weather-reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      // Individual unclustered reports (color-coded by event type)
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'weather-reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'eventType'],
            'rainfall',
            '#38bdf8',
            'heavy_rain',
            '#0284c7',
            'thunderstorm',
            '#c084fc',
            'flooding',
            '#3b82f6',
            'heatwave',
            '#f87171',
            'fog',
            '#94a3b8',
            'dust_storm',
            '#fbbf24',
            'strong_wind',
            '#2dd4bf',
            'snowfall',
            '#67e8f9',
            'cold_wave',
            '#818cf8',
            'weather_observation',
            '#34d399',
            /* other / fallback */
            '#94a3b8'
          ],
          'circle-radius': 7.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a',
          'circle-opacity': 0.95
        }
      })

      // Zoom in on cluster click
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties.cluster_id
        map.getSource('weather-reports').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom + 0.5
          })
        })
      })

      // Open detailed observation popup on unclustered point click
      map.on('click', 'unclustered-point', (e) => {
        if (!e.features || !e.features.length) return
        const feature = e.features[0]
        const coordinates = feature.geometry.coordinates.slice()
        const props = feature.properties

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
        }

        const reportedDate = props.reportedAt
          ? new Date(props.reportedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'N/A'

        const confidenceText =
          props.aiConfidence !== null &&
          props.aiConfidence !== undefined &&
          props.aiConfidence !== '' &&
          !isNaN(Number(props.aiConfidence))
            ? `${Math.round(Number(props.aiConfidence) * 100)}%`
            : 'N/A'

        const evType = (props.eventType || 'other').toLowerCase()
        const color = EVENT_COLORS[evType] || '#38bdf8'

        const statusBadge =
          props.verificationStatus === 'verified'
            ? '<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 7px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">Verified</span>'
            : props.verificationStatus === 'rejected'
            ? '<span style="background: rgba(244, 63, 94, 0.2); color: #fb7185; padding: 2px 7px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(244, 63, 94, 0.3);">Rejected</span>'
            : '<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 7px; border-radius: 9999px; font-weight: 600; border: 1px solid rgba(245, 158, 11, 0.3);">Pending</span>'

        const popupHTML = `
          <div style="font-family: inherit; min-width: 230px; max-width: 290px; color: #f8fafc; font-size: 12px; line-height: 1.5; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 5px;">
              <span style="font-weight: 700; font-size: 13px; color: ${color}; text-transform: capitalize;">
                ${formatEventType(props.eventType)}
              </span>
              <span style="font-size: 10px;">${statusBadge}</span>
            </div>
            <div style="margin-bottom: 3px;"><strong>City:</strong> ${props.city || 'N/A'}</div>
            <div style="margin-bottom: 3px;"><strong>State:</strong> ${props.state || 'N/A'}</div>
            <div style="margin-bottom: 3px;"><strong>Source:</strong> <span style="text-transform: capitalize;">${(props.sourceType || 'citizen').replace('_', ' ')}</span></div>
            <div style="margin-bottom: 3px;"><strong>Verification:</strong> <span style="text-transform: capitalize;">${props.verificationStatus || 'Pending'}</span></div>
            <div style="margin-bottom: 3px;"><strong>AI Classification:</strong> <span style="text-transform: capitalize;">${formatEventType(props.aiClassification || props.eventType)}</span></div>
            <div style="margin-bottom: 3px;"><strong>AI Confidence:</strong> ${confidenceText}</div>
            <div style="margin-bottom: 4px; color: #94a3b8; font-size: 11px;"><strong>Reported At:</strong> ${reportedDate}</div>
            ${
              props.description
                ? `<div style="background: rgba(15, 23, 42, 0.7); padding: 6px 8px; border-radius: 6px; border: 1px solid #1e293b; color: #cbd5e1; font-style: italic; font-size: 11px; margin-top: 4px;">"${props.description}"</div>`
                : ''
            }
          </div>
        `

        if (popupRef.current) popupRef.current.remove()

        popupRef.current = new mapboxgl.Popup({
          className: 'mapbox-dark-weather-popup',
          closeButton: true,
          closeOnClick: true,
          maxWidth: '320px',
          offset: 12
        })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map)
      })

      // Change cursor to pointer on hover
      const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
      const resetPointer = () => { map.getCanvas().style.cursor = '' }

      map.on('mouseenter', 'clusters', setPointer)
      map.on('mouseleave', 'clusters', resetPointer)
      map.on('mouseenter', 'unclustered-point', setPointer)
      map.on('mouseleave', 'unclustered-point', resetPointer)
    })

    mapRef.current = map

    // Resize observer to ensure the map fills container dynamically
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    return () => {
      document.removeEventListener('click', handleDocumentClick)
      if (mapContainerEl) {
        mapContainerEl.removeEventListener('click', enableScrollZoom)
      }
      resizeObserver.disconnect()
      isMapLoadedRef.current = false
      if (popupRef.current) popupRef.current.remove()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [hasValidToken])

  // Update GeoJSON source dynamically whenever filteredReports changes
  useEffect(() => {
    if (!mapRef.current || !isMapLoadedRef.current) return

    const source = mapRef.current.getSource('weather-reports')
    if (source) {
      source.setData(reportsToGeoJSON(filteredReports))
    }
  }, [filteredReports])

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      {/* Map Header & Multi-Parameter Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                National Weather Mapbox Intelligence
              </h2>
              <p className="text-xs text-slate-400">
                Interactive India spatial radar with automated report clustering & AI classification
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-white">All Events</option>
              <option value="rainfall" className="bg-slate-900 text-white">Rainfall</option>
              <option value="heavy_rain" className="bg-slate-900 text-white">Heavy Rain</option>
              <option value="thunderstorm" className="bg-slate-900 text-white">Thunderstorm</option>
              <option value="flooding" className="bg-slate-900 text-white">Flooding</option>
              <option value="heatwave" className="bg-slate-900 text-white">Heatwave</option>
              <option value="fog" className="bg-slate-900 text-white">Fog</option>
              <option value="dust_storm" className="bg-slate-900 text-white">Dust Storm</option>
              <option value="strong_wind" className="bg-slate-900 text-white">Strong Wind</option>
              <option value="snowfall" className="bg-slate-900 text-white">Snowfall</option>
              <option value="cold_wave" className="bg-slate-900 text-white">Cold Wave</option>
              <option value="weather_observation" className="bg-slate-900 text-white">Observation</option>
              <option value="other" className="bg-slate-900 text-white">Other</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-white">All Sources</option>
              <option value="citizen" className="bg-slate-900 text-white">Citizen</option>
              <option value="weather_api" className="bg-slate-900 text-white">Weather API</option>
              <option value="social" className="bg-slate-900 text-white">Social Media</option>
              <option value="public_dataset" className="bg-slate-900 text-white">Public Dataset</option>
            </select>
          </div>

          {/* Verification Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="verified" className="bg-slate-900 text-white">Verified</option>
              <option value="pending" className="bg-slate-900 text-white">Pending</option>
              <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchMapReports}
            disabled={loading}
            title="Refresh map observations"
            className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Active Telemetry Pill */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Rendering <span className="font-semibold text-sky-400 font-mono">{filteredReports.length}</span> active weather observations
        </span>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Mapbox Vector Tiles • Smart Cluster Aggregation • Pan & Zoom
        </span>
      </div>

      {/* API Error Notification */}
      {apiError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={fetchMapReports}
            className="text-[11px] underline text-rose-300 hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Mapbox Token Missing Notice / Fallback Canvas */}
      {!hasValidToken ? (
        <div
          style={{ minHeight: '380px', height }}
          className="rounded-xl bg-slate-950 border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          {/* Subtle decorative grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30 pointer-events-none" />

          <div className="relative z-10 max-w-md space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Mapbox token is not configured.
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                To render the high-resolution vector weather map and dynamic clusters, please set your Mapbox public access token in the project root <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">.env</code> file.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-left font-mono text-xs text-slate-300">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider mb-1">Add to .env:</span>
              <span className="text-amber-400">VITE_MAPBOX_TOKEN</span>=pk.eyJ...
            </div>

            <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
              <a
                href="https://account.mapbox.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline"
              >
                <span>Get a free public token at account.mapbox.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium">{filteredReports.length}</span> geopositioned MongoDB reports ready for mapping
            </div>
          </div>
        </div>
      ) : (
        /* Mapbox GL Map Canvas */
        <div className="relative">
          {mapError && (
            <div className="absolute top-3 left-3 right-3 z-10 p-2.5 rounded-lg bg-rose-500/90 backdrop-blur-md text-white text-xs flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{mapError}</span>
            </div>
          )}
          <div
            ref={mapContainerRef}
            style={{ height, minHeight: '380px', width: '100%' }}
            className="rounded-xl overflow-hidden border border-slate-800 shadow-inner z-0"
          />
        </div>
      )}

      {/* Mapbox Popup Theme Override */}
      <style>{`
        .mapbox-dark-weather-popup .mapboxgl-popup-content {
          background-color: #0f172a !important;
          border: 1px solid #334155 !important;
          border-radius: 12px !important;
          padding: 12px 14px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7) !important;
        }
        .mapbox-dark-weather-popup .mapboxgl-popup-tip {
          border-top-color: #0f172a !important;
          border-bottom-color: #0f172a !important;
        }
        .mapbox-dark-weather-popup .mapboxgl-popup-close-button {
          color: #94a3b8 !important;
          font-size: 16px !important;
          padding: 4px 8px !important;
          line-height: 1 !important;
        }
        .mapbox-dark-weather-popup .mapboxgl-popup-close-button:hover {
          color: #ffffff !important;
          background: transparent !important;
        }
      `}</style>
    </div>
  )
}

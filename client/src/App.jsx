import { useCallback, useEffect, useState } from 'react'
import { getStatus, syncData } from './api.js'
import ProfilePanel from './components/ProfilePanel.jsx'
import AnalysisPanel from './components/AnalysisPanel.jsx'
import SurgePanel from './components/SurgePanel.jsx'
import CategoryPanel from './components/CategoryPanel.jsx'
import ShiftPanel from './components/ShiftPanel.jsx'

const TABS = [
  { id: 'profile', label: 'Profile & Earnings' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'surge', label: 'Live Surge' },
  { id: 'categories', label: 'Categories' },
  { id: 'shifts', label: 'Shift Planner' },
]

const WINDOWS = [30, 60, 90]

export default function App() {
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [window, setWindow] = useState(30)
  const [tab, setTab] = useState('profile')
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const loadStatus = useCallback(() => {
    return getStatus()
      .then((s) => { setStatus(s); setStatusError(null) })
      .catch((e) => setStatusError(e))
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const onSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await syncData()
      setSyncMsg(res.message || `Synced ${res.trips} trips (${res.mode}).`)
      await loadStatus()
      setRefreshKey((k) => k + 1)
    } catch (e) {
      const msg = (e && e.response && e.response.data && e.response.data.error) || (e && e.message) || 'Sync failed'
      setSyncMsg(`Sync failed: ${msg}`)
    } finally {
      setSyncing(false)
    }
  }

  const authenticated = status && status.authenticated
  const demoMode = status && status.demoMode

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-20 bg-black text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold mr-auto">DFW Uber Earnings Maximizer</h1>

          {status ? (
            authenticated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-400" /> LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> DEMO MODE
              </span>
            )
          ) : statusError ? (
            <span className="text-xs text-red-300">status unavailable</span>
          ) : (
            <span className="text-xs text-gray-400">…</span>
          )}

          <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-3 py-1.5 text-xs font-medium ${window === w ? 'bg-white text-black' : 'bg-transparent text-gray-300 hover:bg-gray-800'}`}
              >
                {w}d
              </button>
            ))}
          </div>

          <button
            onClick={onSync}
            disabled={syncing}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync Data'}
          </button>

          {status && !authenticated && (
            <a
              href="/auth/uber"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-black hover:bg-gray-200"
            >
              Connect Uber
            </a>
          )}
        </div>

        <nav className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${tab === t.id ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {syncMsg && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2 flex justify-between items-center">
            <span>{syncMsg}</span>
            <button onClick={() => setSyncMsg(null)} className="text-blue-500 hover:text-blue-700 text-xs">Dismiss</button>
          </div>
        )}

        {demoMode && !bannerDismissed && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 flex justify-between items-start gap-3">
            <span>
              <strong>Demo mode.</strong> The app is running on cached/demo data until your Uber Driver API access is approved.
              Connect Uber and sync once approved to switch to live data.
            </span>
            <button onClick={() => setBannerDismissed(true)} className="text-amber-600 hover:text-amber-800 text-xs shrink-0">Dismiss</button>
          </div>
        )}

        {statusError && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
            Could not reach the backend status endpoint. Panels may not load. Is the server running on :4000?
          </div>
        )}

        {tab === 'profile' && <ProfilePanel refreshKey={refreshKey} />}
        {tab === 'analysis' && <AnalysisPanel window={window} refreshKey={refreshKey} />}
        {tab === 'surge' && <SurgePanel />}
        {tab === 'categories' && <CategoryPanel window={window} refreshKey={refreshKey} />}
        {tab === 'shifts' && <ShiftPanel window={window} refreshKey={refreshKey} />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-gray-400">
        DFW Uber Earnings Maximizer · local tool · window: last {window} days
      </footer>
    </div>
  )
}

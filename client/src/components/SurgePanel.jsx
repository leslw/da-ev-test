import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Card from './Card.jsx'
import { Loading, ErrorText, Empty } from './States.jsx'
import { getSurge, pollSurge, getSurgeHistory, fmtNumber } from '../api.js'

function intensity(mult) {
  const m = Number(mult) || 0
  if (m >= 1.5) return { ring: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600', label: 'Surging' }
  if (m >= 1.2) return { ring: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-600', label: 'Elevated' }
  return { ring: 'border-gray-200', bg: 'bg-white', text: 'text-gray-500', label: 'Normal' }
}

export default function SurgePanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [history, setHistory] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    return getSurge()
      .then((d) => setData(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selectedZone) return
    let alive = true
    setHistory(null)
    getSurgeHistory(selectedZone, 24)
      .then((h) => alive && setHistory(h))
      .catch(() => alive && setHistory({ readings: [] }))
    return () => { alive = false }
  }, [selectedZone])

  const onRefresh = async () => {
    setPolling(true)
    try {
      await pollSurge()
      await load()
    } catch (e) {
      setError(e)
    } finally {
      setPolling(false)
    }
  }

  const refreshBtn = (
    <button
      onClick={onRefresh}
      disabled={polling}
      className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {polling ? 'Refreshing…' : 'Refresh'}
    </button>
  )

  if (loading && !data) return <Card title="Live Surge Detector" action={refreshBtn}><Loading /></Card>
  if (error) return <Card title="Live Surge Detector" action={refreshBtn}><ErrorText error={error} /></Card>

  const zones = (data && data.zones) || []
  const surgingCount = zones.filter((z) => z.surging || Number(z.multiplier) >= 1.2).length
  const historyReadings = (history && history.readings) || []
  const chartData = historyReadings.map((r) => ({
    t: new Date(r.captured_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    multiplier: Number(r.multiplier),
  }))

  return (
    <Card
      title="Live Surge Detector"
      subtitle={!data || data.ridesApiConfigured ? undefined : 'Inferred from time-of-day demand model (no rider-side server token configured)'}
      action={refreshBtn}
    >
      {surgingCount > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {surgingCount} zone{surgingCount > 1 ? 's' : ''} surging now
        </div>
      )}

      {zones.length === 0 ? (
        <Empty label="No surge zones" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => {
            const s = intensity(z.multiplier)
            const active = selectedZone === z.zone_id
            return (
              <button
                key={z.zone_id}
                onClick={() => setSelectedZone(active ? null : z.zone_id)}
                className={`text-left rounded-xl border-2 ${s.ring} ${s.bg} p-4 transition ${active ? 'ring-2 ring-blue-400' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-gray-900 text-sm pr-2">{z.zone_name}</div>
                  <div className={`text-lg font-bold ${s.text}`}>{fmtNumber(z.multiplier, 2)}×</div>
                </div>
                <div className="mt-1 text-xs text-gray-500">{z.product} · {s.label}</div>
              </button>
            )
          })}
        </div>
      )}

      {selectedZone && (
        <div className="mt-5">
          <div className="text-sm font-semibold text-gray-700 mb-2">24h history · {selectedZone}</div>
          {history == null ? (
            <Loading />
          ) : chartData.length === 0 ? (
            <Empty label="No history readings" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} domain={[1, 'auto']} />
                  <Tooltip formatter={(v) => [`${v}×`, 'Multiplier']} />
                  <Line type="monotone" dataKey="multiplier" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

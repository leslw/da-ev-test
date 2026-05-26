import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Card from './Card.jsx'
import { Loading, ErrorText, Empty } from './States.jsx'
import { getAnalysis, fmtCurrency, fmtNumber } from '../api.js'

function EphBarChart({ data }) {
  if (!data || data.length === 0) return <Empty />
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [`${fmtCurrency(v)}/hr`, 'EpH']} />
          <Bar dataKey="eph" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RankedWindows({ title, items, color }) {
  return (
    <div>
      <div className={`text-sm font-semibold mb-2 ${color}`}>{title}</div>
      {!items || items.length === 0 ? (
        <Empty />
      ) : (
        <ol className="space-y-1 text-sm">
          {items.map((w, i) => (
            <li key={`${w.day}-${w.bucket}-${i}`} className="flex justify-between gap-2">
              <span className="text-gray-700">{w.day} · {w.bucket}</span>
              <span className="font-medium">{fmtCurrency(w.eph)}/hr</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Gauge({ score }) {
  if (score == null) {
    return <div className="text-sm text-gray-400">Not enough data</div>
  }
  const pct = Math.max(0, Math.min(100, Number(score)))
  const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-500' : 'text-red-500'
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className={`text-4xl font-bold ${color}`}>{Math.round(pct)}</div>
      <div className="text-xs text-gray-500 mb-2">out of 100</div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AnalysisPanel({ window, refreshKey }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getAnalysis(window, true)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [window, refreshKey])

  if (loading) return <Card title="Earnings Analysis"><Loading /></Card>
  if (error) return <Card title="Earnings Analysis"><ErrorText error={error} /></Card>
  if (!data) return <Card title="Earnings Analysis"><Empty /></Card>

  const overall = data.overall || {}
  const surge = data.surge || {}
  const consistency = data.consistency || {}
  const windows = data.windows || {}

  return (
    <div className="space-y-4">
      <Card title="Overview" subtitle={`Last ${data.window} days · ${data.tripCount} trips`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div><div className="text-2xl font-bold text-gray-900">{fmtCurrency(overall.earnings)}</div><div className="text-xs text-gray-500">Earnings</div></div>
          <div><div className="text-2xl font-bold text-gray-900">{overall.trips}</div><div className="text-xs text-gray-500">Trips</div></div>
          <div><div className="text-2xl font-bold text-gray-900">{fmtNumber(overall.hours, 1)}</div><div className="text-xs text-gray-500">Hours</div></div>
          <div><div className="text-2xl font-bold text-blue-600">{fmtCurrency(overall.eph)}</div><div className="text-xs text-gray-500">Per hour</div></div>
          <div><div className="text-2xl font-bold text-gray-900">{fmtCurrency(overall.perMile)}</div><div className="text-xs text-gray-500">Per mile</div></div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="EpH by Time of Day"><EphBarChart data={data.byTimeOfDay} /></Card>
        <Card title="EpH by Day of Week"><EphBarChart data={data.byDayOfWeek} /></Card>
      </div>

      <Card title="Per-Category Performance">
        {!data.byCategory || data.byCategory.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Trips</th>
                  <th className="py-2 pr-4">EpH</th>
                  <th className="py-2 pr-4">Per Mile</th>
                  <th className="py-2 pr-4">Per Min</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((c) => (
                  <tr key={c.category} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{c.category}</td>
                    <td className="py-2 pr-4">{c.trips}</td>
                    <td className="py-2 pr-4 text-blue-600 font-medium">{fmtCurrency(c.eph)}</td>
                    <td className="py-2 pr-4">{fmtCurrency(c.perMile)}</td>
                    <td className="py-2 pr-4">{fmtCurrency(c.perMinute)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Best Windows"><RankedWindows title="Top earning slots" items={windows.best} color="text-green-600" /></Card>
        <Card title="Worst Windows"><RankedWindows title="Lowest earning slots" items={windows.worst} color="text-red-500" /></Card>
        <Card title="Surge Stats">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Surge frequency</span><span className="font-medium">{((Number(surge.surgeFrequency) || 0) * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Avg multiplier</span><span className="font-medium">{fmtNumber(surge.avgSurgeMultiplier, 2)}×</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Surge trips</span><span className="font-medium">{surge.surgeTrips} / {surge.totalTrips}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Surge earnings</span><span className="font-medium">{fmtCurrency(surge.surgeEarnings)}</span></div>
          </div>
        </Card>
        <Card title="Consistency">
          <Gauge score={consistency.score} />
          <div className="text-xs text-gray-500 mt-2">{consistency.activeDays != null ? `${consistency.activeDays} active days` : ''}</div>
        </Card>
      </div>

      <Card title="Recommendations">
        {!data.recommendations || data.recommendations.length === 0 ? (
          <Empty label="No recommendations" />
        ) : (
          <ol className="space-y-3">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                <div>
                  <div className="font-medium text-gray-900">{r.title} {r.priority && <span className="ml-1 text-xs text-gray-400">({r.priority})</span>}</div>
                  <div className="text-sm text-gray-600">{r.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}

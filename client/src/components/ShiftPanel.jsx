import { useEffect, useState } from 'react'
import Card from './Card.jsx'
import { Loading, ErrorText, Empty } from './States.jsx'
import {
  getShiftPlan, getDriveNow, fmtCurrency, fmtNumber,
  getManualEntries, addManualEntry, deleteManualEntry,
  getEvents, addEvent, deleteEvent,
} from '../api.js'

const SIGNAL_STYLES = {
  green: { bg: 'bg-green-600', label: 'GO — Drive Now', dot: 'bg-green-300' },
  yellow: { bg: 'bg-amber-500', label: 'Caution', dot: 'bg-amber-200' },
  red: { bg: 'bg-red-600', label: 'Hold Off', dot: 'bg-red-300' },
}

const CATEGORIES = ['UberX', 'Comfort', 'XL', 'Black', 'Pet', 'Green', 'Share']

function DriveNow({ refreshKey }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getDriveNow()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [refreshKey])

  if (loading) return <Card title="Drive Now?"><Loading /></Card>
  if (error) return <Card title="Drive Now?"><ErrorText error={error} /></Card>
  if (!data) return <Card title="Drive Now?"><Empty /></Card>

  const s = SIGNAL_STYLES[data.signal] || SIGNAL_STYLES.yellow
  return (
    <div className={`rounded-xl ${s.bg} text-white p-6 shadow`}>
      <div className="flex items-center gap-3">
        <span className={`w-4 h-4 rounded-full ${s.dot} animate-pulse`} />
        <div className="text-2xl font-bold uppercase tracking-wide">{s.label}</div>
      </div>
      <div className="mt-2 text-sm opacity-95">{data.message}</div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="opacity-80">Current EpH</div>
          <div className="text-lg font-semibold">{fmtCurrency(data.currentEph)}</div>
        </div>
        <div>
          <div className="opacity-80">Best EpH ({data.day} · {data.bucket})</div>
          <div className="text-lg font-semibold">{fmtCurrency(data.bestEph)}</div>
        </div>
      </div>
    </div>
  )
}

function WeeklyPlan({ window, refreshKey }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getShiftPlan(window)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [window, refreshKey])

  if (loading) return <Card title="Weekly Plan"><Loading /></Card>
  if (error) return <Card title="Weekly Plan"><ErrorText error={error} /></Card>

  const plan = (data && data.plan) || []
  const airportWindows = (data && data.airportWindows) || []

  return (
    <div className="space-y-4">
      <Card title="Weekly Shift Plan" subtitle={data ? `Based on last ${data.window} days` : undefined}>
        {plan.length === 0 ? (
          <Empty label="No plan available" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.map((d) => (
              <div key={d.day} className="rounded-lg border border-gray-200 p-3">
                <div className="font-semibold text-gray-900 mb-2">{d.day}</div>
                {(!d.shifts || d.shifts.length === 0) ? (
                  <div className="text-xs text-gray-400">No suggested shifts</div>
                ) : (
                  <ul className="space-y-2">
                    {d.shifts.map((sh, i) => (
                      <li key={i} className="text-sm flex justify-between gap-2">
                        <span className="text-gray-700">
                          {sh.start}–{sh.end}
                          {sh.block && <span className="text-gray-400 ml-1">({sh.block})</span>}
                        </span>
                        <span className="font-medium text-blue-600">{fmtCurrency(sh.expectedEph)}/hr</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Airport Windows">
        {airportWindows.length === 0 ? (
          <Empty label="No airport windows" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {airportWindows.map((a) => (
              <div key={a.airport} className="rounded-lg border border-gray-200 p-3">
                <div className="font-semibold text-gray-900">{a.airport}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(a.windows || []).map((w, i) => (
                    <span key={i} className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">{w}</span>
                  ))}
                </div>
                {a.note && <div className="text-xs text-gray-500 mt-2">{a.note}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ManualEntries({ refreshKey }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ week: '', category: CATEGORIES[0], hours: '', earnings: '', trips: '' })

  const load = () => {
    setLoading(true)
    return getManualEntries()
      .then((d) => setEntries(d.entries || []))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [refreshKey])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addManualEntry({
        week: form.week,
        category: form.category,
        hours: Number(form.hours) || 0,
        earnings: Number(form.earnings) || 0,
        trips: Number(form.trips) || 0,
      })
      setForm({ week: '', category: CATEGORIES[0], hours: '', earnings: '', trips: '' })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    try {
      await deleteManualEntry(id)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  const input = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <Card title="Manual Weekly Entry" subtitle="Feeds the analysis while Driver API access is pending">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end mb-4">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Week</span>
          <input type="date" required value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Category</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Hours</span>
          <input type="number" step="0.1" min="0" required value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Earnings ($)</span>
          <input type="number" step="0.01" min="0" required value={form.earnings} onChange={(e) => setForm({ ...form, earnings: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Trips</span>
          <input type="number" step="1" min="0" required value={form.trips} onChange={(e) => setForm({ ...form, trips: e.target.value })} className={input} />
        </label>
        <div className="lg:col-span-5">
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </form>

      {error && <ErrorText error={error} />}

      {loading ? (
        <Loading />
      ) : entries.length === 0 ? (
        <Empty label="No manual entries yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Week</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Hours</th>
                <th className="py-2 pr-4">Earnings</th>
                <th className="py-2 pr-4">Trips</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((en) => (
                <tr key={en.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{en.week}</td>
                  <td className="py-2 pr-4">{en.category}</td>
                  <td className="py-2 pr-4">{fmtNumber(en.hours, 1)}</td>
                  <td className="py-2 pr-4">{fmtCurrency(en.earnings)}</td>
                  <td className="py-2 pr-4">{en.trips}</td>
                  <td className="py-2 pr-4 text-right">
                    <button onClick={() => onDelete(en.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Events({ refreshKey }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', location: '', notes: '' })

  const load = () => {
    setLoading(true)
    return getEvents()
      .then((d) => setEvents(d.events || []))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [refreshKey])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addEvent(form)
      setForm({ name: '', date: '', location: '', notes: '' })
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    try {
      await deleteEvent(id)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  const input = 'border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <Card title="Local Events" subtitle="Allen / Frisco / Plano events flagged as high-opportunity">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end mb-4">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Name</span>
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Date</span>
          <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Location</span>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Notes</span>
          <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} />
        </label>
        <div className="lg:col-span-4">
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Event'}
          </button>
        </div>
      </form>

      {error && <ErrorText error={error} />}

      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <Empty label="No events yet" />
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div>
                <div className="font-semibold text-gray-900">
                  {ev.name}
                  <span className="ml-2 text-xs text-purple-600 font-medium">high-opportunity</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {ev.date}{ev.location ? ` · ${ev.location}` : ''}
                </div>
                {ev.notes && <div className="text-xs text-gray-500 mt-0.5">{ev.notes}</div>}
              </div>
              <button onClick={() => onDelete(ev.id)} className="text-red-500 hover:text-red-700 text-xs shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function ShiftPanel({ window, refreshKey }) {
  return (
    <div className="space-y-4">
      <DriveNow refreshKey={refreshKey} />
      <WeeklyPlan window={window} refreshKey={refreshKey} />
      <ManualEntries refreshKey={refreshKey} />
      <Events refreshKey={refreshKey} />
    </div>
  )
}

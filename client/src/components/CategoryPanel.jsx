import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Card from './Card.jsx'
import { Loading, ErrorText, Empty } from './States.jsx'
import { getCategories, fmtCurrency } from '../api.js'

export default function CategoryPanel({ window, refreshKey }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getCategories(window)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [window, refreshKey])

  if (loading) return <Card title="Category Optimizer"><Loading /></Card>
  if (error) return <Card title="Category Optimizer"><ErrorText error={error} /></Card>
  if (!data) return <Card title="Category Optimizer"><Empty /></Card>

  const categories = data.categories || []
  const opportunities = data.opportunities || []

  return (
    <div className="space-y-4">
      {data.recommended && (
        <div className="rounded-xl bg-blue-600 text-white p-5 shadow">
          <div className="text-xs uppercase tracking-wide opacity-80">Recommended category</div>
          <div className="text-2xl font-bold mt-1">{data.recommended}</div>
          <div className="text-sm opacity-90 mt-1">
            Highest expected earnings per hour among your eligible categories.
          </div>
        </div>
      )}

      <Card title="Eligible Categories — EpH" subtitle={`Last ${data.window} days`}>
        {categories.length === 0 ? (
          <Empty label="No category data" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${fmtCurrency(v)}/hr`, 'EpH']} />
                <Bar dataKey="eph" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {categories.length > 0 && (
        <Card title="Category Detail">
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
                {categories.map((c) => (
                  <tr
                    key={c.category}
                    className={`border-b last:border-0 ${c.category === data.recommended ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-2 pr-4 font-medium">
                      {c.category}
                      {c.category === data.recommended && (
                        <span className="ml-2 text-xs text-blue-600 font-semibold">★ recommended</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{c.trips}</td>
                    <td className="py-2 pr-4 text-green-600 font-medium">{fmtCurrency(c.eph)}</td>
                    <td className="py-2 pr-4">{fmtCurrency(c.perMile)}</td>
                    <td className="py-2 pr-4">{fmtCurrency(c.perMinute)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Opportunity Flags" subtitle="Categories you are not yet eligible for">
        {opportunities.length === 0 ? (
          <Empty label="No opportunity flags" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((o) => (
              <div key={o.category} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{o.category}</div>
                  <div className="text-amber-600 font-bold text-sm">
                    {o.potentialEph != null ? `${fmtCurrency(o.potentialEph)}/hr` : '—'}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{o.note}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

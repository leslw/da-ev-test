import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import Card from './Card.jsx'
import { Loading, ErrorText, Empty } from './States.jsx'
import { getProfile, getPayments, fmtCurrency } from '../api.js'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#a855f7']

export default function ProfilePanel({ refreshKey }) {
  const [profile, setProfile] = useState(null)
  const [payments, setPayments] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([getProfile(), getPayments(100)])
      .then(([p, pay]) => {
        if (!alive) return
        setProfile(p)
        setPayments(pay)
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [refreshKey])

  if (loading) return <Card title="Driver Profile & Earnings"><Loading /></Card>
  if (error) return <Card title="Driver Profile & Earnings"><ErrorText error={error} /></Card>

  const totals = (payments && payments.totals) || {}
  const breakdown = [
    { name: 'Net Fare', value: Number(totals.net_fare) || 0 },
    { name: 'Tips', value: Number(totals.tips) || 0 },
    { name: 'Surge', value: Number(totals.surge) || 0 },
    { name: 'Bonuses', value: Number(totals.bonuses) || 0 },
  ].filter((d) => d.value > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Driver Profile" subtitle={profile && profile.source ? `Source: ${profile.source}` : undefined}>
        {!profile ? (
          <Empty />
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-semibold text-gray-900">
                {profile.first_name} {profile.last_name}
              </div>
              {profile.rating != null && (
                <div className="text-sm text-gray-600">★ {profile.rating}</div>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-gray-500">City</dt>
                <dd className="text-gray-900">{profile.city || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Activation</dt>
                <dd className="text-gray-900">{profile.activation || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Driver ID</dt>
                <dd className="text-gray-900 truncate">{profile.driver_id || '—'}</dd>
              </div>
            </dl>
            <div>
              <div className="text-gray-500 text-sm mb-1">Eligible categories</div>
              <div className="flex flex-wrap gap-2">
                {(profile.eligibleCategories || []).length === 0 ? (
                  <span className="text-sm text-gray-400">None listed</span>
                ) : (
                  profile.eligibleCategories.map((c) => (
                    <span key={c} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {c}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Payments Summary" subtitle={payments ? `${payments.count} payments` : undefined}>
        {!payments ? (
          <Empty />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{fmtCurrency(totals.total)}</div>
              <div className="text-xs text-gray-500 mb-3">Total earnings</div>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between"><span className="text-gray-600">Net fare</span><span className="font-medium">{fmtCurrency(totals.net_fare)}</span></li>
                <li className="flex justify-between"><span className="text-gray-600">Tips</span><span className="font-medium">{fmtCurrency(totals.tips)}</span></li>
                <li className="flex justify-between"><span className="text-gray-600">Surge</span><span className="font-medium">{fmtCurrency(totals.surge)}</span></li>
                <li className="flex justify-between"><span className="text-gray-600">Bonuses</span><span className="font-medium">{fmtCurrency(totals.bonuses)}</span></li>
              </ul>
            </div>
            <div className="h-48">
              {breakdown.length === 0 ? (
                <Empty label="No breakdown" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {breakdown.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtCurrency(v)} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

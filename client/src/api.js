import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Generic GET helper. Returns response data.
export async function get(path, params) {
  const res = await client.get(path, { params })
  return res.data
}

export async function post(path, body) {
  const res = await client.post(path, body)
  return res.data
}

export async function del(path) {
  const res = await client.delete(path)
  return res.data
}

// --- Domain helpers ---
export const getStatus = () => get('/driver/status')
export const syncData = () => post('/driver/sync')
export const getProfile = () => get('/driver/profile')
export const getPayments = (limit = 100) => get('/driver/payments', { limit })
export const getTrips = (limit = 100) => get('/driver/trips', { limit })
export const getAnalysis = (window = 30, eligibleOnly = true) =>
  get('/analysis', { window, eligibleOnly })
export const getCategories = (window = 30) => get('/categories', { window })
export const getSurge = () => get('/surge')
export const getSurgeHistory = (zoneId, hours = 24) =>
  get(`/surge/history/${zoneId}`, { hours })
export const pollSurge = () => post('/surge/poll')
export const getShiftPlan = (window = 60) => get('/shifts/plan', { window })
export const getDriveNow = () => get('/shifts/drive-now')
export const getManualEntries = () => get('/manual/entries')
export const addManualEntry = (body) => post('/manual/entries', body)
export const deleteManualEntry = (id) => del(`/manual/entries/${id}`)
export const getEvents = () => get('/manual/events')
export const addEvent = (body) => post('/manual/events', body)
export const deleteEvent = (id) => del(`/manual/events/${id}`)

export const fmtCurrency = (n) => {
  const v = Number(n)
  if (!isFinite(v)) return '$0.00'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const fmtNumber = (n, digits = 2) => {
  const v = Number(n)
  if (!isFinite(v)) return '0'
  return v.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 text-gray-500 py-6 justify-center">
      <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorText({ error }) {
  const msg =
    (error && error.response && error.response.data && error.response.data.error) ||
    (error && error.message) ||
    'Something went wrong.'
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
      Could not load data: {String(msg)}
    </div>
  )
}

export function Empty({ label = 'No data yet.' }) {
  return <div className="text-sm text-gray-400 py-4 text-center">{label}</div>
}

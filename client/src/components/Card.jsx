export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`rounded-xl shadow bg-white p-4 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3 gap-2">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

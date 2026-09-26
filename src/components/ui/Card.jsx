export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`card p-6 ${hover ? 'hover:shadow-card-hover transition-shadow cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <Icon size={18} className="text-primary-600" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-dark-800 text-base leading-snug">{title}</h3>
          {subtitle && <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, color = 'primary', delta, deltaLabel }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }
  const valueColorMap = {
    primary: 'text-primary-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${valueColorMap[color]}`}>{value}</p>
      {delta !== undefined && (
        <p className="text-xs text-dark-400 mt-1">
          <span className={delta >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
          {deltaLabel && <span className="ml-1">{deltaLabel}</span>}
        </p>
      )}
    </div>
  )
}

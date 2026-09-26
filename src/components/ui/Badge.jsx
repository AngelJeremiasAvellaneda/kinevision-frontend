export function Badge({ level, children }) {
  if (level === 'bajo' || level === 'good')   return <span className="badge-good">{children}</span>
  if (level === 'medio' || level === 'warn')  return <span className="badge-warn">{children}</span>
  if (level === 'alto' || level === 'bad')    return <span className="badge-bad">{children}</span>
  return <span className="badge-good">{children}</span>
}

export function RiskBadge({ level }) {
  const labels = { bajo: 'Riesgo Bajo', medio: 'Riesgo Medio', alto: 'Riesgo Alto' }
  return <Badge level={level}>{labels[level] ?? level}</Badge>
}

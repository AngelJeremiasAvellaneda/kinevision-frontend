/**
 * drawRehabOverlay — full-body skeleton for rehab mode.
 *
 * Skeleton color: orange (#f97316) — distinct from desk-posture cyan.
 * Indicator dots: universal traffic-light system (green / yellow / red)
 *   shared across BOTH analysis types so the user always reads the same signal.
 */
import { REHAB_CONNECTIONS } from '../hooks/useRehabAnalysis'

// Skeleton line color — REHAB ONLY (orange, different from desk cyan)
const SKELETON_COLOR = '#f97316'

// Indicator colors — SAME in both AnalysisPage and RehabPage
const IND_GOOD  = '#10b981'  // green  — correct
const IND_WARN  = '#f59e0b'  // yellow — needs attention
const IND_ERROR = '#ef4444'  // red    — critical

export function drawRehabOverlay(canvas, analysis) {
  if (!canvas || !analysis?.landmarks) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const lms = analysis.landmarks
  const W   = canvas.width
  const H   = canvas.height

  // Build error / warn sets from feedback
  const errorSet = new Set()
  const warnSet  = new Set()
  ;(analysis.feedback || []).forEach(fb => {
    fb.lms?.forEach(i => (fb.severity === 'critico' ? errorSet : warnSet).add(i))
  })

  // ── Connections — orange skeleton ─────────────────────────
  REHAB_CONNECTIONS.forEach(([a, b]) => {
    if ((lms[a]?.visibility ?? 0) < 0.25 || (lms[b]?.visibility ?? 0) < 0.25) return
    ctx.beginPath()
    ctx.moveTo(lms[a].x * W, lms[a].y * H)
    ctx.lineTo(lms[b].x * W, lms[b].y * H)
    ctx.strokeStyle = SKELETON_COLOR
    ctx.lineWidth   = 2.5
    ctx.globalAlpha = 0.80
    ctx.stroke()
    ctx.globalAlpha = 1
  })

  // ── Landmark dots — traffic-light indicators ──────────────
  for (let i = 0; i < lms.length; i++) {
    const lm = lms[i]
    if ((lm?.visibility ?? 0) < 0.25) continue

    const isError = errorSet.has(i)
    const isWarn  = warnSet.has(i)
    const color   = isError ? IND_ERROR : isWarn ? IND_WARN : IND_GOOD
    const radius  = isError ? 7 : isWarn ? 6 : 4

    ctx.beginPath()
    ctx.arc(lm.x * W, lm.y * H, radius, 0, Math.PI * 2)
    ctx.fillStyle   = color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth   = 1.5
    ctx.stroke()
  }
}

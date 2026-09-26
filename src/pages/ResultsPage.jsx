/**
 * ResultsPage — shows AI analysis after a session.
 *
 * Flow:
 *  1. Immediately loads session from backend (has ejercicio_id, tipo, duracion, etc.)
 *  2. If resultados_analisis is empty → shows "Analizando con Gemini..." + polls every 4s
 *  3. Once n8n posts back to /webhook/results → Supabase has the result → poll finds it
 *  4. Shows: risk level, AI text, recommendations, and (for rehab) rep success %
 */
import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { sesionesApi } from '../lib/api'
import {
  CheckCircle2, AlertTriangle, AlertOctagon, BarChart3,
  ChevronRight, Loader2, Repeat2, Clock,
  MoveHorizontal, ArrowUpDown, PersonStanding, Layers, Shield,
} from 'lucide-react'
import { RiskBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const TIPO_LABELS = {
  postura_vivo:   'Corrector de Postura en Vivo',
  rehabilitacion: 'Rehabilitación de Columna',
}

const EJERCICIO_NAMES = {
  1: 'Estiramiento de Cuello',
  2: 'Cat-Cow',
  3: 'Extensión de Columna',
  4: 'Retracción Escapular',
  5: 'Plancha de Núcleo',
}

const EJERCICIO_ICONS = {
  1: MoveHorizontal,
  2: ArrowUpDown,
  3: PersonStanding,
  4: Layers,
  5: Shield,
}

const RISK_ICONS = {
  bajo:  <CheckCircle2 size={32} className="text-emerald-500" />,
  medio: <AlertTriangle size={32} className="text-amber-500" />,
  alto:  <AlertOctagon size={32} className="text-red-500" />,
}
const RISK_BG = {
  bajo:  'from-emerald-50 to-white border-emerald-100',
  medio: 'from-amber-50 to-white border-amber-100',
  alto:  'from-red-50 to-white border-red-100',
}
const RISK_TITLE = {
  bajo:  '¡Excelente sesión!',
  medio: 'Sesión con áreas de mejora',
  alto:  'Se detectaron aspectos importantes a corregir',
}
const RISK_DESC = {
  bajo:  'Tu ejecución fue correcta la mayor parte de la sesión.',
  medio: 'Hay aspectos que puedes mejorar para proteger tu columna.',
  alto:  'Es importante trabajar en la corrección para prevenir lesiones.',
}

// Demo result when backend/n8n is not connected
function makeDemoResult(sessionId) {
  const isLocal = String(sessionId).startsWith('local')
  return {
    id: sessionId,
    tipo: 'postura_vivo',
    fecha: new Date().toISOString(),
    duracion_segundos: 60,
    ejercicio_id: null,
    resultados_analisis: [{
      nivel_riesgo: 'medio',
      texto_analisis: isLocal
        ? 'Sesión completada localmente. El backend no está conectado o Supabase no tiene el schema creado. Los datos de postura se analizaron correctamente en tu dispositivo.'
        : 'Análisis generado. Se procesaron los datos de la sesión correctamente.',
      recomendaciones: [
        'Conecta el backend y configura Supabase para guardar resultados.',
        'Activa el workflow de n8n para recibir análisis personalizado de Gemini.',
        'Completa tu perfil en Configuración para análisis más precisos.',
      ],
    }],
  }
}

// ── Rep success badge ─────────────────────────────────────────
function RepsBadge({ reps_ok, reps_total, metrica }) {
  if (!reps_total) return null
  const pct   = Math.round((reps_ok / reps_total) * 100)
  const color = pct >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
               : pct >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700'
               : 'bg-red-50 border-red-200 text-red-700'
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold ${color}`}>
      <Repeat2 size={16} />
      {reps_ok}/{reps_total} {metrica || 'repeticiones'} correctas
      <span className="ml-1 opacity-70">({pct}%)</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ResultsPage() {
  const { sessionId } = useParams()
  const [session,     setSession]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [analyzing,   setAnalyzing]   = useState(false)   // waiting for AI
  const [pollCount,   setPollCount]   = useState(0)
  const pollRef = useRef(null)

  const MAX_POLLS = 15          // ~60s total (15 × 4s)
  const POLL_MS   = 4000

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const s = await sesionesApi.obtener(sessionId)
        setSession(s)
        // If no AI result yet, start polling
        if (!s?.resultados_analisis?.length) {
          setAnalyzing(true)
        }
      } catch {
        setSession(makeDemoResult(sessionId))
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => stopPolling()
  }, [sessionId])

  // Polling for AI result
  useEffect(() => {
    if (!analyzing) return
    let count = 0
    pollRef.current = setInterval(async () => {
      count++
      setPollCount(count)
      try {
        const s = await sesionesApi.obtener(sessionId)
        if (s?.resultados_analisis?.length) {
          setSession(s)
          setAnalyzing(false)
          stopPolling()
        } else if (count >= MAX_POLLS) {
          // Timeout — show session data with a note
          setSession(s || makeDemoResult(sessionId))
          setAnalyzing(false)
          stopPolling()
        }
      } catch {
        if (count >= MAX_POLLS) {
          setAnalyzing(false)
          stopPolling()
        }
      }
    }, POLL_MS)
    return () => stopPolling()
  }, [analyzing, sessionId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  if (!session) return (
    <div className="text-center py-16 text-dark-400">
      <p>No se encontró la sesión.</p>
      <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Ir al Dashboard</Link>
    </div>
  )

  const resultado     = session.resultados_analisis?.[0]
  const nivel         = resultado?.nivel_riesgo || 'medio'
  const tipo          = session.tipo
  const ejercicioId   = session.ejercicio_id
  const EjIcon        = EJERCICIO_ICONS[ejercicioId] || Shield
  const ejercicioName = ejercicioId ? EJERCICIO_NAMES[ejercicioId] : null
  const durMin        = Math.floor((session.duracion_segundos || 0) / 60)
  const durSec        = (session.duracion_segundos || 0) % 60
  const fecha         = new Date(session.fecha).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Reps — stored in resultados_analisis or last raw frame
  const reps_ok    = resultado?.reps_ok    ?? session.datos_crudos?.at(-1)?.reps_ok
  const reps_total = resultado?.reps_total ?? session.datos_crudos?.at(-1)?.reps_total

  const recomendaciones = Array.isArray(resultado?.recomendaciones)
    ? resultado.recomendaciones
    : resultado?.recomendaciones
      ? [resultado.recomendaciones]
      : []

  // Metrica label for the exercise
  const METRICAS = { 1:'Inclinaciones', 2:'Ciclos', 3:'Extensiones', 4:'Retracciones', 5:'Segundos correctos' }

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-dark-400 font-medium uppercase tracking-wide mb-1">Resultados de sesión</p>
          <h1 className="text-2xl font-bold text-dark-900">
            {tipo === 'rehabilitacion' && ejercicioName ? ejercicioName : TIPO_LABELS[tipo] || tipo}
          </h1>
          <div className="flex items-center gap-2 text-dark-400 text-sm mt-1">
            <Clock size={13} />
            <span className="capitalize">{fecha}</span>
            <span>·</span>
            <span>{durMin}m {durSec}s</span>
          </div>
        </div>
        {resultado && <RiskBadge level={nivel} />}
      </div>

      {/* Rehab exercise badge */}
      {tipo === 'rehabilitacion' && ejercicioId && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <EjIcon size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-dark-800 text-sm">{ejercicioName}</p>
            <p className="text-xs text-dark-400">Ejercicio de rehabilitación · esqueleto naranja</p>
          </div>
          {reps_total > 0 && (
            <div className="ml-auto">
              <RepsBadge reps_ok={reps_ok} reps_total={reps_total} metrica={METRICAS[ejercicioId]} />
            </div>
          )}
        </div>
      )}

      {/* ── AI analyzing state ──────────────────────────────── */}
      {analyzing && (
        <Card>
          <div className="flex items-center gap-4 py-2">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Loader2 size={20} className="text-primary-500 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-dark-800">Gemini AI está analizando tu sesión...</p>
              <p className="text-sm text-dark-400 mt-0.5">
                Procesando {session.duracion_segundos}s de datos de postura con tu perfil personal.
                {pollCount > 2 && ` (${pollCount * 4}s)`}
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary-400 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-xs text-dark-300 mt-2">
            El análisis puede tardar hasta 60 segundos. Esta página actualiza automáticamente.
          </p>
        </Card>
      )}

      {/* ── Risk summary (only once AI result arrives) ───────── */}
      {resultado && (
        <div className={`card p-6 bg-gradient-to-br border-2 ${RISK_BG[nivel] || RISK_BG.medio}`}>
          <div className="flex items-center gap-4">
            {RISK_ICONS[nivel]}
            <div>
              <p className="font-semibold text-dark-800 text-lg">{RISK_TITLE[nivel]}</p>
              <p className="text-sm text-dark-500 mt-0.5">{RISK_DESC[nivel]}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── AI analysis text ─────────────────────────────────── */}
      {resultado?.texto_analisis && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
              <BarChart3 size={14} className="text-primary-600" />
            </div>
            <h2 className="font-semibold text-dark-800">Análisis de Gemini AI</h2>
          </div>
          <p className="text-dark-600 text-sm leading-relaxed whitespace-pre-line">
            {resultado.texto_analisis}
          </p>
        </Card>
      )}

      {/* ── Recommendations ──────────────────────────────────── */}
      {recomendaciones.length > 0 && (
        <Card>
          <h2 className="font-semibold text-dark-800 mb-4">Recomendaciones personalizadas</h2>
          <ol className="space-y-3">
            {recomendaciones.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm text-dark-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ── No result after timeout ───────────────────────────── */}
      {!analyzing && !resultado && (
        <Card>
          <div className="flex items-start gap-3 text-sm text-dark-500">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-dark-700 mb-1">El análisis de Gemini no llegó a tiempo</p>
              <p>Posibles causas:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-dark-400">
                <li>El workflow de n8n no está en estado <strong>Active</strong></li>
                <li>La API Key de Gemini no tiene cuota disponible</li>
                <li>El backend no está corriendo o no puede llegar a n8n</li>
              </ul>
              <p className="mt-2 text-dark-400">Revisa el <strong>Paso 5</strong> del <code className="bg-gray-100 px-1 rounded">SETUP.md</code>.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {tipo === 'rehabilitacion' ? (
          <Link to="/rehab" className="btn-primary">
            <EjIcon size={15} /> Otro ejercicio
          </Link>
        ) : (
          <Link to="/analysis" className="btn-primary">
            Nueva sesión de postura
          </Link>
        )}
        <Link to="/rehab" className="btn-outline">Rehabilitación</Link>
        <Link to="/history" className="btn-ghost">
          Ver historial <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sesionesApi } from '../lib/api'
import {
  Activity, Dumbbell, Clock, ChevronRight, Filter,
  MoveHorizontal, ArrowUpDown, PersonStanding, Layers, Shield, Repeat2,
} from 'lucide-react'
import { RiskBadge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const TIPO_LABELS = {
  postura_vivo:   'Postura en Vivo',
  rehabilitacion: 'Rehabilitación',
}

const EJERCICIO_META = {
  1: { nombre: 'Estiramiento de Cuello', icon: MoveHorizontal, color: 'bg-sky-50 text-sky-600' },
  2: { nombre: 'Cat-Cow',               icon: ArrowUpDown,     color: 'bg-emerald-50 text-emerald-600' },
  3: { nombre: 'Extensión de Columna',  icon: PersonStanding,  color: 'bg-violet-50 text-violet-600' },
  4: { nombre: 'Retracción Escapular',  icon: Layers,          color: 'bg-amber-50 text-amber-600' },
  5: { nombre: 'Plancha de Núcleo',     icon: Shield,          color: 'bg-rose-50 text-rose-600' },
}

const DEMO = [
  { id: '1', tipo: 'postura_vivo',   fecha: new Date(Date.now()-86400000*0).toISOString(), duracion_segundos: 1800, ejercicio_id: null, resultados_analisis: [{ nivel_riesgo: 'bajo' }] },
  { id: '2', tipo: 'rehabilitacion', fecha: new Date(Date.now()-86400000*1).toISOString(), duracion_segundos: 90,   ejercicio_id: 2,    resultados_analisis: [{ nivel_riesgo: 'medio', reps_ok: 8, reps_total: 10 }] },
  { id: '3', tipo: 'postura_vivo',   fecha: new Date(Date.now()-86400000*2).toISOString(), duracion_segundos: 2400, ejercicio_id: null, resultados_analisis: [{ nivel_riesgo: 'bajo' }] },
  { id: '4', tipo: 'rehabilitacion', fecha: new Date(Date.now()-86400000*4).toISOString(), duracion_segundos: 120,  ejercicio_id: 5,    resultados_analisis: [{ nivel_riesgo: 'alto', reps_ok: 2, reps_total: 6 }] },
  { id: '5', tipo: 'rehabilitacion', fecha: new Date(Date.now()-86400000*5).toISOString(), duracion_segundos: 90,   ejercicio_id: 1,    resultados_analisis: [{ nivel_riesgo: 'bajo', reps_ok: 12, reps_total: 13 }] },
]

function RepsBadge({ reps_ok, reps_total }) {
  if (!reps_total) return null
  const pct  = Math.round((reps_ok / reps_total) * 100)
  const color = pct >= 80 ? 'bg-emerald-50 text-emerald-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      <Repeat2 size={11} />
      {reps_ok}/{reps_total} ({pct}%)
    </span>
  )
}

export default function HistoryPage() {
  const [sesiones, setSesiones] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    sesionesApi.listar()
      .then(s => setSesiones(s.length ? s : DEMO))
      .catch(() => setSesiones(DEMO))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? sesiones : sesiones.filter(s => s.tipo === filter)

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fmtDur  = (s)   => { const m = Math.floor(s/60); return m > 0 ? `${m}m ${s%60}s` : `${s}s` }

  const grouped = filtered.reduce((acc, s) => {
    const day = new Date(s.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[day]) acc[day] = []
    acc[day].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Historial de Sesiones</h1>
          <p className="text-dark-400 text-sm mt-1">{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''} en total</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-dark-400" />
          {['all', 'postura_vivo', 'rehabilitacion'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filter === f ? 'bg-primary-500 text-white' : 'bg-gray-100 text-dark-500 hover:bg-gray-200'}`}>
              {f === 'all' ? 'Todas' : TIPO_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Activity size={40} className="mx-auto mb-3 text-dark-200" />
          <p className="text-dark-400">No hay sesiones registradas.</p>
          <Link to="/analysis" className="btn-primary mt-4 inline-flex">Empezar ahora</Link>
        </Card>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">{day}</h2>
            <Card className="divide-y divide-gray-50 p-0">
              {items.map(s => {
                const nivel     = s.resultados_analisis?.[0]?.nivel_riesgo
                const reps_ok   = s.resultados_analisis?.[0]?.reps_ok   ?? s.datos_crudos?.at(-1)?.reps_ok
                const reps_total = s.resultados_analisis?.[0]?.reps_total ?? s.datos_crudos?.at(-1)?.reps_total
                const ejMeta    = s.ejercicio_id ? EJERCICIO_META[s.ejercicio_id] : null
                const EjIcon    = ejMeta?.icon || (s.tipo === 'rehabilitacion' ? Dumbbell : Activity)
                const iconColor = ejMeta?.color || (s.tipo === 'rehabilitacion' ? 'bg-orange-50 text-orange-600' : 'bg-primary-50 text-primary-600')

                return (
                  <Link key={s.id} to={`/results/${s.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <EjIcon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-700 text-sm">
                        {s.tipo === 'rehabilitacion' && ejMeta
                          ? ejMeta.nombre
                          : TIPO_LABELS[s.tipo] || s.tipo}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-dark-400 mt-0.5">
                        <Clock size={11} />
                        {fmtTime(s.fecha)}
                        {s.duracion_segundos && <span>· {fmtDur(s.duracion_segundos)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.tipo === 'rehabilitacion' && reps_total > 0 && (
                        <RepsBadge reps_ok={reps_ok} reps_total={reps_total} />
                      )}
                      {nivel && <RiskBadge level={nivel} />}
                      <ChevronRight size={15} className="text-dark-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </Card>
          </div>
        ))
      )}
    </div>
  )
}

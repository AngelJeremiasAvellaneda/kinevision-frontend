import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Flame, Clock, TrendingUp, ChevronRight, Dumbbell,
  Calendar, BarChart3, Monitor, Bone, ShieldPlus, Target,
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { sesionesApi, rachaApi, perfilApi } from '../lib/api'
import { Card, StatCard } from '../components/ui/Card'
import { RiskBadge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const TIPO_LABELS = {
  postura_vivo:   'Postura en Vivo',
  rehabilitacion: 'Rehabilitación',
}

// Fallback demo data when backend isn't connected yet
const DEMO_SESIONES = [
  { id: '1', tipo: 'postura_vivo',   fecha: new Date(Date.now() - 86400000).toISOString(), duracion_segundos: 1800, resultados_analisis: [{ nivel_riesgo: 'bajo', texto_analisis: 'Buena postura general hoy.' }] },
  { id: '2', tipo: 'rehabilitacion', fecha: new Date(Date.now() - 172800000).toISOString(), duracion_segundos: 900, resultados_analisis: [{ nivel_riesgo: 'medio', texto_analisis: 'Mejora en la ejecución.' }] },
  { id: '3', tipo: 'postura_vivo',   fecha: new Date(Date.now() - 259200000).toISOString(), duracion_segundos: 2400, resultados_analisis: [{ nivel_riesgo: 'bajo', texto_analisis: 'Excelente sesión.' }] },
]

function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [sesiones, setSesiones] = useState([])
  const [racha, setRacha]       = useState({ dias_consecutivos: 0 })
  const [perfil, setPerfil]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r, p] = await Promise.all([
          sesionesApi.listar(),
          rachaApi.obtener(),
          perfilApi.obtener(),
        ])
        setSesiones(s.length ? s : DEMO_SESIONES)
        setRacha(r || { dias_consecutivos: 3 })
        setPerfil(p)
      } catch {
        // Backend not connected — use demo data
        setSesiones(DEMO_SESIONES)
        setRacha({ dias_consecutivos: 3 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const nombre = perfil?.nombre || user?.user_metadata?.full_name?.split(' ')[0] || 'Atleta'
  const ultimaSesion = sesiones[0]
  const totalSesiones = sesiones.length
  const totalMinutos = Math.round(sesiones.reduce((a, s) => a + (s.duracion_segundos || 0), 0) / 60)

  const OBJETIVO_LABELS = {
    mejorar_postura: { label: 'Mejorar postura al trabajar', icon: Monitor,    color: 'text-sky-600 bg-sky-50' },
    rehabilitacion:  { label: 'Rehabilitar dolor de columna', icon: Bone,      color: 'text-emerald-600 bg-emerald-50' },
    prevencion:      { label: 'Prevenir lesiones futuras',   icon: ShieldPlus, color: 'text-violet-600 bg-violet-50' },
    rendimiento:     { label: 'Mejorar rendimiento físico',  icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
  }

  // Chart data — last 7 sessions score (simulated from risk level)
  const scoreFromRisk = (r) => ({ bajo: 88, medio: 65, alto: 40 }[r] ?? 70)
  const chartLabels = sesiones.slice(0, 7).reverse().map(s => formatDate(s.fecha))
  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Puntuación',
      data: sesiones.slice(0, 7).reverse().map(s => scoreFromRisk(s.resultados_analisis?.[0]?.nivel_riesgo)),
      fill: true,
      borderColor: '#00c5dd',
      backgroundColor: 'rgba(0,197,221,0.08)',
      borderWidth: 2,
      pointBackgroundColor: '#00c5dd',
      pointRadius: 4,
      tension: 0.4,
    }],
  }
  const chartOpts = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#f0f4f8' }, ticks: { color: '#627d98' } },
      x: { grid: { display: false }, ticks: { color: '#627d98', maxRotation: 30 } },
    },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">
            Hola, {nombre}
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/analysis" className="btn-primary">
            <Activity size={15} />
            Análisis en Vivo
          </Link>
          <Link to="/rehab" className="btn-outline">
            <Dumbbell size={15} />
            Rehabilitación
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Racha actual"    value={`${racha.dias_consecutivos} días`} icon={Flame}     color="amber"   />
        <StatCard label="Sesiones totales" value={totalSesiones}                    icon={Calendar}  color="primary" />
        <StatCard label="Minutos activo"  value={`${totalMinutos}m`}                icon={Clock}     color="emerald" />
        <StatCard label="Última sesión"   value={ultimaSesion ? formatDate(ultimaSesion.fecha) : '—'} icon={TrendingUp} color="primary" />
      </div>

      {/* Objetivo reminder */}
      {perfil?.objetivo && (() => {
        const obj = OBJETIVO_LABELS[perfil.objetivo]
        if (!obj) return null
        const ObjIcon = obj.icon
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${obj.color} border-opacity-30`}
            style={{ borderColor: 'currentColor', borderWidth: 1 }}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${obj.color}`}>
              <ObjIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Tu objetivo</p>
              <p className="text-sm font-medium text-dark-800">{obj.label}</p>
            </div>
            <Link to="/settings" className="ml-auto text-xs text-dark-400 hover:text-primary-500 flex items-center gap-1 flex-shrink-0">
              <Target size={12} /> Editar
            </Link>
          </div>
        )
      })()}

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary-500" />
                <h3 className="font-semibold text-dark-800">Progreso de las últimas sesiones</h3>
              </div>
              <Link to="/history" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                Ver todo <ChevronRight size={13} />
              </Link>
            </div>
            {chartLabels.length > 0 ? (
              <Line data={chartData} options={chartOpts} />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-dark-400">
                <BarChart3 size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Aún no hay sesiones registradas</p>
              </div>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card hover className="group" onClick={() => {}}>
            <Link to="/analysis" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-md group-hover:bg-primary-600 transition-colors">
                <Activity size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-dark-800">Corrector de Postura</p>
                <p className="text-xs text-dark-400 mt-0.5">Análisis en tiempo real frente a la computadora</p>
              </div>
              <ChevronRight size={18} className="text-dark-300 group-hover:text-primary-500 transition-colors" />
            </Link>
          </Card>

          <Card hover>
            <Link to="/rehab" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                <Dumbbell size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-dark-800">Rehabilitación</p>
                <p className="text-xs text-dark-400 mt-0.5">5 ejercicios de columna con análisis IA</p>
              </div>
              <ChevronRight size={18} className="text-dark-300" />
            </Link>
          </Card>

          {/* Streak card */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
                <Flame size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-amber-800 text-lg">{racha.dias_consecutivos} días seguidos</p>
                <p className="text-xs text-amber-600">La constancia es clave.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent sessions */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-dark-800">Sesiones recientes</h3>
          <Link to="/history" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
            Ver historial completo <ChevronRight size={13} />
          </Link>
        </div>

        {sesiones.length === 0 ? (
          <div className="text-center py-10 text-dark-400">
            <Activity size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aún no tienes sesiones registradas.</p>
            <Link to="/analysis" className="btn-primary mt-4 inline-flex">Comenzar ahora</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sesiones.slice(0, 5).map(s => (
              <Link
                key={s.id}
                to={`/results/${s.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                  {s.tipo === 'rehabilitacion' ? <Dumbbell size={16} className="text-primary-600" /> : <Activity size={16} className="text-primary-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-700">{TIPO_LABELS[s.tipo] || s.tipo}</p>
                  <p className="text-xs text-dark-400">{formatDate(s.fecha)} · {formatDuration(s.duracion_segundos)}</p>
                </div>
                {s.resultados_analisis?.[0]?.nivel_riesgo && (
                  <RiskBadge level={s.resultados_analisis[0].nivel_riesgo} />
                )}
                <ChevronRight size={15} className="text-dark-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

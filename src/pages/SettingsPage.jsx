import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Ruler, Weight, Clock3, Zap, Target, Save,
  LogOut, ShieldCheck, Bell, Monitor, Bone, ShieldPlus, TrendingUp,
  CheckCircle2, Camera, Volume2,
} from 'lucide-react'
import { perfilApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'

const ACTIVIDAD = [
  { value: 'sedentario', label: 'Sedentario',  desc: '< 1h / semana' },
  { value: 'leve',       label: 'Leve',        desc: '1 – 2h / semana' },
  { value: 'moderado',   label: 'Moderado',    desc: '3 – 4h / semana' },
  { value: 'activo',     label: 'Activo',      desc: '5+ h / semana' },
]

const TRABAJO = [
  { value: 'oficina', label: 'Oficina / Remoto' },
  { value: 'mixto',   label: 'Mixto' },
  { value: 'pie',     label: 'De pie' },
  { value: 'fisico',  label: 'Trabajo físico' },
]

const OBJETIVOS = [
  { value: 'mejorar_postura', icon: Monitor,    label: 'Mejorar postura' },
  { value: 'rehabilitacion',  icon: Bone,       label: 'Rehabilitación' },
  { value: 'prevencion',      icon: ShieldPlus, label: 'Prevención' },
  { value: 'rendimiento',     icon: TrendingUp, label: 'Rendimiento' },
]

const DOLORES = ['Cuello', 'Hombros', 'Lumbar', 'Columna media', 'Caderas', 'Rodillas', 'Ninguno']

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [tab,     setTab]     = useState('perfil')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nombre: '', edad: '', altura_cm: '', peso_kg: '',
    horas_sentado: '8', tipo_trabajo: 'oficina',
    actividad_fisica: 'moderado', dolores: [], condiciones: '', objetivo: '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleDolor = (d) => {
    if (d === 'Ninguno') { set('dolores', ['Ninguno']); return }
    const next = form.dolores.filter(x => x !== 'Ninguno')
    set('dolores', next.includes(d) ? next.filter(x => x !== d) : [...next, d])
  }

  useEffect(() => {
    perfilApi.obtener()
      .then(p => {
        if (p) setForm({
          nombre:          p.nombre           ?? '',
          edad:            p.edad             ?? '',
          altura_cm:       p.altura_cm        ?? '',
          peso_kg:         p.peso_kg          ?? '',
          horas_sentado:   p.horas_sentado_dia ?? '8',
          tipo_trabajo:    p.tipo_trabajo     ?? 'oficina',
          actividad_fisica:p.actividad_fisica ?? 'moderado',
          dolores:         p.dolores_frecuentes ? p.dolores_frecuentes.split(', ').filter(Boolean) : [],
          condiciones:     p.condiciones      ?? '',
          objetivo:        p.objetivo         ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      await perfilApi.guardar({
        nombre:            form.nombre.trim(),
        edad:              parseInt(form.edad) || null,
        altura_cm:         parseInt(form.altura_cm) || null,
        peso_kg:           parseFloat(form.peso_kg) || null,
        horas_sentado_dia: parseInt(form.horas_sentado),
        tipo_trabajo:      form.tipo_trabajo,
        actividad_fisica:  form.actividad_fisica,
        dolores_frecuentes:form.dolores.join(', '),
        condiciones:       form.condiciones.trim(),
        objetivo:          form.objetivo,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { /* show nothing — demo mode */ }
    finally { setSaving(false) }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const avatar = user?.user_metadata?.avatar_url
  const name   = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  const TABS = [
    { id: 'perfil',  label: 'Perfil',   icon: User },
    { id: 'cuenta',  label: 'Cuenta',   icon: ShieldCheck },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Configuración</h1>
        <p className="text-dark-400 text-sm mt-1">Actualiza tu perfil y preferencias</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === id ? 'bg-white text-dark-800 shadow-sm' : 'text-dark-500 hover:text-dark-700'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── PERFIL TAB ── */}
          {tab === 'perfil' && (
            <div className="space-y-5">
              {/* Datos personales */}
              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <User size={16} className="text-primary-500" />
                  Datos personales
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">Nombre</label>
                    <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="label">Edad</label>
                    <input className="input" type="number" value={form.edad} onChange={e => set('edad', e.target.value)} placeholder="Ej: 28" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Altura (cm)</label>
                      <div className="relative">
                        <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                        <input className="input pl-9" type="number" value={form.altura_cm} onChange={e => set('altura_cm', e.target.value)} placeholder="170" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Peso (kg)</label>
                      <div className="relative">
                        <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                        <input className="input pl-9" type="number" value={form.peso_kg} onChange={e => set('peso_kg', e.target.value)} placeholder="70" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Hábitos */}
              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <Clock3 size={16} className="text-primary-500" />
                  Hábitos diarios
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">Horas sentado al día: <strong>{form.horas_sentado}h</strong></label>
                    <input className="w-full accent-primary-500 mt-1" type="range" min="1" max="16" step="1"
                      value={form.horas_sentado} onChange={e => set('horas_sentado', e.target.value)} />
                    <div className="flex justify-between text-xs text-dark-400 mt-1"><span>1h</span><span>8h</span><span>16h</span></div>
                  </div>

                  <div>
                    <label className="label">Tipo de trabajo</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {TRABAJO.map(t => (
                        <button key={t.value} type="button" onClick={() => set('tipo_trabajo', t.value)}
                          className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left
                            ${form.tipo_trabajo === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-primary-200 text-dark-600'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Actividad física semanal</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {ACTIVIDAD.map(a => (
                        <button key={a.value} type="button" onClick={() => set('actividad_fisica', a.value)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all
                            ${form.actividad_fisica === a.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
                          <p className="text-sm font-semibold text-dark-800">{a.label}</p>
                          <p className="text-xs text-dark-400">{a.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Salud */}
              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary-500" />
                  Historial de salud
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">Dolores frecuentes</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {DOLORES.map(d => (
                        <button key={d} type="button" onClick={() => toggleDolor(d)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                            ${form.dolores.includes(d) ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-dark-600 border-gray-200 hover:border-primary-300'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Condiciones médicas</label>
                    <textarea className="input resize-none" rows={3}
                      placeholder="Escoliosis, hernias, cirugías recientes..."
                      value={form.condiciones} onChange={e => set('condiciones', e.target.value)} />
                  </div>
                </div>
              </Card>

              {/* Objetivo */}
              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <Target size={16} className="text-primary-500" />
                  Objetivo principal
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {OBJETIVOS.map(o => {
                    const Icon = o.icon
                    return (
                      <button key={o.value} type="button" onClick={() => set('objetivo', o.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                          ${form.objetivo === o.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${form.objetivo === o.value ? 'bg-primary-500' : 'bg-gray-100'}`}>
                          <Icon size={15} className={form.objetivo === o.value ? 'text-white' : 'text-dark-500'} />
                        </div>
                        <span className="text-sm font-medium text-dark-700">{o.label}</span>
                        {form.objetivo === o.value && <CheckCircle2 size={14} className="ml-auto text-primary-500" />}
                      </button>
                    )
                  })}
                </div>
              </Card>

              {/* Save */}
              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full justify-center py-3 disabled:opacity-50">
                {saved
                  ? <><CheckCircle2 size={16} /> Guardado</>
                  : saving
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                    : <><Save size={16} /> Guardar cambios</>
                }
              </button>
            </div>
          )}

          {/* ── CUENTA TAB ── */}
          {tab === 'cuenta' && (
            <div className="space-y-4">
              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <User size={16} className="text-primary-500" />
                  Información de cuenta
                </h2>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-dark-800">{name}</p>
                    <p className="text-sm text-dark-400">{user?.email}</p>
                    <p className="text-xs text-dark-300 mt-1">Cuenta Google</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <Camera size={16} className="text-primary-500" />
                  Privacidad y datos
                </h2>
                <div className="space-y-3 text-sm text-dark-500">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
                    <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p>Tu video <strong className="text-dark-700">nunca abandona tu dispositivo</strong>. El análisis de pose corre completamente en el navegador con WebAssembly.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                    <Volume2 size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                    <p>La retroalimentación por voz usa la <strong className="text-dark-700">Web Speech API</strong> nativa del navegador. Sin servicios de terceros.</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="font-semibold text-dark-800 mb-4 flex items-center gap-2">
                  <LogOut size={16} className="text-red-500" />
                  Sesión
                </h2>
                <button onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors">
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

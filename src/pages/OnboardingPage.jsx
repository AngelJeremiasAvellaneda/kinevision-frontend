import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, ChevronRight, ChevronLeft, CheckCircle2,
  User, Ruler, Weight, Clock3, Zap, Target,
  Monitor, Bone, ShieldPlus, TrendingUp,
} from 'lucide-react'
import { perfilApi } from '../lib/api'

const STEPS = [
  { id: 'personal', title: 'Datos personales',    subtitle: 'Para personalizar tu análisis' },
  { id: 'habitos',  title: 'Tus hábitos diarios', subtitle: 'Cuéntanos sobre tu rutina' },
  { id: 'salud',    title: 'Historial de salud',  subtitle: 'Opcional pero ayuda mucho' },
  { id: 'objetivo', title: 'Tu objetivo',         subtitle: 'Lo que quieres lograr con KineVisión' },
]

const OBJETIVOS = [
  { value: 'mejorar_postura', icon: Monitor,    label: 'Mejorar postura al trabajar',   desc: 'Corrección en tiempo real frente al computador' },
  { value: 'rehabilitacion',  icon: Bone,       label: 'Rehabilitar dolor de columna',  desc: 'Ejercicios guiados para recuperación' },
  { value: 'prevencion',      icon: ShieldPlus, label: 'Prevenir lesiones futuras',     desc: 'Hábitos saludables antes de que duela' },
  { value: 'rendimiento',     icon: TrendingUp, label: 'Mejorar rendimiento físico',    desc: 'Técnica correcta para entrenar mejor' },
]

const DOLORES = ['Cuello', 'Hombros', 'Lumbar', 'Columna media', 'Caderas', 'Rodillas', 'Ninguno']

const ACTIVIDAD = [
  { value: 'sedentario', label: 'Sedentario',  desc: 'Menos de 1 hora por semana' },
  { value: 'leve',       label: 'Leve',        desc: '1 – 2 horas por semana' },
  { value: 'moderado',   label: 'Moderado',    desc: '3 – 4 horas por semana' },
  { value: 'activo',     label: 'Activo',      desc: '5 o más horas por semana' },
]

const TRABAJO = [
  { value: 'oficina',    label: 'Oficina / Remoto', desc: 'Sentado la mayor parte del día' },
  { value: 'mixto',      label: 'Mixto',            desc: 'Sentado y de pie en partes iguales' },
  { value: 'pie',        label: 'De pie',           desc: 'La mayoría del tiempo parado' },
  { value: 'fisico',     label: 'Trabajo físico',   desc: 'Esfuerzo físico constante' },
]

export default function OnboardingPage() {
  const navigate  = useNavigate()
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    nombre:          '',
    edad:            '',
    altura_cm:       '',
    peso_kg:         '',
    horas_sentado:   '8',
    tipo_trabajo:    'oficina',
    actividad_fisica:'moderado',
    dolores:         [],
    condiciones:     '',
    objetivo:        '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleDolor = (d) => {
    if (d === 'Ninguno') { set('dolores', ['Ninguno']); return }
    const next = form.dolores.filter(x => x !== 'Ninguno')
    set('dolores', next.includes(d) ? next.filter(x => x !== d) : [...next, d])
  }

  const canNext = () => {
    if (step === 0) return form.nombre.trim().length > 1 && Number(form.edad) > 0
    if (step === 1) return true
    if (step === 2) return true
    if (step === 3) return form.objetivo !== ''
    return false
  }

  const handleFinish = async () => {
    try {
      setSaving(true)
      await perfilApi.guardar({
        nombre:            form.nombre.trim(),
        edad:              parseInt(form.edad),
        altura_cm:         form.altura_cm ? parseInt(form.altura_cm) : null,
        peso_kg:           form.peso_kg   ? parseFloat(form.peso_kg) : null,
        horas_sentado_dia: parseInt(form.horas_sentado),
        tipo_trabajo:      form.tipo_trabajo,
        actividad_fisica:  form.actividad_fisica,
        dolores_frecuentes:form.dolores.join(', '),
        condiciones:       form.condiciones.trim(),
        objetivo:          form.objetivo,
      })
    } catch { /* skip gracefully */ }
    finally { setSaving(false) }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="font-bold text-dark-800 text-xl">KineVisión</span>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex flex-col gap-1.5">
              <div className={`h-1.5 rounded-full transition-all duration-300
                ${i < step ? 'bg-primary-500' : i === step ? 'bg-primary-400' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>

        {/* Step title */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h1 className="text-2xl font-bold text-dark-900 mt-1">{STEPS[step].title}</h1>
          <p className="text-dark-400 text-sm mt-1">{STEPS[step].subtitle}</p>
        </div>

        {/* Card */}
        <div className="card p-6">

          {/* ── Step 0: Datos personales ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    className="input pl-9"
                    placeholder="Tu nombre"
                    value={form.nombre}
                    onChange={e => set('nombre', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Edad</label>
                <input
                  className="input"
                  type="number" min="10" max="100" placeholder="Ej: 28"
                  value={form.edad}
                  onChange={e => set('edad', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Altura (cm)</label>
                  <div className="relative">
                    <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      className="input pl-9"
                      type="number" min="100" max="250" placeholder="170"
                      value={form.altura_cm}
                      onChange={e => set('altura_cm', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Peso (kg)</label>
                  <div className="relative">
                    <Weight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                    <input
                      className="input pl-9"
                      type="number" min="30" max="250" placeholder="70"
                      value={form.peso_kg}
                      onChange={e => set('peso_kg', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Hábitos ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="label">
                  <Clock3 size={13} className="inline mr-1" />
                  Horas sentado al día: <strong>{form.horas_sentado}h</strong>
                </label>
                <input
                  className="w-full accent-primary-500 mt-2"
                  type="range" min="1" max="16" step="1"
                  value={form.horas_sentado}
                  onChange={e => set('horas_sentado', e.target.value)}
                />
                <div className="flex justify-between text-xs text-dark-400 mt-1">
                  <span>1h</span><span>8h</span><span>16h</span>
                </div>
              </div>

              <div>
                <label className="label">Tipo de trabajo</label>
                <div className="space-y-2 mt-1.5">
                  {TRABAJO.map(t => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                        ${form.tipo_trabajo === t.value
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-200'}`}
                    >
                      <input
                        type="radio" name="trabajo" value={t.value}
                        checked={form.tipo_trabajo === t.value}
                        onChange={() => set('tipo_trabajo', t.value)}
                        className="accent-primary-500 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-dark-700">{t.label}</p>
                        <p className="text-xs text-dark-400">{t.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  <Zap size={13} className="inline mr-1" />
                  Actividad física semanal
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {ACTIVIDAD.map(a => (
                    <button
                      key={a.value} type="button"
                      onClick={() => set('actividad_fisica', a.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all
                        ${form.actividad_fisica === a.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-200'}`}
                    >
                      <p className="text-sm font-semibold text-dark-800">{a.label}</p>
                      <p className="text-xs text-dark-400 mt-0.5">{a.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Salud ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="label">Dolores frecuentes</label>
                <p className="text-xs text-dark-400 mb-2">Selecciona todos los que apliquen</p>
                <div className="flex flex-wrap gap-2">
                  {DOLORES.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => toggleDolor(d)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                        ${form.dolores.includes(d)
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-dark-600 border-gray-200 hover:border-primary-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Condiciones médicas relevantes</label>
                <p className="text-xs text-dark-400 mb-1.5">Escoliosis, hernias, cirugías recientes, etc. (opcional)</p>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Ej: Hernia L4-L5 operada en 2024..."
                  value={form.condiciones}
                  onChange={e => set('condiciones', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Objetivo ── */}
          {step === 3 && (
            <div className="space-y-3">
              {OBJETIVOS.map(o => {
                const Icon = o.icon
                return (
                  <button
                    key={o.value} type="button"
                    onClick={() => set('objetivo', o.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                      ${form.objetivo === o.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${form.objetivo === o.value ? 'bg-primary-500' : 'bg-gray-100'}`}>
                      <Icon size={18} className={form.objetivo === o.value ? 'text-white' : 'text-dark-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-800 text-sm">{o.label}</p>
                      <p className="text-xs text-dark-400 mt-0.5">{o.desc}</p>
                    </div>
                    {form.objetivo === o.value && (
                      <CheckCircle2 size={18} className="text-primary-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn-ghost disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} />
            Atrás
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canNext() || saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed min-w-[130px] justify-center"
            >
              {saving
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Guardando...</span>
                : <span className="flex items-center gap-2">Comenzar <ChevronRight size={16} /></span>
              }
            </button>
          )}
        </div>

        <p className="text-center text-xs text-dark-400 mt-4">
          Puedes actualizar estos datos en cualquier momento desde Configuración
        </p>
      </div>
    </div>
  )
}

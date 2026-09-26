/**
 * RehabPage — Rehabilitation with dedicated analysis (NOT shared with desk posture).
 *
 * Uses useRehabAnalysis (full-body skeleton, orange, per-exercise checks + rep counting).
 * GIFs live in src/assets/ejercicios/ — see that folder's README.md for naming.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRehabAnalysis } from '../hooks/useRehabAnalysis'
import { drawRehabOverlay } from '../lib/drawRehab'
import { useVoiceFeedback } from '../hooks/useVoiceFeedback'
import { sesionesApi } from '../lib/api'
import {
  Clock, Play, StopCircle, ChevronLeft, Volume2, VolumeX,
  CameraOff, AlertCircle, CheckCircle2, XCircle, Activity,
  MoveHorizontal, ArrowUpDown, PersonStanding, Layers, Shield,
  ImageOff, Repeat2,
} from 'lucide-react'

// GIF paths — use the public folder so they work in both dev and build
// without crashing if files are missing. Place GIFs in /public/ejercicios/
const GIF_NAMES = {
  1: 'neck_stretch.gif',
  2: 'cat_cow.gif',
  3: 'spine_extension.gif',
  4: 'scapular.gif',
  5: 'plank.gif',
}
// /ejercicios/ is served from public/ejercicios/  (copy your GIFs there)
const GIF_MAP = Object.fromEntries(
  Object.entries(GIF_NAMES).map(([k, v]) => [k, `/ejercicios/${v}`])
)

const COLOR_MAP = {
  buena:   '#10b981',   // green  — same indicator system as AnalysisPage
  regular: '#f59e0b',   // yellow
  mala:    '#ef4444',   // red
}

const EJERCICIOS = [
  {
    id: 1, icon: MoveHorizontal,
    nombre: 'Estiramiento de Cuello',
    descripcion: 'Alivia la tensión cervical causada por largos períodos frente al computador.',
    instrucciones: [
      'Siéntate erguido con hombros relajados.',
      'Inclina suavemente la cabeza hacia un lado, sosteniendo 5 segundos.',
      'Regresa al centro y repite del otro lado.',
      'Mantén los movimientos lentos y controlados.',
    ],
    voz: ['Inclina la cabeza hacia la izquierda', 'Regresa al centro', 'Inclina hacia la derecha', 'Regresa al centro'],
    metrica: 'Inclinaciones',
    duracion_seg: 120, color: 'border-sky-200 bg-sky-50/50', iconBg: 'bg-sky-500',
  },
  {
    id: 2, icon: ArrowUpDown,
    nombre: 'Cat-Cow',
    descripcion: 'Moviliza la columna vertebral y alivia la tensión lumbar.',
    instrucciones: [
      'En cuatro puntos: manos bajo hombros, rodillas bajo caderas.',
      'Inhala y arquea la espalda hacia arriba (Gato).',
      'Exhala y hunde la espalda hacia abajo (Vaca).',
      'Alterna lentamente entre las dos posiciones.',
    ],
    voz: ['Arquea la espalda hacia arriba', 'Hunde la espalda hacia abajo'],
    metrica: 'Ciclos',
    duracion_seg: 90, color: 'border-emerald-200 bg-emerald-50/50', iconBg: 'bg-emerald-500',
  },
  {
    id: 3, icon: PersonStanding,
    nombre: 'Extensión de Columna',
    descripcion: 'Contrarresta la postura encorvada y fortalece los músculos espinales.',
    instrucciones: [
      'De pie, pies a la altura de los hombros.',
      'Coloca las manos en la zona lumbar.',
      'Inclínate suavemente hacia atrás empujando las caderas al frente.',
      'Sostén 3 segundos, regresa a posición inicial.',
    ],
    voz: ['Empuja las caderas hacia adelante, inclínate atrás', 'Regresa erguido'],
    metrica: 'Extensiones',
    duracion_seg: 90, color: 'border-violet-200 bg-violet-50/50', iconBg: 'bg-violet-500',
  },
  {
    id: 4, icon: Layers,
    nombre: 'Retracción Escapular',
    descripcion: 'Fortalece los músculos entre los omóplatos y mejora la postura de hombros.',
    instrucciones: [
      'Siéntate erguido, brazos a los lados.',
      'Junta los omóplatos llevando los codos hacia atrás.',
      'Sostén 5 segundos.',
      'Relaja y repite.',
    ],
    voz: ['Junta los omóplatos y sostén', 'Relaja los hombros'],
    metrica: 'Retracciones',
    duracion_seg: 90, color: 'border-amber-200 bg-amber-50/50', iconBg: 'bg-amber-500',
  },
  {
    id: 5, icon: Shield,
    nombre: 'Plancha de Núcleo',
    descripcion: 'Activa el core profundo para estabilizar la columna lumbar.',
    instrucciones: [
      'Apoya antebrazos y puntas de pies.',
      'Cuerpo en línea recta de cabeza a talones.',
      'Activa el abdomen, no dejes caer ni subir las caderas.',
      'Aguanta el máximo tiempo posible.',
    ],
    voz: ['Mantén el cuerpo recto', 'Activa el abdomen'],
    metrica: 'Segundos correctos',
    duracion_seg: 60, color: 'border-rose-200 bg-rose-50/50', iconBg: 'bg-rose-500',
  },
]

// ── GIF placeholder component ─────────────────────────────────
function ExerciseGif({ ejercicioId, nombre }) {
  const [failed, setFailed] = useState(false)
  const src      = GIF_MAP[ejercicioId]
  const filename = GIF_NAMES[ejercicioId] || 'ejercicio.gif'

  if (failed || !src) {
    return (
      <div className="w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-dark-300">
        <ImageOff size={32} />
        <p className="text-xs text-center px-2 leading-relaxed">
          Agrega <code className="bg-gray-100 px-1 rounded">{filename}</code>
          <br />en <code className="bg-gray-100 px-1 rounded">public/ejercicios/</code>
        </p>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={`Demostración: ${nombre}`}
      className="w-full aspect-square object-cover rounded-xl"
      onError={() => setFailed(true)}
    />
  )
}

// ── Main component ────────────────────────────────────────────
export default function RehabPage() {
  const navigate = useNavigate()

  const videoRef     = useRef(null)   // ALWAYS mounted
  const canvasRef    = useRef(null)   // ALWAYS mounted
  const rafRef       = useRef(null)
  const sessionIdRef = useRef(null)
  const rawDataRef   = useRef([])
  const startTimeRef = useRef(null)
  const stoppingRef  = useRef(false)
  const voiceIdxRef  = useRef(0)
  const voiceTimerRef = useRef(null)

  const [selected,    setSelected]    = useState(null)
  const [phase,       setPhase]       = useState('select')
  const [elapsed,     setElapsed]     = useState(0)
  const [cameraOn,    setCameraOn]    = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [analysis,    setAnalysis]    = useState(null)

  const { ready, loading: modelLoading, error: modelError, analyzeFrame, resetCounters, getReps }
    = useRehabAnalysis(selected?.id)

  const { enabled: voiceOn, setEnabled: setVoiceOn, speak, speakFeedback }
    = useVoiceFeedback()

  const fmt      = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const remaining = selected ? Math.max(0, selected.duracion_seg - elapsed) : 0
  const progress  = selected ? Math.min(100, (elapsed / selected.duracion_seg) * 100) : 0

  // ── Stop camera ───────────────────────────────────────────
  const stopStream = useCallback(() => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null }
  }, [])

  // ── Start camera ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null)
    if (!videoRef.current) { setCameraError('Error interno: elemento de video no disponible.'); return false }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      videoRef.current.srcObject = stream
      await new Promise((res, rej) => {
        videoRef.current.onloadedmetadata = res
        videoRef.current.onerror = rej
        setTimeout(() => rej(new Error('Timeout')), 8000)
      })
      await videoRef.current.play()
      setCameraOn(true)
      return true
    } catch (e) {
      setCameraError(
        e?.name === 'NotAllowedError'  ? 'Permiso denegado. Habilita la cámara en tu navegador.' :
        e?.name === 'NotFoundError'    ? 'No se encontró cámara en este dispositivo.' :
        e?.name === 'NotReadableError' ? 'La cámara está en uso por otra aplicación.' :
        `Error de cámara: ${e?.message || 'desconocido'}`
      )
      return false
    }
  }, [])

  // ── Voice guide cycling ───────────────────────────────────
  const startVoiceGuide = useCallback((ejercicio) => {
    if (!voiceOn || !ejercicio?.voz?.length) return
    speak(ejercicio.voz[0])
    voiceIdxRef.current = 1
    voiceTimerRef.current = setInterval(() => {
      const msgs = ejercicio.voz
      speak(msgs[voiceIdxRef.current % msgs.length])
      voiceIdxRef.current++
    }, 8000)
  }, [voiceOn, speak])

  // ── Start session ─────────────────────────────────────────
  const handleStart = async () => {
    const ok = await startCamera()
    if (!ok) return

    try {
      const s = await sesionesApi.crear({ tipo: 'rehabilitacion', ejercicio_id: selected.id })
      sessionIdRef.current = s.id
    } catch {
      sessionIdRef.current = `local-${Date.now()}`
    }

    rawDataRef.current   = []
    startTimeRef.current = Date.now()
    stoppingRef.current  = false
    setElapsed(0)
    setAnalysis(null)
    resetCounters()
    startVoiceGuide(selected)
    setPhase('active')
  }

  // ── Stop session ──────────────────────────────────────────
  const doStop = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    stopStream()

    const { reps_ok, reps_total } = getReps()
    const dur = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000)
    const id  = sessionIdRef.current

    // Inject rep data into raw frames for backend stats
    const finalData = rawDataRef.current.slice(-150).map(f => ({ ...f, reps_ok, reps_total }))

    try {
      await sesionesApi.finalizar(id, { duracion_segundos: dur, datos_crudos: finalData })
      navigate(`/results/${id}`)
    } catch {
      navigate(`/results/${id || 'local'}`)
    }
  }, [navigate, stopStream, getReps])

  // ── Timer + auto-stop ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    const iv = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (next >= (selected?.duracion_seg ?? Infinity)) { clearInterval(iv); doStop() }
        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, selected, doStop])

  // ── Analysis loop ─────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn || !ready || phase !== 'active') return
    const loop = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return }
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      const result = analyzeFrame(video, performance.now())
      if (result?.detected) {
        setAnalysis(result)
        drawRehabOverlay(canvas, result)
        speakFeedback(result.feedback)
        rawDataRef.current.push({
          t: Date.now(), metricas: result.puntuacion,
          puntuacion: result.puntuacion, estado: result.estado_global,
        })
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [cameraOn, ready, phase, analyzeFrame, speakFeedback])

  useEffect(() => () => stopStream(), [stopStream])

  const Icon       = selected?.icon || Shield
  const stateColor = analysis?.estado_global ? COLOR_MAP[analysis.estado_global] : '#f97316'

  return (
    <div className="fade-in">

      {/* ── ALWAYS-MOUNTED video+canvas (hidden when not active) ── */}
      <div className={phase === 'active' ? 'block' : 'sr-only absolute -top-[9999px]'}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${selected?.iconBg || 'bg-orange-500'} flex items-center justify-center`}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-dark-900">{selected?.nombre}</h1>
                <p className="text-dark-400 text-xs">Sesión en progreso · esqueleto naranja</p>
              </div>
            </div>
            <button
              onClick={() => setVoiceOn(v => !v)}
              title={voiceOn ? 'Desactivar indicaciones por voz' : 'Activar indicaciones por voz'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                ${voiceOn
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 border-gray-200 text-dark-500 hover:bg-gray-200'}`}>
              {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              Voz {voiceOn ? 'ON' : 'OFF'}
            </button>          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Camera + canvas */}
            <div className="lg:col-span-2 space-y-3">
              <div className="relative bg-dark-900 rounded-2xl overflow-hidden aspect-video shadow-lg">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay
                  aria-label="Cámara de rehabilitación" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-hidden="true" />

                {/* Status banner */}
                {cameraOn && analysis?.estado_global && (
                  <div className="absolute top-3 left-3 right-3 py-1.5 px-3 rounded-xl text-white text-xs font-semibold text-center"
                    style={{ backgroundColor: stateColor + 'dd' }}>
                    {analysis.estado_global === 'buena' ? 'EJECUCIÓN CORRECTA'
                      : analysis.estado_global === 'regular' ? 'AJUSTA LA POSTURA'
                      : 'CORRIGE LA POSTURA'} · {analysis.puntuacion}/100
                  </div>
                )}

                {/* Timer */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-xl text-lg font-mono font-bold">
                  {fmt(remaining)}
                </div>

                {/* Reps badge */}
                {analysis?.reps_ok > 0 && (
                  <div className="absolute bottom-3 right-3 bg-orange-500/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                    <Repeat2 size={12} />
                    {analysis.reps_ok}/{analysis.reps_total} {selected?.metrica}
                  </div>
                )}

                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark-900/90">
                    <CameraOff size={40} className="text-white/30" />
                    <p className="text-white/40 text-sm">Iniciando cámara...</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-dark-400 mb-1.5">
                  <span>Progreso</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000 bg-orange-500"
                    style={{ width: `${progress}%` }} />
                </div>
              </div>

              <button onClick={doStop}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">
                <StopCircle size={16} />
                Terminar ejercicio
              </button>

              {cameraError && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{cameraError}
                </div>
              )}
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              {/* Score */}
              <div className="card p-5">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Ejecución</p>
                {analysis?.detected ? (
                  <>
                    <p className="text-3xl font-bold" style={{ color: stateColor }}>
                      {analysis.puntuacion}<span className="text-sm text-dark-400 font-normal">/100</span>
                    </p>
                    <div className="h-2 rounded-full bg-gray-100 mt-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${analysis.puntuacion}%`, backgroundColor: stateColor }} />
                    </div>
                    {analysis.reps_total > 0 && (
                      <p className="text-xs text-dark-500 mt-2">
                        <span className="font-semibold text-orange-500">{analysis.reps_ok}</span>
                        /{analysis.reps_total} {selected?.metrica} correctas
                      </p>
                    )}
                    {/* Indicator legend — same as AnalysisPage */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-dark-400">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Correcto</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Atención</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Crítico</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-dark-300 text-sm">
                    <Activity size={14} className="animate-pulse" />
                    Analizando postura...
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="card p-5">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Correcciones</p>
                {analysis?.feedback?.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.feedback.map((fb, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg
                        ${fb.severity === 'critico' ? 'bg-red-50 text-red-700' : fb.severity === 'advertencia' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {fb.severity === 'critico' ? <XCircle size={13} className="flex-shrink-0 mt-0.5" />
                          : fb.severity === 'advertencia' ? <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                          : <Activity size={13} className="flex-shrink-0 mt-0.5" />}
                        {fb.msg}
                      </div>
                    ))}
                  </div>
                ) : analysis?.detected ? (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={13} />
                    Ejecución correcta
                  </div>
                ) : (
                  <p className="text-dark-300 text-xs">Esperando detección...</p>
                )}
              </div>

              {/* GIF demo */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Movimiento de referencia</p>
                <ExerciseGif ejercicioId={selected?.id} nombre={selected?.nombre} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SELECT ── */}
      {phase === 'select' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-900">Rehabilitación de Columna</h1>
            <p className="text-dark-400 text-sm mt-1">
              Cada ejercicio tiene análisis dedicado: esqueleto naranja completo, conteo de repeticiones y correcciones específicas.
            </p>
          </div>
          {modelError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <AlertCircle size={15} />{modelError}
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EJERCICIOS.map(ej => {
              const EjIcon = ej.icon
              return (
                <button key={ej.id}
                  onClick={() => { setSelected(ej); setPhase('ready') }}
                  className={`card p-5 text-left hover:shadow-card-hover transition-all border-2 ${ej.color}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ej.iconBg}`}>
                      <EjIcon size={18} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-dark-400 bg-white px-2 py-1 rounded-full border border-gray-100">
                      <Clock size={11} />{ej.duracion_seg}s
                    </div>
                  </div>
                  <h3 className="font-semibold text-dark-800 mb-1">{ej.nombre}</h3>
                  <p className="text-xs text-dark-400 leading-relaxed">{ej.descripcion}</p>
                  <p className="text-xs text-orange-500 font-medium mt-2">Mide: {ej.metrica}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── READY ── */}
      {phase === 'ready' && selected && (
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={() => setPhase('select')} className="btn-ghost text-sm">
            <ChevronLeft size={16} /> Volver
          </button>

          <div className={`card p-0 border-2 overflow-hidden ${selected.color}`}>
            <div className="grid sm:grid-cols-2">
              {/* Left — info */}
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${selected.iconBg} flex items-center justify-center shadow-md`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-dark-900">{selected.nombre}</h2>
                    <p className="text-xs text-dark-400">{selected.descripcion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5 text-sm text-dark-500">
                  <Clock size={14} className="text-orange-500" />
                  Duración: <strong className="text-dark-800">{selected.duracion_seg}s</strong>
                  <span className="mx-1">·</span>
                  <Repeat2 size={14} className="text-orange-500" />
                  Mide {selected.metrica.toLowerCase()}
                </div>

                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Instrucciones</p>
                <ol className="space-y-2.5 mb-6">
                  {selected.instrucciones.map((inst, i) => (
                    <li key={i} className="flex gap-3 text-sm text-dark-600">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full ${selected.iconBg} flex items-center justify-center text-xs font-bold text-white`}>
                        {i+1}
                      </span>
                      {inst}
                    </li>
                  ))}
                </ol>

                <button onClick={handleStart} disabled={modelLoading}
                  className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
                  {modelLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Cargando modelo...</>
                    : <><Play size={18} /> Comenzar ejercicio</>}
                </button>
              </div>

              {/* Right — GIF */}
              <div className="p-6 flex flex-col items-center justify-center bg-white/50">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Cómo hacerlo</p>
                <ExerciseGif ejercicioId={selected.id} nombre={selected.nombre} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

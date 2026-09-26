/**
 * AnalysisPage — desk posture corrector.
 *
 * Skeleton color: CYAN (#00c5dd)  — distinct from rehab orange.
 * Indicator dots: traffic-light green / yellow / red (same system as RehabPage).
 *
 * Flow:
 *  1. User clicks "Activar Cámara"  → MediaPipe loads + camera starts
 *  2. User clicks "Iniciar Sesión"  → session created in backend, data recording starts
 *  3. User clicks "Finalizar"       → session finalized, backend triggers n8n → Gemini
 *  4. Redirect to /results/:id      → ResultsPage polls until AI result arrives
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePoseAnalysis } from '../hooks/usePoseAnalysis'
import { useVoiceFeedback } from '../hooks/useVoiceFeedback'
import { sesionesApi } from '../lib/api'
import {
  Activity, Volume2, VolumeX, StopCircle, Camera, CameraOff,
  Info, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react'

// ── Shared indicator colors (same in RehabPage) ───────────────
const IND_GOOD  = '#10b981'   // green
const IND_WARN  = '#f59e0b'   // yellow
const IND_ERROR = '#ef4444'   // red

// Skeleton color — DESK POSTURE only (cyan)
const SKELETON_COLOR = '#00c5dd'

const STATE_COLOR = { buena: IND_GOOD, regular: IND_WARN, mala: IND_ERROR }
const STATE_LABEL = {
  buena:   'POSTURA CORRECTA',
  regular: 'AJUSTA LA POSTURA',
  mala:    'CORRIGE LA POSTURA',
}

// ── Canvas drawing ────────────────────────────────────────────
function drawOverlay(canvas, analysis) {
  if (!canvas || !analysis?.landmarks) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const lms = analysis.landmarks
  const W   = canvas.width
  const H   = canvas.height

  const errorSet = new Set()
  const warnSet  = new Set()
  ;(analysis.feedback || []).forEach(fb => {
    fb.lms?.forEach(i => (fb.severity === 'critico' ? errorSet : warnSet).add(i))
  })

  // Upper-body connections for desk posture (cyan)
  const connections = [[0,7],[0,8],[7,8],[7,11],[8,12],[11,12],[11,23],[12,24],[23,24]]
  connections.forEach(([a, b]) => {
    if ((lms[a]?.visibility ?? 0) < 0.3 || (lms[b]?.visibility ?? 0) < 0.3) return
    ctx.beginPath()
    ctx.moveTo(lms[a].x * W, lms[a].y * H)
    ctx.lineTo(lms[b].x * W, lms[b].y * H)
    ctx.strokeStyle = SKELETON_COLOR
    ctx.lineWidth   = 2.5
    ctx.globalAlpha = 0.80
    ctx.stroke()
    ctx.globalAlpha = 1
  })

  // Landmark dots — traffic-light indicators
  const deskLms = [0, 7, 8, 11, 12, 23, 24]
  deskLms.forEach(i => {
    const lm = lms[i]
    if (!lm || (lm.visibility ?? 0) < 0.3) return
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
  })
}

// ── Component ─────────────────────────────────────────────────
export default function AnalysisPage() {
  const navigate     = useNavigate()
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const rafRef       = useRef(null)
  const sessionIdRef = useRef(null)
  const rawDataRef   = useRef([])
  const startTimeRef = useRef(null)
  const stoppingRef  = useRef(false)

  const [cameraActive,  setCameraActive]  = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [analysis,      setAnalysis]      = useState(null)
  const [elapsed,       setElapsed]       = useState(0)
  const [cameraError,   setCameraError]   = useState(null)

  const { ready, loading: modelLoading, error: modelError, analyzeFrame, resetCounters }
    = usePoseAnalysis()
  const { enabled: voiceOn, setEnabled: setVoiceOn, speakFeedback }
    = useVoiceFeedback()

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // ── Camera ────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraActive(true)
    } catch (e) {
      setCameraError(
        e?.name === 'NotAllowedError'  ? 'Permiso denegado. Habilita la cámara en tu navegador.' :
        e?.name === 'NotFoundError'    ? 'No se encontró cámara en este dispositivo.' :
        e?.name === 'NotReadableError' ? 'La cámara está en uso por otra aplicación.' :
        `Error de cámara: ${e?.message}`
      )
    }
  }

  // ── Session ───────────────────────────────────────────────
  const startSession = async () => {
    try {
      const s = await sesionesApi.crear({ tipo: 'postura_vivo' })
      sessionIdRef.current = s.id
    } catch {
      sessionIdRef.current = `local-${Date.now()}`
    }
    rawDataRef.current   = []
    startTimeRef.current = Date.now()
    stoppingRef.current  = false
    setElapsed(0)
    resetCounters()
    setSessionActive(true)
  }

  const stopSession = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    setSessionActive(false)
    stopStream()

    const dur = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000)
    const id  = sessionIdRef.current

    try {
      await sesionesApi.finalizar(id, {
        duracion_segundos: dur,
        datos_crudos: rawDataRef.current.slice(-150),
      })
      navigate(`/results/${id}`)
    } catch {
      navigate(`/results/${id || 'local'}`)
    }
  }, [navigate, stopStream])

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive) return
    const iv = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(iv)
  }, [sessionActive])

  // ── Analysis loop ─────────────────────────────────────────
  useEffect(() => {
    if (!cameraActive || !ready) return
    const loop = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return }
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480

      const result = analyzeFrame(video, performance.now())
      if (result?.detected) {
        setAnalysis(result)
        drawOverlay(canvas, result)
        speakFeedback(result.feedback)
        if (sessionActive) {
          rawDataRef.current.push({
            t: Date.now(), metricas: result.metricas,
            puntuacion: result.puntuacion, estado: result.estado_global,
          })
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [cameraActive, ready, sessionActive, analyzeFrame, speakFeedback])

  useEffect(() => () => stopStream(), [stopStream])

  const stateColor = analysis?.estado_global ? STATE_COLOR[analysis.estado_global] : SKELETON_COLOR

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Corrector de Postura en Vivo</h1>
        <p className="text-dark-400 text-sm mt-1">
          Esqueleto <span className="font-semibold" style={{ color: SKELETON_COLOR }}>cian</span> · indicadores
          <span className="font-semibold text-emerald-600"> verde</span> /
          <span className="font-semibold text-amber-500"> amarillo</span> /
          <span className="font-semibold text-red-500"> rojo</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-dark-900 rounded-2xl overflow-hidden aspect-video shadow-lg">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay
              aria-label="Cámara de análisis de postura" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true" />

            {/* Status banner */}
            {cameraActive && analysis?.estado_global && (
              <div className="absolute top-3 left-3 right-3 py-1.5 px-4 rounded-xl text-white text-sm font-semibold text-center"
                style={{ backgroundColor: stateColor + 'dd' }}>
                {STATE_LABEL[analysis.estado_global]} · {analysis.puntuacion}/100
              </div>
            )}

            {/* Timer */}
            {sessionActive && (
              <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1.5 rounded-xl text-sm font-mono font-bold recording-pulse">
                ● {fmt(elapsed)}
              </div>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <CameraOff size={48} className="text-white/30" />
                <p className="text-white/50 text-sm">Cámara desactivada</p>
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary action */}
            {!cameraActive ? (
              <button onClick={startCamera} disabled={modelLoading} className="btn-primary disabled:opacity-50">
                <Camera size={16} />
                {modelLoading ? 'Cargando modelo...' : 'Activar Cámara'}
              </button>
            ) : !sessionActive ? (
              <button onClick={startSession} className="btn-primary">
                <Activity size={16} />
                Iniciar Sesión
              </button>
            ) : (
              <button onClick={stopSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors shadow-sm">
                <StopCircle size={16} />
                Finalizar Sesión
              </button>
            )}

            {/* Secondary */}
            {cameraActive && !sessionActive && (
              <button onClick={stopStream} className="btn-ghost">
                <CameraOff size={15} /> Apagar cámara
              </button>
            )}

            {/* Voice toggle — always visible */}
            <button
              onClick={() => setVoiceOn(v => !v)}
              title={voiceOn ? 'Desactivar indicaciones por voz' : 'Activar indicaciones por voz'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                ${voiceOn
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-100 border-gray-200 text-dark-500 hover:bg-gray-200'}`}>
              {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              Voz {voiceOn ? 'ON' : 'OFF'}
            </button>
          </div>

          {(cameraError || modelError) && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {cameraError || modelError}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Score */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Puntuación Postural</p>
            {analysis?.detected ? (
              <>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-extrabold" style={{ color: stateColor }}>
                    {analysis.puntuacion}
                  </span>
                  <span className="text-dark-400 text-sm mb-1">/100</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${analysis.puntuacion}%`, backgroundColor: stateColor }} />
                </div>
                {/* Indicator legend */}
                <div className="flex items-center gap-3 mt-3 text-xs text-dark-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Correcto</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Atención</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Crítico</span>
                </div>
              </>
            ) : (
              <div className="text-dark-300 text-sm flex items-center gap-2">
                <Activity size={14} className="animate-pulse" />
                Esperando detección...
              </div>
            )}
          </div>

          {/* Metrics */}
          {analysis?.metricas && (
            <div className="card p-5 space-y-3">
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Métricas en tiempo real</p>
              {analysis.metricas.angulo_columna != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Columna</span>
                  <span className="font-semibold text-dark-800">{analysis.metricas.angulo_columna}°</span>
                </div>
              )}
              {analysis.metricas.caida_cabeza != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Cabeza</span>
                  <span className="font-semibold text-dark-800">
                    {analysis.metricas.caida_cabeza > 0
                      ? `↓ ${analysis.metricas.caida_cabeza.toFixed(2)}`
                      : `↑ ${Math.abs(analysis.metricas.caida_cabeza).toFixed(2)}`}
                  </span>
                </div>
              )}
              {analysis.metricas.inclinacion_lateral != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Inclinación</span>
                  <span className="font-semibold text-dark-800">{analysis.metricas.inclinacion_lateral.toFixed(3)}</span>
                </div>
              )}
              {analysis.metricas.hombros_encogidos != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-500">Hombros</span>
                  <span className="font-semibold text-dark-800">
                    {analysis.metricas.hombros_encogidos > -0.12 ? 'Encogidos' : 'Relajados'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Live alerts */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Alertas activas</p>
            {analysis?.feedback?.length > 0 ? (
              <div className="space-y-2">
                {analysis.feedback.map((fb, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg
                    ${fb.severity === 'critico' ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {fb.severity === 'critico'
                      ? <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                      : <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />}
                    {fb.msg}
                  </div>
                ))}
              </div>
            ) : analysis?.detected ? (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={14} /> Postura correcta. Sigue así.
              </div>
            ) : (
              <p className="text-dark-300 text-sm">Activa la cámara para empezar.</p>
            )}
          </div>

          {/* Tips */}
          <div className="card p-4 bg-sky-50 border-sky-100">
            <div className="flex items-start gap-2">
              <Info size={15} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-sky-700 space-y-1">
                <p className="font-semibold">Posición óptima</p>
                <ul className="list-disc list-inside space-y-0.5 text-sky-600">
                  <li>Cámara al nivel de los ojos</li>
                  <li>Torso visible (50-80 cm de distancia)</li>
                  <li>Buena iluminación frontal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

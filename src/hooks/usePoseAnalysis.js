/**
 * usePoseAnalysis — runs MediaPipe PoseLandmarker in the browser
 * and returns real-time posture metrics + voice feedback integration.
 *
 * Mirrors the Python EscritorioAnalyzer thresholds from config.py.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'

// Thresholds (matches config.py)
const T = {
  HEAD_DROP_CRITICAL: 0.12,
  HEAD_DROP_WARN: 0.07,
  HEAD_UP_WARN: -0.08,
  HEAD_TILT_WARN: 0.04,
  SHOULDER_ROLL_WARN: -0.12,
  SHOULDER_HEIGHT_DIFF: 0.05,
  SPINE_ANGLE_CRITICAL: 52,
  SPINE_ANGLE_WARN: 65,
  MIN_BAD_FRAMES: 8,
}

function angleToHorizontal(a, b) {
  const dx = Math.abs(b.x - a.x)
  const dy = Math.abs(b.y - a.y)
  return Math.atan2(dy, dx + 1e-8) * (180 / Math.PI)
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function usePoseAnalysis() {
  const landmarkerRef = useRef(null)
  const badFrames     = useRef({ headDrop: 0, headUp: 0, tilt: 0, shoulderRoll: 0, asym: 0, spine: 0 })
  const smoothed      = useRef(null)
  const [ready, setReady]     = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )
        const pl = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        })
        if (active) {
          landmarkerRef.current = pl
          setReady(true)
          setLoading(false)
        }
      } catch (e) {
        if (active) {
          setError('No se pudo cargar el modelo de pose. Verifica tu conexión.')
          setLoading(false)
        }
      }
    }
    init()
    return () => { active = false }
  }, [])

  /** Applies EMA smoothing (alpha=0.35) to landmarks */
  const applySmoothing = (landmarks) => {
    const alpha = 0.35
    if (!smoothed.current) {
      smoothed.current = landmarks.map(l => ({ ...l }))
      return smoothed.current
    }
    smoothed.current = landmarks.map((l, i) => ({
      x: alpha * l.x + (1 - alpha) * (smoothed.current[i]?.x ?? l.x),
      y: alpha * l.y + (1 - alpha) * (smoothed.current[i]?.y ?? l.y),
      z: alpha * l.z + (1 - alpha) * (smoothed.current[i]?.z ?? l.z),
      visibility: l.visibility,
    }))
    return smoothed.current
  }

  /** Main analysis function — mirrors EscritorioAnalyzer.analyze() */
  const analyzeFrame = useCallback((videoEl, timestampMs) => {
    if (!landmarkerRef.current || !videoEl || videoEl.readyState < 2) return null

    const result = landmarkerRef.current.detectForVideo(videoEl, timestampMs)
    if (!result.landmarks || result.landmarks.length === 0) {
      smoothed.current = null
      return { detected: false }
    }

    const lms = applySmoothing(result.landmarks[0])
    const vis = (i) => lms[i]?.visibility ?? 0
    const bf  = badFrames.current

    const feedback = []
    let penalizacion = 0
    const metricas = {}

    // 1. Head drop — nose vs ears
    const noseVis  = vis(0)
    const earLVis  = vis(7)
    const earRVis  = vis(8)
    const earYs    = []
    if (earLVis > 0.3) earYs.push(lms[7].y)
    if (earRVis > 0.3) earYs.push(lms[8].y)

    if (noseVis > 0.3 && earYs.length > 0) {
      const avgEarY = earYs.reduce((a, b) => a + b, 0) / earYs.length
      const headDrop = lms[0].y - avgEarY
      metricas.caida_cabeza = parseFloat(headDrop.toFixed(3))

      if (headDrop > T.HEAD_DROP_CRITICAL) {
        bf.headDrop++
        if (bf.headDrop >= T.MIN_BAD_FRAMES)
          feedback.push({ msg: '¡Levanta la cabeza! Tu cuello está muy inclinado', severity: 'critico', lms: [0,7,8] })
        penalizacion += 35
      } else if (headDrop > T.HEAD_DROP_WARN) {
        bf.headDrop = Math.max(0, bf.headDrop - 1)
        feedback.push({ msg: 'Eleva un poco la cabeza, endereza el cuello', severity: 'advertencia', lms: [0,7,8] })
        penalizacion += 15
      } else if (headDrop < T.HEAD_UP_WARN) {
        bf.headUp++
        if (bf.headUp >= T.MIN_BAD_FRAMES)
          feedback.push({ msg: 'Baja un poco la cabeza, la pantalla puede estar muy alta', severity: 'advertencia', lms: [0,7,8] })
        penalizacion += 10
      } else {
        bf.headDrop = Math.max(0, bf.headDrop - 2)
        bf.headUp   = Math.max(0, bf.headUp - 2)
      }
    }

    // 2. Head lateral tilt
    if (earLVis > 0.3 && earRVis > 0.3) {
      const earDiff = Math.abs(lms[7].y - lms[8].y)
      metricas.inclinacion_lateral = parseFloat(earDiff.toFixed(3))
      if (earDiff > T.HEAD_TILT_WARN) {
        bf.tilt++
        if (bf.tilt >= T.MIN_BAD_FRAMES) {
          const lado = lms[7].y < lms[8].y ? 'izquierda' : 'derecha'
          feedback.push({ msg: `Cabeza ladeada hacia la ${lado}, centra la cabeza`, severity: 'advertencia', lms: [7,8] })
        }
        penalizacion += 10
      } else {
        bf.tilt = Math.max(0, bf.tilt - 1)
      }
    }

    // 3. Shoulder roll
    const rolls = []
    if (earLVis > 0.3 && vis(11) > 0.3) rolls.push(lms[7].y - lms[11].y)
    if (earRVis > 0.3 && vis(12) > 0.3) rolls.push(lms[8].y - lms[12].y)

    if (rolls.length > 0) {
      const avgRoll = rolls.reduce((a, b) => a + b, 0) / rolls.length
      metricas.hombros_encogidos = parseFloat(avgRoll.toFixed(3))
      if (avgRoll > T.SHOULDER_ROLL_WARN) {
        bf.shoulderRoll++
        if (bf.shoulderRoll >= T.MIN_BAD_FRAMES)
          feedback.push({ msg: 'Baja y relaja los hombros, no los encogidos', severity: 'advertencia', lms: [7,8,11,12] })
        penalizacion += 15
      } else {
        bf.shoulderRoll = Math.max(0, bf.shoulderRoll - 1)
      }
    }

    // 4. Shoulder asymmetry
    if (vis(11) > 0.3 && vis(12) > 0.3) {
      const shDiff = Math.abs(lms[11].y - lms[12].y)
      metricas.diferencia_hombros = parseFloat(shDiff.toFixed(3))
      if (shDiff > T.SHOULDER_HEIGHT_DIFF) {
        bf.asym++
        if (bf.asym >= T.MIN_BAD_FRAMES) {
          const lado = lms[11].y < lms[12].y ? 'izquierdo' : 'derecho'
          feedback.push({ msg: `Hombro ${lado} elevado, nivela los hombros`, severity: 'advertencia', lms: [11,12] })
        }
        penalizacion += 10
      } else {
        bf.asym = Math.max(0, bf.asym - 1)
      }
    }

    // 5. Spine angle (only if hips visible)
    if (vis(11) > 0.3 && vis(12) > 0.3 && vis(23) > 0.3 && vis(24) > 0.3) {
      const midSh  = midpoint(lms[11], lms[12])
      const midHip = midpoint(lms[23], lms[24])
      const spineAngle = angleToHorizontal(midSh, midHip)
      metricas.angulo_columna = parseFloat(spineAngle.toFixed(1))

      if (spineAngle < T.SPINE_ANGLE_CRITICAL) {
        bf.spine++
        if (bf.spine >= T.MIN_BAD_FRAMES)
          feedback.push({ msg: '¡Columna muy curvada! Siéntate erguido', severity: 'critico', lms: [11,12,23,24] })
        penalizacion += 35
      } else if (spineAngle < T.SPINE_ANGLE_WARN) {
        bf.spine = Math.max(0, bf.spine - 1)
        feedback.push({ msg: 'Estira la espalda, siéntate más erguido', severity: 'advertencia', lms: [11,12,23,24] })
        penalizacion += 18
      } else {
        bf.spine = Math.max(0, bf.spine - 2)
      }
    }

    const puntuacion   = Math.max(0, Math.round(100 - penalizacion))
    const estado_global = puntuacion >= 82 ? 'buena' : puntuacion >= 58 ? 'regular' : 'mala'

    return { detected: true, feedback, metricas, puntuacion, estado_global, landmarks: lms }
  }, [])

  const resetCounters = useCallback(() => {
    const bf = badFrames.current
    Object.keys(bf).forEach(k => { bf[k] = 0 })
    smoothed.current = null
  }, [])

  return { ready, loading, error, analyzeFrame, resetCounters }
}

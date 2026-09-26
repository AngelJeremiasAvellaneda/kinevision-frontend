/**
 * useRehabAnalysis — dedicated MediaPipe hook for rehabilitation exercises.
 *
 * COMPLETELY SEPARATE from usePoseAnalysis (desk posture).
 * Differences:
 *  - Different skeleton connections (full body, not just upper body)
 *  - Different skeleton color (#f97316 orange vs #00c5dd cyan for desk)
 *  - Per-exercise posture checks and rep counting
 *  - Returns reps_ok / reps_total for history
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'

// ── Geometry helpers ──────────────────────────────────────────
function angle3(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.sqrt(ab.x**2 + ab.y**2) * Math.sqrt(cb.x**2 + cb.y**2) + 1e-8
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI
}
function midpt(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
function angleH(a, b) {
  return Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x) + 1e-8) * 180 / Math.PI
}

// ── Full body skeleton connections (orange for rehab) ─────────
export const REHAB_CONNECTIONS = [
  // Face
  [0,7],[0,8],[7,8],
  // Torso
  [11,12],[11,23],[12,24],[23,24],
  // Left arm
  [11,13],[13,15],
  // Right arm
  [12,14],[14,16],
  // Left leg
  [23,25],[25,27],[27,29],[29,31],
  // Right leg
  [24,26],[26,28],[28,30],[30,32],
]
export const REHAB_SKELETON_COLOR = '#f97316'   // orange — distinct from desk cyan
export const REHAB_GOOD_COLOR     = '#f97316'
export const REHAB_WARN_COLOR     = '#fbbf24'
export const REHAB_ERROR_COLOR    = '#ef4444'

// ── Per-exercise analyzers ────────────────────────────────────

/** 1. Neck stretch — head lateral tilt range */
function analyzeNeckStretch(lms, vis, state) {
  const fb = []
  // Check that head actually tilts (ear-to-shoulder change)
  if (vis(7) > 0.3 && vis(8) > 0.3 && vis(11) > 0.3 && vis(12) > 0.3) {
    const earDiff = Math.abs(lms[7].y - lms[8].y)
    if (earDiff < 0.03 && state.frames > 20) {
      fb.push({ msg: 'Inclina más la cabeza hacia un lado', severity: 'advertencia', lms: [7,8] })
    }
    if (earDiff > 0.18) {
      fb.push({ msg: 'No fuerces demasiado, movimiento suave', severity: 'advertencia', lms: [7,8] })
    }
    const shAsym = Math.abs(lms[11].y - lms[12].y)
    if (shAsym > 0.06) {
      fb.push({ msg: 'Mantén los hombros nivelados y relajados', severity: 'advertencia', lms: [11,12] })
    }
    // Rep: tilt left then right = 1 rep
    const side = lms[7].y > lms[8].y ? 'left' : 'right'
    if (state.lastSide && state.lastSide !== side && earDiff > 0.06) {
      state.reps_ok++
      state.reps_total++
    }
    state.lastSide = earDiff > 0.04 ? side : state.lastSide
  }
  return fb
}

/** 2. Cat-Cow — spine flexion/extension cycle */
function analyzeCatCow(lms, vis, state) {
  const fb = []
  if (vis(11) > 0.3 && vis(12) > 0.3 && vis(23) > 0.3 && vis(24) > 0.3) {
    const midSh  = midpt(lms[11], lms[12])
    const midHip = midpt(lms[23], lms[24])
    const spineAngle = angleH(midSh, midHip)
    // spine < 50° = too horizontal (on all fours expected ~40-60°)
    // Y difference between midSh and midHip shows cat/cow
    const yDiff = midHip.y - midSh.y  // positive = hips higher than shoulders (cat)
    const currentPhase = yDiff > 0.05 ? 'cat' : yDiff < -0.05 ? 'cow' : 'neutral'

    if (currentPhase !== 'neutral' && currentPhase !== state.lastPhase) {
      state.reps_total++
      if (spineAngle >= 20 && spineAngle <= 75) {
        state.reps_ok++
      } else {
        fb.push({ msg: 'Rango incompleto — mueve más la columna', severity: 'advertencia', lms: [11,12,23,24] })
      }
      state.lastPhase = currentPhase
    }
    if (vis(0) > 0.3) {
      const headNeck = lms[0].y - midSh.y
      if (Math.abs(headNeck) < 0.05) {
        fb.push({ msg: 'Mueve también la cabeza con la columna', severity: 'info', lms: [0,7,8] })
      }
    }
  }
  return fb
}

/** 3. Standing spine extension */
function analyzeSpineExtension(lms, vis, state) {
  const fb = []
  if (vis(11) > 0.3 && vis(12) > 0.3 && vis(23) > 0.3 && vis(24) > 0.3) {
    const midSh  = midpt(lms[11], lms[12])
    const midHip = midpt(lms[23], lms[24])
    const spineAngle = angleH(midSh, midHip)
    // Upright = ~85°. Extension backward = hips forward, midHip.x < midSh.x
    const hipForward = midHip.x - midSh.x  // negative = hips pushed forward (correct)

    if (hipForward < -0.04 && spineAngle > 70) {
      // Good extension rep
      if (!state.inExtension) {
        state.inExtension = true
        state.reps_total++
        state.reps_ok++
      }
    } else {
      if (state.inExtension) state.inExtension = false
      if (hipForward > 0.02 && state.frames > 10) {
        fb.push({ msg: 'Empuja las caderas hacia adelante para extender', severity: 'advertencia', lms: [23,24] })
      }
    }
    if (vis(11) > 0.3 && vis(13) > 0.3) {
      const elbowAngle = angle3(lms[13], lms[11], lms[23])
      if (elbowAngle < 60) {
        fb.push({ msg: 'Coloca las manos en la zona lumbar, no tan arriba', severity: 'info', lms: [11,13] })
      }
    }
  }
  return fb
}

/** 4. Scapular retraction */
function analyzeScapular(lms, vis, state) {
  const fb = []
  if (vis(11) > 0.3 && vis(12) > 0.3 && vis(13) > 0.3 && vis(14) > 0.3) {
    // Retraction = elbows pulled back, shoulders move back
    // Proxy: distance between shoulders increases on retraction
    const shoulderDist = Math.abs(lms[11].x - lms[12].x)
    const elbowFlare = Math.abs(lms[13].x - lms[14].x)
    const ratio = elbowFlare / (shoulderDist + 0.01)

    if (ratio > 1.2) {
      // Elbows wide = retracted
      if (!state.inRetraction) {
        state.inRetraction = true
      }
    } else if (ratio < 0.9 && state.inRetraction) {
      // Released
      state.inRetraction = false
      state.reps_total++
      state.reps_ok++
    }

    const shAsym = Math.abs(lms[11].y - lms[12].y)
    if (shAsym > 0.05) {
      fb.push({ msg: 'Mantén ambos hombros al mismo nivel', severity: 'advertencia', lms: [11,12] })
    }
    if (ratio < 0.8 && state.frames > 15) {
      fb.push({ msg: 'Junta los omóplatos, lleva los codos hacia atrás', severity: 'advertencia', lms: [13,14] })
    }
  }
  return fb
}

/** 5. Core plank */
function analyzePlank(lms, vis, state) {
  const fb = []
  if (vis(11) > 0.3 && vis(23) > 0.3 && vis(27) > 0.3) {
    const bodyAngle = angle3(lms[11], lms[23], lms[27])
    // Good plank = body straight ~170-180°
    if (bodyAngle < 155) {
      fb.push({ msg: bodyAngle < 140 ? '¡Sube las caderas! El cuerpo debe ser recto' : 'Las caderas están un poco bajas', severity: bodyAngle < 140 ? 'critico' : 'advertencia', lms: [23,11,27] })
      state.goodSeconds = 0
    } else if (bodyAngle > 190) {
      fb.push({ msg: 'Baja las caderas, no las eleves tanto', severity: 'advertencia', lms: [23] })
      state.goodSeconds = 0
    } else {
      state.goodSeconds = (state.goodSeconds || 0) + 1
      // Count good seconds as "reps_ok"
      state.reps_ok = Math.floor(state.goodSeconds / 30) // 1 "rep" = 1 good second
      state.reps_total = Math.floor(state.frames / 30)
    }
    const shHip = Math.abs(lms[11].y - lms[12].y)
    if (shHip > 0.06) {
      fb.push({ msg: 'Alinea los hombros, no los rotes', severity: 'advertencia', lms: [11,12] })
    }
  }
  return fb
}

const ANALYZERS = {
  1: analyzeNeckStretch,
  2: analyzeCatCow,
  3: analyzeSpineExtension,
  4: analyzeScapular,
  5: analyzePlank,
}

// ── Hook ─────────────────────────────────────────────────────
export function useRehabAnalysis(ejercicioId) {
  const landmarkerRef = useRef(null)
  const smoothedRef   = useRef(null)
  const exerciseState = useRef({ frames: 0, reps_ok: 0, reps_total: 0 })

  const [ready,   setReady]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let active = true
    exerciseState.current = { frames: 0, reps_ok: 0, reps_total: 0 }
    smoothedRef.current   = null

    const init = async () => {
      // Reuse if already loaded (e.g. coming back from select screen)
      if (landmarkerRef.current) { setReady(true); setLoading(false); return }
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )
        const pl = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        })
        if (active) { landmarkerRef.current = pl; setReady(true); setLoading(false) }
      } catch (e) {
        if (active) { setError('No se pudo cargar el modelo. Verifica tu conexión.'); setLoading(false) }
      }
    }
    init()
    return () => { active = false }
  }, [ejercicioId])

  const applySmoothing = (landmarks) => {
    const alpha = 0.3
    if (!smoothedRef.current) { smoothedRef.current = landmarks.map(l => ({ ...l })); return smoothedRef.current }
    smoothedRef.current = landmarks.map((l, i) => ({
      x: alpha * l.x + (1-alpha) * (smoothedRef.current[i]?.x ?? l.x),
      y: alpha * l.y + (1-alpha) * (smoothedRef.current[i]?.y ?? l.y),
      z: alpha * l.z + (1-alpha) * (smoothedRef.current[i]?.z ?? l.z),
      visibility: l.visibility,
    }))
    return smoothedRef.current
  }

  const analyzeFrame = useCallback((videoEl, timestampMs) => {
    if (!landmarkerRef.current || !videoEl || videoEl.readyState < 2) return null
    const result = landmarkerRef.current.detectForVideo(videoEl, timestampMs)
    if (!result.landmarks?.length) { smoothedRef.current = null; return { detected: false } }

    const lms = applySmoothing(result.landmarks[0])
    const vis = (i) => lms[i]?.visibility ?? 0
    const state = exerciseState.current
    state.frames++

    const analyzer = ANALYZERS[ejercicioId]
    const feedback = analyzer ? analyzer(lms, vis, state) : []

    // Score: penalize by feedback severity
    let pen = 0
    feedback.forEach(f => { pen += f.severity === 'critico' ? 30 : f.severity === 'advertencia' ? 15 : 5 })
    const puntuacion = Math.max(0, 100 - pen)
    const estado_global = puntuacion >= 80 ? 'buena' : puntuacion >= 55 ? 'regular' : 'mala'

    return {
      detected: true, feedback, puntuacion, estado_global, landmarks: lms,
      reps_ok: state.reps_ok, reps_total: state.reps_total,
    }
  }, [ejercicioId])

  const resetCounters = useCallback(() => {
    exerciseState.current = { frames: 0, reps_ok: 0, reps_total: 0 }
    smoothedRef.current   = null
  }, [])

  const getReps = useCallback(() => ({
    reps_ok:    exerciseState.current.reps_ok,
    reps_total: exerciseState.current.reps_total,
  }), [])

  return { ready, loading, error, analyzeFrame, resetCounters, getReps }
}

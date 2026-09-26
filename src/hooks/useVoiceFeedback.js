/**
 * useVoiceFeedback — Web Speech API TTS with cooldown throttling.
 * Mirrors the Python VoiceFeedbackManager behavior.
 */
import { useRef, useCallback, useState } from 'react'

const COOLDOWN_MS = 7000

export function useVoiceFeedback() {
  const lastSpoken = useRef({})
  const [enabled, setEnabled] = useState(true)

  const speak = useCallback((text, priority = 'advertencia') => {
    if (!enabled) return
    if (!('speechSynthesis' in window)) return

    const now = Date.now()
    if (lastSpoken.current[text] && now - lastSpoken.current[text] < COOLDOWN_MS) return
    lastSpoken.current[text] = now

    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang    = 'es-ES'
    utt.rate    = 0.95
    utt.pitch   = 1.0
    utt.volume  = 1.0

    const voices = window.speechSynthesis.getVoices()
    const espVoice = voices.find(v => v.lang.startsWith('es'))
    if (espVoice) utt.voice = espVoice

    window.speechSynthesis.speak(utt)
  }, [enabled])

  const speakFeedback = useCallback((feedbackList) => {
    if (!enabled || !feedbackList?.length) return
    // Only speak highest priority (critico first, then advertencia)
    const sorted = [...feedbackList].sort((a, b) => {
      const p = { critico: 0, advertencia: 1, info: 2 }
      return (p[a.severity] ?? 2) - (p[b.severity] ?? 2)
    })
    const top = sorted.find(f => f.severity === 'critico' || f.severity === 'advertencia')
    if (top) speak(top.msg, top.severity)
  }, [enabled, speak])

  const clearCooldowns = useCallback(() => { lastSpoken.current = {} }, [])

  return { enabled, setEnabled, speak, speakFeedback, clearCooldowns }
}

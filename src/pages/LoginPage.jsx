import { Activity, Chrome } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (err) {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-800 flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">KineVisión</span>
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Mejora tu postura,<br />cuida tu salud.
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed max-w-md">
            Análisis en tiempo real con MediaPipe y recomendaciones personalizadas con Gemini AI.
            Todo desde tu navegador.
          </p>
        </div>

        <div className="flex gap-4">
          {['Análisis en vivo', 'Rehabilitación', 'Gemini AI', 'Supabase Auth'].map((tag) => (
            <span key={tag} className="px-3 py-1.5 rounded-full bg-white/15 text-white/80 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-dark-800 text-lg">KineVisión</span>
          </div>

          <h1 className="text-2xl font-bold text-dark-900 mb-2">Bienvenido</h1>
          <p className="text-dark-400 mb-8 text-sm">
            Inicia sesión para acceder a tu panel de postura.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-gray-200
                       bg-white text-dark-700 font-semibold text-sm hover:border-primary-300 hover:bg-primary-50
                       transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
          </button>

          <p className="mt-8 text-xs text-dark-400 text-center leading-relaxed">
            Al continuar, aceptas nuestros términos de uso y política de privacidad.
            No guardamos tu video — todo el procesamiento ocurre en tu dispositivo.
          </p>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

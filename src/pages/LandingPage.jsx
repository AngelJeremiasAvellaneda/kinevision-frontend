import { Link } from 'react-router-dom'
import { Activity, Camera, Volume2, BarChart3, ShieldCheck, Zap, ChevronRight } from 'lucide-react'

const features = [
  {
    icon: Camera,
    title: 'Análisis con IA en tiempo real',
    desc: 'MediaPipe detecta 33 puntos corporales desde tu webcam. Sin hardware adicional, sin instalaciones complejas.',
  },
  {
    icon: Volume2,
    title: 'Retroalimentación por voz',
    desc: 'La app te habla en español mientras te ejercitas. Correcciones en el momento justo, sin distracciones.',
  },
  {
    icon: BarChart3,
    title: 'Progreso con Gemini AI',
    desc: 'Al terminar cada sesión, Gemini analiza tus datos y genera recomendaciones personalizadas basadas en tu historial.',
  },
  {
    icon: ShieldCheck,
    title: 'Rehabilitación guiada',
    desc: '5 ejercicios de columna con análisis de ejecución, nivel de riesgo y plan de mejora adaptado a ti.',
  },
]

const steps = [
  { n: '01', title: 'Créate una cuenta', desc: 'Registro con Google en un clic. Completa el cuestionario inicial y personalizamos tu experiencia.' },
  { n: '02', title: 'Activa la cámara', desc: 'Permite el acceso a tu webcam. No guardamos video — todo el procesamiento ocurre en tu navegador.' },
  { n: '03', title: 'Comienza a moverte', desc: 'Postura en escritorio o ejercicios de rehabilitación. La IA detecta y corrige en tiempo real.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-dark-800 text-lg">KineVisión</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Iniciar sesión</Link>
            <Link to="/login" className="btn-primary text-sm">Empezar gratis</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4 sm:px-6 bg-gradient-to-b from-primary-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-6">
            <Zap size={12} />
            Análisis postural con MediaPipe + Gemini
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-dark-900 leading-tight tracking-tight mb-6">
            Tu postura, corregida{' '}
            <span className="text-primary-500">en tiempo real</span>
          </h1>
          <p className="text-lg text-dark-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            KineVisión analiza tu postura frente a la computadora y durante ejercicios de rehabilitación.
            Retroalimentación por voz inmediata y análisis personalizado con IA al finalizar cada sesión.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn-primary text-base px-8 py-3 shadow-md hover:shadow-lg">
              Comenzar gratis
              <ChevronRight size={16} />
            </Link>
            <a href="#como-funciona" className="btn-outline text-base px-8 py-3">
              Cómo funciona
            </a>
          </div>

          {/* ODS badge */}
          <div className="mt-8 inline-flex items-center gap-2 text-xs text-dark-400">
            <ShieldCheck size={13} className="text-emerald-500" />
            Contribuye a los ODS 3 — Salud y Bienestar
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-dark-900 mb-3">Todo lo que necesitas</h2>
            <p className="text-dark-500 max-w-xl mx-auto">
              Una sola app que combina visión por computadora, IA generativa y retroalimentación en tiempo real.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-card-hover transition-shadow group">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <Icon size={20} className="text-primary-600" />
                </div>
                <h3 className="font-semibold text-dark-800 mb-2">{title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-dark-900 mb-3">Tres pasos, sin fricción</h2>
            <p className="text-dark-500">Empieza a mejorar tu postura en menos de 5 minutos.</p>
          </div>
          <div className="space-y-8">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                  {n}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-dark-800 text-lg mb-1">{title}</h3>
                  <p className="text-dark-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture explainer */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-dark-900 text-center mb-12">Arquitectura por capas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { layer: 'Frontend', tech: 'React + MediaPipe', desc: 'Cámara, detección de pose y voz corren en el navegador. Tu video nunca sale del dispositivo.' },
              { layer: 'Backend API', tech: 'Node / Express', desc: 'Maneja auth, sesiones y dispara webhooks a n8n. La API key de Gemini nunca llega al cliente.' },
              { layer: 'Orquestación IA', tech: 'n8n + Gemini', desc: 'n8n recibe los datos, arma el prompt según el tipo de sesión y llama a Gemini Flash para el análisis.' },
              { layer: 'Base de datos', tech: 'Supabase', desc: 'Usuarios, perfiles, sesiones y resultados con Postgres. Auth nativo con Google OAuth.' },
              { layer: 'Visión', tech: 'MediaPipe Pose', desc: '33 landmarks corporales, EMA smoothing y análisis de ángulos articulares en tiempo real.' },
              { layer: 'ODS 3', tech: 'Salud y Bienestar', desc: 'Prevención de lesiones posturales y apoyo a la rehabilitación accesible desde cualquier dispositivo.' },
            ].map(({ layer, tech, desc }) => (
              <div key={layer} className="card p-5">
                <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-1">{layer}</p>
                <p className="font-semibold text-dark-800 mb-2">{tech}</p>
                <p className="text-sm text-dark-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-primary-500 to-primary-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Listo para mejorar tu postura?</h2>
          <p className="text-primary-100 mb-8 text-lg">
            Gratis, en el navegador, sin descargas. Solo tu webcam y ganas de mejorar.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary-600 font-bold text-base shadow-lg hover:bg-primary-50 transition-colors"
          >
            Empezar ahora
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary-500 flex items-center justify-center">
              <Activity size={10} className="text-white" />
            </div>
            <span className="font-semibold text-dark-700">KineVisión</span>
          </div>
          <p>© 2026 KineVisión — Postura inteligente para todos</p>
        </div>
      </footer>
    </div>
  )
}

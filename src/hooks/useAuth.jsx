import { useState, useEffect, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Detectar error OAuth en query params (?error=bad_oauth_state...)
    // Limpiar la URL y mostrar la pantalla de login limpia
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      console.warn('[auth] OAuth error:', params.get('error_description'))
      window.history.replaceState(null, '', '/')
    }

    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        // Limpiar hash fragment del callback OAuth y redirigir al dashboard
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', '/')
          navigate('/dashboard', { replace: true })
        }
      }

      if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirigir a la raíz — implicit flow devuelve el token como hash (#access_token=...)
        // detectSessionInUrl lo procesa automáticamente
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

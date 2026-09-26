/**
 * API client — habla con el backend Express.
 *
 * En desarrollo: Vite hace proxy de /api → localhost:4000  (sin CORS)
 * En producción: usa VITE_API_URL apuntando al backend desplegado en Railway
 *
 * Incluye el JWT de Supabase como Bearer token automáticamente.
 */
import { supabase } from './supabase'

// En prod VITE_API_URL = https://kinevision-backend.up.railway.app
// En dev  VITE_API_URL no se define → el proxy de Vite maneja /api
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function request(path, options = {}) {
  const token = await getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Error de red')
  }

  if (res.status === 204) return null
  return res.json()
}

/* ---------- Sesiones ---------- */
export const sesionesApi = {
  crear:     (data)      => request('/sesiones',                 { method: 'POST',  body: JSON.stringify(data) }),
  finalizar: (id, datos) => request(`/sesiones/${id}/finalizar`, { method: 'PATCH', body: JSON.stringify(datos) }),
  listar:    ()          => request('/sesiones'),
  obtener:   (id)        => request(`/sesiones/${id}`),
}

/* ---------- Perfil ---------- */
export const perfilApi = {
  obtener: ()     => request('/perfil'),
  guardar: (data) => request('/perfil', { method: 'POST', body: JSON.stringify(data) }),
}

/* ---------- Racha ---------- */
export const rachaApi = {
  obtener: () => request('/racha'),
}

/* ---------- Catálogo de ejercicios ---------- */
export const ejerciciosApi = {
  listar: () => request('/ejercicios'),
}

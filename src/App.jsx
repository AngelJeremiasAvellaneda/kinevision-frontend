import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useEffect, useState } from 'react'
import { perfilApi } from './lib/api'
import LandingPage   from './pages/LandingPage'
import LoginPage     from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import AnalysisPage  from './pages/AnalysisPage'
import RehabPage     from './pages/RehabPage'
import ResultsPage   from './pages/ResultsPage'
import HistoryPage   from './pages/HistoryPage'
import SettingsPage  from './pages/SettingsPage'
import AppLayout     from './components/layout/AppLayout'

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-dark-500">Cargando KineVisión...</p>
      </div>
    </div>
  )
}

/** Wraps private routes — redirects to /login if not authenticated.
 *  On first login (no profile yet) redirects to /onboarding. */
function PrivateRoute({ children, requireProfile = false }) {
  const { user, loading } = useAuth()
  const [profileChecked, setProfileChecked] = useState(false)
  const [hasProfile, setHasProfile]         = useState(false)

  useEffect(() => {
    if (!user) { setProfileChecked(true); return }
    perfilApi.obtener()
      .then(p  => { setHasProfile(!!p?.nombre); setProfileChecked(true) })
      .catch(() => { setHasProfile(false);      setProfileChecked(true) })
  }, [user])

  if (loading || !profileChecked) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />

  // First-time user → onboarding (but don't loop if already on onboarding)
  if (!hasProfile && requireProfile) return <Navigate to="/onboarding" replace />

  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />

  return (
    <Routes>
      {/* Public */}
      <Route path="/"      element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* Onboarding (private, no profile check — it IS where the profile is created) */}
      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            <OnboardingPage />
          </PrivateRoute>
        }
      />

      {/* Private app shell — all inner routes check for profile */}
      <Route
        path="/"
        element={
          <PrivateRoute requireProfile>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard"          element={<DashboardPage />} />
        <Route path="analysis"           element={<AnalysisPage />} />
        <Route path="rehab"              element={<RehabPage />} />
        <Route path="results/:sessionId" element={<ResultsPage />} />
        <Route path="history"            element={<HistoryPage />} />
        <Route path="settings"           element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

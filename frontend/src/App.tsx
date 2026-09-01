import { useEffect, useState, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { BookingPage } from './pages/Booking'
import { NewBooking } from './pages/NewBooking'
import { PackagePage } from './pages/Package'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { LockedPage } from './pages/Locked'
import { useStore } from './lib/store'

const PACKAGE_ROLES = ['cashier', 'owner', 'cameraman']

function RequireAuth({ children }: { children: ReactNode }) {
  const authUser = useStore((s) => s.authUser)
  if (!authUser) return <Navigate to="/login" replace />
  return children
}

function PackageRoleOnly({ children }: { children: ReactNode }) {
  const authUser = useStore((s) => s.authUser)
  if (!authUser || !PACKAGE_ROLES.includes(authUser.role)) {
    return (
      <LockedPage
        title="Package is locked"
        message="Only cashier, cameraman and owner accounts can access package orders."
      />
    )
  }
  return children
}

function App() {
  const validateSession = useStore((s) => s.validateSession)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    validateSession().finally(() => setChecking(false))
  }, [validateSession])

  if (checking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-canvas text-text-primary">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="bookings/new" element={<NewBooking />} />
          <Route path="bookings" element={<BookingPage />} />
          <Route
            path="packages"
            element={
              <PackageRoleOnly>
                <PackagePage />
              </PackageRoleOnly>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App

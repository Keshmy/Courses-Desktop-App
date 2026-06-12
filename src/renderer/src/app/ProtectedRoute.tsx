import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { canAccessRoute } from '@/lib/permissions'

export function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!canAccessRoute(location.pathname, user.role)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

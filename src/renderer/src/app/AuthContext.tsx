import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { EmployeeDto } from '../../../shared/types/employee'
import { roleMatchesIntent, type LoginIntent } from '@/lib/permissions'

const SESSION_KEY = 'courses-app-session'
const INTENT_KEY = 'courses-app-login-intent'

type Session = EmployeeDto

type AuthContextValue = {
  user: Session | null
  loginIntent: LoginIntent | null
  setLoginIntent: (intent: LoginIntent | null) => void
  login: (username: string, password: string, intent: LoginIntent) => Promise<string | null>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function readIntent(): LoginIntent | null {
  const v = sessionStorage.getItem(INTENT_KEY)
  if (v === 'admin' || v === 'employee') return v
  return null
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<Session | null>(() => readSession())
  const [loginIntent, setLoginIntentState] = useState<LoginIntent | null>(() => readIntent())

  const setLoginIntent = useCallback((intent: LoginIntent | null) => {
    if (intent) sessionStorage.setItem(INTENT_KEY, intent)
    else sessionStorage.removeItem(INTENT_KEY)
    setLoginIntentState(intent)
  }, [])

  const login = useCallback(
    async (username: string, password: string, intent: LoginIntent): Promise<string | null> => {
      const res = await window.api.auth.login({ username, password })
      if (!res.success || !res.employee) {
        return res.error ?? 'فشل تسجيل الدخول'
      }

      if (!roleMatchesIntent(res.employee.role, intent)) {
        return intent === 'admin'
          ? 'هذا الحساب ليس حساب مدير. اختر دخول الموظف.'
          : 'هذا الحساب مدير. اختر دخول المدير.'
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.employee))
      sessionStorage.removeItem(INTENT_KEY)
      setUser(res.employee)
      setLoginIntentState(null)
      return null
    },
    []
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(INTENT_KEY)
    setUser(null)
    setLoginIntentState(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loginIntent,
      setLoginIntent,
      login,
      logout,
      isAuthenticated: user !== null
    }),
    [user, loginIntent, setLoginIntent, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

import { FormEvent, useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { ArrowRight } from 'lucide-react'

import { useAuth } from '@/app/AuthContext'

import { ForgotPasswordDialog } from './ForgotPasswordDialog'

import { Button } from '@/components/ui/button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import type { LoginIntent } from '@/lib/permissions'

const INTENT_LABEL: Record<LoginIntent, string> = {
  admin: 'مدير',

  employee: 'موظف'
}

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()

  const { login, loginIntent, isAuthenticated } = useAuth()

  const [username, setUsername] = useState('')

  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const [forgotOpen, setForgotOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true })

      return
    }

    if (!loginIntent) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loginIntent, navigate])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()

    if (!loginIntent) return

    setLoading(true)
    setError(null)

    try {
      const err = await login(username.trim(), password, loginIntent)
      if (err) {
        setError(err)
        return
      }
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      console.error('Login failed:', error)
      setError('تعذّر تسجيل الدخول. أغلق التطبيق وافتحه مجدداً، ثم حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  if (!loginIntent) {
    return <div className="text-center text-sm text-muted-foreground">جاري التحميل…</div>
  }

  return (
    <>
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle>تسجيل الدخول — {INTENT_LABEL[loginIntent]}</CardTitle>

          <CardDescription>أدخل اسم المستخدم وكلمة المرور</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="field-group">
              <Label htmlFor="username">اسم المستخدم</Label>

              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">كلمة المرور</Label>

                <button
                  type="button"
                  className="text-xs font-medium text-primary transition-colors hover:text-[var(--primary-hover)]"
                  onClick={() => setForgotOpen(true)}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'جاري الدخول…' : 'دخول'}
            </Button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="size-4" />
              العودة لاختيار الدور
            </Link>
          </form>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        loginIntent={loginIntent}
      />
    </>
  )
}

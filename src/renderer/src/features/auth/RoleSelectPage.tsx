import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, UserCircle } from 'lucide-react'
import { useAuth } from '@/app/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function RoleSelectPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { setLoginIntent, isAuthenticated } = useAuth()
  const [firstRunNote, setFirstRunNote] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true })
      return
    }
    void window.api.auth.checkFirstRun().then((isFirst) => {
      if (isFirst) setFirstRunNote(true)
    })
  }, [isAuthenticated, navigate])

  function pickRole(intent: 'admin' | 'employee'): void {
    setLoginIntent(intent)
    navigate('/login/credentials')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">مرحباً بك</h1>
        <p className="mt-2 text-sm text-muted-foreground">اختر نوع الدخول للمتابعة</p>
      </div>

      {firstRunNote ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-primary">أول تشغيل للنظام</p>
          <p className="mt-1 text-muted-foreground">
            تم إنشاء حساب مدير افتراضي: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => pickRole('employee')} className="text-right">
          <Card
            className={cn(
              'glass-card cursor-pointer transition-all hover:border-primary/40 hover:shadow-md',
              'h-full'
            )}
          >
            <CardHeader>
              <UserCircle className="mb-2 size-10 text-primary" />
              <CardTitle>موظف</CardTitle>
              <CardDescription>
                إدارة الطلاب، المواد، المجموعات، الأساتذة، والمدفوعات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-primary">متابعة ←</span>
            </CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => pickRole('admin')} className="text-right">
          <Card
            className={cn(
              'glass-card cursor-pointer transition-all hover:border-primary/40 hover:shadow-md',
              'h-full'
            )}
          >
            <CardHeader>
              <Shield className="mb-2 size-10 text-primary" />
              <CardTitle>مدير</CardTitle>
              <CardDescription>
                كل صلاحيات الموظف + المالية، الرواتب، الإعدادات، والنسخ الاحتياطي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-primary">متابعة ←</span>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  )
}

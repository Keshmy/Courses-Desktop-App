import { FormEvent, useState } from 'react'
import { DEFAULT_ADMIN_USERNAME } from '../../../../shared/constants/auth'
import type { LoginIntent } from '@/lib/permissions'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  loginIntent: LoginIntent
}

const INTENT_LABEL: Record<LoginIntent, string> = {
  admin: 'مدير',
  employee: 'موظف'
}

export function ForgotPasswordDialog({ open, onOpenChange, loginIntent }: Props): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function resetForm(): void {
    setUsername('')
    setFullName('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  function handleClose(next: boolean): void {
    if (!next) resetForm()
    onOpenChange(next)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedUsername = username.trim()
    if (trimmedUsername.toLowerCase() === DEFAULT_ADMIN_USERNAME) {
      setError(
        'حساب المدير الرئيسي (admin) محمي. سجّل الدخول بكلمة المرور الحالية وغيّرها من الإعدادات.'
      )
      return
    }

    if (newPassword.length < 4) {
      setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق')
      return
    }

    setLoading(true)
    const result = await window.api.auth.resetPassword({
      username: trimmedUsername,
      fullName: fullName.trim(),
      newPassword,
      role: loginIntent
    })
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'تعذّر إعادة تعيين كلمة المرور')
      return
    }

    setSuccess('تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="نسيت كلمة المرور؟"
      description={`إعادة تعيين كلمة مرور حساب ${INTENT_LABEL[loginIntent]} باستخدام اسم المستخدم والاسم الكامل`}
      className="max-w-md"
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="field-group">
          <Label htmlFor="resetUsername">اسم المستخدم</Label>
          <Input
            id="resetUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="field-group">
          <Label htmlFor="resetFullName">الاسم الكامل (كما في السجل)</Label>
          <Input
            id="resetFullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <Label htmlFor="resetNewPassword">كلمة المرور الجديدة</Label>
          <Input
            id="resetNewPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
        </div>
        <div className="field-group">
          <Label htmlFor="resetConfirmPassword">تأكيد كلمة المرور</Label>
          <Input
            id="resetConfirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

        <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'جاري الحفظ…' : 'تحديث كلمة المرور'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

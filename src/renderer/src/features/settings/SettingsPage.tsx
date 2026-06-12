import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Upload, Image, KeyRound, FolderOpen } from 'lucide-react'
import { DEFAULT_ADMIN_USERNAME } from '../../../../shared/constants/auth'
import { useAuth } from '@/app/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CenterLogo } from '@/components/CenterLogo'

export function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.getSettings()
  })

  const [centerName, setCenterName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    if (settings) setCenterName(settings.centerName ?? '')
  }, [settings])

  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [restoreMsg, setRestoreMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [autoBackupMsg, setAutoBackupMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const updateMutation = useMutation({
    mutationFn: (name: string) =>
      window.api.settings.updateSettings({ centerName: name }, user?.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setUpdateMsg('تم التحديث بنجاح')
      setTimeout(() => setUpdateMsg(null), 3000)
    }
  })

  const [logoMsg, setLogoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const uploadLogoMutation = useMutation({
    mutationFn: () => window.api.settings.uploadLogo(user?.id),
    onSuccess: async (result) => {
      if (!result) {
        setLogoMsg(null)
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      const logo = await window.api.settings.getLogoDataUrl()
      queryClient.setQueryData(['center-logo'], logo)
      setLogoMsg({
        type: logo ? 'success' : 'error',
        text: logo ? 'تم تحديث الشعار بنجاح' : 'تم الحفظ لكن تعذّر عرض المعاينة'
      })
      setTimeout(() => setLogoMsg(null), 4000)
    },
    onError: () => {
      setLogoMsg({ type: 'error', text: 'حدث خطأ أثناء رفع الشعار' })
      setTimeout(() => setLogoMsg(null), 4000)
    }
  })

  const backupMutation = useMutation({
    mutationFn: (userId: number) => window.api.settings.backup(userId),
    onSuccess: (result) => {
      setBackupMsg({
        type: result.success ? 'success' : 'error',
        text: result.success
          ? result.filePath
            ? `تم الحفظ: ${result.filePath}`
            : 'تم إنشاء النسخة الاحتياطية بنجاح'
          : 'تم الإلغاء أو حدث خطأ'
      })
      setTimeout(() => setBackupMsg(null), 5000)
    },
    onError: () => {
      setBackupMsg({ type: 'error', text: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية' })
      setTimeout(() => setBackupMsg(null), 5000)
    }
  })

  const backupSettingsMutation = useMutation({
    mutationFn: (data: {
      autoBackupOnClose?: boolean
      autoBackupDirectory?: string | null
    }) => window.api.settings.updateSettings(data, user?.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  })

  async function handleSelectBackupFolder(): Promise<void> {
    const result = await window.api.settings.selectBackupFolder()
    if (!result.success || !result.directory) return

    try {
      await backupSettingsMutation.mutateAsync({ autoBackupDirectory: result.directory })
      setAutoBackupMsg({ type: 'success', text: 'تم حفظ مجلد النسخ الاحتياطي' })
    } catch {
      setAutoBackupMsg({ type: 'error', text: 'تعذّر حفظ المجلد' })
    }
    setTimeout(() => setAutoBackupMsg(null), 4000)
  }

  async function handleAutoBackupToggle(enabled: boolean): Promise<void> {
    if (enabled && !settings?.autoBackupDirectory) {
      const result = await window.api.settings.selectBackupFolder()
      if (!result.success || !result.directory) return

      try {
        await backupSettingsMutation.mutateAsync({
          autoBackupOnClose: true,
          autoBackupDirectory: result.directory
        })
        setAutoBackupMsg({ type: 'success', text: 'تم تفعيل النسخ الاحتياطي التلقائي' })
      } catch {
        setAutoBackupMsg({ type: 'error', text: 'تعذّر تفعيل النسخ التلقائي' })
      }
    } else {
      try {
        await backupSettingsMutation.mutateAsync({ autoBackupOnClose: enabled })
        setAutoBackupMsg({
          type: 'success',
          text: enabled ? 'تم تفعيل النسخ الاحتياطي التلقائي' : 'تم إيقاف النسخ الاحتياطي التلقائي'
        })
      } catch {
        setAutoBackupMsg({ type: 'error', text: 'تعذّر تحديث الإعداد' })
      }
    }
    setTimeout(() => setAutoBackupMsg(null), 4000)
  }

  const restoreMutation = useMutation({
    mutationFn: () => window.api.settings.restore(user?.id),
    onSuccess: (result) => {
      setRestoreMsg({
        type: result.success ? 'success' : 'error',
        text: result.success ? 'تمت استعادة النسخة الاحتياطية بنجاح' : 'حدث خطأ'
      })
      if (result.success) {
        void queryClient.invalidateQueries()
      }
      setTimeout(() => setRestoreMsg(null), 5000)
    },
    onError: () => {
      setRestoreMsg({ type: 'error', text: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' })
      setTimeout(() => setRestoreMsg(null), 5000)
    }
  })

  async function handleChangePassword(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!user) return

    setPasswordMsg(null)

    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'تأكيد كلمة المرور غير مطابق' })
      return
    }

    setPasswordLoading(true)
    const result = await window.api.auth.changePassword({
      employeeId: user.id,
      currentPassword,
      newPassword
    })
    setPasswordLoading(false)

    if (!result.success) {
      setPasswordMsg({ type: 'error', text: result.error ?? 'تعذّر تغيير كلمة المرور' })
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
    setTimeout(() => setPasswordMsg(null), 4000)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">جاري التحميل…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">الإعدادات</h2>
        <p className="text-sm text-muted-foreground">إعدادات المركز والنسخ الاحتياطي</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex max-w-md flex-col gap-4" onSubmit={handleChangePassword}>
            {user?.username.toLowerCase() === DEFAULT_ADMIN_USERNAME ? (
              <p className="text-sm text-muted-foreground">
                حساب المدير الرئيسي (<strong>admin</strong>) يمكنك تغيير كلمة مروره من هنا فقط بعد
                تسجيل الدخول.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                غيّر كلمة مرور حسابك الحالي: <strong>{user?.username}</strong>
              </p>
            )}
            <div className="field-group">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="field-group">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            <div className="field-group">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            {passwordMsg ? (
              <p
                className={`text-sm ${passwordMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
              >
                {passwordMsg.text}
              </p>
            ) : null}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'جاري الحفظ…' : 'حفظ كلمة المرور'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card 1: بيانات المركز */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات المركز</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="centerName">اسم المركز</Label>
            <div className="flex gap-2">
              <Input
                id="centerName"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="أدخل اسم المركز"
              />
              <Button
                disabled={updateMutation.isPending || !centerName.trim()}
                onClick={() => updateMutation.mutate(centerName.trim())}
              >
                تحديث
              </Button>
            </div>
            {updateMsg && <p className="text-sm text-green-600">{updateMsg}</p>}
          </div>

          <div className="space-y-3">
            <Label>شعار المركز</Label>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-4 sm:flex-row sm:items-center">
              <CenterLogo
                className="h-28 w-28 shrink-0 rounded-2xl border border-border/60 bg-white object-contain p-2 shadow-sm"
                showFallback
                fallbackClassName="size-28"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  يظهر الشعار في شاشة تسجيل الدخول والإيصالات. الصيغ المدعومة: PNG، JPG، WEBP.
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={uploadLogoMutation.isPending}
                  onClick={() => uploadLogoMutation.mutate()}
                >
                  <Image className="size-4" />
                  {uploadLogoMutation.isPending ? 'جاري الرفع…' : 'اختيار صورة الشعار'}
                </Button>
                {logoMsg ? (
                  <p
                    className={`text-sm ${logoMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
                  >
                    {logoMsg.text}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: النسخ الاحتياطي */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">النسخ الاحتياطي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="autoBackup" className="text-sm font-semibold">
                  نسخ احتياطي تلقائي عند الإغلاق
                </Label>
                <p className="text-sm text-muted-foreground">
                  عند إغلاق البرنامج يتم حفظ نسخة من قاعدة البيانات تلقائياً في المجلد المحدد.
                </p>
              </div>
              <input
                id="autoBackup"
                type="checkbox"
                className="mt-1 size-5 shrink-0 cursor-pointer accent-primary"
                checked={settings?.autoBackupOnClose ?? false}
                disabled={backupSettingsMutation.isPending}
                onChange={(e) => void handleAutoBackupToggle(e.target.checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">مجلد الحفظ</Label>
              <p className="break-all rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                {settings?.autoBackupDirectory ?? 'لم يتم اختيار مجلد بعد'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={backupSettingsMutation.isPending}
                onClick={() => void handleSelectBackupFolder()}
              >
                <FolderOpen className="size-4" />
                اختيار مجلد النسخ الاحتياطي
              </Button>
            </div>

            {autoBackupMsg ? (
              <p
                className={`text-sm ${autoBackupMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
              >
                {autoBackupMsg.text}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              disabled={backupMutation.isPending}
              onClick={() => {
                if (user) backupMutation.mutate(user.id)
              }}
            >
              <Download className="size-4" />
              إنشاء نسخة احتياطية
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate()}
            >
              <Upload className="size-4" />
              استعادة نسخة احتياطية
            </Button>
          </div>

          {backupMsg && (
            <p
              className={`text-sm ${backupMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}
            >
              {backupMsg.text}
            </p>
          )}

          {restoreMsg && (
            <p
              className={`text-sm ${restoreMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}
            >
              {restoreMsg.text}
            </p>
          )}

          <p className="text-sm text-destructive">
            تحذير: استعادة نسخة احتياطية ستؤدي إلى استبدال جميع البيانات الحالية.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

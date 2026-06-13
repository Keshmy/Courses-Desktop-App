import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LicensePlan, LicenseServerStatus } from '../../../../shared/types/license'

type ActivationPageProps = {
  onActivated: () => void
}

const POLL_INTERVAL_MS = 10 * 1000
const ACTIVATION_SUCCESS_DELAY_MS = 2000
const SUPPORT_NUMBERS = ['+218 91 492 1099', '+218 93 453 1467']
const PENDING_STATUSES: LicenseServerStatus[] = ['PENDING_APPROVAL', 'RENEWAL_PENDING']

function formatDuration(days: number): string {
  if (days >= 365) {
    const years = Math.round(days / 365)
    return years === 1 ? 'سنة' : `${years} سنوات`
  }
  if (days >= 30) {
    const months = Math.round(days / 30)
    return months === 1 ? 'شهر' : `${months} أشهر`
  }
  return days === 1 ? 'يوم' : `${days} يوم`
}

function statusMessage(status: LicenseServerStatus): string {
  switch (status) {
    case 'CHECKING':
      return 'جاري فحص حالة الاشتراك'
    case 'PENDING_APPROVAL':
      return 'طلبك قيد الدفع أو الموافقة'
    case 'RENEWAL_PENDING':
      return 'تجديد الاشتراك قيد الدفع'
    case 'EXPIRED':
      return 'انتهت صلاحية الاشتراك'
    case 'REJECTED':
      return 'تم رفض طلب التفعيل'
    case 'PAYMENT_CANCELLED':
      return 'تم إلغاء عملية الدفع'
    case 'ACTIVE':
      return 'تم التفعيل بنجاح'
    case 'NOT_FOUND':
      return 'لا يوجد اشتراك مسجل لهذا الجهاز بعد'
    default:
      return 'أدخل بياناتك لتفعيل النظام'
  }
}

export function ActivationPage({ onActivated }: ActivationPageProps): React.JSX.Element {
  const [hwid, setHwid] = useState('')
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<LicenseServerStatus>('CHECKING')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showActivationSuccess = useCallback(() => {
    setStatus('ACTIVE')
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    successTimeoutRef.current = setTimeout(onActivated, ACTIVATION_SUCCESS_DELAY_MS)
  }, [onActivated])

  const activateLicense = useCallback(
    async (licenseKey: string) => {
      const result = await window.api.activation.activate(licenseKey)
      if (!result.activated) {
        setError(result.error || 'فشل تفعيل الترخيص')
        setStatus(result.error === 'EXPIRED' ? 'EXPIRED' : 'UNKNOWN')
        return
      }

      showActivationSuccess()
    },
    [showActivationSuccess]
  )

  const checkStatus = useCallback(
    async (machineId = hwid) => {
      if (!machineId) return

      try {
        const data = await window.api.activation.checkServerStatus(machineId)

        if (data.customerId) setCustomerId(data.customerId)
        if (data.subscriptionId) setPendingSubscriptionId(data.subscriptionId)
        if (data.payment_url) setPaymentUrl(data.payment_url)

        if (data.status === 'ACTIVE' && data.licenseKey) {
          await activateLicense(data.licenseKey)
          return
        }

        setError('')
        setStatus(data.status || 'UNKNOWN')
      } catch {
        setStatus('IDLE')
        setError('تعذر الاتصال بخادم الاشتراكات. تحقق من الإنترنت وحاول مرة أخرى.')
      }
    },
    [activateLicense, hwid]
  )

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const data = await window.api.activation.listPlans()
      setPlans(data)
      setSelectedPlanId((current) => current ?? data[0]?.id ?? null)
    } catch {
      setError('فشل تحميل خطط الاشتراك.')
    } finally {
      setPlansLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadInitialState = async (): Promise<void> => {
      try {
        const [machineId, info] = await Promise.all([
          window.api.activation.getHWID(),
          window.api.activation.getInfo()
        ])
        setHwid(machineId)

        if (info.license) {
          setCustomerId(info.license.customerId || null)
          setName(info.license.name || '')
          setPhone(info.license.phone || '')
        }

        await checkStatus(machineId)
      } catch {
        setStatus('IDLE')
        setError('فشل تحميل بيانات الجهاز.')
      }
    }

    void fetchPlans()
    void loadInitialState()

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [checkStatus, fetchPlans])

  useEffect(() => {
    if (!['PENDING_APPROVAL', 'RENEWAL_PENDING'].includes(status) || !hwid) return

    pollTimeoutRef.current = setTimeout(() => {
      void checkStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [checkStatus, hwid, status])

  const requestAccess = async (): Promise<void> => {
    setError('')

    if (!name.trim() || !phone.trim()) {
      setError('أدخل الاسم ورقم الهاتف.')
      return
    }
    if (!selectedPlanId) {
      setError('اختر خطة الاشتراك أولاً.')
      return
    }

    setLoading(true)
    try {
      const data = await window.api.activation.requestAccess({
        name: name.trim(),
        phone: phone.trim(),
        planId: selectedPlanId,
        hwid
      })

      if (data.success === false) {
        throw new Error(
          typeof data.error === 'string' ? data.error : data.message || 'فشل إرسال طلب التفعيل'
        )
      }

      setPendingSubscriptionId(data.data?.subscriptionId || null)
      setPaymentUrl(data.data?.payment_url || null)
      setStatus('PENDING_APPROVAL')

      if (data.data?.payment_url) {
        await window.api.openExternal(data.data.payment_url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال طلب التفعيل.')
    } finally {
      setLoading(false)
    }
  }

  const requestRenew = async (): Promise<void> => {
    setError('')

    if (!customerId) {
      setError('تعذر تحميل بيانات العميل للتجديد.')
      return
    }
    if (!selectedPlanId) {
      setError('اختر خطة التجديد أولاً.')
      return
    }

    setLoading(true)
    try {
      const data = await window.api.activation.renew(customerId, hwid, selectedPlanId)

      if (data.success === false) {
        throw new Error(
          typeof data.error === 'string' ? data.error : data.message || 'فشل إرسال طلب التجديد'
        )
      }

      setPendingSubscriptionId(data.data?.subscriptionId || null)
      setPaymentUrl(data.data?.payment_url || null)
      setStatus('RENEWAL_PENDING')

      if (data.data?.payment_url) {
        await window.api.openExternal(data.data.payment_url)
      }

      void checkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال طلب التجديد.')
    } finally {
      setLoading(false)
    }
  }

  const openPayment = async (): Promise<void> => {
    if (!paymentUrl) {
      setError('لا يوجد رابط دفع محفوظ لهذا الطلب.')
      return
    }
    await window.api.openExternal(paymentUrl)
  }

  const cancelPendingRequest = async (): Promise<void> => {
    setError('')

    if (!pendingSubscriptionId) {
      setError('تعذر العثور على رقم الطلب لإلغائه.')
      return
    }

    setCancelLoading(true)
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }

    try {
      const ok = await window.api.activation.cancelPending(pendingSubscriptionId)
      if (!ok) throw new Error('Cancel failed')

      setPendingSubscriptionId(null)
      setPaymentUrl(null)
      setStatus('PAYMENT_CANCELLED')
      setError('تم إلغاء الطلب. يمكنك اختيار خطة أخرى والمحاولة من جديد.')
    } catch {
      setError('تعذر إلغاء الطلب. حاول مرة أخرى.')
    } finally {
      setCancelLoading(false)
    }
  }

  const openSupport = async (phoneNumber: string): Promise<void> => {
    const digits = phoneNumber.replace(/\D/g, '')
    await window.api.openExternal(`https://wa.me/${digits}`)
  }

  const syncNow = async (): Promise<void> => {
    setError('')
    setLoading(true)
    try {
      await fetchPlans()
      const syncResult = await window.api.activation.syncLicense()
      if (syncResult?.kind === 'updated') {
        showActivationSuccess()
        return
      }
      await checkStatus()
    } catch {
      setError('تعذر التحقق الآن.')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId)
  const isChecking = status === 'CHECKING'
  const isActive = status === 'ACTIVE'
  const isWaitingForPayment = PENDING_STATUSES.includes(status)
  const isRenewalMode =
    !isWaitingForPayment &&
    (status === 'EXPIRED' || (status === 'PAYMENT_CANCELLED' && Boolean(customerId)))
  const isNewActivationMode = !isChecking && !isActive && !isRenewalMode && !isWaitingForPayment

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)] md:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-between bg-primary p-8 text-primary-foreground">
          <div className="space-y-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/12">
              <ShieldCheck className="size-7" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">نظام الدورات</h1>
              <p className="max-w-md text-sm leading-7 text-primary-foreground/80">
                {statusMessage(status)}
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-3 rounded-xl border border-white/15 bg-white/10 p-4 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="size-4" />
              <span className="font-semibold">معرف الجهاز</span>
            </div>
            <p
              dir="ltr"
              className="break-all rounded-lg bg-black/15 p-3 text-xs text-primary-foreground/85"
            >
              {hwid || '...'}
            </p>
          </div>
        </section>

        <section className="space-y-6 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {isRenewalMode ? 'تجديد الاشتراك' : 'تفعيل الاشتراك'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRenewalMode ? 'اختر خطة التجديد للمتابعة' : statusMessage(status)}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={syncNow} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              تحقق
            </Button>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 size-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {isChecking ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-muted/30 p-6 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="font-semibold">جاري التحقق من حالة الاشتراك...</p>
                <p className="text-sm text-muted-foreground">
                  يتم فحص الترخيص وبيانات الجهاز قبل المتابعة.
                </p>
              </div>
            </div>
          ) : null}

          {isRenewalMode ? (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              {status === 'PAYMENT_CANCELLED'
                ? 'تم إلغاء الطلب. يمكنك اختيار خطة أخرى للتجديد.'
                : 'انتهت صلاحية اشتراكك. يرجى اختيار خطة للتجديد.'}
            </div>
          ) : null}

          {isWaitingForPayment ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
              <Clock className="mt-0.5 size-5" />
              <div className="space-y-2">
                <p className="font-semibold">طلب الاشتراك قيد المتابعة.</p>
                <p>سيتم التفعيل تلقائياً بعد اكتمال الدفع أو الموافقة.</p>
                {pendingSubscriptionId ? (
                  <p className="text-xs">رقم الطلب: {pendingSubscriptionId}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {status === 'ACTIVE' ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-emerald-300/50 bg-emerald-50 p-6 text-center text-emerald-900">
              <span className="flex size-16 animate-pulse items-center justify-center rounded-full bg-emerald-600 text-white">
                <ShieldCheck className="size-9" />
              </span>
              <div className="space-y-1">
                <p className="text-lg font-bold">تم التفعيل بنجاح</p>
                <p className="text-sm">جاري فتح النظام...</p>
              </div>
            </div>
          ) : null}

          {!isChecking && !isActive && !isWaitingForPayment ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {plansLoading ? (
                <div className="col-span-full flex h-28 items-center justify-center rounded-xl border border-border">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <div className="col-span-full rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  لا توجد خطط متاحة لهذا النظام حالياً.
                </div>
              ) : (
                plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`min-h-28 rounded-xl border p-4 text-right transition ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{plan.name}</p>
                        <p className="mt-2 text-2xl font-bold text-primary">
                          {plan.price.toFixed(2)} د.ل
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDuration(plan.durationDays)}
                        </p>
                      </div>
                      {selectedPlanId === plan.id ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {isNewActivationMode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field-group">
                <Label htmlFor="activation-name">الاسم</Label>
                <Input
                  id="activation-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اسم العميل"
                />
              </div>
              <div className="field-group">
                <Label htmlFor="activation-phone">رقم الهاتف</Label>
                <Input
                  id="activation-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="09xxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {isWaitingForPayment ? (
              <>
                {paymentUrl ? (
                  <Button type="button" className="h-10 flex-1" onClick={openPayment}>
                    <ExternalLink className="size-4" />
                    فتح صفحة الدفع
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={cancelPendingRequest}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {cancelLoading ? 'جاري إلغاء الطلب...' : 'إلغاء الطلب والرجوع'}
                </Button>
              </>
            ) : null}
            {!isChecking && !isActive && !isWaitingForPayment ? (
              <Button
                type="button"
                className="h-10 flex-1"
                onClick={isRenewalMode ? requestRenew : requestAccess}
                disabled={loading || !selectedPlan}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                {isRenewalMode ? 'تجديد الآن' : 'طلب تفعيل'}
              </Button>
            ) : null}
          </div>

          {isWaitingForPayment ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="mb-3 font-semibold">للدعم أثناء انتظار الموافقة:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUPPORT_NUMBERS.map((phoneNumber) => (
                  <Button
                    key={phoneNumber}
                    type="button"
                    variant="outline"
                    className="justify-center"
                    onClick={() => void openSupport(phoneNumber)}
                  >
                    <Phone className="size-4" />
                    <span dir="ltr">{phoneNumber}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {customerId ? (
            <p className="text-xs text-muted-foreground">رقم العميل: {customerId}</p>
          ) : null}
        </section>
      </div>
    </main>
  )
}

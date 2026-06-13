import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { LICENSE_CHECK_INTERVAL_MS } from '../../../../shared/license'
import type { LicensePlan } from '../../../../shared/types/license'
import { useAuth } from '@/app/AuthContext'
import { ActivationPage } from './ActivationPage'

const DAY_MS = 24 * 60 * 60 * 1000

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

function formatRemaining(remainingMs: number): string {
  const safeMs = Math.max(remainingMs, 0)
  const totalSeconds = Math.floor(safeMs / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60
  const time = [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')

  if (days > 0) return `${days} يوم ${time}`
  return time
}

export function ActivationGate({ children }: { children: ReactNode }): React.JSX.Element {
  const { logout, isAuthenticated } = useAuth()
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [licenseExpiresAtMs, setLicenseExpiresAtMs] = useState<number | null>(null)
  const [licenseCustomerId, setLicenseCustomerId] = useState<string | null>(null)
  const [machineHwid, setMachineHwid] = useState<string | null>(null)
  const [warningDays, setWarningDays] = useState(1)
  const [nowMs, setNowMs] = useState(Date.now())
  const [renewOpen, setRenewOpen] = useState(false)
  const [plans, setPlans] = useState<LicensePlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [plansLoading, setPlansLoading] = useState(false)
  const [renewLoading, setRenewLoading] = useState(false)
  const [renewCancelLoading, setRenewCancelLoading] = useState(false)
  const [renewError, setRenewError] = useState('')
  const [renewMessage, setRenewMessage] = useState('')
  const [renewPending, setRenewPending] = useState(false)
  const [pendingSubscriptionId, setPendingSubscriptionId] = useState<string | null>(null)
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null)

  const checkActivation = useCallback(async () => {
    try {
      const status = await window.api.activation.checkLicense()
      setIsActivated(status.activated)

      if (status.activated && status.license?.expiresAt) {
        const expiresAtMs = new Date(status.license.expiresAt).getTime()
        setLicenseExpiresAtMs(Number.isNaN(expiresAtMs) ? null : expiresAtMs)
        setLicenseCustomerId(status.license.customerId || null)
      } else {
        setLicenseExpiresAtMs(null)
        setLicenseCustomerId(status.license?.customerId || null)
      }
    } catch {
      setIsActivated(false)
      setLicenseExpiresAtMs(null)
    }
  }, [])

  useEffect(() => {
    const load = async (): Promise<void> => {
      const [hwid, days] = await Promise.all([
        window.api.activation.getHWID(),
        window.api.activation.getWarningWindowDays()
      ])
      setMachineHwid(hwid)
      if (days > 0) setWarningDays(days)
      await checkActivation()
    }

    void load()
  }, [checkActivation])

  useEffect(() => {
    const unsubscribeInvalid = window.api.activation.onLicenseInvalid(() => {
      logout()
      setIsActivated(false)
      setLicenseExpiresAtMs(null)
      setRenewOpen(false)
    })

    const unsubscribeUpdated = window.api.activation.onLicenseUpdated((license) => {
      if (license.expiresAt) {
        const expiresAtMs = new Date(license.expiresAt).getTime()
        setLicenseExpiresAtMs(Number.isNaN(expiresAtMs) ? null : expiresAtMs)
      }
      if (license.customerId) setLicenseCustomerId(license.customerId)
      setIsActivated(true)
    })

    return () => {
      unsubscribeInvalid()
      unsubscribeUpdated()
    }
  }, [logout])

  useEffect(() => {
    const interval = setInterval(() => {
      void window.api.activation.syncLicense().then((syncResult) => {
        if (syncResult?.kind === 'updated') {
          setIsActivated(true)
          if (syncResult.status.license?.expiresAt) {
            const expiresAtMs = new Date(syncResult.status.license.expiresAt).getTime()
            setLicenseExpiresAtMs(Number.isNaN(expiresAtMs) ? null : expiresAtMs)
          }
          setLicenseCustomerId(syncResult.status.license?.customerId || null)
          return
        }
        void checkActivation()
      })
    }, LICENSE_CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [checkActivation])

  useEffect(() => {
    if (!isAuthenticated || !isActivated || !licenseExpiresAtMs) return

    setNowMs(Date.now())
    const interval = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [isActivated, isAuthenticated, licenseExpiresAtMs])

  const loadPlans = async (): Promise<void> => {
    setPlansLoading(true)
    setRenewError('')
    try {
      const data = await window.api.activation.listPlans()
      setPlans(data)
      setSelectedPlanId((current) => current ?? data[0]?.id ?? null)
    } catch {
      setRenewError('فشل تحميل خطط التجديد.')
    } finally {
      setPlansLoading(false)
    }
  }

  const openRenew = async (): Promise<void> => {
    setRenewOpen(true)
    setRenewError('')
    setRenewMessage('')
    setRenewPending(false)
    setPendingSubscriptionId(null)
    setPendingPaymentUrl(null)
    await loadPlans()
  }

  const requestRenew = async (): Promise<void> => {
    setRenewError('')
    setRenewMessage('')

    if (!licenseCustomerId || !machineHwid) {
      setRenewError('تعذر تحميل بيانات الترخيص.')
      return
    }
    if (!selectedPlanId) {
      setRenewError('اختر خطة التجديد أولاً.')
      return
    }

    setRenewLoading(true)
    setPendingPaymentUrl(null)
    try {
      const result = await window.api.activation.renew(
        licenseCustomerId,
        machineHwid,
        selectedPlanId
      )
      if (!result.success) {
        setRenewError(result.error || 'فشل إنشاء طلب التجديد.')
        return
      }

      const paymentUrl = result.data?.payment_url || null
      setPendingSubscriptionId(result.data?.subscriptionId || null)
      setPendingPaymentUrl(paymentUrl)
      setRenewPending(true)
      if (paymentUrl) await window.api.openExternal(paymentUrl)
      if (paymentUrl) {
        setRenewMessage(
          result.data?.existing_pending
            ? 'لديك طلب دفع قيد الانتظار.'
            : 'تم إنشاء رابط الدفع. سيتم تحديث الاشتراك بعد اكتمال الدفع.'
        )
        return
      }

      setRenewMessage(
        result.data?.requires_payment === false
          ? 'تم إرسال طلب التجديد للموافقة. هذه الخطة لا تحتاج إلى دفع.'
          : 'لديك طلب تجديد قيد المراجعة.'
      )
      void checkActivation()
    } catch {
      setRenewError('فشل إرسال طلب التجديد.')
    } finally {
      setRenewLoading(false)
    }
  }

  const checkRenewNow = async (): Promise<void> => {
    setRenewError('')
    setRenewMessage('')
    setRenewLoading(true)
    try {
      const syncResult = await window.api.activation.syncLicense()
      await checkActivation()
      if (syncResult?.kind !== 'updated') setRenewPending(true)
      setRenewMessage(
        syncResult?.kind === 'updated'
          ? 'تم تحديث الاشتراك بنجاح.'
          : 'تم التحقق. إذا أكملت الدفع للتو، قد يحتاج التأكيد لحظات قليلة.'
      )
    } catch {
      setRenewError('تعذر التحقق الآن.')
    } finally {
      setRenewLoading(false)
    }
  }

  const cancelRenewRequest = async (): Promise<void> => {
    setRenewError('')
    setRenewMessage('')

    if (!pendingSubscriptionId) {
      setRenewError('تعذر العثور على رقم الطلب لإلغائه.')
      return
    }

    setRenewCancelLoading(true)
    try {
      const ok = await window.api.activation.cancelPending(pendingSubscriptionId)
      if (!ok) throw new Error('Cancel failed')

      setRenewPending(false)
      setPendingSubscriptionId(null)
      setPendingPaymentUrl(null)
      setRenewMessage('تم إلغاء طلب التجديد. يمكنك اختيار خطة أخرى والمحاولة من جديد.')
      await checkActivation()
    } catch {
      setRenewError('تعذر إلغاء طلب التجديد. حاول مرة أخرى.')
    } finally {
      setRenewCancelLoading(false)
    }
  }

  const remainingMs = licenseExpiresAtMs ? licenseExpiresAtMs - nowMs : null

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isActivated ||
      !licenseExpiresAtMs ||
      remainingMs === null ||
      remainingMs > 0
    ) {
      return
    }

    logout()
    setIsActivated(false)
    setLicenseExpiresAtMs(null)
    setRenewOpen(false)
  }, [isActivated, isAuthenticated, licenseExpiresAtMs, logout, remainingMs])

  const showWarning = Boolean(
    isAuthenticated &&
    isActivated &&
    remainingMs !== null &&
    remainingMs > 0 &&
    remainingMs <= warningDays * DAY_MS
  )

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId),
    [plans, selectedPlanId]
  )

  if (isActivated === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isActivated) {
    return <ActivationPage onActivated={() => void checkActivation()} />
  }

  return (
    <>
      {showWarning ? (
        <div className="no-print sticky top-0 z-40 flex min-h-12 items-center justify-between gap-3 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            <span className="font-semibold">
              ينتهي الاشتراك خلال {formatRemaining(remainingMs ?? 0)}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openRenew}>
            تجديد
          </Button>
        </div>
      ) : null}

      {children}

      <Dialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        title="تجديد الاشتراك"
        description="اختر خطة التجديد، ثم أكمل الدفع عبر MyPay."
      >
        <div className="space-y-4">
          {renewError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {renewError}
            </div>
          ) : null}
          {renewMessage ? (
            <div className="rounded-xl border border-emerald-300/50 bg-emerald-50 p-3 text-sm text-emerald-900">
              {renewMessage}
            </div>
          ) : null}

          <div className="grid gap-3">
            {plansLoading ? (
              <div className="flex h-24 items-center justify-center rounded-xl border border-border">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : renewPending ? (
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                طلب التجديد قيد المتابعة. لا يمكن اختيار خطة أخرى حتى تتم الموافقة أو الرفض.
              </div>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-xl border p-4 text-right transition ${
                    selectedPlanId === plan.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold">{plan.name}</span>
                    <span className="font-bold text-primary">{plan.price.toFixed(2)} د.ل</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDuration(plan.durationDays)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!renewPending ? (
              <Button
                type="button"
                className="flex-1"
                onClick={requestRenew}
                disabled={renewLoading || !selectedPlan}
              >
                {renewLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                طلب التجديد
              </Button>
            ) : null}
            {pendingPaymentUrl ? (
              <Button
                type="button"
                className="flex-1"
                onClick={() => void window.api.openExternal(pendingPaymentUrl)}
              >
                <ExternalLink className="size-4" />
                فتح صفحة الدفع
              </Button>
            ) : null}
            {renewPending ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={cancelRenewRequest}
                disabled={renewCancelLoading}
              >
                {renewCancelLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {renewCancelLoading ? 'جاري إلغاء الطلب...' : 'إلغاء الطلب والرجوع'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={checkRenewNow}
              disabled={renewLoading}
            >
              تحقق الآن
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

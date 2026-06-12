import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EnrollmentDto } from '../../../../shared/types/payment'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollment: EnrollmentDto
  studentId: number
  /** Called after payment is saved — use to open receipt preview/print */
  onPaymentComplete?: (paymentId: number) => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  enrollment,
  studentId,
  onPaymentComplete
}: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'card' | 'mixed'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [cardAmount, setCardAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAmount(String(enrollment.remainingAmount))
    setMethod('cash')
    setCashAmount('')
    setCardAmount('')
    setNotes('')
    setError(null)
  }, [open, enrollment.remainingAmount])

  useEffect(() => {
    const amt = Number(amount) || 0
    if (method === 'cash') {
      setCashAmount(String(amt))
      setCardAmount('0')
    } else if (method === 'card') {
      setCashAmount('0')
      setCardAmount(String(amt))
    }
  }, [amount, method])

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('يجب تسجيل الدخول')
      const amt = Number(amount)
      const cash = Number(cashAmount) || 0
      const card = Number(cardAmount) || 0
      return window.api.payments.create({
        enrollmentId: enrollment.id,
        amount: amt,
        method,
        cashAmount: cash,
        cardAmount: card,
        notes: notes.trim() || undefined,
        paidBy: user.id
      })
    },
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments', studentId] })
      void queryClient.invalidateQueries({ queryKey: ['payments', studentId] })
      void queryClient.invalidateQueries({ queryKey: ['payments-all'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-payments'] })
      onOpenChange(false)
      onPaymentComplete?.(payment.id)
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    const amt = Number(amount)
    const cash = Number(cashAmount) || 0
    const card = Number(cardAmount) || 0

    if (!amt || amt <= 0) {
      setError('المبلغ غير صالح')
      return
    }
    if (amt > enrollment.remainingAmount) {
      setError(`المبلغ يتجاوز المتبقي (${formatMoney(enrollment.remainingAmount)})`)
      return
    }
    if (method === 'mixed' && Math.abs(cash + card - amt) > 0.01) {
      setError('مجموع النقد والبطاقة يجب أن يساوي المبلغ')
      return
    }

    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="تسجيل دفعة"
      description={`${enrollment.subjectName} — ${enrollment.groupName}`}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          المتبقي: <strong>{formatMoney(enrollment.remainingAmount)}</strong> من{' '}
          {formatMoney(enrollment.totalAmount)}
        </p>

        <div className="space-y-2">
          <Label htmlFor="amount">مبلغ الدفعة</Label>
          <Input
            id="amount"
            type="number"
            min={0}
            max={enrollment.remainingAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="method">طريقة الدفع</Label>
          <Select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'cash' | 'card' | 'mixed')}
          >
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
            <option value="mixed">مختلط (نقد + بطاقة)</option>
          </Select>
        </div>

        {method === 'mixed' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cashAmount">نقداً</Label>
              <Input
                id="cashAmount"
                type="number"
                min={0}
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardAmount">بطاقة</Label>
              <Input
                id="cardAmount"
                type="number"
                min={0}
                step="0.01"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending || enrollment.remainingAmount <= 0}>
            {mutation.isPending ? 'جاري الحفظ…' : 'تسجيل الدفعة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'teacher' | 'employee'
}

function currentPeriod(): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${m}`
}

export function SalaryPayDialog({ open, onOpenChange, type }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [targetId, setTargetId] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => window.api.teachers.list(),
    enabled: type === 'teacher' && open
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => window.api.employees.list(),
    enabled: type === 'employee' && open
  })

  useEffect(() => {
    if (!open) return
    setTargetId('')
    setAmount('')
    setPeriod(currentPeriod())
    setNotes('')
    setError(null)
  }, [open, type])

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) throw new Error('يجب تسجيل الدخول')
      const payload = {
        targetId: Number(targetId),
        amount: Number(amount),
        period: period.trim(),
        notes: notes.trim() || undefined,
        paidBy: user.id
      }
      if (type === 'teacher') {
        await window.api.finances.payTeacherSalary(payload)
      } else {
        await window.api.finances.payEmployeeSalary(payload)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [type === 'teacher' ? 'teacher-salaries' : 'employee-salaries']
      })
      void queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (!targetId) {
      setError(type === 'teacher' ? 'يجب اختيار المدرس' : 'يجب اختيار الموظف')
      return
    }
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('المبلغ غير صالح')
      return
    }
    if (!period.trim()) {
      setError('يجب تحديد الفترة')
      return
    }
    mutation.mutate()
  }

  const targets =
    type === 'teacher'
      ? teachers.filter((t) => t.isActive)
      : employees.filter((e) => e.isActive)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={type === 'teacher' ? 'دفع راتب مدرس' : 'دفع راتب موظف'}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="target">
            {type === 'teacher' ? 'المدرس' : 'الموظف'}
          </Label>
          <Select
            id="target"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            required
          >
            <option value="">
              {type === 'teacher' ? '— اختر المدرس —' : '— اختر الموظف —'}
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ</Label>
          <Input
            id="amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="period">الفترة</Label>
          <Input
            id="period"
            type="text"
            placeholder="2026-06"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ…' : 'دفع الراتب'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

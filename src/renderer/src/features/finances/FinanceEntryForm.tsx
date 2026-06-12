import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateFinanceEntryRequest } from '../../../../shared/types/finance'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/app/AuthContext'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const expenseCategories = [
  { value: 'rent', label: 'إيجار' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'other', label: 'أخرى' }
]

const incomeCategories = [{ value: 'other', label: 'أخرى' }]

const emptyForm = {
  type: 'income' as 'income' | 'expense',
  category: 'other',
  amount: '',
  description: ''
}

export function FinanceEntryForm({ open, onOpenChange }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const categories = form.type === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(emptyForm)
  }, [open])

  // Reset category when type changes
  useEffect(() => {
    setForm((f) => ({ ...f, category: 'other' }))
  }, [form.type])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateFinanceEntryRequest = {
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description.trim() || undefined,
        createdBy: user!.id
      }
      return window.api.finances.createEntry(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setError('المبلغ مطلوب ويجب أن يكون أكبر من صفر')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="إضافة قيد"
      description="إدخال قيد مالي جديد"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entryType">النوع *</Label>
            <Select
              id="entryType"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as 'income' | 'expense'
                }))
              }
            >
              <option value="income">إيراد</option>
              <option value="expense">مصروف</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryCategory">التصنيف *</Label>
            <Select
              id="entryCategory"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryAmount">المبلغ *</Label>
          <Input
            id="entryAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryDescription">الوصف</Label>
          <Textarea
            id="entryDescription"
            placeholder="وصف اختياري للقيد…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ…' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

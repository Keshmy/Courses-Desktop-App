import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateSubjectRequest, SubjectDto } from '../../../../shared/types/subject'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: SubjectDto | null
}

const empty = { name: '', description: '', defaultPrice: '' }

export function SubjectFormDialog({ open, onOpenChange, subject }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = subject != null
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (subject) {
      setForm({
        name: subject.name,
        description: subject.description ?? '',
        defaultPrice: String(subject.defaultPrice)
      })
    } else {
      setForm(empty)
    }
  }, [open, subject])

  const mutation = useMutation({
    mutationFn: async () => {
      const price = Number(form.defaultPrice)
      if (!form.name.trim() || Number.isNaN(price) || price < 0) {
        throw new Error('تحقق من الاسم والسعر')
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        defaultPrice: price
      }
      if (isEdit && subject) {
        return window.api.subjects.update({ id: subject.id, ...payload }, user?.id)
      }
      return window.api.subjects.create(payload as CreateSubjectRequest, user?.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'تعديل مادة' : 'إضافة مادة'}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">اسم المادة *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPrice">السعر الافتراضي (د.ل) *</Label>
          <Input
            id="defaultPrice"
            type="number"
            min={0}
            step="0.01"
            value={form.defaultPrice}
            onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">الوصف</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

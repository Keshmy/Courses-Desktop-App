import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTeacherRequest, TeacherDto, UpdateTeacherRequest } from '../../../../shared/types/teacher'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: TeacherDto | null
}

const empty = { fullName: '', phone: '', specialization: '' }

export function TeacherFormDialog({ open, onOpenChange, teacher }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = teacher != null
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (teacher) {
      setForm({
        fullName: teacher.fullName,
        phone: teacher.phone ?? '',
        specialization: teacher.specialization ?? ''
      })
    } else {
      setForm(empty)
    }
  }, [open, teacher])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName.trim()) throw new Error('اسم الأستاذ مطلوب')
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        specialization: form.specialization.trim() || undefined
      }
      if (isEdit && teacher) {
        return window.api.teachers.update({ id: teacher.id, ...payload } as UpdateTeacherRequest, user?.id)
      }
      return window.api.teachers.create(payload as CreateTeacherRequest, user?.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? 'تعديل أستاذ' : 'إضافة أستاذ'}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
        <div className="space-y-2">
          <Label htmlFor="fullName">الاسم الكامل *</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialization">التخصص</Label>
            <Input
              id="specialization"
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">الأستاذ لا يدخل إلى النظام — سجل بيانات فقط.</p>
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

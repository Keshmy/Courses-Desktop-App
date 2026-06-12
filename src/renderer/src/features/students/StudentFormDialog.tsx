import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthContext'
import type { CreateStudentRequest, StudentDto, UpdateStudentRequest } from '../../../../shared/types/student'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: StudentDto | null
}

const emptyForm = {
  fullName: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  notes: ''
}

export function StudentFormDialog({ open, onOpenChange, student }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = student != null
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (student) {
      setForm({
        fullName: student.fullName,
        phone: student.phone ?? '',
        guardianName: student.guardianName ?? '',
        guardianPhone: student.guardianPhone ?? '',
        notes: student.notes ?? ''
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, student])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        guardianName: form.guardianName.trim() || undefined,
        guardianPhone: form.guardianPhone.trim() || undefined,
        notes: form.notes.trim() || undefined
      }
      if (isEdit && student) {
        const data: UpdateStudentRequest = { id: student.id, ...payload }
        return window.api.students.update(data, user?.id)
      }
      const data: CreateStudentRequest = payload
      return window.api.students.create(data, user?.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      if (student) void queryClient.invalidateQueries({ queryKey: ['student', student.id] })
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (!form.fullName.trim()) {
      setError('اسم الطالب مطلوب')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'تعديل طالب' : 'إضافة طالب'}
      description={isEdit ? 'تحديث بيانات الطالب' : 'إدخال بيانات طالب جديد'}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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
            <Label htmlFor="phone">هاتف الطالب</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianPhone">هاتف ولي الأمر</Label>
            <Input
              id="guardianPhone"
              value={form.guardianPhone}
              onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianName">اسم ولي الأمر</Label>
          <Input
            id="guardianName"
            value={form.guardianName}
            onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

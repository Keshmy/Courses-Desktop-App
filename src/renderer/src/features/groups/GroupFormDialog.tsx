import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateGroupRequest, GroupDto, UpdateGroupRequest } from '../../../../shared/types/group'
import { useAuth } from '@/app/AuthContext'
import { ScheduleEditor, type ScheduleSlotInput } from './ScheduleEditor'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: GroupDto | null
}

const empty = {
  name: '',
  subjectId: '',
  teacherId: '',
  capacity: '30'
}

export function GroupFormDialog({ open, onOpenChange, group }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEdit = group != null
  const [form, setForm] = useState(empty)
  const [schedule, setSchedule] = useState<ScheduleSlotInput[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => window.api.subjects.list(),
    enabled: open
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => window.api.teachers.list(),
    enabled: open
  })

  const activeSubjects = subjects.filter((s) => s.isActive)
  const activeTeachers = teachers.filter((t) => t.isActive)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (group) {
      setForm({
        name: group.name,
        subjectId: String(group.subjectId),
        teacherId: String(group.teacherId),
        capacity: String(group.capacity)
      })
      setSchedule(
        group.schedule.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      )
    } else {
      setForm(empty)
      setSchedule([])
    }
  }, [open, group])

  const mutation = useMutation({
    mutationFn: async () => {
      const capacity = Number(form.capacity)
      if (!form.name.trim() || !form.subjectId || !form.teacherId || !capacity || capacity < 1) {
        throw new Error('أكمل جميع الحقول المطلوبة')
      }
      if (isEdit && group) {
        const data: UpdateGroupRequest = {
          id: group.id,
          name: form.name.trim(),
          teacherId: Number(form.teacherId),
          capacity,
          schedule
        }
        return window.api.groups.update(data, user?.id)
      }
      const data: CreateGroupRequest = {
        name: form.name.trim(),
        subjectId: Number(form.subjectId),
        teacherId: Number(form.teacherId),
        capacity,
        schedule
      }
      return window.api.groups.create(data, user?.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      if (group) void queryClient.invalidateQueries({ queryKey: ['group', group.id] })
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
      title={isEdit ? 'تعديل مجموعة' : 'إضافة مجموعة'}
      className="max-w-xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="gname">اسم المجموعة *</Label>
          <Input
            id="gname"
            placeholder="مثال: مجموعة مسائية أ"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="subject">المادة *</Label>
            <Select
              id="subject"
              value={form.subjectId}
              disabled={isEdit}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              required
            >
              <option value="">— اختر —</option>
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {isEdit ? (
              <p className="text-xs text-muted-foreground">لا يمكن تغيير المادة بعد الإنشاء.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher">الأستاذ *</Label>
            <Select
              id="teacher"
              value={form.teacherId}
              onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
              required
            >
              <option value="">— اختر —</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">السعة *</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            required
          />
        </div>

        <ScheduleEditor slots={schedule} onChange={setSchedule} />

        {activeSubjects.length === 0 || activeTeachers.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            أضف مادة وأستاذاً نشطين قبل إنشاء مجموعة.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={
              mutation.isPending || activeSubjects.length === 0 || activeTeachers.length === 0
            }
          >
            {mutation.isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

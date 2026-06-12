import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthContext'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  studentName: string
  onEnrolled?: () => void
}

export function EnrollmentDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onEnrolled
}: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [groupId, setGroupId] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => window.api.groups.list(),
    enabled: open
  })

  const activeGroups = groups.filter((g) => g.isActive)

  const mutation = useMutation({
    mutationFn: () =>
      window.api.enrollments.create(
        {
          studentId,
          groupId: Number(groupId),
          totalAmount: Number(totalAmount)
        },
        user?.id
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments', studentId] })
      void queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      onOpenChange(false)
      setGroupId('')
      setTotalAmount('')
      setError(null)
      onEnrolled?.()
    },
    onError: (err: Error) => setError(err.message)
  })

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (!groupId) {
      setError('اختر المجموعة')
      return
    }
    const amount = Number(totalAmount)
    if (!amount || amount <= 0) {
      setError('أدخل مبلغاً صحيحاً')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="تسجيل في مجموعة"
      description={`تسجيل ${studentName} في مادة/مجموعة`}
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="field-group">
          <Label htmlFor="group">المجموعة</Label>
          <Select id="group" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            <option value="">— اختر مجموعة —</option>
            {activeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.subjectName} — {g.name} ({g.teacherName}) · {g.enrolledCount}/{g.capacity}
              </option>
            ))}
          </Select>
          {activeGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد مجموعات. أنشئ مادة ومجموعة أولاً.</p>
          ) : null}
        </div>
        <div className="field-group">
          <Label htmlFor="totalAmount">إجمالي الرسوم (د.ل)</Label>
          <Input
            id="totalAmount"
            type="number"
            min={0}
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
          <Button
            type="button"
            variant="outline"
            className="min-w-24"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            className="min-w-24 shadow-sm"
            disabled={mutation.isPending || activeGroups.length === 0}
          >
            {mutation.isPending ? 'جاري التسجيل…' : 'تسجيل'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

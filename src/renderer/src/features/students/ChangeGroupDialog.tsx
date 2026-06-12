import { FormEvent, useEffect, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { EnrollmentDto } from '../../../../shared/types/payment'

import { useAuth } from '@/app/AuthContext'

import { Dialog } from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'

import { Label } from '@/components/ui/label'

import { Select } from '@/components/ui/select'



type Props = {

  open: boolean

  onOpenChange: (open: boolean) => void

  enrollment: EnrollmentDto

  studentName: string

}



export function ChangeGroupDialog({

  open,

  onOpenChange,

  enrollment,

  studentName

}: Props): React.JSX.Element {

  const { user } = useAuth()

  const queryClient = useQueryClient()

  const [newGroupId, setNewGroupId] = useState('')

  const [error, setError] = useState<string | null>(null)



  const { data: currentGroup } = useQuery({

    queryKey: ['group', enrollment.groupId],

    queryFn: () => window.api.groups.get(enrollment.groupId),

    enabled: open

  })



  const subjectId = currentGroup?.subjectId



  const { data: groups = [] } = useQuery({

    queryKey: ['groups-by-subject', subjectId],

    queryFn: () => window.api.groups.listBySubject(subjectId!),

    enabled: open && subjectId != null

  })



  const availableGroups = groups.filter(

    (g) => g.isActive && g.id !== enrollment.groupId && g.enrolledCount < g.capacity

  )



  useEffect(() => {

    if (!open) {

      setNewGroupId('')

      setError(null)

    }

  }, [open])



  const mutation = useMutation({

    mutationFn: () =>

      window.api.enrollments.changeGroup(

        { enrollmentId: enrollment.id, newGroupId: Number(newGroupId) },

        user?.id

      ),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: ['enrollments', enrollment.studentId] })

      void queryClient.invalidateQueries({ queryKey: ['student', enrollment.studentId] })

      void queryClient.invalidateQueries({ queryKey: ['groups'] })

      onOpenChange(false)

      setNewGroupId('')

      setError(null)

    },

    onError: (err: Error) => setError(err.message)

  })



  function handleSubmit(e: FormEvent): void {

    e.preventDefault()

    if (!newGroupId) {

      setError('اختر المجموعة الجديدة')

      return

    }

    mutation.mutate()

  }



  return (

    <Dialog

      open={open}

      onOpenChange={onOpenChange}

      title="تغيير المجموعة"

      description={`نقل ${studentName} من ${enrollment.subjectName} — ${enrollment.groupName}`}

    >

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

        <p className="text-sm text-muted-foreground">

          سيتم الاحتفاظ بالرسوم والمدفوعات المسجّلة على نفس التسجيل. تظهر فقط مجموعات مادة{' '}

          <strong>{enrollment.subjectName}</strong>.

        </p>

        <div className="field-group">

          <Label htmlFor="newGroup">المجموعة الجديدة</Label>

          <Select

            id="newGroup"

            value={newGroupId}

            onChange={(e) => setNewGroupId(e.target.value)}

            required

          >

            <option value="">— اختر مجموعة —</option>

            {availableGroups.map((g) => (

              <option key={g.id} value={g.id}>

                {g.name} ({g.teacherName}) · {g.enrolledCount}/{g.capacity}

              </option>

            ))}

          </Select>

          {availableGroups.length === 0 ? (

            <p className="text-xs text-muted-foreground">

              لا توجد مجموعات أخرى متاحة في مادة {enrollment.subjectName}.

            </p>

          ) : null}

        </div>



        {error ? <p className="text-sm text-destructive">{error}</p> : null}



        <div className="flex justify-end gap-3 border-t border-border/60 pt-5">

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>

            إلغاء

          </Button>

          <Button type="submit" disabled={mutation.isPending || availableGroups.length === 0}>

            {mutation.isPending ? 'جاري النقل…' : 'تغيير المجموعة'}

          </Button>

        </div>

      </form>

    </Dialog>

  )

}


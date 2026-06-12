import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Pencil } from 'lucide-react'
import { GroupFormDialog } from './GroupFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/format'

export function GroupDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const groupId = Number(id)
  const [editOpen, setEditOpen] = useState(false)

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => window.api.groups.get(groupId),
    enabled: Number.isFinite(groupId)
  })

  const { data: students = [] } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => window.api.groups.students(groupId),
    enabled: Number.isFinite(groupId)
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">جاري التحميل…</p>
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">المجموعة غير موجودة.</p>
        <Button variant="outline" asChild>
          <Link to="/app/groups">العودة</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/groups" className="flex items-center gap-1 hover:text-foreground">
          <ArrowRight className="size-4" />
          المجموعات
        </Link>
        <span>/</span>
        <span className="text-foreground">{group.name}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{group.name}</h2>
            <Badge variant={group.isActive ? 'success' : 'secondary'}>
              {group.isActive ? 'نشط' : 'معطّل'}
            </Badge>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">المادة</dt>
              <dd className="font-medium">{group.subjectName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">الأستاذ</dt>
              <dd className="font-medium">{group.teacherName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">السعة</dt>
              <dd>
                {group.enrolledCount} مسجّل من {group.capacity}
              </dd>
            </div>
          </dl>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">جدول الأسبوع</CardTitle>
        </CardHeader>
        <CardContent>
          {group.schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد جدول محدد.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {group.schedule.map((s) => (
                <li key={s.id} className="flex justify-between rounded-lg border px-3 py-2">
                  <span className="font-medium">{s.dayOfWeek}</span>
                  <span className="text-muted-foreground">
                    {s.startTime} – {s.endTime}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الطلاب المسجّلون ({students.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              لا يوجد طلاب. سجّل طالباً من{' '}
              <Link to="/app/students" className="text-primary underline">
                صفحة الطلاب
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-right">
                  <th className="px-4 py-3 font-medium">الطالب</th>
                  <th className="px-4 py-3 font-medium">الهاتف</th>
                  <th className="px-4 py-3 font-medium">الرسوم</th>
                  <th className="px-4 py-3 font-medium">المدفوع</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.enrollmentId} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3">{formatMoney(s.totalAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(s.paidAmount)}</td>
                    <td className="px-4 py-3">
                      <Button variant="link" size="sm" asChild>
                        <Link to={`/app/students/${s.studentId}`}>ملف الطالب</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <GroupFormDialog open={editOpen} onOpenChange={setEditOpen} group={group} />
    </div>
  )
}

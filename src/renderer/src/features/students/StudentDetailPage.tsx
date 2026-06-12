import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowLeftRight, BookPlus, CreditCard, Pencil, Printer } from 'lucide-react'
import { ReceiptPreviewDialog } from '@/components/receipts/ReceiptPreviewDialog'
import { StudentFormDialog } from './StudentFormDialog'
import { EnrollmentDialog } from './EnrollmentDialog'
import { ChangeGroupDialog } from './ChangeGroupDialog'
import { PaymentDialog } from './PaymentDialog'
import type { EnrollmentDto } from '../../../../shared/types/payment'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  enrollmentStatusLabel,
  formatMoney,
  paymentMethodLabel
} from '@/lib/format'

export function StudentDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const [editOpen, setEditOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [changeGroupEnrollment, setChangeGroupEnrollment] = useState<EnrollmentDto | null>(null)
  const [payEnrollment, setPayEnrollment] = useState<EnrollmentDto | null>(null)
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => window.api.students.get(studentId),
    enabled: Number.isFinite(studentId)
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', studentId],
    queryFn: () => window.api.enrollments.listByStudent(studentId),
    enabled: Number.isFinite(studentId)
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', studentId],
    queryFn: () => window.api.payments.listByStudent(studentId),
    enabled: Number.isFinite(studentId)
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">جاري التحميل…</p>
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">الطالب غير موجود.</p>
        <Button variant="outline" asChild>
          <Link to="/app/students">العودة للقائمة</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/students" className="flex items-center gap-1 hover:text-foreground">
          <ArrowRight className="size-4" />
          الطلاب
        </Link>
        <span>/</span>
        <span className="text-foreground">{student.fullName}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-display-name">{student.fullName}</h2>
            <Badge variant={student.isActive ? 'success' : 'secondary'}>
              {student.isActive ? 'نشط' : 'معطّل'}
            </Badge>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-field-label">هاتف الطالب</dt>
              <dd className="text-field-value mt-1">{student.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-field-label">ولي الأمر</dt>
              <dd className="mt-1 text-sm">
                <span className="font-semibold text-foreground">{student.guardianName ?? '—'}</span>
                {student.guardianPhone ? (
                  <span className="text-field-secondary"> · {student.guardianPhone}</span>
                ) : null}
              </dd>
            </div>
            {student.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-field-label">ملاحظات</dt>
                <dd className="text-field-secondary mt-1 leading-relaxed">{student.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            تعديل
          </Button>
          <Button className="gap-2" onClick={() => setEnrollOpen(true)}>
            <BookPlus className="size-4" />
            تسجيل في مجموعة
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">التسجيلات ({enrollments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا توجد تسجيلات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">المادة / المجموعة</th>
                    <th className="px-4 py-3 font-medium">الإجمالي</th>
                    <th className="px-4 py-3 font-medium">المدفوع</th>
                    <th className="px-4 py-3 font-medium">المتبقي</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{e.subjectName}</span>
                        <span className="block text-xs text-muted-foreground">{e.groupName}</span>
                      </td>
                      <td className="px-4 py-3">{formatMoney(e.totalAmount)}</td>
                      <td className="px-4 py-3">{formatMoney(e.paidAmount)}</td>
                      <td className="px-4 py-3 font-medium">{formatMoney(e.remainingAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            e.status === 'active'
                              ? 'success'
                              : e.status === 'cancelled'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {enrollmentStatusLabel(e.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setChangeGroupEnrollment(e)}
                            >
                              <ArrowLeftRight className="size-4" />
                              تغيير مجموعة
                            </Button>
                          ) : null}
                          {e.status === 'active' && e.remainingAmount > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setPayEnrollment(e)}
                            >
                              <CreditCard className="size-4" />
                              دفع
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل المدفوعات ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">لا توجد مدفوعات بعد.</p>
          ) : (
            <ul className="divide-y">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {p.subjectName} — {p.groupName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.receiptNumber} · {paymentMethodLabel(p.method)} · {p.paidAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatMoney(p.amount)}</p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setReceiptId(p.id)
                        setReceiptOpen(true)
                      }}
                    >
                      <Printer className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student} />
      <EnrollmentDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        studentId={student.id}
        studentName={student.fullName}
      />
      {changeGroupEnrollment ? (
        <ChangeGroupDialog
          open={changeGroupEnrollment != null}
          onOpenChange={(open) => !open && setChangeGroupEnrollment(null)}
          enrollment={changeGroupEnrollment}
          studentName={student.fullName}
        />
      ) : null}
      <ReceiptPreviewDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        paymentId={receiptId}
      />
      {payEnrollment ? (
        <PaymentDialog
          open={payEnrollment != null}
          onOpenChange={(open) => !open && setPayEnrollment(null)}
          enrollment={payEnrollment}
          studentId={student.id}
          onPaymentComplete={(id) => {
            setReceiptId(id)
            setReceiptOpen(true)
          }}
        />
      ) : null}
    </div>
  )
}

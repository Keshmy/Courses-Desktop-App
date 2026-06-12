import { useMemo, useState } from 'react'

import { Link } from 'react-router-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { EnrollmentDto } from '../../../../shared/types/payment'

import type { StudentDto } from '../../../../shared/types/student'

import { PaymentDialog } from '@/features/students/PaymentDialog'

import { EnrollmentDialog } from '@/features/students/EnrollmentDialog'

import { Dialog } from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import { Select } from '@/components/ui/select'

import { formatMoney } from '@/lib/format'



type Props = {

  open: boolean

  onOpenChange: (open: boolean) => void

  onPaymentComplete?: (paymentId: number) => void

}



type Step = 'student' | 'enrollment' | 'pay'



export function RecordPaymentDialog({ open, onOpenChange, onPaymentComplete }: Props): React.JSX.Element {

  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('student')

  const [search, setSearch] = useState('')

  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null)

  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentDto | null>(null)

  const [enrollOpen, setEnrollOpen] = useState(false)



  const trimmed = search.trim()



  const { data: students = [] } = useQuery({

    queryKey: ['students', 'payment-picker', trimmed],

    queryFn: () =>

      trimmed.length >= 2 ? window.api.students.search(trimmed) : window.api.students.list(),

    enabled: open && step === 'student'

  })



  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery({

    queryKey: ['enrollments', selectedStudent?.id],

    queryFn: () => window.api.enrollments.listByStudent(selectedStudent!.id),

    enabled: open && selectedStudent != null && step === 'enrollment'

  })



  const payableEnrollments = useMemo(

    () =>

      enrollments.filter(

        (e) => e.status === 'active' && e.remainingAmount > 0

      ),

    [enrollments]

  )



  function reset(): void {

    setStep('student')

    setSearch('')

    setSelectedStudent(null)

    setSelectedEnrollment(null)

    setEnrollOpen(false)

  }



  function handleClose(next: boolean): void {

    if (!next) reset()

    onOpenChange(next)

  }



  function pickStudent(s: StudentDto): void {

    setSelectedStudent(s)

    setStep('enrollment')

  }



  function pickEnrollment(e: EnrollmentDto): void {

    setSelectedEnrollment(e)

    setStep('pay')

  }



  function handleEnrolled(): void {

    void refetchEnrollments()

    void queryClient.invalidateQueries({ queryKey: ['enrollments', selectedStudent?.id] })

  }



  if (step === 'pay' && selectedStudent && selectedEnrollment) {

    return (

      <PaymentDialog

        open={open}

        onOpenChange={(next) => {

          if (!next) {

            reset()

            onOpenChange(false)

          }

        }}

        enrollment={selectedEnrollment}

        studentId={selectedStudent.id}

        onPaymentComplete={onPaymentComplete}

      />

    )

  }



  return (

    <>

      <Dialog

        open={open}

        onOpenChange={handleClose}

        title={step === 'student' ? 'تسجيل دفعة — اختر الطالب' : 'تسجيل دفعة — اختر التسجيل'}

        className="max-w-lg"

      >

        {step === 'student' ? (

          <div className="space-y-4">

            <div className="space-y-2">

              <Label htmlFor="studentSearch">بحث</Label>

              <Input

                id="studentSearch"

                placeholder="اسم أو هاتف…"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

              />

            </div>

            <ul className="max-h-64 space-y-1 overflow-y-auto">

              {students

                .filter((s) => s.isActive)

                .map((s) => (

                  <li key={s.id}>

                    <button

                      type="button"

                      className="w-full rounded-lg border px-3 py-2 text-right text-sm transition-colors hover:bg-muted"

                      onClick={() => pickStudent(s)}

                    >

                      <span className="font-medium">{s.fullName}</span>

                      {s.phone ? (

                        <span className="mr-2 text-muted-foreground">{s.phone}</span>

                      ) : null}

                    </button>

                  </li>

                ))}

            </ul>

            {students.length === 0 ? (

              <p className="text-sm text-muted-foreground">لا يوجد طلاب.</p>

            ) : null}

          </div>

        ) : (

          <div className="space-y-4">

            <p className="text-sm text-muted-foreground">

              الطالب: <strong className="text-foreground">{selectedStudent?.fullName}</strong>

            </p>

            {payableEnrollments.length === 0 ? (

              <div className="space-y-3 rounded-lg border border-dashed p-4">

                <p className="text-sm text-muted-foreground">

                  لا توجد تسجيلات نشطة بمبلغ متبقٍ. سجّل الطالب في مجموعة أولاً ثم سجّل الدفعة.

                </p>

                <div className="flex flex-wrap gap-2">

                  <Button type="button" onClick={() => setEnrollOpen(true)}>

                    تسجيل في مجموعة

                  </Button>

                  {selectedStudent ? (

                    <Button type="button" variant="outline" asChild>

                      <Link to={`/app/students/${selectedStudent.id}`}>ملف الطالب</Link>

                    </Button>

                  ) : null}

                </div>

              </div>

            ) : (

              <div className="space-y-2">

                <Label>التسجيل</Label>

                <Select

                  value={selectedEnrollment ? String(selectedEnrollment.id) : ''}

                  onChange={(e) => {

                    const en = payableEnrollments.find((x) => x.id === Number(e.target.value))

                    if (en) pickEnrollment(en)

                  }}

                >

                  <option value="">— اختر —</option>

                  {payableEnrollments.map((e) => (

                    <option key={e.id} value={e.id}>

                      {e.subjectName} — {e.groupName} (متبقي {formatMoney(e.remainingAmount)})

                    </option>

                  ))}

                </Select>

              </div>

            )}

            <Button type="button" variant="outline" onClick={() => setStep('student')}>

              تغيير الطالب

            </Button>

          </div>

        )}

      </Dialog>



      {selectedStudent ? (

        <EnrollmentDialog

          open={enrollOpen}

          onOpenChange={setEnrollOpen}

          studentId={selectedStudent.id}

          studentName={selectedStudent.fullName}

          onEnrolled={handleEnrolled}

        />

      ) : null}

    </>

  )

}


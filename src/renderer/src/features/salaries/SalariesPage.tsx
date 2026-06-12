import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import type { TeacherSalaryDto, EmployeeSalaryDto } from '../../../../shared/types/finance'
import { SalaryPayDialog } from './SalaryPayDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/format'
import { TablePagination } from '@/components/ui/table-pagination'
import { useClientPagination } from '@/lib/pagination'

type Tab = 'teachers' | 'employees'

type Props = {
  embedded?: boolean
}

export function SalariesPage({ embedded = false }: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('teachers')
  const [payOpen, setPayOpen] = useState(false)

  const { data: teacherSalaries = [], isLoading: loadingTeachers } = useQuery<TeacherSalaryDto[]>({
    queryKey: ['teacher-salaries'],
    queryFn: () => window.api.finances.listTeacherSalaries()
  })

  const { data: employeeSalaries = [], isLoading: loadingEmployees } = useQuery<EmployeeSalaryDto[]>({
    queryKey: ['employee-salaries'],
    queryFn: () => window.api.finances.listEmployeeSalaries()
  })

  const isLoading = tab === 'teachers' ? loadingTeachers : loadingEmployees

  const teacherPagination = useClientPagination(teacherSalaries, 'teachers')
  const employeePagination = useClientPagination(employeeSalaries, 'employees')
  const { page, setPage, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    tab === 'teachers' ? teacherPagination : employeePagination

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setPayOpen(true)}>
            <Plus className="size-4" />
            {tab === 'teachers' ? 'دفع راتب مدرس' : 'دفع راتب موظف'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">الرواتب</h2>
            <p className="page-subtitle">دفع ومتابعة رواتب المدرسين والموظفين</p>
          </div>
          <Button className="gap-2" onClick={() => setPayOpen(true)}>
            <Plus className="size-4" />
            {tab === 'teachers' ? 'دفع راتب مدرس' : 'دفع راتب موظف'}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">
            {tab === 'teachers'
              ? `رواتب المدرسين (${totalItems})`
              : `رواتب الموظفين (${totalItems})`}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === 'teachers' ? 'default' : 'outline'}
              onClick={() => {
                setTab('teachers')
                setPage(1)
              }}
            >
              رواتب المدرسين
            </Button>
            <Button
              size="sm"
              variant={tab === 'employees' ? 'default' : 'outline'}
              onClick={() => {
                setTab('employees')
                setPage(1)
              }}
            >
              رواتب الموظفين
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : totalItems === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {tab === 'teachers'
                ? 'لا توجد رواتب مدرسين مسجلة.'
                : 'لا توجد رواتب موظفين مسجلة.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    {tab === 'teachers' ? (
                      <th className="px-4 py-3 font-medium">المدرس</th>
                    ) : (
                      <th className="px-4 py-3 font-medium">الموظف</th>
                    )}
                    <th className="px-4 py-3 font-medium">المبلغ</th>
                    <th className="px-4 py-3 font-medium">الفترة</th>
                    <th className="px-4 py-3 font-medium">ملاحظات</th>
                    <th className="px-4 py-3 font-medium">بواسطة</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {tab === 'teachers'
                    ? teacherPagination.slice.map((s) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{s.teacherName}</td>
                          <td className="px-4 py-3">{formatMoney(s.amount)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.period}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.paidByName ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(s.paidAt).toLocaleDateString('ar')}
                          </td>
                        </tr>
                      ))
                    : employeePagination.slice.map((s) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{s.employeeName}</td>
                          <td className="px-4 py-3">{formatMoney(s.amount)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.period}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.paidByName ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(s.paidAt).toLocaleDateString('ar')}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <SalaryPayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        type={tab === 'teachers' ? 'teacher' : 'employee'}
      />
    </div>
  )
}

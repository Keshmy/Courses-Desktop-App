import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import type { EmployeeDto } from '../../../../shared/types/employee'
import { useAuth } from '@/app/AuthContext'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableActions } from '@/components/ui/table-actions'
import { useClientPagination } from '@/lib/pagination'

type Filter = 'all' | 'active' | 'inactive'

type Props = {
  embedded?: boolean
}

export function EmployeesPage({ embedded = false }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeDto | null>(null)

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => window.api.employees.list()
  })

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (filter === 'active') return e.isActive
      if (filter === 'inactive') return !e.isActive
      return true
    })
  }, [employees, filter])

  const toggleMutation = useMutation({
    mutationFn: (id: number) => window.api.employees.toggleActive(id, user?.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['employees'] })
  })

  const { page, setPage, slice, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    useClientPagination(filtered, filter)

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex justify-end">
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            إضافة موظف
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">الموظفون</h2>
            <p className="page-subtitle">إدارة حسابات المستخدمين</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            إضافة موظف
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">القائمة ({totalItems})</CardTitle>
          <div className="flex gap-2">
            {(['active', 'inactive', 'all'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => {
                  setFilter(f)
                  setPage(1)
                }}
              >
                {f === 'active' ? 'نشط' : f === 'inactive' ? 'معطّل' : 'الكل'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : totalItems === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا يوجد موظفون.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">الاسم</th>
                    <th className="px-4 py-3 font-medium">اسم المستخدم</th>
                    <th className="px-4 py-3 font-medium">الصلاحية</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((emp) => (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'}>
                          {emp.role === 'admin' ? 'مدير' : 'موظف'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.isActive ? 'success' : 'secondary'}>
                          {emp.isActive ? 'نشط' : 'معطّل'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <TableActions
                          actions={[
                            {
                              label: 'تعديل',
                              icon: <Pencil className="size-3.5" />,
                              onClick: () => {
                                setEditing(emp)
                                setFormOpen(true)
                              }
                            },
                            emp.isActive
                              ? {
                                  label: 'تعطيل',
                                  icon: <UserX className="size-3.5" />,
                                  tone: 'danger',
                                  disabled: toggleMutation.isPending,
                                  onClick: () => toggleMutation.mutate(emp.id)
                                }
                              : {
                                  label: 'تفعيل',
                                  icon: <UserCheck className="size-3.5" />,
                                  tone: 'success',
                                  disabled: toggleMutation.isPending,
                                  onClick: () => toggleMutation.mutate(emp.id)
                                }
                          ]}
                        />
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

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
    </div>
  )
}

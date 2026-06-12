import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthContext'
import { Eye, Pencil, Plus, Search, UserX, UserCheck } from 'lucide-react'
import type { StudentDto } from '../../../../shared/types/student'
import { StudentFormDialog } from './StudentFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableActions } from '@/components/ui/table-actions'
import { useClientPagination } from '@/lib/pagination'

type Filter = 'all' | 'active' | 'inactive'

export function StudentsPage(): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StudentDto | null>(null)

  const trimmedSearch = search.trim()

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', trimmedSearch],
    queryFn: () =>
      trimmedSearch.length >= 2
        ? window.api.students.search(trimmedSearch)
        : window.api.students.list()
  })

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filter === 'active') return s.isActive
      if (filter === 'inactive') return !s.isActive
      return true
    })
  }, [students, filter])

  const { page, setPage, slice, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    useClientPagination(filtered, `${filter}|${trimmedSearch}`)

  const toggleMutation = useMutation({
    mutationFn: (id: number) => window.api.students.toggleActive(id, user?.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['students'] })
  })

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(student: StudentDto): void {
    setEditing(student)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">الطلاب</h2>
          <p className="page-subtitle">إدارة سجلات الطلاب والتسجيلات</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          إضافة طالب
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">قائمة الطلاب ({totalItems})</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(['active', 'inactive', 'all'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                >
                  {f === 'active' ? 'نشط' : f === 'inactive' ? 'معطّل' : 'الكل'}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="بحث بالاسم أو الهاتف…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {trimmedSearch ? 'لا توجد نتائج.' : 'لا يوجد طلاب بعد. أضف طالباً جديداً.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">الاسم</th>
                    <th className="px-4 py-3 font-medium">الهاتف</th>
                    <th className="px-4 py-3 font-medium">ولي الأمر</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((student) => (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{student.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{student.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.guardianName ?? '—'}
                        {student.guardianPhone ? (
                          <span className="block text-xs">{student.guardianPhone}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={student.isActive ? 'success' : 'secondary'}>
                          {student.isActive ? 'نشط' : 'معطّل'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <TableActions
                          actions={[
                            {
                              label: 'عرض',
                              icon: <Eye className="size-3.5" />,
                              href: `/app/students/${student.id}`,
                              tone: 'primary'
                            },
                            {
                              label: 'تعديل',
                              icon: <Pencil className="size-3.5" />,
                              onClick: () => openEdit(student)
                            },
                            student.isActive
                              ? {
                                  label: 'تعطيل',
                                  icon: <UserX className="size-3.5" />,
                                  tone: 'danger',
                                  disabled: toggleMutation.isPending,
                                  onClick: () => toggleMutation.mutate(student.id)
                                }
                              : {
                                  label: 'تفعيل',
                                  icon: <UserCheck className="size-3.5" />,
                                  tone: 'success',
                                  disabled: toggleMutation.isPending,
                                  onClick: () => toggleMutation.mutate(student.id)
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

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />
    </div>
  )
}

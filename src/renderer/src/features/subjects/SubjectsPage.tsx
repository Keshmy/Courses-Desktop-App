import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react'
import type { SubjectDto } from '../../../../shared/types/subject'
import { useAuth } from '@/app/AuthContext'
import { SubjectFormDialog } from './SubjectFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableActions } from '@/components/ui/table-actions'
import { useClientPagination } from '@/lib/pagination'
import { formatMoney } from '@/lib/format'

type Filter = 'all' | 'active' | 'inactive'

export function SubjectsPage(): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SubjectDto | null>(null)

  const trimmedSearch = search.trim().toLowerCase()

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => window.api.subjects.list()
  })

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      if (filter === 'active' && !s.isActive) return false
      if (filter === 'inactive' && s.isActive) return false
      if (!trimmedSearch) return true
      const haystack = [s.name, s.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(trimmedSearch)
    })
  }, [subjects, filter, trimmedSearch])

  const { page, setPage, slice, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    useClientPagination(filtered, `${filter}|${trimmedSearch}`)

  const toggleMutation = useMutation({
    mutationFn: (id: number) => window.api.subjects.toggleActive(id, user?.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subjects'] })
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">المواد</h2>
          <p className="page-subtitle">إدارة المواد الدراسية والأسعار الافتراضية</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          إضافة مادة
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">القائمة ({totalItems})</CardTitle>
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
              placeholder="بحث باسم المادة أو الوصف…"
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
              {trimmedSearch ? 'لا توجد نتائج.' : 'لا توجد مواد. أضف مادة أولاً.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-right">
                  <th className="px-4 py-3 font-medium">المادة</th>
                  <th className="px-4 py-3 font-medium">السعر الافتراضي</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-medium">{s.name}</span>
                      {s.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{s.description}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatMoney(s.defaultPrice)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.isActive ? 'success' : 'secondary'}>
                        {s.isActive ? 'نشط' : 'معطّل'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TableActions
                        actions={[
                          {
                            label: 'تعديل',
                            icon: <Pencil className="size-3.5" />,
                            onClick: () => {
                              setEditing(s)
                              setFormOpen(true)
                            }
                          },
                          s.isActive
                            ? {
                                label: 'تعطيل',
                                icon: <UserX className="size-3.5" />,
                                tone: 'danger',
                                disabled: toggleMutation.isPending,
                                onClick: () => toggleMutation.mutate(s.id)
                              }
                            : {
                                label: 'تفعيل',
                                icon: <UserCheck className="size-3.5" />,
                                tone: 'success',
                                disabled: toggleMutation.isPending,
                                onClick: () => toggleMutation.mutate(s.id)
                              }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <SubjectFormDialog open={formOpen} onOpenChange={setFormOpen} subject={editing} />
    </div>
  )
}

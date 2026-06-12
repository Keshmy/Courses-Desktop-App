import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import type { GroupDto, GroupListItemDto } from '../../../../shared/types/group'
import { useAuth } from '@/app/AuthContext'
import { GroupFormDialog } from './GroupFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { TableActions } from '@/components/ui/table-actions'
import { TablePagination } from '@/components/ui/table-pagination'
import { useClientPagination } from '@/lib/pagination'

type Filter = 'all' | 'active' | 'inactive'

export function GroupsPage(): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('active')
  const [subjectFilter, setSubjectFilter] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GroupDto | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => window.api.subjects.list()
  })

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups', subjectFilter],
    queryFn: () =>
      subjectFilter
        ? window.api.groups.listBySubject(Number(subjectFilter))
        : window.api.groups.list()
  })

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (filter === 'active') return g.isActive
      if (filter === 'inactive') return !g.isActive
      return true
    })
  }, [groups, filter])

  const { page, setPage, slice, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    useClientPagination(filtered, `${filter}|${subjectFilter}`)

  const toggleMutation = useMutation({
    mutationFn: (id: number) => window.api.groups.toggleActive(id, user?.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] })
  })

  async function openEdit(item: GroupListItemDto): Promise<void> {
    setLoadingEdit(true)
    try {
      const full = await window.api.groups.get(item.id)
      if (full) {
        setEditing(full)
        setFormOpen(true)
      }
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">المجموعات</h2>
          <p className="text-sm text-muted-foreground">ربط مادة + أستاذ + جدول أسبوعي + سعة</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          إضافة مجموعة
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">القائمة ({totalItems})</CardTitle>
            <div className="flex flex-wrap gap-2">
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
          </div>
          <div className="max-w-xs space-y-1">
            <label className="text-xs text-muted-foreground">تصفية حسب المادة</label>
            <Select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">كل المواد</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : totalItems === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              لا توجد مجموعات. أضف مادة وأستاذاً ثم أنشئ مجموعة.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-right">
                  <th className="px-4 py-3 font-medium">المجموعة</th>
                  <th className="px-4 py-3 font-medium">المادة</th>
                  <th className="px-4 py-3 font-medium">الأستاذ</th>
                  <th className="px-4 py-3 font-medium">الإشغال</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((g) => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3">{g.subjectName}</td>
                    <td className="px-4 py-3">{g.teacherName}</td>
                    <td className="px-4 py-3">
                      {g.enrolledCount} / {g.capacity}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={g.isActive ? 'success' : 'secondary'}>
                        {g.isActive ? 'نشط' : 'معطّل'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TableActions
                        actions={[
                          {
                            label: 'عرض',
                            icon: <Eye className="size-3.5" />,
                            href: `/app/groups/${g.id}`,
                            tone: 'primary'
                          },
                          {
                            label: 'تعديل',
                            icon: <Pencil className="size-3.5" />,
                            disabled: loadingEdit,
                            onClick: () => void openEdit(g)
                          },
                          g.isActive
                            ? {
                                label: 'تعطيل',
                                icon: <UserX className="size-3.5" />,
                                tone: 'danger',
                                disabled: toggleMutation.isPending,
                                onClick: () => toggleMutation.mutate(g.id)
                              }
                            : {
                                label: 'تفعيل',
                                icon: <UserCheck className="size-3.5" />,
                                tone: 'success',
                                disabled: toggleMutation.isPending,
                                onClick: () => toggleMutation.mutate(g.id)
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

      <GroupFormDialog open={formOpen} onOpenChange={setFormOpen} group={editing} />
    </div>
  )
}

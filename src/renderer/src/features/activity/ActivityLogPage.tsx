import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { usePageSize } from '@/lib/pagination'
import { activityActionLabel } from '@/lib/activity-labels'

type RoleFilter = 'all' | 'employee' | 'admin'

export function ActivityLogPage(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('employee')
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize, pageSizeOptions } = usePageSize()

  const trimmed = search.trim()
  const filterKey = `${trimmed}|${roleFilter}|${employeeId}|${dateFrom}|${dateTo}|${pageSize}`

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => window.api.employees.list()
  })

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', page, filterKey],
    queryFn: () =>
      window.api.activity.list({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        query: trimmed || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        employeeId: employeeId ? Number(employeeId) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handleDateFromChange(value: string): void {
    setDateFrom(value)
    if (value && dateTo && dateTo < value) setDateTo(value)
    setPage(1)
  }

  function handleDateToChange(value: string): void {
    if (value && dateFrom && value < dateFrom) return
    setDateTo(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">سجل حركات الموظفين</h2>
        <p className="page-subtitle">متابعة كل العمليات التي ينفّذها الموظفون والمديرون في النظام</p>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <CardTitle className="text-base">تصفية السجل</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="field-group min-w-0 flex-1 lg:min-w-[12rem]">
              <Label htmlFor="activitySearch" className="text-xs text-muted-foreground">
                بحث
              </Label>
              <div className="relative">
                <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="activitySearch"
                  className="pr-9"
                  placeholder="ملخص أو اسم موظف…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>
            <div className="field-group w-full lg:w-40">
              <Label htmlFor="roleFilter" className="text-xs text-muted-foreground">
                نوع المستخدم
              </Label>
              <Select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as RoleFilter)
                  setPage(1)
                }}
              >
                <option value="employee">موظفون فقط</option>
                <option value="admin">مديرون فقط</option>
                <option value="all">الكل</option>
              </Select>
            </div>
            <div className="field-group w-full lg:w-48">
              <Label htmlFor="employeeFilter" className="text-xs text-muted-foreground">
                الموظف
              </Label>
              <Select
                id="employeeFilter"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">الكل</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field-group w-full lg:w-44">
              <Label htmlFor="logDateFrom" className="text-xs text-muted-foreground">
                من تاريخ
              </Label>
              <Input
                id="logDateFrom"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>
            <div className="field-group w-full lg:w-44">
              <Label htmlFor="logDateTo" className="text-xs text-muted-foreground">
                إلى تاريخ
              </Label>
              <Input
                id="logDateTo"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('')
                setRoleFilter('employee')
                setEmployeeId('')
                setDateFrom('')
                setDateTo('')
                setPage(1)
              }}
            >
              مسح الفلاتر
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد حركات مسجّلة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium">الموظف</th>
                    <th className="px-4 py-3 font-medium">العملية</th>
                    <th className="px-4 py-3 font-medium">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {log.createdAt}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.employeeName}</span>
                        <Badge
                          variant={log.employeeRole === 'admin' ? 'default' : 'secondary'}
                          className="mr-2"
                        >
                          {log.employeeRole === 'admin' ? 'مدير' : 'موظف'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{activityActionLabel(log.action)}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}

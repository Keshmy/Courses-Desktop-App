import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/AuthContext'
import { Plus, Trash2 } from 'lucide-react'
import type { FinanceEntryDto } from '../../../../shared/types/finance'
import { FinanceEntryForm } from './FinanceEntryForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/format'
import { TablePagination } from '@/components/ui/table-pagination'
import { useClientPagination } from '@/lib/pagination'

type TypeFilter = 'all' | 'income' | 'expense'

const categoryLabels: Record<string, string> = {
  student_payment: 'دفعة طالب',
  salary_teacher: 'راتب مدرس',
  salary_employee: 'راتب موظف',
  rent: 'إيجار',
  supplies: 'مستلزمات',
  other: 'أخرى'
}

function categoryLabel(cat: string): string {
  return categoryLabels[cat] ?? cat
}

type Props = {
  embedded?: boolean
}

export function FinancesPage({ embedded = false }: Props): React.JSX.Element {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [formOpen, setFormOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.finances.deleteEntry(id, user?.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-entries'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  function handleDelete(entry: FinanceEntryDto): void {
    if (entry.referenceType !== 'manual') return
    if (!window.confirm('حذف هذا القيد اليدوي؟')) return
    deleteMutation.mutate(entry.id)
  }

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => window.api.finances.getSummary()
  })

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['finance-entries', typeFilter],
    queryFn: () =>
      window.api.finances.listEntries(
        typeFilter === 'all' ? undefined : { type: typeFilter }
      )
  })

  const { page, setPage, slice, totalPages, totalItems, pageSize, setPageSize, pageSizeOptions } =
    useClientPagination(entries, typeFilter)

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="size-4" />
            إضافة قيد
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">المالية</h2>
            <p className="page-subtitle">إدارة الإيرادات والمصروفات</p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="size-4" />
            إضافة قيد
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {summaryLoading ? '…' : formatMoney(summary?.totalIncome ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {summaryLoading ? '…' : formatMoney(summary?.totalExpenses ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الرصيد</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {summaryLoading ? '…' : formatMoney(summary?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              دخل الشهر / مصاريف الشهر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {summaryLoading ? (
                '…'
              ) : (
                <>
                  <span className="text-green-600">
                    {formatMoney(summary?.monthlyIncome ?? 0)}
                  </span>
                  {' / '}
                  <span className="text-red-600">
                    {formatMoney(summary?.monthlyExpenses ?? 0)}
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entries table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">القيود المالية ({totalItems})</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={typeFilter === f ? 'default' : 'outline'}
                  onClick={() => {
                    setTypeFilter(f)
                    setPage(1)
                  }}
                >
                  {f === 'all' ? 'الكل' : f === 'income' ? 'إيرادات' : 'مصروفات'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {entriesLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد قيود مالية بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">النوع</th>
                    <th className="px-4 py-3 font-medium">التصنيف</th>
                    <th className="px-4 py-3 font-medium">المبلغ</th>
                    <th className="px-4 py-3 font-medium">الوصف</th>
                    <th className="px-4 py-3 font-medium">بواسطة</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {slice.map((entry: FinanceEntryDto) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Badge variant={entry.type === 'income' ? 'success' : 'destructive'}>
                          {entry.type === 'income' ? 'إيراد' : 'مصروف'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{categoryLabel(entry.category)}</td>
                      <td className="px-4 py-3 font-medium">{formatMoney(entry.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.createdByName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.createdAt}</td>
                      <td className="px-4 py-3">
                        {entry.referenceType === 'manual' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">تلقائي</span>
                        )}
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

      <FinanceEntryForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}

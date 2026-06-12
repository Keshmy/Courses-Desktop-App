import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Plus, Printer, Search } from 'lucide-react'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { ReceiptPreviewDialog } from '@/components/receipts/ReceiptPreviewDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { usePageSize } from '@/lib/pagination'
import { formatMoney, paymentMethodLabel } from '@/lib/format'

function methodVariant(method: string): 'success' | 'secondary' | 'outline' {
  if (method === 'cash') return 'success'
  if (method === 'card') return 'outline'
  return 'secondary'
}

export function PaymentsPage(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize, pageSizeOptions } = usePageSize()
  const [recordOpen, setRecordOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const trimmed = search.trim()
  const filterKey = `${trimmed}|${dateFrom}|${dateTo}|${pageSize}`

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payments-all', page, filterKey],
    queryFn: () =>
      window.api.payments.listAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        query: trimmed || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
  })

  const payments = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const totalAmount = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  function handleSearchChange(value: string): void {
    setSearch(value)
    setPage(1)
  }

  function handleDateFromChange(value: string): void {
    setDateFrom(value)
    if (value && dateTo && dateTo < value) {
      setDateTo(value)
    }
    setPage(1)
  }

  function handleDateToChange(value: string): void {
    if (value && dateFrom && value < dateFrom) return
    setDateTo(value)
    setPage(1)
  }

  function openReceipt(paymentId: number): void {
    setReceiptId(paymentId)
    setReceiptOpen(true)
  }

  const hasFilters = Boolean(trimmed || dateFrom || dateTo)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">المدفوعات</h2>
          <p className="page-subtitle">
            سجل كل الدفعات، تسجيل دفعات جديدة، وطباعة إيصالات A5
          </p>
        </div>
        <Button className="gap-2" onClick={() => setRecordOpen(true)}>
          <Plus className="size-4" />
          تسجيل دفعة
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              عدد الدفعات {hasFilters ? '(نتائج البحث)' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المبالغ (الصفحة الحالية)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <CardTitle className="text-base">سجل المدفوعات</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="field-group min-w-0 flex-1">
              <Label htmlFor="paymentSearch" className="text-xs text-muted-foreground">
                بحث
              </Label>
              <div className="relative">
                <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="paymentSearch"
                  className="pr-9"
                  placeholder="اسم الطالب أو رقم الهاتف…"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            <div className="field-group w-full lg:w-44">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                من تاريخ
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>
            <div className="field-group w-full lg:w-44">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                إلى تاريخ
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : payments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {hasFilters ? 'لا توجد نتائج.' : 'لا توجد مدفوعات بعد.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">الإيصال</th>
                    <th className="px-4 py-3 font-medium">الطالب</th>
                    <th className="px-4 py-3 font-medium">المادة / المجموعة</th>
                    <th className="px-4 py-3 font-medium">المبلغ</th>
                    <th className="px-4 py-3 font-medium">الطريقة</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium">بواسطة</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.studentName}</span>
                        {p.studentPhone ? (
                          <span className="block text-xs text-muted-foreground">{p.studentPhone}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span>{p.subjectName}</span>
                        <span className="block text-xs text-muted-foreground">{p.groupName}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={methodVariant(p.method)}>
                          {paymentMethodLabel(p.method)}
                        </Badge>
                        {p.method === 'mixed' ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {formatMoney(p.cashAmount)} نقد · {formatMoney(p.cardAmount)} بطاقة
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.paidAt}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.paidByName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => openReceipt(p.id)}
                          >
                            <Printer className="size-4" />
                            إيصال
                          </Button>
                        </div>
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
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2 py-4 text-sm text-muted-foreground">
          <CreditCard className="size-4" />
          <span>لتسجيل طالب في مجموعة جديدة، انتقل إلى</span>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/app/students">الطلاب</Link>
          </Button>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={(open) => {
          setRecordOpen(open)
          if (!open) void refetch()
        }}
        onPaymentComplete={(id) => {
          setReceiptId(id)
          setReceiptOpen(true)
        }}
      />

      <ReceiptPreviewDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        paymentId={receiptId}
      />
    </div>
  )
}

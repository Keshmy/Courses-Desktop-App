import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CreditCard, Plus, Printer, Search, Wallet } from 'lucide-react'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { ReceiptPreviewDialog } from '@/components/receipts/ReceiptPreviewDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { usePageSize } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { formatMoney, paymentMethodLabel } from '@/lib/format'

type TabKey = 'log' | 'outstanding'

function methodVariant(method: string): 'success' | 'secondary' | 'outline' {
  if (method === 'cash') return 'success'
  if (method === 'card') return 'outline'
  return 'secondary'
}

export function PaymentsPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('log')
  const [recordOpen, setRecordOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  function openReceipt(paymentId: number): void {
    setReceiptId(paymentId)
    setReceiptOpen(true)
  }

  function handleRecordOpenChange(open: boolean): void {
    setRecordOpen(open)
    if (!open) {
      void queryClient.invalidateQueries({ queryKey: ['payments-all'] })
      void queryClient.invalidateQueries({ queryKey: ['payments-outstanding'] })
    }
  }

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

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-2 py-3.5 text-sm text-muted-foreground">
          <CreditCard className="size-4" />
          <span>لتسجيل طالب في مجموعة جديدة، انتقل إلى</span>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link to="/app/students">الطلاب</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex w-fit gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'log'
              ? 'bg-white text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Wallet className="size-4" />
          سجل المدفوعات
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outstanding')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'outstanding'
              ? 'bg-white text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <AlertCircle className="size-4" />
          طلاب عليهم مستحقات
        </button>
      </div>

      {activeTab === 'log' ? (
        <PaymentsLogTab onPrintReceipt={openReceipt} />
      ) : (
        <OutstandingTab />
      )}

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={handleRecordOpenChange}
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

function PaymentsLogTab({
  onPrintReceipt
}: {
  onPrintReceipt: (paymentId: number) => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize, pageSizeOptions } = usePageSize()

  const trimmed = search.trim()
  const filterKey = `${trimmed}|${dateFrom}|${dateTo}|${pageSize}`

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const { data, isLoading } = useQuery({
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

  const hasFilters = Boolean(trimmed || dateFrom || dateTo)

  return (
    <div className="space-y-6">
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
                            onClick={() => onPrintReceipt(p.id)}
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
    </div>
  )
}

function OutstandingTab(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize, pageSizeOptions } = usePageSize()

  const trimmed = search.trim()
  const filterKey = `${trimmed}|${pageSize}`

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const { data, isLoading } = useQuery({
    queryKey: ['payments-outstanding', page, filterKey],
    queryFn: () =>
      window.api.payments.listOutstanding({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        query: trimmed || undefined
      })
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalRemaining = data?.totalRemaining ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = Boolean(trimmed)

  function handleSearchChange(value: string): void {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              عدد التسجيلات غير المسددة {hasFilters ? '(نتائج البحث)' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المبالغ المتبقية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatMoney(totalRemaining)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <CardTitle className="text-base">طلاب عليهم مستحقات</CardTitle>
          <div className="field-group max-w-md">
            <Label htmlFor="outstandingSearch" className="text-xs text-muted-foreground">
              بحث
            </Label>
            <div className="relative">
              <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="outstandingSearch"
                className="pr-9"
                placeholder="اسم الطالب أو رقم الهاتف…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جاري التحميل…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {hasFilters ? 'لا توجد نتائج.' : 'لا يوجد طلاب عليهم مستحقات. كل المدفوعات مكتملة.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-4 py-3 font-medium">الطالب</th>
                    <th className="px-4 py-3 font-medium">المادة / المجموعة</th>
                    <th className="px-4 py-3 font-medium">الإجمالي</th>
                    <th className="px-4 py-3 font-medium">المدفوع</th>
                    <th className="px-4 py-3 font-medium">المتبقي</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.enrollmentId}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{row.studentName}</span>
                        {row.studentPhone ? (
                          <span className="block text-xs text-muted-foreground">
                            {row.studentPhone}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span>{row.subjectName}</span>
                        <span className="block text-xs text-muted-foreground">{row.groupName}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMoney(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMoney(row.paidAmount)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-destructive">
                        {formatMoney(row.remainingAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="gap-1" asChild>
                          <Link to={`/app/students/${row.studentId}`}>
                            <Wallet className="size-4" />
                            تسجيل دفعة
                          </Link>
                        </Button>
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
    </div>
  )
}

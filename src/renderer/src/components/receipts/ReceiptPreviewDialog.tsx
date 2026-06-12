import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { ReceiptA5 } from './ReceiptA5'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: number | null
}

export function ReceiptPreviewDialog({ open, onOpenChange, paymentId }: Props): React.JSX.Element {
  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['receipt', paymentId],
    queryFn: () => window.api.payments.getReceipt(paymentId!),
    enabled: open && paymentId != null
  })

  function handlePrint(): void {
    window.print()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="معاينة الإيصال"
      description="حجم A5 — جاهز للطباعة"
      className="max-w-md"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : isError || !receipt ? (
        <p className="text-sm text-destructive">تعذّر تحميل الإيصال.</p>
      ) : (
        <div className="space-y-4">
          <div className="no-print flex justify-end">
            <Button className="gap-2" onClick={handlePrint}>
              <Printer className="size-4" />
              طباعة A5
            </Button>
          </div>
          <div className="rounded-lg border bg-white p-2 shadow-inner">
            <ReceiptA5 data={receipt} />
          </div>
        </div>
      )}
    </Dialog>
  )
}

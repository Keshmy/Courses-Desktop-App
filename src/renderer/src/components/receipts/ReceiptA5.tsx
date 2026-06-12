import type { ReceiptData } from '../../../../shared/types/payment'
import { formatMoney, paymentMethodLabel } from '@/lib/format'

type Props = {
  data: ReceiptData
}

/**
 * A5 receipt layout. Wrapped in `.receipt-print` for @media print rules in main.css.
 */
export function ReceiptA5({ data }: Props): React.JSX.Element {
  return (
    <div className="receipt-print text-black">
      <header className="mb-6 border-b border-black/20 pb-4 text-center">
        {data.centerLogoDataUrl ? (
          <img
            src={data.centerLogoDataUrl}
            alt=""
            className="mx-auto mb-2 h-16 max-w-[120px] object-contain"
          />
        ) : null}
        <h1 className="text-lg font-bold">{data.centerName}</h1>
        <p className="mt-1 text-sm">إيصال قبض</p>
        <p className="mt-2 font-mono text-xs">{data.receiptNumber}</p>
      </header>

      <section className="space-y-3 text-sm">
        <Row label="التاريخ" value={data.paidAt} />
        <Row label="الطالب" value={data.studentName} />
        <Row label="المادة" value={data.subjectName} />
        <Row label="المجموعة" value={data.groupName} />
        <Row label="طريقة الدفع" value={paymentMethodLabel(data.method)} />
        {data.method === 'mixed' ? (
          <>
            <Row label="نقداً" value={formatMoney(data.cashAmount)} />
            <Row label="بطاقة" value={formatMoney(data.cardAmount)} />
          </>
        ) : null}
        <Row label="المبلغ المدفوع" value={formatMoney(data.amount)} bold />
        <Row label="إجمالي الرسوم" value={formatMoney(data.totalAmount)} />
        <Row label="المدفوع سابقاً" value={formatMoney(data.paidSoFar - data.amount)} />
        <Row label="المدفوع حتى الآن" value={formatMoney(data.paidSoFar)} />
        <Row label="المتبقي" value={formatMoney(data.remaining)} bold />
        <Row label="استلم من" value={data.paidByName} />
      </section>

      <footer className="mt-10 border-t border-black/20 pt-4 text-center text-xs text-black/60">
        شكراً لثقتكم — {data.centerName}
      </footer>
    </div>
  )
}

function Row({
  label,
  value,
  bold
}: {
  label: string
  value: string
  bold?: boolean
}): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-black/10 py-1.5">
      <span className="text-black/70">{label}</span>
      <span className={bold ? 'font-bold' : ''}>{value}</span>
    </div>
  )
}

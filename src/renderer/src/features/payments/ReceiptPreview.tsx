import type { ReceiptData } from '../../../../shared/types/payment'
import { formatMoney, paymentMethodLabel } from '@/lib/format'

type Props = {
  data: ReceiptData
}

export function ReceiptPreview({ data }: Props): React.JSX.Element {
  return (
    <div className="receipt-print mx-auto w-full max-w-[148mm] border border-black p-6 font-sans text-black" dir="rtl">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-xl font-bold">{data.centerName}</h1>
        <div className="text-left text-sm">
          <span className="font-medium">رقم الإيصال:</span>{' '}
          <span className="font-bold">{data.receiptNumber}</span>
        </div>
      </div>

      <hr className="border-black" />

      {/* Info Grid */}
      <div className="my-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="font-medium">الطالب:</span> {data.studentName}
        </div>
        <div>
          <span className="font-medium">المادة:</span> {data.subjectName}
        </div>
        <div>
          <span className="font-medium">المجموعة:</span> {data.groupName}
        </div>
        <div>
          <span className="font-medium">طريقة الدفع:</span> {paymentMethodLabel(data.method)}
        </div>
        {data.method === 'mixed' ? (
          <>
            <div>
              <span className="font-medium">نقداً:</span> {formatMoney(data.cashAmount)}
            </div>
            <div>
              <span className="font-medium">بطاقة:</span> {formatMoney(data.cardAmount)}
            </div>
          </>
        ) : null}
      </div>

      <hr className="border-black" />

      {/* Payment Summary */}
      <div className="my-4 space-y-2 text-sm">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>مبلغ الدفعة</span>
          <span>{formatMoney(data.amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">إجمالي الاشتراك</span>
          <span>{formatMoney(data.totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">المدفوع حتى الآن</span>
          <span>{formatMoney(data.paidSoFar)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">المتبقي</span>
          <span>{formatMoney(data.remaining)}</span>
        </div>
      </div>

      <hr className="border-black" />

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">الموظف:</span> {data.paidByName}
        </div>
        <div>
          <span className="font-medium">التاريخ:</span>{' '}
          {new Date(data.paidAt).toLocaleDateString('ar-LY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  )
}

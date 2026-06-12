export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('ar')} د.ل`
}

export function enrollmentStatusLabel(status: 'active' | 'completed' | 'cancelled'): string {
  const map = { active: 'نشط', completed: 'مكتمل', cancelled: 'ملغى' } as const
  return map[status]
}

export function paymentMethodLabel(method: 'cash' | 'card' | 'mixed'): string {
  const map = { cash: 'نقداً', card: 'بطاقة', mixed: 'مختلط' } as const
  return map[method]
}

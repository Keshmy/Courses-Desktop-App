/**
 * Enrollment DTOs sent over IPC.
 */
export type EnrollmentDto = {
  id: number
  studentId: number
  studentName: string
  groupId: number
  groupName: string
  subjectName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'active' | 'completed' | 'cancelled'
  enrolledAt: string
}

export type CreateEnrollmentRequest = {
  studentId: number
  groupId: number
  totalAmount: number
}

export type ChangeEnrollmentGroupRequest = {
  enrollmentId: number
  newGroupId: number
}

/**
 * Payment DTOs sent over IPC.
 */
export type PaymentListFilters = {
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
  /** Student name or phone */
  query?: string
}

export type PaymentListResult = {
  items: PaymentDto[]
  total: number
}

/**
 * Filters for listing students with outstanding (unpaid) balances.
 */
export type OutstandingListFilters = {
  limit?: number
  offset?: number
  /** Student name or phone */
  query?: string
}

/**
 * An active enrollment that still has a remaining balance to be paid.
 */
export type OutstandingDto = {
  enrollmentId: number
  studentId: number
  studentName: string
  studentPhone: string | null
  subjectName: string
  groupName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  enrolledAt: string
}

export type OutstandingListResult = {
  items: OutstandingDto[]
  total: number
  /** Sum of all remaining balances across every matching enrollment. */
  totalRemaining: number
}

export type PaymentDto = {
  id: number
  enrollmentId: number
  studentName: string
  studentPhone: string | null
  subjectName: string
  groupName: string
  amount: number
  method: 'cash' | 'card' | 'mixed'
  cashAmount: number
  cardAmount: number
  notes: string | null
  receiptNumber: string
  paidByName: string | null
  paidAt: string
}

export type CreatePaymentRequest = {
  enrollmentId: number
  amount: number
  method: 'cash' | 'card' | 'mixed'
  cashAmount: number
  cardAmount: number
  notes?: string
  paidBy: number
}

export type ReceiptData = {
  receiptNumber: string
  centerName: string
  centerLogoPath: string | null
  centerLogoDataUrl: string | null
  studentName: string
  subjectName: string
  groupName: string
  amount: number
  method: 'cash' | 'card' | 'mixed'
  cashAmount: number
  cardAmount: number
  paidByName: string
  paidAt: string
  totalAmount: number
  paidSoFar: number
  remaining: number
}

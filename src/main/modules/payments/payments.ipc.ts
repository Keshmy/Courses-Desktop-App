import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  PaymentDto,
  PaymentListFilters,
  PaymentListResult,
  OutstandingDto,
  OutstandingListFilters,
  OutstandingListResult,
  CreatePaymentRequest,
  ReceiptData
} from '../../../shared/types/payment'
import { audit } from '../../lib/audit'
import { getLogoDataUrlOrDefault } from '../../lib/logo'
import * as repo from './payment.repository'

/**
 * Maps a joined payment row to PaymentDto.
 */
function toDto(row: repo.PaymentWithDetails): PaymentDto {
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    studentName: row.studentName,
    studentPhone: row.studentPhone,
    subjectName: row.subjectName,
    groupName: row.groupName,
    amount: row.amount,
    method: row.method as PaymentDto['method'],
    cashAmount: row.cashAmount,
    cardAmount: row.cardAmount,
    notes: row.notes,
    receiptNumber: row.receiptNumber,
    paidByName: row.paidByName,
    paidAt: row.paidAt
  }
}

/**
 * Maps a receipt row to the shared ReceiptData type.
 */
function toReceiptData(row: repo.ReceiptRow): ReceiptData {
  return {
    receiptNumber: row.receiptNumber,
    centerName: row.centerName,
    centerLogoPath: row.centerLogoPath,
    centerLogoDataUrl: getLogoDataUrlOrDefault(row.centerLogoPath),
    studentName: row.studentName,
    subjectName: row.subjectName,
    groupName: row.groupName,
    amount: row.amount,
    method: row.method as ReceiptData['method'],
    cashAmount: row.cashAmount,
    cardAmount: row.cardAmount,
    paidByName: row.paidByName,
    paidAt: row.paidAt,
    totalAmount: row.totalAmount,
    paidSoFar: row.paidSoFar,
    remaining: row.remaining
  }
}

/**
 * Registers payment-related `ipcMain.handle` listeners.
 */
export function registerPaymentsIpcHandlers(): void {
  // ── Create payment ────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_CREATE,
    async (_event, data: CreatePaymentRequest): Promise<PaymentDto> => {
      const payment = await repo.createPayment(data)
      const rows = await repo.listByEnrollment(payment.enrollmentId)
      const full = rows.find((r) => r.id === payment.id)
      const dto = full
        ? toDto(full)
        : toDto({
            ...payment,
            studentName: '',
            studentPhone: null,
            subjectName: '',
            groupName: '',
            paidByName: null
          })

      await audit(
        data.paidBy,
        'payment.create',
        'payment',
        `تسجيل دفعة ${dto.amount} د.ل — ${dto.studentName}`,
        dto.id,
        { enrollmentId: dto.enrollmentId, receiptNumber: dto.receiptNumber, method: dto.method }
      )

      return dto
    }
  )

  // ── List payments by enrollment ───────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_LIST_BY_ENROLLMENT,
    async (_event, enrollmentId: number): Promise<PaymentDto[]> => {
      const rows = await repo.listByEnrollment(enrollmentId)
      return rows.map(toDto)
    }
  )

  // ── List payments by student ──────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_LIST_BY_STUDENT,
    async (_event, studentId: number): Promise<PaymentDto[]> => {
      const rows = await repo.listByStudent(studentId)
      return rows.map(toDto)
    }
  )

  // ── List all payments (paginated) ─────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_LIST_ALL,
    async (_event, filters?: PaymentListFilters): Promise<PaymentListResult> => {
      const { items, total } = await repo.listAll(filters)
      return { items: items.map(toDto), total }
    }
  )

  // ── List students with outstanding balances ───────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_LIST_OUTSTANDING,
    async (_event, filters?: OutstandingListFilters): Promise<OutstandingListResult> => {
      const { items, total, totalRemaining } = await repo.listOutstanding(filters)
      const dtos: OutstandingDto[] = items.map((row) => ({
        enrollmentId: row.enrollmentId,
        studentId: row.studentId,
        studentName: row.studentName,
        studentPhone: row.studentPhone,
        subjectName: row.subjectName,
        groupName: row.groupName,
        totalAmount: row.totalAmount,
        paidAmount: row.paidAmount,
        remainingAmount: row.remainingAmount,
        enrolledAt: row.enrolledAt
      }))
      return { items: dtos, total, totalRemaining }
    }
  )

  // ── Get receipt data ──────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.PAYMENTS_GET_RECEIPT,
    async (_event, paymentId: number): Promise<ReceiptData | null> => {
      const row = await repo.getReceipt(paymentId)
      return row ? toReceiptData(row) : null
    }
  )
}

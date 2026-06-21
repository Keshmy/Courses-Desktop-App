import { eq, desc, sql, like, and, or, gte, lte, count, type SQL } from 'drizzle-orm'
import { getDb } from '../../db/db'
import {
  paymentsTable,
  enrollmentsTable,
  studentsTable,
  groupsTable,
  subjectsTable,
  settingsTable,
  employeesTable,
  financeEntriesTable
} from '../../db/models/schema'

export type PaymentRow = typeof paymentsTable.$inferSelect
export type NewPayment = typeof paymentsTable.$inferInsert

export type PaymentWithDetails = PaymentRow & {
  studentName: string
  studentPhone: string | null
  subjectName: string
  groupName: string
  paidByName: string | null
}

export type PaymentListFilters = {
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
  query?: string
}

function buildPaymentConditions(filters?: PaymentListFilters): SQL | undefined {
  const conditions: SQL[] = []
  const q = filters?.query?.trim()
  if (q) {
    const pattern = `%${q}%`
    const nameOrPhone = or(like(studentsTable.fullName, pattern), like(studentsTable.phone, pattern))
    if (nameOrPhone) conditions.push(nameOrPhone)
  }
  if (filters?.dateFrom) {
    conditions.push(gte(paymentsTable.paidAt, `${filters.dateFrom} 00:00:00`))
  }
  if (filters?.dateTo) {
    conditions.push(lte(paymentsTable.paidAt, `${filters.dateTo} 23:59:59`))
  }
  if (conditions.length === 0) return undefined
  const clause = and(...conditions)
  return clause ?? undefined
}

const paymentSelectFields = {
  id: paymentsTable.id,
  enrollmentId: paymentsTable.enrollmentId,
  amount: paymentsTable.amount,
  method: paymentsTable.method,
  cashAmount: paymentsTable.cashAmount,
  cardAmount: paymentsTable.cardAmount,
  notes: paymentsTable.notes,
  receiptNumber: paymentsTable.receiptNumber,
  paidBy: paymentsTable.paidBy,
  paidAt: paymentsTable.paidAt,
  studentName: studentsTable.fullName,
  studentPhone: studentsTable.phone,
  subjectName: subjectsTable.name,
  groupName: groupsTable.name,
  paidByName: employeesTable.fullName
}

function paymentJoins(db: ReturnType<typeof getDb>) {
  return db
    .select(paymentSelectFields)
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .leftJoin(employeesTable, eq(paymentsTable.paidBy, employeesTable.id))
}

export type ReceiptRow = {
  receiptNumber: string
  centerName: string
  centerLogoPath: string | null
  studentName: string
  subjectName: string
  groupName: string
  amount: number
  method: string
  cashAmount: number
  cardAmount: number
  paidByName: string
  paidAt: string
  totalAmount: number
  paidSoFar: number
  remaining: number
}

// ── Generate receipt number (REC-YYYYMMDD-NNN) ──────────────────
export async function generateReceiptNumber(): Promise<string> {
  const db = getDb()

  const now = new Date()
  const yyyy = now.getFullYear().toString()
  const mm = (now.getMonth() + 1).toString().padStart(2, '0')
  const dd = now.getDate().toString().padStart(2, '0')
  const dateStr = `${yyyy}${mm}${dd}`
  const prefix = `REC-${dateStr}-`

  // Find the highest existing receipt number for today
  const rows = await db
    .select({ receiptNumber: paymentsTable.receiptNumber })
    .from(paymentsTable)
    .where(like(paymentsTable.receiptNumber, `${prefix}%`))
    .orderBy(desc(paymentsTable.receiptNumber))
    .limit(1)

  let seq = 1
  if (rows.length > 0) {
    const lastNum = rows[0].receiptNumber.replace(prefix, '')
    seq = parseInt(lastNum, 10) + 1
  }

  return `${prefix}${seq.toString().padStart(3, '0')}`
}

// ── Create payment + update enrollment + create finance entry ───
export async function createPayment(data: {
  enrollmentId: number
  amount: number
  method: 'cash' | 'card' | 'mixed'
  cashAmount: number
  cardAmount: number
  notes?: string
  paidBy: number
}): Promise<PaymentRow> {
  const db = getDb()

  const receiptNumber = await generateReceiptNumber()

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      enrollmentId: data.enrollmentId,
      amount: data.amount,
      method: data.method,
      cashAmount: data.cashAmount,
      cardAmount: data.cardAmount,
      notes: data.notes ?? null,
      receiptNumber,
      paidBy: data.paidBy
    })
    .returning()

  // Update enrollment paidAmount
  await db
    .update(enrollmentsTable)
    .set({
      paidAmount: sql`${enrollmentsTable.paidAmount} + ${data.amount}`
    })
    .where(eq(enrollmentsTable.id, data.enrollmentId))

  // Create finance entry for income tracking
  await db.insert(financeEntriesTable).values({
    type: 'income',
    category: 'student_payment',
    amount: data.amount,
    description: `دفعة طالب - إيصال ${receiptNumber}`,
    referenceType: 'payment',
    referenceId: payment.id,
    createdBy: data.paidBy
  })

  return payment
}

// ── List payments by enrollment ─────────────────────────────────
export async function listByEnrollment(enrollmentId: number): Promise<PaymentWithDetails[]> {
  const db = getDb()

  return db
    .select({
      id: paymentsTable.id,
      enrollmentId: paymentsTable.enrollmentId,
      amount: paymentsTable.amount,
      method: paymentsTable.method,
      cashAmount: paymentsTable.cashAmount,
      cardAmount: paymentsTable.cardAmount,
      notes: paymentsTable.notes,
      receiptNumber: paymentsTable.receiptNumber,
      paidBy: paymentsTable.paidBy,
      paidAt: paymentsTable.paidAt,
      studentName: studentsTable.fullName,
      studentPhone: studentsTable.phone,
      subjectName: subjectsTable.name,
      groupName: groupsTable.name,
      paidByName: employeesTable.fullName
    })
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .leftJoin(employeesTable, eq(paymentsTable.paidBy, employeesTable.id))
    .where(eq(paymentsTable.enrollmentId, enrollmentId))
    .orderBy(desc(paymentsTable.paidAt))
}

// ── List payments by student ────────────────────────────────────
export async function listByStudent(studentId: number): Promise<PaymentWithDetails[]> {
  const db = getDb()

  return db
    .select({
      id: paymentsTable.id,
      enrollmentId: paymentsTable.enrollmentId,
      amount: paymentsTable.amount,
      method: paymentsTable.method,
      cashAmount: paymentsTable.cashAmount,
      cardAmount: paymentsTable.cardAmount,
      notes: paymentsTable.notes,
      receiptNumber: paymentsTable.receiptNumber,
      paidBy: paymentsTable.paidBy,
      paidAt: paymentsTable.paidAt,
      studentName: studentsTable.fullName,
      studentPhone: studentsTable.phone,
      subjectName: subjectsTable.name,
      groupName: groupsTable.name,
      paidByName: employeesTable.fullName
    })
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .leftJoin(employeesTable, eq(paymentsTable.paidBy, employeesTable.id))
    .where(eq(enrollmentsTable.studentId, studentId))
    .orderBy(desc(paymentsTable.paidAt))
}

// ── List all payments (filtered + paginated) ────────────────────
export async function listAll(
  filters: PaymentListFilters = {}
): Promise<{ items: PaymentWithDetails[]; total: number }> {
  const db = getDb()
  const whereClause = buildPaymentConditions(filters)
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const baseFrom = db
    .select({ total: count(paymentsTable.id) })
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .leftJoin(employeesTable, eq(paymentsTable.paidBy, employeesTable.id))

  const countRows = whereClause ? await baseFrom.where(whereClause) : await baseFrom
  const total = Number(countRows[0]?.total ?? 0)

  let query = paymentJoins(db).orderBy(desc(paymentsTable.paidAt)).limit(limit).offset(offset)
  const items = whereClause ? await query.where(whereClause) : await query

  return { items, total }
}

export type OutstandingFilters = {
  limit?: number
  offset?: number
  query?: string
}

export type OutstandingRow = {
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

// ── List active enrollments that still have a remaining balance ──
export async function listOutstanding(
  filters: OutstandingFilters = {}
): Promise<{ items: OutstandingRow[]; total: number; totalRemaining: number }> {
  const db = getDb()
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const conditions: SQL[] = [
    eq(enrollmentsTable.status, 'active'),
    sql`${enrollmentsTable.paidAmount} < ${enrollmentsTable.totalAmount}`
  ]

  const q = filters.query?.trim()
  if (q) {
    const pattern = `%${q}%`
    const nameOrPhone = or(like(studentsTable.fullName, pattern), like(studentsTable.phone, pattern))
    if (nameOrPhone) conditions.push(nameOrPhone)
  }

  const whereClause = and(...conditions)
  const remaining = sql<number>`${enrollmentsTable.totalAmount} - ${enrollmentsTable.paidAmount}`

  const summaryRows = await db
    .select({
      total: count(enrollmentsTable.id),
      totalRemaining: sql<number>`coalesce(sum(${remaining}), 0)`
    })
    .from(enrollmentsTable)
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .where(whereClause)

  const total = Number(summaryRows[0]?.total ?? 0)
  const totalRemaining = Number(summaryRows[0]?.totalRemaining ?? 0)

  const items = await db
    .select({
      enrollmentId: enrollmentsTable.id,
      studentId: enrollmentsTable.studentId,
      studentName: studentsTable.fullName,
      studentPhone: studentsTable.phone,
      subjectName: subjectsTable.name,
      groupName: groupsTable.name,
      totalAmount: enrollmentsTable.totalAmount,
      paidAmount: enrollmentsTable.paidAmount,
      remainingAmount: remaining,
      enrolledAt: enrollmentsTable.enrolledAt
    })
    .from(enrollmentsTable)
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .where(whereClause)
    .orderBy(desc(remaining))
    .limit(limit)
    .offset(offset)

  return {
    items: items.map((row) => ({ ...row, remainingAmount: Number(row.remainingAmount) })),
    total,
    totalRemaining
  }
}

// ── Get full receipt data ───────────────────────────────────────
export async function getReceipt(paymentId: number): Promise<ReceiptRow | null> {
  const db = getDb()

  const rows = await db
    .select({
      receiptNumber: paymentsTable.receiptNumber,
      centerName: settingsTable.centerName,
      centerLogoPath: settingsTable.centerLogoPath,
      studentName: studentsTable.fullName,
      subjectName: subjectsTable.name,
      groupName: groupsTable.name,
      amount: paymentsTable.amount,
      method: paymentsTable.method,
      cashAmount: paymentsTable.cashAmount,
      cardAmount: paymentsTable.cardAmount,
      paidByName: employeesTable.fullName,
      paidAt: paymentsTable.paidAt,
      totalAmount: enrollmentsTable.totalAmount,
      paidSoFar: enrollmentsTable.paidAmount,
      remaining: sql<number>`${enrollmentsTable.totalAmount} - ${enrollmentsTable.paidAmount}`
    })
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .leftJoin(employeesTable, eq(paymentsTable.paidBy, employeesTable.id))
    .crossJoin(settingsTable)
    .where(eq(paymentsTable.id, paymentId))
    .limit(1)

  if (rows.length === 0) return null

  const r = rows[0]
  return {
    receiptNumber: r.receiptNumber,
    centerName: r.centerName,
    centerLogoPath: r.centerLogoPath,
    studentName: r.studentName,
    subjectName: r.subjectName,
    groupName: r.groupName,
    amount: r.amount,
    method: r.method,
    cashAmount: r.cashAmount,
    cardAmount: r.cardAmount,
    paidByName: r.paidByName ?? '',
    paidAt: r.paidAt,
    totalAmount: r.totalAmount,
    paidSoFar: r.paidSoFar,
    remaining: Number(r.remaining)
  }
}

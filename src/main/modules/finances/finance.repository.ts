import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import { getDb } from '../../db/db'
import {
  financeEntriesTable,
  employeesTable,
  teacherSalariesTable,
  employeeSalariesTable,
  teachersTable
} from '../../db/models/schema'

export type FinanceEntryRow = typeof financeEntriesTable.$inferSelect
export type NewFinanceEntry = typeof financeEntriesTable.$inferInsert
export type TeacherSalaryRow = typeof teacherSalariesTable.$inferSelect
export type NewTeacherSalary = typeof teacherSalariesTable.$inferInsert
export type EmployeeSalaryRow = typeof employeeSalariesTable.$inferSelect
export type NewEmployeeSalary = typeof employeeSalariesTable.$inferInsert

// ── Finance Entries ─────────────────────────────────────────────

export type FinanceEntryWithCreator = FinanceEntryRow & { createdByName: string | null }

export async function listEntries(filters?: {
  type?: 'income' | 'expense'
  dateFrom?: string
  dateTo?: string
}): Promise<FinanceEntryWithCreator[]> {
  const db = getDb()
  const conditions: ReturnType<typeof eq>[] = []

  if (filters?.type) {
    conditions.push(eq(financeEntriesTable.type, filters.type))
  }
  if (filters?.dateFrom) {
    conditions.push(gte(financeEntriesTable.createdAt, filters.dateFrom))
  }
  if (filters?.dateTo) {
    conditions.push(lte(financeEntriesTable.createdAt, filters.dateTo))
  }

  const rows = await db
    .select({
      id: financeEntriesTable.id,
      type: financeEntriesTable.type,
      category: financeEntriesTable.category,
      amount: financeEntriesTable.amount,
      description: financeEntriesTable.description,
      referenceType: financeEntriesTable.referenceType,
      referenceId: financeEntriesTable.referenceId,
      createdBy: financeEntriesTable.createdBy,
      createdAt: financeEntriesTable.createdAt,
      createdByName: employeesTable.fullName
    })
    .from(financeEntriesTable)
    .leftJoin(employeesTable, eq(financeEntriesTable.createdBy, employeesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(financeEntriesTable.createdAt))

  return rows
}

export async function createEntry(data: {
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  createdBy: number
}): Promise<FinanceEntryRow> {
  const db = getDb()
  const rows = await db
    .insert(financeEntriesTable)
    .values({
      type: data.type,
      category: data.category as NewFinanceEntry['category'],
      amount: data.amount,
      description: data.description ?? null,
      referenceType: 'manual',
      createdBy: data.createdBy
    })
    .returning()
  return rows[0]
}

export async function deleteEntry(id: number): Promise<void> {
  const db = getDb()
  await db.delete(financeEntriesTable).where(eq(financeEntriesTable.id, id))
}

export async function getSummary(): Promise<{
  totalIncome: number
  totalExpenses: number
  balance: number
  monthlyIncome: number
  monthlyExpenses: number
}> {
  const db = getDb()

  // All-time totals
  const totals = await db
    .select({
      type: financeEntriesTable.type,
      total: sql<number>`coalesce(sum(${financeEntriesTable.amount}), 0)`
    })
    .from(financeEntriesTable)
    .groupBy(financeEntriesTable.type)

  let totalIncome = 0
  let totalExpenses = 0
  for (const row of totals) {
    if (row.type === 'income') totalIncome = row.total
    else if (row.type === 'expense') totalExpenses = row.total
  }

  // Current month totals
  const monthStart = sql`strftime('%Y-%m-01', 'now', 'localtime')`
  const monthlyTotals = await db
    .select({
      type: financeEntriesTable.type,
      total: sql<number>`coalesce(sum(${financeEntriesTable.amount}), 0)`
    })
    .from(financeEntriesTable)
    .where(gte(financeEntriesTable.createdAt, monthStart))
    .groupBy(financeEntriesTable.type)

  let monthlyIncome = 0
  let monthlyExpenses = 0
  for (const row of monthlyTotals) {
    if (row.type === 'income') monthlyIncome = row.total
    else if (row.type === 'expense') monthlyExpenses = row.total
  }

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    monthlyIncome,
    monthlyExpenses
  }
}

// ── Teacher Salaries ────────────────────────────────────────────

export type TeacherSalaryWithName = TeacherSalaryRow & {
  teacherName: string
  paidByName: string | null
}

export async function payTeacherSalary(data: {
  teacherId: number
  amount: number
  period: string
  notes?: string
  paidBy: number
}): Promise<TeacherSalaryRow> {
  const db = getDb()

  // Use a transaction: insert salary row + create expense entry
  const result = await db.transaction(async (tx) => {
    const salaryRows = await tx
      .insert(teacherSalariesTable)
      .values({
        teacherId: data.teacherId,
        amount: data.amount,
        period: data.period,
        notes: data.notes ?? null,
        paidBy: data.paidBy
      })
      .returning()

    const salary = salaryRows[0]

    await tx.insert(financeEntriesTable).values({
      type: 'expense',
      category: 'salary_teacher',
      amount: data.amount,
      description: `راتب معلم - فترة ${data.period}`,
      referenceType: 'salary',
      referenceId: salary.id,
      createdBy: data.paidBy
    })

    return salary
  })

  return result
}

export async function listTeacherSalaries(
  teacherId?: number
): Promise<TeacherSalaryWithName[]> {
  const db = getDb()
  const paidByEmployee = employeesTable

  const rows = await db
    .select({
      id: teacherSalariesTable.id,
      teacherId: teacherSalariesTable.teacherId,
      amount: teacherSalariesTable.amount,
      period: teacherSalariesTable.period,
      notes: teacherSalariesTable.notes,
      paidBy: teacherSalariesTable.paidBy,
      paidAt: teacherSalariesTable.paidAt,
      teacherName: teachersTable.fullName,
      paidByName: paidByEmployee.fullName
    })
    .from(teacherSalariesTable)
    .innerJoin(teachersTable, eq(teacherSalariesTable.teacherId, teachersTable.id))
    .leftJoin(paidByEmployee, eq(teacherSalariesTable.paidBy, paidByEmployee.id))
    .where(teacherId ? eq(teacherSalariesTable.teacherId, teacherId) : undefined)
    .orderBy(desc(teacherSalariesTable.paidAt))

  return rows
}

// ── Employee Salaries ───────────────────────────────────────────

export type EmployeeSalaryWithName = EmployeeSalaryRow & {
  employeeName: string
  paidByName: string | null
}

export async function payEmployeeSalary(data: {
  employeeId: number
  amount: number
  period: string
  notes?: string
  paidBy: number
}): Promise<EmployeeSalaryRow> {
  const db = getDb()

  const result = await db.transaction(async (tx) => {
    const salaryRows = await tx
      .insert(employeeSalariesTable)
      .values({
        employeeId: data.employeeId,
        amount: data.amount,
        period: data.period,
        notes: data.notes ?? null,
        paidBy: data.paidBy
      })
      .returning()

    const salary = salaryRows[0]

    await tx.insert(financeEntriesTable).values({
      type: 'expense',
      category: 'salary_employee',
      amount: data.amount,
      description: `راتب موظف - فترة ${data.period}`,
      referenceType: 'salary',
      referenceId: salary.id,
      createdBy: data.paidBy
    })

    return salary
  })

  return result
}

export async function listEmployeeSalaries(
  employeeId?: number
): Promise<EmployeeSalaryWithName[]> {
  const db = getDb()

  // Alias for the employee who received the salary
  const salaryEmployee = employeesTable

  const rows = await db
    .select({
      id: employeeSalariesTable.id,
      employeeId: employeeSalariesTable.employeeId,
      amount: employeeSalariesTable.amount,
      period: employeeSalariesTable.period,
      notes: employeeSalariesTable.notes,
      paidBy: employeeSalariesTable.paidBy,
      paidAt: employeeSalariesTable.paidAt,
      employeeName: salaryEmployee.fullName,
      paidByName: sql<string | null>`(SELECT full_name FROM employees WHERE id = ${employeeSalariesTable.paidBy})`
    })
    .from(employeeSalariesTable)
    .innerJoin(salaryEmployee, eq(employeeSalariesTable.employeeId, salaryEmployee.id))
    .where(employeeId ? eq(employeeSalariesTable.employeeId, employeeId) : undefined)
    .orderBy(desc(employeeSalariesTable.paidAt))

  return rows
}

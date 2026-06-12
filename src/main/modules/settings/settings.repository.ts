import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { eq, sql, desc } from 'drizzle-orm'
import { getDb } from '../../db/db'
import {
  settingsTable,
  backupsTable,
  studentsTable,
  groupsTable,
  teachersTable,
  financeEntriesTable,
  enrollmentsTable,
  paymentsTable,
  subjectsTable
} from '../../db/models/schema'

export type SettingsRow = typeof settingsTable.$inferSelect
export type BackupRow = typeof backupsTable.$inferSelect

// ── Settings ────────────────────────────────────────────────────

export async function getSettings(): Promise<SettingsRow> {
  const db = getDb()
  const rows = await db.select().from(settingsTable)

  if (rows.length === 0) {
    // Create default row
    const inserted = await db
      .insert(settingsTable)
      .values({ centerName: 'مركز التعليم' })
      .returning()
    return inserted[0]
  }

  return rows[0]
}

export async function updateSettings(data: {
  centerName?: string
  centerLogoPath?: string
  autoBackupOnClose?: boolean
  autoBackupDirectory?: string | null
}): Promise<SettingsRow> {
  const db = getDb()
  const current = await getSettings()

  const updated = await db
    .update(settingsTable)
    .set({
      centerName: data.centerName ?? current.centerName,
      centerLogoPath: data.centerLogoPath ?? current.centerLogoPath,
      autoBackupOnClose:
        data.autoBackupOnClose !== undefined
          ? data.autoBackupOnClose
            ? 1
            : 0
          : current.autoBackupOnClose,
      autoBackupDirectory:
        data.autoBackupDirectory !== undefined
          ? data.autoBackupDirectory
          : current.autoBackupDirectory
    })
    .where(eq(settingsTable.id, current.id))
    .returning()

  return updated[0]
}

// ── Backup / Restore ────────────────────────────────────────────

/**
 * Resolves the physical file path of the current SQLite database.
 */
function getDbFilePath(): string {
  const fromEnv = process.env.DB_FILE_NAME
  if (fromEnv !== undefined && fromEnv.length > 0) {
    // DB_FILE_NAME may be a `file:` URL or a plain path
    return fromEnv.replace(/^file:/, '')
  }
  return join(app.getPath('userData'), 'app.db')
}

export function buildAutoBackupFilePath(directory: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  return join(directory, `courses-backup-${stamp}.db`)
}

export async function createBackup(
  filePath: string,
  createdBy?: number | null
): Promise<BackupRow> {
  const db = getDb()
  const dbPath = getDbFilePath()
  const parentDir = dirname(filePath)
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true })
  }

  copyFileSync(dbPath, filePath)

  const rows = await db
    .insert(backupsTable)
    .values({
      filePath,
      createdBy: createdBy ?? undefined
    })
    .returning()

  return rows[0]
}

export async function createAutoBackupOnClose(): Promise<string | null> {
  const settings = await getSettings()
  if (settings.autoBackupOnClose !== 1 || !settings.autoBackupDirectory) {
    return null
  }

  if (!existsSync(settings.autoBackupDirectory)) {
    mkdirSync(settings.autoBackupDirectory, { recursive: true })
  }

  const filePath = buildAutoBackupFilePath(settings.autoBackupDirectory)
  await createBackup(filePath)
  return filePath
}

export async function restoreBackup(filePath: string): Promise<void> {
  const dbPath = getDbFilePath()
  // Overwrite the current DB with the backup
  copyFileSync(filePath, dbPath)
}

// ── Dashboard Stats ─────────────────────────────────────────────

export async function getDashboardStats(): Promise<{
  activeStudents: number
  activeGroups: number
  activeTeachers: number
  monthlyIncome: number
  monthlyExpenses: number
  pendingPayments: number
}> {
  const db = getDb()

  // Count actives
  const [studentsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentsTable)
    .where(eq(studentsTable.isActive, 1))

  const [groupsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(groupsTable)
    .where(eq(groupsTable.isActive, 1))

  const [teachersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teachersTable)
    .where(eq(teachersTable.isActive, 1))

  // Monthly finance totals
  const monthStart = sql`strftime('%Y-%m-01', 'now', 'localtime')`
  const monthlyFinance = await db
    .select({
      type: financeEntriesTable.type,
      total: sql<number>`coalesce(sum(${financeEntriesTable.amount}), 0)`
    })
    .from(financeEntriesTable)
    .where(sql`${financeEntriesTable.createdAt} >= ${monthStart}`)
    .groupBy(financeEntriesTable.type)

  let monthlyIncome = 0
  let monthlyExpenses = 0
  for (const row of monthlyFinance) {
    if (row.type === 'income') monthlyIncome = row.total
    else if (row.type === 'expense') monthlyExpenses = row.total
  }

  // Pending payments: sum(totalAmount - paidAmount) where status = 'active'
  const [pending] = await db
    .select({
      total: sql<number>`coalesce(sum(${enrollmentsTable.totalAmount} - ${enrollmentsTable.paidAmount}), 0)`
    })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, 'active'))

  return {
    activeStudents: studentsCount.count,
    activeGroups: groupsCount.count,
    activeTeachers: teachersCount.count,
    monthlyIncome,
    monthlyExpenses,
    pendingPayments: pending.total
  }
}

// ── Recent Payments ─────────────────────────────────────────────

export type RecentPaymentRow = {
  id: number
  amount: number
  method: string
  receiptNumber: string
  paidAt: string
  studentName: string
  subjectName: string
}

export async function getRecentPayments(limit: number): Promise<RecentPaymentRow[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: paymentsTable.id,
      amount: paymentsTable.amount,
      method: paymentsTable.method,
      receiptNumber: paymentsTable.receiptNumber,
      paidAt: paymentsTable.paidAt,
      studentName: studentsTable.fullName,
      subjectName: subjectsTable.name
    })
    .from(paymentsTable)
    .innerJoin(enrollmentsTable, eq(paymentsTable.enrollmentId, enrollmentsTable.id))
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .innerJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .orderBy(desc(paymentsTable.paidAt))
    .limit(limit)

  return rows
}

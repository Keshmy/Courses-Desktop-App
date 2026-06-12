import { and, count, desc, eq, gte, like, lte, or, type SQL } from 'drizzle-orm'
import { getDb } from '../../db/db'
import { activityLogsTable } from '../../db/models/schema'
import type { ActivityLogFilters } from '../../../shared/types/activity-log'

export type ActivityLogRow = typeof activityLogsTable.$inferSelect

export async function logActivity(data: {
  employeeId: number
  employeeName: string
  employeeRole: 'admin' | 'employee'
  action: string
  entityType: string
  entityId?: number
  summary: string
  details?: Record<string, unknown>
}): Promise<void> {
  const db = getDb()
  await db.insert(activityLogsTable).values({
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    employeeRole: data.employeeRole,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    summary: data.summary,
    details: data.details ? JSON.stringify(data.details) : null
  })
}

function buildConditions(filters: ActivityLogFilters): SQL | undefined {
  const conditions: SQL[] = []

  if (filters.employeeId) {
    conditions.push(eq(activityLogsTable.employeeId, filters.employeeId))
  }
  if (filters.role) {
    conditions.push(eq(activityLogsTable.employeeRole, filters.role))
  }
  if (filters.dateFrom) {
    conditions.push(gte(activityLogsTable.createdAt, `${filters.dateFrom} 00:00:00`))
  }
  if (filters.dateTo) {
    conditions.push(lte(activityLogsTable.createdAt, `${filters.dateTo} 23:59:59`))
  }
  const q = filters.query?.trim()
  if (q) {
    const pattern = `%${q}%`
    const textMatch = or(
      like(activityLogsTable.summary, pattern),
      like(activityLogsTable.employeeName, pattern),
      like(activityLogsTable.action, pattern)
    )
    if (textMatch) conditions.push(textMatch)
  }

  if (conditions.length === 0) return undefined
  const clause = and(...conditions)
  return clause ?? undefined
}

export async function listActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<{ items: ActivityLogRow[]; total: number }> {
  const db = getDb()
  const whereClause = buildConditions(filters)
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const countQuery = db.select({ total: count(activityLogsTable.id) }).from(activityLogsTable)
  const countRows = whereClause ? await countQuery.where(whereClause) : await countQuery
  const total = Number(countRows[0]?.total ?? 0)

  let query = db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(limit).offset(offset)
  const items = whereClause ? await query.where(whereClause) : await query

  return { items, total }
}

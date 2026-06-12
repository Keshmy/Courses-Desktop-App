import { eq, asc, sql, and, count } from 'drizzle-orm'
import { getDb } from '../../db/db'
import {
  groupsTable,
  groupScheduleTable,
  subjectsTable,
  teachersTable,
  enrollmentsTable,
  studentsTable
} from '../../db/models/schema'

export type GroupRow = typeof groupsTable.$inferSelect
export type NewGroup = typeof groupsTable.$inferInsert
export type ScheduleRow = typeof groupScheduleTable.$inferSelect
export type NewScheduleSlot = typeof groupScheduleTable.$inferInsert

export type GroupWithDetails = GroupRow & {
  subjectName: string
  teacherName: string
  enrolledCount: number
}

export type GroupStudentRow = {
  enrollmentId: number
  studentId: number
  fullName: string
  phone: string | null
  totalAmount: number
  paidAmount: number
  status: string
  enrolledAt: string
}

function buildEnrolledCountSq() {
  const db = getDb()
  return db
    .select({
      groupId: enrollmentsTable.groupId,
      cnt: count(enrollmentsTable.id).as('cnt')
    })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.status, 'active'))
    .groupBy(enrollmentsTable.groupId)
    .as('enrolled_count')
}

// ── List all groups ─────────────────────────────────────────────
export async function listGroups(): Promise<GroupWithDetails[]> {
  const db = getDb()
  const sq = buildEnrolledCountSq()

  const rows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      subjectId: groupsTable.subjectId,
      teacherId: groupsTable.teacherId,
      capacity: groupsTable.capacity,
      isActive: groupsTable.isActive,
      createdAt: groupsTable.createdAt,
      subjectName: subjectsTable.name,
      teacherName: teachersTable.fullName,
      enrolledCount: sql<number>`coalesce(${sq.cnt}, 0)`
    })
    .from(groupsTable)
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .innerJoin(teachersTable, eq(groupsTable.teacherId, teachersTable.id))
    .leftJoin(sq, eq(groupsTable.id, sq.groupId))
    .orderBy(asc(groupsTable.id))

  return rows.map((r) => ({
    ...r,
    enrolledCount: Number(r.enrolledCount)
  }))
}

// ── List groups by subject ──────────────────────────────────────
export async function listBySubject(subjectId: number): Promise<GroupWithDetails[]> {
  const db = getDb()
  const sq = buildEnrolledCountSq()

  const rows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      subjectId: groupsTable.subjectId,
      teacherId: groupsTable.teacherId,
      capacity: groupsTable.capacity,
      isActive: groupsTable.isActive,
      createdAt: groupsTable.createdAt,
      subjectName: subjectsTable.name,
      teacherName: teachersTable.fullName,
      enrolledCount: sql<number>`coalesce(${sq.cnt}, 0)`
    })
    .from(groupsTable)
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .innerJoin(teachersTable, eq(groupsTable.teacherId, teachersTable.id))
    .leftJoin(sq, eq(groupsTable.id, sq.groupId))
    .where(eq(groupsTable.subjectId, subjectId))
    .orderBy(asc(groupsTable.id))

  return rows.map((r) => ({
    ...r,
    enrolledCount: Number(r.enrolledCount)
  }))
}

// ── Get single group with details + schedule ────────────────────
export async function getGroup(
  id: number
): Promise<(GroupWithDetails & { schedule: ScheduleRow[] }) | null> {
  const db = getDb()
  const sq = buildEnrolledCountSq()

  const rows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      subjectId: groupsTable.subjectId,
      teacherId: groupsTable.teacherId,
      capacity: groupsTable.capacity,
      isActive: groupsTable.isActive,
      createdAt: groupsTable.createdAt,
      subjectName: subjectsTable.name,
      teacherName: teachersTable.fullName,
      enrolledCount: sql<number>`coalesce(${sq.cnt}, 0)`
    })
    .from(groupsTable)
    .innerJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .innerJoin(teachersTable, eq(groupsTable.teacherId, teachersTable.id))
    .leftJoin(sq, eq(groupsTable.id, sq.groupId))
    .where(eq(groupsTable.id, id))

  if (rows.length === 0) return null

  const group = { ...rows[0], enrolledCount: Number(rows[0].enrolledCount) }
  const schedule = await getSchedule(id)

  return { ...group, schedule }
}

// ── Create group + schedule slots ───────────────────────────────
export async function createGroup(data: {
  name: string
  subjectId: number
  teacherId: number
  capacity: number
  schedule: { dayOfWeek: string; startTime: string; endTime: string }[]
}): Promise<GroupRow> {
  const db = getDb()

  const [inserted] = await db
    .insert(groupsTable)
    .values({
      name: data.name,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      capacity: data.capacity
    })
    .returning()

  if (data.schedule.length > 0) {
    await db.insert(groupScheduleTable).values(
      data.schedule.map((s) => ({
        groupId: inserted.id,
        dayOfWeek: s.dayOfWeek as NewScheduleSlot['dayOfWeek'],
        startTime: s.startTime,
        endTime: s.endTime
      }))
    )
  }

  return inserted
}

// ── Update group + replace schedule slots ───────────────────────
export async function updateGroup(data: {
  id: number
  name?: string
  teacherId?: number
  capacity?: number
  schedule?: { dayOfWeek: string; startTime: string; endTime: string }[]
}): Promise<GroupRow> {
  const db = getDb()

  const updates: Partial<NewGroup> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.teacherId !== undefined) updates.teacherId = data.teacherId
  if (data.capacity !== undefined) updates.capacity = data.capacity

  if (Object.keys(updates).length > 0) {
    await db.update(groupsTable).set(updates).where(eq(groupsTable.id, data.id))
  }

  if (data.schedule !== undefined) {
    // Delete old schedule slots and insert new ones
    await db.delete(groupScheduleTable).where(eq(groupScheduleTable.groupId, data.id))

    if (data.schedule.length > 0) {
      await db.insert(groupScheduleTable).values(
        data.schedule.map((s) => ({
          groupId: data.id,
          dayOfWeek: s.dayOfWeek as NewScheduleSlot['dayOfWeek'],
          startTime: s.startTime,
          endTime: s.endTime
        }))
      )
    }
  }

  const [updated] = await db.select().from(groupsTable).where(eq(groupsTable.id, data.id))
  return updated
}

// ── Toggle isActive ─────────────────────────────────────────────
export async function toggleActive(id: number): Promise<GroupRow> {
  const db = getDb()

  const [row] = await db.select().from(groupsTable).where(eq(groupsTable.id, id))
  const newValue = row.isActive === 1 ? 0 : 1

  await db.update(groupsTable).set({ isActive: newValue }).where(eq(groupsTable.id, id))

  const [updated] = await db.select().from(groupsTable).where(eq(groupsTable.id, id))
  return updated
}

// ── Get schedule slots ──────────────────────────────────────────
export async function getSchedule(groupId: number): Promise<ScheduleRow[]> {
  const db = getDb()
  return db
    .select()
    .from(groupScheduleTable)
    .where(eq(groupScheduleTable.groupId, groupId))
    .orderBy(asc(groupScheduleTable.id))
}

// ── Get enrolled students for a group ───────────────────────────
export async function getGroupStudents(groupId: number): Promise<GroupStudentRow[]> {
  const db = getDb()

  return db
    .select({
      enrollmentId: enrollmentsTable.id,
      studentId: studentsTable.id,
      fullName: studentsTable.fullName,
      phone: studentsTable.phone,
      totalAmount: enrollmentsTable.totalAmount,
      paidAmount: enrollmentsTable.paidAmount,
      status: enrollmentsTable.status,
      enrolledAt: enrollmentsTable.enrolledAt
    })
    .from(enrollmentsTable)
    .innerJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .where(
      and(eq(enrollmentsTable.groupId, groupId), eq(enrollmentsTable.status, 'active'))
    )
    .orderBy(asc(studentsTable.fullName))
}

import { and, count, desc, eq } from 'drizzle-orm'
import { getDb } from '../../db/db'
import {
  enrollmentsTable,
  groupsTable,
  studentsTable,
  subjectsTable
} from '../../db/models/schema'

export type EnrollmentRow = typeof enrollmentsTable.$inferSelect
export type NewEnrollment = typeof enrollmentsTable.$inferInsert

/** Shape returned by joined queries. */
export type EnrollmentWithDetails = EnrollmentRow & {
  studentName: string
  groupName: string
  subjectName: string
}

/**
 * Create a new enrollment.
 */
export async function createEnrollment(
  data: Pick<NewEnrollment, 'studentId' | 'groupId' | 'totalAmount'>
): Promise<EnrollmentRow> {
  const db = getDb()
  const result = await db.insert(enrollmentsTable).values(data).returning()
  return result[0]
}

/**
 * List enrollments for a specific student, including group and subject info.
 */
export async function listByStudent(studentId: number): Promise<EnrollmentWithDetails[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: enrollmentsTable.id,
      studentId: enrollmentsTable.studentId,
      groupId: enrollmentsTable.groupId,
      totalAmount: enrollmentsTable.totalAmount,
      paidAmount: enrollmentsTable.paidAmount,
      status: enrollmentsTable.status,
      enrolledAt: enrollmentsTable.enrolledAt,
      studentName: studentsTable.fullName,
      groupName: groupsTable.name,
      subjectName: subjectsTable.name
    })
    .from(enrollmentsTable)
    .leftJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .leftJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .leftJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .where(eq(enrollmentsTable.studentId, studentId))
    .orderBy(desc(enrollmentsTable.id))

  return rows as EnrollmentWithDetails[]
}

/**
 * List enrollments for a specific group, including student info.
 */
export async function listByGroup(groupId: number): Promise<EnrollmentWithDetails[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: enrollmentsTable.id,
      studentId: enrollmentsTable.studentId,
      groupId: enrollmentsTable.groupId,
      totalAmount: enrollmentsTable.totalAmount,
      paidAmount: enrollmentsTable.paidAmount,
      status: enrollmentsTable.status,
      enrolledAt: enrollmentsTable.enrolledAt,
      studentName: studentsTable.fullName,
      groupName: groupsTable.name,
      subjectName: subjectsTable.name
    })
    .from(enrollmentsTable)
    .leftJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .leftJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .leftJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .where(eq(enrollmentsTable.groupId, groupId))
    .orderBy(desc(enrollmentsTable.id))

  return rows as EnrollmentWithDetails[]
}

/**
 * Update the status of an enrollment.
 */
export async function updateStatus(
  id: number,
  status: 'active' | 'completed' | 'cancelled'
): Promise<EnrollmentRow> {
  const db = getDb()
  const result = await db
    .update(enrollmentsTable)
    .set({ status })
    .where(eq(enrollmentsTable.id, id))
    .returning()
  return result[0]
}

/**
 * Get a single enrollment by id with full details.
 */
export async function getEnrollment(id: number): Promise<EnrollmentWithDetails | undefined> {
  const db = getDb()
  const rows = await db
    .select({
      id: enrollmentsTable.id,
      studentId: enrollmentsTable.studentId,
      groupId: enrollmentsTable.groupId,
      totalAmount: enrollmentsTable.totalAmount,
      paidAmount: enrollmentsTable.paidAmount,
      status: enrollmentsTable.status,
      enrolledAt: enrollmentsTable.enrolledAt,
      studentName: studentsTable.fullName,
      groupName: groupsTable.name,
      subjectName: subjectsTable.name
    })
    .from(enrollmentsTable)
    .leftJoin(studentsTable, eq(enrollmentsTable.studentId, studentsTable.id))
    .leftJoin(groupsTable, eq(enrollmentsTable.groupId, groupsTable.id))
    .leftJoin(subjectsTable, eq(groupsTable.subjectId, subjectsTable.id))
    .where(eq(enrollmentsTable.id, id))
    .limit(1)

  return rows[0] as EnrollmentWithDetails | undefined
}

/**
 * Move an active enrollment to another group (keeps fees and payments).
 */
export async function changeGroup(
  enrollmentId: number,
  newGroupId: number
): Promise<EnrollmentWithDetails> {
  const db = getDb()
  const current = await getEnrollment(enrollmentId)

  if (!current) {
    throw new Error('التسجيل غير موجود')
  }
  if (current.status !== 'active') {
    throw new Error('يمكن نقل التسجيلات النشطة فقط')
  }
  if (current.groupId === newGroupId) {
    throw new Error('الطالب مسجّل في هذه المجموعة بالفعل')
  }

  const targetGroupRows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      isActive: groupsTable.isActive,
      capacity: groupsTable.capacity
    })
    .from(groupsTable)
    .where(eq(groupsTable.id, newGroupId))
    .limit(1)

  const targetGroup = targetGroupRows[0]
  if (!targetGroup) {
    throw new Error('المجموعة الجديدة غير موجودة')
  }
  if (targetGroup.isActive !== 1) {
    throw new Error('المجموعة الجديدة غير نشطة')
  }

  const duplicate = await db
    .select({ id: enrollmentsTable.id })
    .from(enrollmentsTable)
    .where(
      and(
        eq(enrollmentsTable.studentId, current.studentId),
        eq(enrollmentsTable.groupId, newGroupId),
        eq(enrollmentsTable.status, 'active')
      )
    )
    .limit(1)

  if (duplicate.length > 0) {
    throw new Error('الطالب مسجّل نشطاً في المجموعة المختارة')
  }

  const countRows = await db
    .select({ total: count(enrollmentsTable.id) })
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.groupId, newGroupId), eq(enrollmentsTable.status, 'active')))

  const enrolledCount = Number(countRows[0]?.total ?? 0)
  if (enrolledCount >= targetGroup.capacity) {
    throw new Error('المجموعة الجديدة ممتلئة')
  }

  await db
    .update(enrollmentsTable)
    .set({ groupId: newGroupId })
    .where(eq(enrollmentsTable.id, enrollmentId))

  const updated = await getEnrollment(enrollmentId)
  if (!updated) {
    throw new Error('فشل تحديث التسجيل')
  }
  return updated
}

import { desc, eq, not } from 'drizzle-orm'
import { getDb } from '../../db/db'
import { teachersTable } from '../../db/models/schema'

export type TeacherRow = typeof teachersTable.$inferSelect
export type NewTeacher = typeof teachersTable.$inferInsert

/**
 * Lists all teachers ordered by id descending (newest first).
 */
export async function listTeachers(): Promise<TeacherRow[]> {
  const db = getDb()
  return db.select().from(teachersTable).orderBy(desc(teachersTable.id))
}

/**
 * Returns a single teacher by id, or undefined if not found.
 */
export async function getTeacher(id: number): Promise<TeacherRow | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.id, id))
    .limit(1)
  return rows[0]
}

/**
 * Inserts a new teacher and returns the created row.
 */
export async function createTeacher(data: {
  fullName: string
  phone?: string
  specialization?: string
}): Promise<TeacherRow> {
  const db = getDb()
  const rows = await db
    .insert(teachersTable)
    .values({
      fullName: data.fullName,
      phone: data.phone ?? null,
      specialization: data.specialization ?? null
    })
    .returning()
  return rows[0]
}

/**
 * Updates an existing teacher. Only provided fields are changed.
 */
export async function updateTeacher(data: {
  id: number
  fullName?: string
  phone?: string
  specialization?: string
}): Promise<TeacherRow> {
  const db = getDb()
  const updates: Partial<NewTeacher> = {}
  if (data.fullName !== undefined) updates.fullName = data.fullName
  if (data.phone !== undefined) updates.phone = data.phone
  if (data.specialization !== undefined) updates.specialization = data.specialization

  const rows = await db
    .update(teachersTable)
    .set(updates)
    .where(eq(teachersTable.id, data.id))
    .returning()
  return rows[0]
}

/**
 * Toggles the isActive flag for a teacher and returns the updated row.
 */
export async function toggleActive(id: number): Promise<TeacherRow> {
  const db = getDb()
  const rows = await db
    .update(teachersTable)
    .set({ isActive: not(teachersTable.isActive) })
    .where(eq(teachersTable.id, id))
    .returning()
  return rows[0]
}

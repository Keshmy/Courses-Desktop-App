import { desc, eq, like, or } from 'drizzle-orm'
import { getDb } from '../../db/db'
import { studentsTable } from '../../db/models/schema'

export type StudentRow = typeof studentsTable.$inferSelect
export type NewStudent = typeof studentsTable.$inferInsert

/**
 * List all students ordered by id descending (newest first).
 */
export async function listStudents(): Promise<StudentRow[]> {
  const db = getDb()
  return db.select().from(studentsTable).orderBy(desc(studentsTable.id))
}

/**
 * Get a single student by id.
 */
export async function getStudent(id: number): Promise<StudentRow | undefined> {
  const db = getDb()
  const rows = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1)
  return rows[0]
}

/**
 * Create a new student.
 */
export async function createStudent(data: Omit<NewStudent, 'id' | 'createdAt' | 'isActive'>): Promise<StudentRow> {
  const db = getDb()
  const result = await db.insert(studentsTable).values(data).returning()
  return result[0]
}

/**
 * Update an existing student's fields.
 */
export async function updateStudent(
  data: { id: number } & Partial<Omit<NewStudent, 'id' | 'createdAt' | 'isActive'>>
): Promise<StudentRow> {
  const db = getDb()
  const { id, ...fields } = data
  const result = await db.update(studentsTable).set(fields).where(eq(studentsTable.id, id)).returning()
  return result[0]
}

/**
 * Search students by name or phone (partial match).
 */
export async function searchStudents(query: string): Promise<StudentRow[]> {
  const db = getDb()
  const pattern = `%${query}%`
  return db
    .select()
    .from(studentsTable)
    .where(or(like(studentsTable.fullName, pattern), like(studentsTable.phone, pattern)))
    .orderBy(desc(studentsTable.id))
}

/**
 * Toggle the isActive flag for a student.
 */
export async function toggleActive(id: number): Promise<StudentRow> {
  const db = getDb()
  const student = await getStudent(id)
  if (!student) throw new Error(`الطالب غير موجود: ${id}`)
  const newValue = student.isActive === 1 ? 0 : 1
  const result = await db
    .update(studentsTable)
    .set({ isActive: newValue })
    .where(eq(studentsTable.id, id))
    .returning()
  return result[0]
}

import { desc, eq, not } from 'drizzle-orm'
import { getDb } from '../../db/db'
import { subjectsTable } from '../../db/models/schema'

export type SubjectRow = typeof subjectsTable.$inferSelect
export type NewSubject = typeof subjectsTable.$inferInsert

/**
 * Lists all subjects ordered by id descending (newest first).
 */
export async function listSubjects(): Promise<SubjectRow[]> {
  const db = getDb()
  return db.select().from(subjectsTable).orderBy(desc(subjectsTable.id))
}

/**
 * Returns a single subject by id, or undefined if not found.
 */
export async function getSubject(id: number): Promise<SubjectRow | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, id))
    .limit(1)
  return rows[0]
}

/**
 * Inserts a new subject and returns the created row.
 */
export async function createSubject(data: {
  name: string
  description?: string
  defaultPrice: number
}): Promise<SubjectRow> {
  const db = getDb()
  const rows = await db
    .insert(subjectsTable)
    .values({
      name: data.name,
      description: data.description ?? null,
      defaultPrice: data.defaultPrice
    })
    .returning()
  return rows[0]
}

/**
 * Updates an existing subject. Only provided fields are changed.
 */
export async function updateSubject(data: {
  id: number
  name?: string
  description?: string
  defaultPrice?: number
}): Promise<SubjectRow> {
  const db = getDb()
  const updates: Partial<NewSubject> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.defaultPrice !== undefined) updates.defaultPrice = data.defaultPrice

  const rows = await db
    .update(subjectsTable)
    .set(updates)
    .where(eq(subjectsTable.id, data.id))
    .returning()
  return rows[0]
}

/**
 * Toggles the isActive flag for a subject and returns the updated row.
 */
export async function toggleActive(id: number): Promise<SubjectRow> {
  const db = getDb()
  const rows = await db
    .update(subjectsTable)
    .set({ isActive: not(subjectsTable.isActive) })
    .where(eq(subjectsTable.id, id))
    .returning()
  return rows[0]
}

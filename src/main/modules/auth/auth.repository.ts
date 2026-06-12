import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { eq, asc } from 'drizzle-orm'
import { getDb } from '../../db/db'
import { employeesTable } from '../../db/models/schema'
import { isProtectedAdminUsername } from '../../../shared/constants/auth'

// ── Inferred types ──────────────────────────────────────────────
export type EmployeeRow = typeof employeesTable.$inferSelect
export type NewEmployee = typeof employeesTable.$inferInsert

// ── Password helpers ────────────────────────────────────────────

/**
 * Hash a plain-text password.
 * Returns a string in the format `salt:hash` (hex-encoded).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a plain-text password against a stored `salt:hash` string.
 */
export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  const inputHash = scryptSync(inputPassword, salt, 64)
  return timingSafeEqual(inputHash, Buffer.from(hash, 'hex'))
}

// ── Queries ─────────────────────────────────────────────────────

/**
 * Find an employee by username (case-sensitive).
 */
export async function findByUsername(username: string): Promise<EmployeeRow | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.username, username))
    .limit(1)
  return rows[0]
}

/**
 * Create the default admin account when no employees exist.
 */
export async function createDefaultAdmin(): Promise<void> {
  const db = getDb()
  const existing = await db.select({ id: employeesTable.id }).from(employeesTable).limit(1)
  if (existing.length > 0) return

  await db.insert(employeesTable).values({
    fullName: 'المدير',
    username: 'admin',
    passwordHash: hashPassword('admin123'),
    role: 'admin'
  })
}

/**
 * List all employees ordered by id.
 */
export async function listEmployees(): Promise<EmployeeRow[]> {
  const db = getDb()
  return db.select().from(employeesTable).orderBy(asc(employeesTable.id))
}

/**
 * Get a single employee by id.
 */
export async function getEmployee(id: number): Promise<EmployeeRow | undefined> {
  const db = getDb()
  const rows = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, id))
    .limit(1)
  return rows[0]
}

/**
 * Create a new employee (password will be hashed).
 */
export async function createEmployee(data: {
  fullName: string
  username: string
  password: string
  role: 'admin' | 'employee'
}): Promise<EmployeeRow> {
  const db = getDb()
  const rows = await db
    .insert(employeesTable)
    .values({
      fullName: data.fullName,
      username: data.username,
      passwordHash: hashPassword(data.password),
      role: data.role
    })
    .returning()
  return rows[0]
}

/**
 * Update an existing employee.
 * If a new password is provided it will be hashed before storing.
 */
function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export async function resetPassword(data: {
  username: string
  fullName: string
  newPassword: string
  role: 'admin' | 'employee'
}): Promise<{ success: boolean; error?: string }> {
  const username = data.username.trim()
  const fullName = normalizeName(data.fullName)

  if (!username || !fullName || !data.newPassword) {
    return { success: false, error: 'جميع الحقول مطلوبة' }
  }

  if (data.newPassword.length < 4) {
    return { success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' }
  }

  if (isProtectedAdminUsername(username)) {
    return {
      success: false,
      error: 'لا يمكن إعادة تعيين كلمة مرور المدير الرئيسي من هنا. سجّل الدخول وغيّرها من الإعدادات.'
    }
  }

  const employee = await findByUsername(username)
  if (!employee) {
    return { success: false, error: 'اسم المستخدم غير موجود' }
  }

  if (employee.role !== data.role) {
    return { success: false, error: 'نوع الحساب لا يطابق صفحة الدخول المختارة' }
  }

  if (employee.isActive !== 1) {
    return { success: false, error: 'هذا الحساب معطّل، تواصل مع المدير' }
  }

  if (normalizeName(employee.fullName) !== fullName) {
    return { success: false, error: 'الاسم الكامل غير مطابق لسجل الحساب' }
  }

  await updateEmployee({ id: employee.id, password: data.newPassword })
  return { success: true }
}

export async function changeOwnPassword(data: {
  employeeId: number
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  if (!data.currentPassword || !data.newPassword) {
    return { success: false, error: 'جميع الحقول مطلوبة' }
  }

  if (data.newPassword.length < 4) {
    return { success: false, error: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' }
  }

  if (data.currentPassword === data.newPassword) {
    return { success: false, error: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية' }
  }

  const employee = await getEmployee(data.employeeId)
  if (!employee) {
    return { success: false, error: 'الحساب غير موجود' }
  }

  if (employee.isActive !== 1) {
    return { success: false, error: 'هذا الحساب معطّل' }
  }

  const valid = verifyPassword(data.currentPassword, employee.passwordHash)
  if (!valid) {
    return { success: false, error: 'كلمة المرور الحالية غير صحيحة' }
  }

  await updateEmployee({
    id: employee.id,
    password: data.newPassword,
    allowProtectedAdminPassword: true
  })
  return { success: true }
}

export async function updateEmployee(data: {
  id: number
  fullName?: string
  username?: string
  password?: string
  role?: 'admin' | 'employee'
  allowProtectedAdminPassword?: boolean
}): Promise<EmployeeRow | undefined> {
  const db = getDb()
  const existing = await getEmployee(data.id)

  if (existing && data.password !== undefined && isProtectedAdminUsername(existing.username)) {
    if (!data.allowProtectedAdminPassword) {
      throw new Error(
        'لا يمكن تغيير كلمة مرور المدير الرئيسي (admin) إلا من قبله عبر الإعدادات بعد تسجيل الدخول'
      )
    }
  }

  const updates: Partial<NewEmployee> = {}
  if (data.fullName !== undefined) updates.fullName = data.fullName
  if (data.username !== undefined) updates.username = data.username
  if (data.role !== undefined) updates.role = data.role
  if (data.password !== undefined) updates.passwordHash = hashPassword(data.password)

  if (Object.keys(updates).length === 0) {
    return getEmployee(data.id)
  }

  const rows = await db
    .update(employeesTable)
    .set(updates)
    .where(eq(employeesTable.id, data.id))
    .returning()
  return rows[0]
}

/**
 * Toggle the isActive flag (1 → 0, 0 → 1).
 */
export async function toggleActive(id: number): Promise<EmployeeRow | undefined> {
  const db = getDb()
  const employee = await getEmployee(id)
  if (!employee) return undefined

  const newValue = employee.isActive === 1 ? 0 : 1
  const rows = await db
    .update(employeesTable)
    .set({ isActive: newValue })
    .where(eq(employeesTable.id, id))
    .returning()
  return rows[0]
}

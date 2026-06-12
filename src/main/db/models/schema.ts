import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Settings (single row) ───────────────────────────────────────
export const settingsTable = sqliteTable('settings', {
  id: int().primaryKey({ autoIncrement: true }),
  centerName: text('center_name').notNull().default('مركز التعليم'),
  centerLogoPath: text('center_logo_path'),
  autoBackupOnClose: int('auto_backup_on_close').notNull().default(0),
  autoBackupDirectory: text('auto_backup_directory')
})

// ─── Employees (system users: admin | employee) ─────────────────
export const employeesTable = sqliteTable('employees', {
  id: int().primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'employee'] })
    .notNull()
    .default('employee'),
  isActive: int('is_active').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Teachers (instructors – do NOT login) ──────────────────────
export const teachersTable = sqliteTable('teachers', {
  id: int().primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  specialization: text('specialization'),
  isActive: int('is_active').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Subjects ───────────────────────────────────────────────────
export const subjectsTable = sqliteTable('subjects', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  defaultPrice: real('default_price').notNull().default(0),
  isActive: int('is_active').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Groups (per subject, taught by one teacher) ────────────────
export const groupsTable = sqliteTable('groups', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  subjectId: int('subject_id')
    .notNull()
    .references(() => subjectsTable.id),
  teacherId: int('teacher_id')
    .notNull()
    .references(() => teachersTable.id),
  capacity: int('capacity').notNull().default(30),
  isActive: int('is_active').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Group Schedule (days & times per group) ────────────────────
export const groupScheduleTable = sqliteTable('group_schedule', {
  id: int().primaryKey({ autoIncrement: true }),
  groupId: int('group_id')
    .notNull()
    .references(() => groupsTable.id),
  dayOfWeek: text('day_of_week', {
    enum: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
  }).notNull(),
  startTime: text('start_time').notNull(), // HH:mm
  endTime: text('end_time').notNull() // HH:mm
})

// ─── Students ───────────────────────────────────────────────────
export const studentsTable = sqliteTable('students', {
  id: int().primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  notes: text('notes'),
  isActive: int('is_active').notNull().default(1),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Enrollments (student ↔ group) ──────────────────────────────
export const enrollmentsTable = sqliteTable('enrollments', {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int('student_id')
    .notNull()
    .references(() => studentsTable.id),
  groupId: int('group_id')
    .notNull()
    .references(() => groupsTable.id),
  totalAmount: real('total_amount').notNull().default(0),
  paidAmount: real('paid_amount').notNull().default(0),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] })
    .notNull()
    .default('active'),
  enrolledAt: text('enrolled_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Payments ───────────────────────────────────────────────────
export const paymentsTable = sqliteTable('payments', {
  id: int().primaryKey({ autoIncrement: true }),
  enrollmentId: int('enrollment_id')
    .notNull()
    .references(() => enrollmentsTable.id),
  amount: real('amount').notNull(),
  method: text('method', { enum: ['cash', 'card', 'mixed'] })
    .notNull()
    .default('cash'),
  cashAmount: real('cash_amount').notNull().default(0),
  cardAmount: real('card_amount').notNull().default(0),
  notes: text('notes'),
  receiptNumber: text('receipt_number').notNull().unique(),
  paidBy: int('paid_by').references(() => employeesTable.id),
  paidAt: text('paid_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Finance Entries (income / expense ledger) ──────────────────
export const financeEntriesTable = sqliteTable('finance_entries', {
  id: int().primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  category: text('category', {
    enum: ['student_payment', 'salary_teacher', 'salary_employee', 'rent', 'supplies', 'other']
  }).notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  referenceType: text('reference_type', { enum: ['payment', 'salary', 'manual'] }),
  referenceId: int('reference_id'),
  createdBy: int('created_by').references(() => employeesTable.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Teacher Salaries ───────────────────────────────────────────
export const teacherSalariesTable = sqliteTable('teacher_salaries', {
  id: int().primaryKey({ autoIncrement: true }),
  teacherId: int('teacher_id')
    .notNull()
    .references(() => teachersTable.id),
  amount: real('amount').notNull(),
  period: text('period').notNull(), // e.g. "2026-06"
  notes: text('notes'),
  paidBy: int('paid_by').references(() => employeesTable.id),
  paidAt: text('paid_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Employee Salaries ──────────────────────────────────────────
export const employeeSalariesTable = sqliteTable('employee_salaries', {
  id: int().primaryKey({ autoIncrement: true }),
  employeeId: int('employee_id')
    .notNull()
    .references(() => employeesTable.id),
  amount: real('amount').notNull(),
  period: text('period').notNull(), // e.g. "2026-06"
  notes: text('notes'),
  paidBy: int('paid_by').references(() => employeesTable.id),
  paidAt: text('paid_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Activity logs (employee / admin actions) ───────────────────
export const activityLogsTable = sqliteTable('activity_logs', {
  id: int().primaryKey({ autoIncrement: true }),
  employeeId: int('employee_id').references(() => employeesTable.id),
  employeeName: text('employee_name').notNull(),
  employeeRole: text('employee_role', { enum: ['admin', 'employee'] }).notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: int('entity_id'),
  summary: text('summary').notNull(),
  details: text('details'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

// ─── Backups (history log) ──────────────────────────────────────
export const backupsTable = sqliteTable('backups', {
  id: int().primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull(),
  createdBy: int('created_by').references(() => employeesTable.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now','localtime'))`)
})

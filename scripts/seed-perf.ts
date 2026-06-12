/**
 * Fills the database with realistic test data for performance / pagination testing.
 *
 * Usage:
 *   npm run db:seed:perf                    # medium preset, append mode
 *   npm run db:seed:perf -- --scale=large   # more data
 *   npm run db:seed:perf -- --scale=small   # lighter dataset
 *   npm run db:seed:perf -- --reset         # wipe app data (keeps admin + settings) then seed
 *
 * Prerequisite: DB exists (app has run once, or `npm run db:migrate`)
 * Uses `DB_FILE_NAME` from `.env` (same as the app).
 */
import 'dotenv/config'
import { hashPassword } from '../src/main/modules/auth/auth.repository'
import { initializeDatabase, getDb } from '../src/main/db/db'
import { runBootstrapMigrations } from '../src/main/db/bootstrap-migrations'
import { createDefaultAdmin } from '../src/main/modules/auth/auth.repository'
import { getSettings } from '../src/main/modules/settings/settings.repository'
import {
  activityLogsTable,
  employeeSalariesTable,
  employeesTable,
  enrollmentsTable,
  financeEntriesTable,
  groupScheduleTable,
  groupsTable,
  paymentsTable,
  studentsTable,
  subjectsTable,
  teacherSalariesTable,
  teachersTable
} from '../src/main/db/models/schema'
import { DEFAULT_ADMIN_USERNAME } from '../src/shared/constants/auth'
import { eq, ne } from 'drizzle-orm'

type Scale = 'small' | 'medium' | 'large'

type PerfPreset = {
  subjects: number
  teachers: number
  groups: number
  students: number
  employees: number
  enrollmentsPerStudent: [number, number]
  paymentsPerEnrollment: [number, number]
  financeEntries: number
  teacherSalaries: number
  employeeSalaries: number
  activityLogs: number
}

const PRESETS: Record<Scale, PerfPreset> = {
  small: {
    subjects: 8,
    teachers: 12,
    groups: 20,
    students: 150,
    employees: 5,
    enrollmentsPerStudent: [1, 2],
    paymentsPerEnrollment: [1, 3],
    financeEntries: 80,
    teacherSalaries: 40,
    employeeSalaries: 15,
    activityLogs: 300
  },
  medium: {
    subjects: 15,
    teachers: 35,
    groups: 60,
    students: 600,
    employees: 10,
    enrollmentsPerStudent: [1, 2],
    paymentsPerEnrollment: [1, 4],
    financeEntries: 400,
    teacherSalaries: 120,
    employeeSalaries: 40,
    activityLogs: 1500
  },
  large: {
    subjects: 25,
    teachers: 70,
    groups: 150,
    students: 2500,
    employees: 20,
    enrollmentsPerStudent: [1, 3],
    paymentsPerEnrollment: [2, 6],
    financeEntries: 1500,
    teacherSalaries: 400,
    employeeSalaries: 120,
    activityLogs: 5000
  }
}

const SUBJECT_NAMES = [
  'رياضيات',
  'فيزياء',
  'كيمياء',
  'أحياء',
  'لغة عربية',
  'لغة إنجليزية',
  'تاريخ',
  'جغرافيا',
  'علوم',
  'حاسوب',
  'فلسفة',
  'اقتصاد',
  'إحصاء',
  'هندسة',
  'محاسبة',
  'تربية إسلامية',
  'فرنسية',
  'ألمانية',
  'فنون',
  'موسيقى',
  'قراءة',
  'كتابة',
  'منطق',
  'علم نفس',
  'اجتماعيات'
]

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const
const FIRST_NAMES = [
  'محمد',
  'أحمد',
  'علي',
  'فاطمة',
  'عائشة',
  'خالد',
  'سارة',
  'يوسف',
  'مريم',
  'عمر',
  'نور',
  'حسن',
  'ليلى',
  'إبراهيم',
  'زينب'
]
const LAST_NAMES = [
  'الفيتوري',
  'الورفلي',
  'الزاوي',
  'الطرابلسي',
  'السنوسي',
  'القذافي',
  'البرعصي',
  'الحاسي',
  'المصراتي',
  'الغرياني'
]

const ACTIONS = [
  'student.create',
  'student.update',
  'enrollment.create',
  'payment.create',
  'finance.create',
  'group.update',
  'teacher.create'
] as const

function parseArgs(): { scale: Scale; reset: boolean } {
  let scale: Scale = 'medium'
  let reset = false

  const envScale = process.env.SEED_SCALE as Scale | undefined
  if (envScale && envScale in PRESETS) scale = envScale

  if (process.env.SEED_RESET === '1' || process.env.SEED_RESET === 'true') {
    reset = true
  }

  for (const arg of process.argv.slice(2)) {
    if (arg === '--reset') reset = true
    else if (arg.startsWith('--scale=')) {
      const value = arg.split('=')[1] as Scale
      if (value in PRESETS) scale = value
      else console.warn(`Unknown scale "${value}", using medium.`)
    } else if (arg === '--small') scale = 'small'
    else if (arg === '--medium') scale = 'medium'
    else if (arg === '--large') scale = 'large'
  }

  return { scale, reset }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, '0')
}

function randomDateWithinMonths(monthsBack: number): string {
  const now = Date.now()
  const past = now - monthsBack * 30 * 24 * 60 * 60 * 1000
  const ts = past + Math.random() * (now - past)
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1, 2)
  const day = pad(d.getDate(), 2)
  const h = pad(d.getHours(), 2)
  const min = pad(d.getMinutes(), 2)
  const s = pad(d.getSeconds(), 2)
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

async function insertBatched<T extends Record<string, unknown>>(
  table: Parameters<ReturnType<typeof getDb>['insert']>[0],
  rows: T[],
  batchSize = 250
): Promise<void> {
  const db = getDb()
  for (let i = 0; i < rows.length; i += batchSize) {
    await db.insert(table).values(rows.slice(i, i + batchSize) as never[])
  }
}

async function resetAppData(): Promise<void> {
  const db = getDb()
  console.log('Resetting existing app data (keeping admin + settings)…')

  await db.delete(activityLogsTable)
  await db.delete(paymentsTable)
  await db.delete(financeEntriesTable)
  await db.delete(teacherSalariesTable)
  await db.delete(employeeSalariesTable)
  await db.delete(enrollmentsTable)
  await db.delete(groupScheduleTable)
  await db.delete(groupsTable)
  await db.delete(studentsTable)
  await db.delete(teachersTable)
  await db.delete(subjectsTable)
  await db.delete(employeesTable).where(ne(employeesTable.username, DEFAULT_ADMIN_USERNAME))
}

async function seedPerf(): Promise<void> {
  const url = process.env.DB_FILE_NAME
  if (!url) throw new Error('DB_FILE_NAME is missing in .env (e.g. file:local.db)')

  const { scale, reset } = parseArgs()
  const preset = PRESETS[scale]
  const started = performance.now()
  const runTag = reset ? '' : `-${Date.now().toString(36).slice(-6)}`

  initializeDatabase(url)
  await runBootstrapMigrations()
  await createDefaultAdmin()
  await getSettings()

  if (reset) await resetAppData()

  const db = getDb()
  const [admin] = await db.select().from(employeesTable).where(eq(employeesTable.username, DEFAULT_ADMIN_USERNAME)).limit(1)
  if (!admin) throw new Error('Default admin not found')

  let employees = await db.select().from(employeesTable)
  const employeeIds = employees.map((e) => e.id)
  const paidById = admin.id

  console.log(`\nSeeding performance data (scale: ${scale})…\n`)

  // ── Subjects ───────────────────────────────────────────────────
  const subjectRows = Array.from({ length: preset.subjects }, (_, i) => ({
    name: `${SUBJECT_NAMES[i % SUBJECT_NAMES.length]}${runTag}${i >= SUBJECT_NAMES.length ? ` ${i + 1}` : ''}`.trim(),
    description: `مادة تجريبية للاختبار #${i + 1}`,
    defaultPrice: randInt(200, 800),
    isActive: 1
  }))
  await insertBatched(subjectsTable, subjectRows)
  const subjects = await db.select().from(subjectsTable)
  console.log(`  subjects:      ${subjects.length}`)

  // ── Teachers ───────────────────────────────────────────────────
  const teacherRows = Array.from({ length: preset.teachers }, (_, i) => ({
    fullName: `أ. ${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pad(i + 1)}`,
    phone: `09${randInt(10000000, 99999999)}`,
    specialization: pick(SUBJECT_NAMES),
    isActive: Math.random() > 0.05 ? 1 : 0
  }))
  await insertBatched(teachersTable, teacherRows)
  const teachers = await db.select().from(teachersTable)
  console.log(`  teachers:      ${teachers.length}`)

  // ── Groups + schedule ──────────────────────────────────────────
  const groupRows: (typeof groupsTable.$inferInsert)[] = []
  for (let i = 0; i < preset.groups; i++) {
    groupRows.push({
      name: `مجموعة ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? `-${Math.floor(i / 26)}` : ''}`,
      subjectId: subjects[i % subjects.length].id,
      teacherId: teachers[i % teachers.length].id,
      capacity: pick([20, 25, 30, 35, 40]),
      isActive: Math.random() > 0.08 ? 1 : 0
    })
  }
  await insertBatched(groupsTable, groupRows)
  const groups = await db.select().from(groupsTable)

  const scheduleRows: (typeof groupScheduleTable.$inferInsert)[] = []
  for (const g of groups) {
    const day = pick(DAYS)
    const hour = randInt(8, 16)
    scheduleRows.push({
      groupId: g.id,
      dayOfWeek: day,
      startTime: `${pad(hour, 2)}:00`,
      endTime: `${pad(hour + 2, 2)}:00`
    })
  }
  await insertBatched(groupScheduleTable, scheduleRows)
  console.log(`  groups:        ${groups.length}`)

  // ── Students ───────────────────────────────────────────────────
  const studentRows = Array.from({ length: preset.students }, (_, i) => ({
    fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pad(i + 1, 5)}`,
    phone: `09${randInt(10000000, 99999999)}`,
    guardianName: `ولي أمر ${pad(i + 1, 5)}`,
    guardianPhone: `09${randInt(10000000, 99999999)}`,
    notes: i % 7 === 0 ? 'ملاحظة تجريبية' : null,
    isActive: Math.random() > 0.06 ? 1 : 0
  }))
  await insertBatched(studentsTable, studentRows)
  const students = await db.select().from(studentsTable)
  console.log(`  students:      ${students.length}`)

  // ── Extra employees ────────────────────────────────────────────
  const existingCount = employees.length
  if (existingCount - 1 < preset.employees) {
    const toCreate = preset.employees - (existingCount - 1)
    const newEmployees = Array.from({ length: toCreate }, (_, i) => ({
      fullName: `موظف تجريبي ${pad(existingCount + i)}`,
      username: `emp_perf${runTag}_${existingCount + i}`,
      passwordHash: hashPassword('employee123'),
      role: 'employee' as const,
      isActive: 1
    }))
    await insertBatched(employeesTable, newEmployees)
    employees = await db.select().from(employeesTable)
    employeeIds.length = 0
    employeeIds.push(...employees.map((e) => e.id))
  }
  console.log(`  employees:     ${employees.length}`)

  // ── Enrollments ────────────────────────────────────────────────
  const activeGroups = groups.filter((g) => g.isActive === 1)
  type EnrollmentSeed = {
    row: typeof enrollmentsTable.$inferInsert
    pendingPayments: Omit<typeof paymentsTable.$inferInsert, 'enrollmentId'>[]
  }

  const enrollmentSeeds: EnrollmentSeed[] = []
  const enrollmentKeys = new Set<string>()
  let receiptSeq = 1

  for (const student of students) {
    if (student.isActive !== 1) continue
    const count = randInt(...preset.enrollmentsPerStudent)
    const usedGroups = new Set<number>()

    for (let e = 0; e < count; e++) {
      const group = activeGroups[randInt(0, activeGroups.length - 1)]
      if (!group || usedGroups.has(group.id)) continue
      usedGroups.add(group.id)

      const key = `${student.id}:${group.id}`
      if (enrollmentKeys.has(key)) continue
      enrollmentKeys.add(key)

      const subject = subjects.find((s) => s.id === group.subjectId)
      const totalAmount = subject?.defaultPrice ?? randInt(300, 900)
      const status = pick(['active', 'active', 'active', 'completed', 'cancelled'] as const)
      const pendingPayments: EnrollmentSeed['pendingPayments'] = []
      let paidSoFar = 0

      if (status !== 'cancelled') {
        const paymentCount = randInt(...preset.paymentsPerEnrollment)
        for (let p = 0; p < paymentCount; p++) {
          const left = totalAmount - paidSoFar
          if (left <= 0) break

          const amount =
            p === paymentCount - 1
              ? Math.min(left, randInt(Math.floor(left * 0.3), left))
              : randInt(50, Math.max(50, Math.floor(left / (paymentCount - p))))

          if (amount <= 0) break
          paidSoFar += amount

          const method = pick(['cash', 'card', 'mixed'] as const)
          const cashAmount = method === 'card' ? 0 : method === 'cash' ? amount : randInt(0, amount)
          const cardAmount = amount - cashAmount

          pendingPayments.push({
            amount,
            method,
            cashAmount,
            cardAmount,
            notes: p === 0 ? null : 'دفعة تجريبية',
            receiptNumber: `REC-SEED${runTag}-${pad(receiptSeq++, 7)}`,
            paidBy: pick(employeeIds),
            paidAt: randomDateWithinMonths(12)
          })
        }
      }

      enrollmentSeeds.push({
        row: {
          studentId: student.id,
          groupId: group.id,
          totalAmount,
          paidAmount: Math.min(paidSoFar, totalAmount),
          status,
          enrolledAt: randomDateWithinMonths(18)
        },
        pendingPayments
      })
    }
  }

  await insertBatched(
    enrollmentsTable,
    enrollmentSeeds.map((s) => s.row)
  )
  const enrollments = await db.select().from(enrollmentsTable)
  console.log(`  enrollments:   ${enrollments.length}`)

  const enrollmentByKey = new Map(
    enrollments.map((e) => [`${e.studentId}:${e.groupId}`, e.id])
  )

  // ── Payments + finance income ──────────────────────────────────
  const paymentRows: (typeof paymentsTable.$inferInsert)[] = []
  const financeFromPayments: (typeof financeEntriesTable.$inferInsert)[] = []

  for (const seed of enrollmentSeeds) {
    const enrollmentId = enrollmentByKey.get(`${seed.row.studentId}:${seed.row.groupId}`)
    if (!enrollmentId) continue

    for (const payment of seed.pendingPayments) {
      paymentRows.push({ enrollmentId, ...payment })
      financeFromPayments.push({
        type: 'income',
        category: 'student_payment',
        amount: payment.amount,
        description: `دفعة طالب - إيصال ${payment.receiptNumber}`,
        referenceType: 'payment',
        createdBy: paidById,
        createdAt: payment.paidAt
      })
    }
  }

  await insertBatched(paymentsTable, paymentRows, 200)
  await insertBatched(financeEntriesTable, financeFromPayments, 200)
  console.log(`  payments:      ${paymentRows.length}`)

  // ── Manual finance entries ─────────────────────────────────────
  const manualFinance: (typeof financeEntriesTable.$inferInsert)[] = []
  for (let i = 0; i < preset.financeEntries; i++) {
    const isIncome = Math.random() > 0.65
    manualFinance.push({
      type: isIncome ? 'income' : 'expense',
      category: isIncome ? 'other' : pick(['rent', 'supplies', 'other'] as const),
      amount: randInt(100, 5000),
      description: `${isIncome ? 'إيراد' : 'مصروف'} تجريبي #${i + 1}`,
      referenceType: 'manual',
      createdBy: pick(employeeIds),
      createdAt: randomDateWithinMonths(24)
    })
  }
  await insertBatched(financeEntriesTable, manualFinance)
  console.log(`  finance:       ${manualFinance.length + financeFromPayments.length}`)

  // ── Salaries ───────────────────────────────────────────────────
  const teacherSalaryRows: (typeof teacherSalariesTable.$inferInsert)[] = []
  for (let i = 0; i < preset.teacherSalaries; i++) {
    const teacher = teachers[i % teachers.length]
    teacherSalaryRows.push({
      teacherId: teacher.id,
      amount: randInt(800, 4000),
      period: `2025-${pad((i % 12) + 1, 2)}`,
      notes: 'راتب تجريبي',
      paidBy: paidById,
      paidAt: randomDateWithinMonths(12)
    })
  }
  await insertBatched(teacherSalariesTable, teacherSalaryRows)

  const employeeSalaryRows: (typeof employeeSalariesTable.$inferInsert)[] = []
  const nonAdminEmployees = employees.filter((e) => e.username !== DEFAULT_ADMIN_USERNAME)
  for (let i = 0; i < preset.employeeSalaries; i++) {
    const emp = nonAdminEmployees[i % nonAdminEmployees.length]
    if (!emp) break
    employeeSalaryRows.push({
      employeeId: emp.id,
      amount: randInt(600, 2500),
      period: `2025-${pad((i % 12) + 1, 2)}`,
      paidBy: paidById,
      paidAt: randomDateWithinMonths(12)
    })
  }
  await insertBatched(employeeSalariesTable, employeeSalaryRows)
  console.log(`  salaries:      ${teacherSalaryRows.length + employeeSalaryRows.length}`)

  // ── Activity logs ──────────────────────────────────────────────
  const activityRows: (typeof activityLogsTable.$inferInsert)[] = []
  for (let i = 0; i < preset.activityLogs; i++) {
    const emp = pick(employees)
    activityRows.push({
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeRole: emp.role,
      action: pick(ACTIONS),
      entityType: 'test',
      entityId: randInt(1, 9999),
      summary: `عملية تجريبية #${i + 1}`,
      createdAt: randomDateWithinMonths(6)
    })
  }
  await insertBatched(activityLogsTable, activityRows)
  console.log(`  activity logs: ${activityRows.length}`)

  const elapsed = ((performance.now() - started) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s. Restart the app to test with this data.\n`)
  console.log('Login: admin / admin123')
  console.log('Test employees: emp_perf_* / employee123\n')
}

seedPerf().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

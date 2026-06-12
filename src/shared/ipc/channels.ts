/**
 * Central list of IPC channel names.
 * Main and preload import this so channel strings stay in one place.
 */
export const IPC_CHANNELS = {
  // ── Auth ──────────────────────────────
  AUTH_LOGIN: 'auth:login',
  AUTH_CHECK_FIRST_RUN: 'auth:check-first-run',
  AUTH_RESET_PASSWORD: 'auth:reset-password',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',

  // ── Employees ─────────────────────────
  EMPLOYEES_LIST: 'employees:list',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_GET: 'employees:get',
  EMPLOYEES_TOGGLE_ACTIVE: 'employees:toggle-active',

  // ── Students ──────────────────────────
  STUDENTS_LIST: 'students:list',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_GET: 'students:get',
  STUDENTS_SEARCH: 'students:search',
  STUDENTS_TOGGLE_ACTIVE: 'students:toggle-active',

  // ── Teachers ──────────────────────────
  TEACHERS_LIST: 'teachers:list',
  TEACHERS_CREATE: 'teachers:create',
  TEACHERS_UPDATE: 'teachers:update',
  TEACHERS_GET: 'teachers:get',
  TEACHERS_TOGGLE_ACTIVE: 'teachers:toggle-active',

  // ── Subjects ──────────────────────────
  SUBJECTS_LIST: 'subjects:list',
  SUBJECTS_CREATE: 'subjects:create',
  SUBJECTS_UPDATE: 'subjects:update',
  SUBJECTS_GET: 'subjects:get',
  SUBJECTS_TOGGLE_ACTIVE: 'subjects:toggle-active',

  // ── Groups ────────────────────────────
  GROUPS_LIST: 'groups:list',
  GROUPS_LIST_BY_SUBJECT: 'groups:list-by-subject',
  GROUPS_CREATE: 'groups:create',
  GROUPS_UPDATE: 'groups:update',
  GROUPS_GET: 'groups:get',
  GROUPS_STUDENTS: 'groups:students',
  GROUPS_TOGGLE_ACTIVE: 'groups:toggle-active',

  // ── Enrollments ───────────────────────
  ENROLLMENTS_CREATE: 'enrollments:create',
  ENROLLMENTS_LIST_BY_STUDENT: 'enrollments:list-by-student',
  ENROLLMENTS_LIST_BY_GROUP: 'enrollments:list-by-group',
  ENROLLMENTS_UPDATE_STATUS: 'enrollments:update-status',
  ENROLLMENTS_CHANGE_GROUP: 'enrollments:change-group',

  // ── Activity log ──────────────────────
  ACTIVITY_LIST: 'activity:list',

  // ── Payments ──────────────────────────
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_LIST_BY_ENROLLMENT: 'payments:list-by-enrollment',
  PAYMENTS_LIST_BY_STUDENT: 'payments:list-by-student',
  PAYMENTS_LIST_ALL: 'payments:list-all',
  PAYMENTS_GET_RECEIPT: 'payments:get-receipt',

  // ── Finances ──────────────────────────
  FINANCE_LIST: 'finance:list',
  FINANCE_CREATE: 'finance:create',
  FINANCE_SUMMARY: 'finance:summary',
  FINANCE_DELETE: 'finance:delete',

  // ── Salaries ──────────────────────────
  SALARIES_PAY_TEACHER: 'salaries:pay-teacher',
  SALARIES_PAY_EMPLOYEE: 'salaries:pay-employee',
  SALARIES_LIST_TEACHER: 'salaries:list-teacher',
  SALARIES_LIST_EMPLOYEE: 'salaries:list-employee',

  // ── Settings ──────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_BACKUP: 'settings:backup',
  SETTINGS_RESTORE: 'settings:restore',
  SETTINGS_UPLOAD_LOGO: 'settings:upload-logo',
  SETTINGS_GET_LOGO: 'settings:get-logo',
  SETTINGS_SELECT_BACKUP_FOLDER: 'settings:select-backup-folder',

  // ── Dashboard ─────────────────────────
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_RECENT_PAYMENTS: 'dashboard:recent-payments'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

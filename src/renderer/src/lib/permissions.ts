import type { EmployeeDto } from '../../../shared/types/employee'

export type AppRole = EmployeeDto['role']
export type LoginIntent = 'admin' | 'employee'

export type NavIconKey =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'subjects'
  | 'groups'
  | 'payments'
  | 'management'
  | 'activity'
  | 'settings'

export type NavItem = {
  path: string
  label: string
  icon: NavIconKey
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/app/dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { path: '/app/students', label: 'الطلاب', icon: 'students' },
  { path: '/app/teachers', label: 'الأساتذة', icon: 'teachers' },
  { path: '/app/subjects', label: 'المواد', icon: 'subjects' },
  { path: '/app/groups', label: 'المجموعات', icon: 'groups' },
  { path: '/app/payments', label: 'المدفوعات', icon: 'payments' },
  { path: '/app/management', label: 'المالية والموظفين', icon: 'management', adminOnly: true },
  { path: '/app/activity', label: 'سجل الحركات', icon: 'activity', adminOnly: true },
  { path: '/app/settings', label: 'الإعدادات', icon: 'settings', adminOnly: true }
]

const ADMIN_PATHS = new Set([
  '/app/management',
  '/app/activity',
  '/app/finances',
  '/app/salaries',
  '/app/employees',
  '/app/settings'
])

export function isAdmin(role: AppRole): boolean {
  return role === 'admin'
}

export function canAccessRoute(path: string, role: AppRole): boolean {
  const normalized = path.split('?')[0]
  if (ADMIN_PATHS.has(normalized) && !isAdmin(role)) return false
  const item = NAV_ITEMS.find((n) => n.path === normalized)
  if (!item) return true
  if (item.adminOnly && !isAdmin(role)) return false
  return true
}

export function navItemsForRole(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin(role))
}

export function roleMatchesIntent(employeeRole: AppRole, intent: LoginIntent): boolean {
  if (intent === 'admin') return employeeRole === 'admin'
  return employeeRole === 'employee'
}

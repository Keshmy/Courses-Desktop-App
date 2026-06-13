import { registerAuthIpcHandlers } from '../modules/auth/auth.ipc'
import { registerStudentsIpcHandlers } from '../modules/students/students.ipc'
import { registerEnrollmentsIpcHandlers } from '../modules/enrollments/enrollments.ipc'
import { registerTeachersIpcHandlers } from '../modules/teachers/teachers.ipc'
import { registerSubjectsIpcHandlers } from '../modules/subjects/subjects.ipc'
import { registerGroupsIpcHandlers } from '../modules/groups/groups.ipc'
import { registerPaymentsIpcHandlers } from '../modules/payments/payments.ipc'
import { registerFinancesIpcHandlers } from '../modules/finances/finances.ipc'
import { registerSettingsIpcHandlers } from '../modules/settings/settings.ipc'
import { registerActivityIpcHandlers } from '../modules/activity/activity.ipc'
import {
  installLicenseGuard,
  registerActivationIpcHandlers
} from '../modules/activation/activation.ipc'

/**
 * Single entry point to register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  installLicenseGuard()
  registerActivationIpcHandlers()
  registerAuthIpcHandlers()
  registerStudentsIpcHandlers()
  registerEnrollmentsIpcHandlers()
  registerActivityIpcHandlers()
  registerTeachersIpcHandlers()
  registerSubjectsIpcHandlers()
  registerGroupsIpcHandlers()
  registerPaymentsIpcHandlers()
  registerFinancesIpcHandlers()
  registerSettingsIpcHandlers()
}

import * as activityRepo from '../modules/activity/activity-log.repository'
import * as authRepo from '../modules/auth/auth.repository'

export async function audit(
  performedBy: number | undefined,
  action: string,
  entityType: string,
  summary: string,
  entityId?: number,
  details?: Record<string, unknown>
): Promise<void> {
  if (!performedBy) return

  const employee = await authRepo.getEmployee(performedBy)
  if (!employee) return

  await activityRepo.logActivity({
    employeeId: employee.id,
    employeeName: employee.fullName,
    employeeRole: employee.role,
    action,
    entityType,
    entityId,
    summary,
    details
  })
}

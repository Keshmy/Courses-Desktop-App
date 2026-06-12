import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  EnrollmentDto,
  CreateEnrollmentRequest,
  ChangeEnrollmentGroupRequest
} from '../../../shared/types/payment'
import { audit } from '../../lib/audit'
import * as repo from './enrollment.repository'

function toDto(row: repo.EnrollmentWithDetails): EnrollmentDto {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    groupId: row.groupId,
    groupName: row.groupName,
    subjectName: row.subjectName,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    remainingAmount: row.totalAmount - row.paidAmount,
    status: row.status,
    enrolledAt: row.enrolledAt
  }
}

export function registerEnrollmentsIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.ENROLLMENTS_CREATE,
    async (_event, data: CreateEnrollmentRequest, performedBy?: number): Promise<EnrollmentDto> => {
      const created = await repo.createEnrollment(data)
      const full = await repo.getEnrollment(created.id)
      if (!full) throw new Error(`فشل في جلب التسجيل: ${created.id}`)

      await audit(
        performedBy,
        'enrollment.create',
        'enrollment',
        `تسجيل ${full.studentName} في ${full.subjectName} — ${full.groupName}`,
        full.id,
        { studentId: full.studentId, groupId: full.groupId, totalAmount: full.totalAmount }
      )

      return toDto(full)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ENROLLMENTS_LIST_BY_STUDENT,
    async (_event, studentId: number): Promise<EnrollmentDto[]> => {
      const rows = await repo.listByStudent(studentId)
      return rows.map(toDto)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ENROLLMENTS_LIST_BY_GROUP,
    async (_event, groupId: number): Promise<EnrollmentDto[]> => {
      const rows = await repo.listByGroup(groupId)
      return rows.map(toDto)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ENROLLMENTS_UPDATE_STATUS,
    async (
      _event,
      id: number,
      status: 'active' | 'completed' | 'cancelled',
      performedBy?: number
    ): Promise<EnrollmentDto> => {
      const before = await repo.getEnrollment(id)
      await repo.updateStatus(id, status)
      const full = await repo.getEnrollment(id)
      if (!full) throw new Error(`فشل في جلب التسجيل: ${id}`)

      await audit(
        performedBy,
        'enrollment.status',
        'enrollment',
        `تغيير حالة تسجيل ${full.studentName} إلى ${status}`,
        full.id,
        { previousStatus: before?.status, status }
      )

      return toDto(full)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ENROLLMENTS_CHANGE_GROUP,
    async (
      _event,
      data: ChangeEnrollmentGroupRequest,
      performedBy?: number
    ): Promise<EnrollmentDto> => {
      const before = await repo.getEnrollment(data.enrollmentId)
      const updated = await repo.changeGroup(data.enrollmentId, data.newGroupId)

      await audit(
        performedBy,
        'enrollment.change_group',
        'enrollment',
        `نقل ${updated.studentName} من ${before?.groupName ?? '—'} إلى ${updated.groupName}`,
        updated.id,
        {
          studentId: updated.studentId,
          fromGroupId: before?.groupId,
          toGroupId: updated.groupId
        }
      )

      return toDto(updated)
    }
  )
}

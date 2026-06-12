import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  GroupDto,
  GroupListItemDto,
  ScheduleSlotDto,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../../../shared/types/group'
import { audit } from '../../lib/audit'
import * as repo from './group.repository'

/**
 * Maps a joined group row to GroupListItemDto.
 */
function toListItemDto(row: repo.GroupWithDetails): GroupListItemDto {
  return {
    id: row.id,
    name: row.name,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    capacity: row.capacity,
    enrolledCount: row.enrolledCount,
    isActive: row.isActive === 1
  }
}

/**
 * Maps a schedule row to ScheduleSlotDto.
 */
function toScheduleSlotDto(row: repo.ScheduleRow): ScheduleSlotDto {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime
  }
}

/**
 * Maps a full group (with schedule) to GroupDto.
 */
function toGroupDto(
  row: repo.GroupWithDetails & { schedule: repo.ScheduleRow[] }
): GroupDto {
  return {
    id: row.id,
    name: row.name,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    capacity: row.capacity,
    enrolledCount: row.enrolledCount,
    schedule: row.schedule.map(toScheduleSlotDto),
    isActive: row.isActive === 1,
    createdAt: row.createdAt
  }
}

/**
 * Registers group-related `ipcMain.handle` listeners.
 */
export function registerGroupsIpcHandlers(): void {
  // ── List all groups ───────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_LIST,
    async (): Promise<GroupListItemDto[]> => {
      const rows = await repo.listGroups()
      return rows.map(toListItemDto)
    }
  )

  // ── List groups by subject ────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_LIST_BY_SUBJECT,
    async (_event, subjectId: number): Promise<GroupListItemDto[]> => {
      const rows = await repo.listBySubject(subjectId)
      return rows.map(toListItemDto)
    }
  )

  // ── Create group ──────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_CREATE,
    async (_event, data: CreateGroupRequest, performedBy?: number): Promise<GroupDto | null> => {
      await repo.createGroup(data)
      // Reload the freshly created group with all joins
      const groups = await repo.listGroups()
      const created = groups[groups.length - 1]
      if (!created) return null
      const full = await repo.getGroup(created.id)
      if (full) {
        await audit(
          performedBy,
          'group.create',
          'group',
          `إضافة مجموعة: ${full.subjectName} — ${full.name}`,
          full.id
        )
      }
      return full ? toGroupDto(full) : null
    }
  )

  // ── Update group ──────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_UPDATE,
    async (_event, data: UpdateGroupRequest, performedBy?: number): Promise<GroupDto | null> => {
      await repo.updateGroup(data)
      const full = await repo.getGroup(data.id)
      if (full) {
        await audit(
          performedBy,
          'group.update',
          'group',
          `تعديل مجموعة: ${full.subjectName} — ${full.name}`,
          full.id
        )
      }
      return full ? toGroupDto(full) : null
    }
  )

  // ── Get single group ──────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_GET,
    async (_event, id: number): Promise<GroupDto | null> => {
      const full = await repo.getGroup(id)
      return full ? toGroupDto(full) : null
    }
  )

  // ── Get group students ────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_STUDENTS,
    async (_event, groupId: number) => {
      return repo.getGroupStudents(groupId)
    }
  )

  // ── Toggle active status ──────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.GROUPS_TOGGLE_ACTIVE,
    async (_event, id: number, performedBy?: number): Promise<boolean> => {
      const updated = await repo.toggleActive(id)
      const full = await repo.getGroup(id)
      await audit(
        performedBy,
        'group.toggle',
        'group',
        `${updated.isActive ? 'تفعيل' : 'تعطيل'} مجموعة: ${full?.name ?? id}`,
        id
      )
      return updated.isActive === 1
    }
  )
}

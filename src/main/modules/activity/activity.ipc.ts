import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  ActivityLogDto,
  ActivityLogFilters,
  ActivityLogListResult
} from '../../../shared/types/activity-log'
import * as repo from './activity-log.repository'

function toDto(row: repo.ActivityLogRow): ActivityLogDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeRole: row.employeeRole,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    details: row.details,
    createdAt: row.createdAt
  }
}

export function registerActivityIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.ACTIVITY_LIST,
    async (_event, filters?: ActivityLogFilters): Promise<ActivityLogListResult> => {
      const { items, total } = await repo.listActivityLogs(filters)
      return { items: items.map(toDto), total }
    }
  )
}

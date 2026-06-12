import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  SubjectDto,
  CreateSubjectRequest,
  UpdateSubjectRequest
} from '../../../shared/types/subject'
import { audit } from '../../lib/audit'
import * as subjectRepo from './subject.repository'

/**
 * Maps a DB row to the IPC contract type.
 * isActive is stored as 0/1 in SQLite, converted to boolean for the renderer.
 */
function toDto(row: subjectRepo.SubjectRow): SubjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultPrice: row.defaultPrice,
    isActive: row.isActive === 1,
    createdAt: row.createdAt
  }
}

/**
 * Registers subject-related `ipcMain.handle` listeners.
 */
export function registerSubjectsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SUBJECTS_LIST, async (): Promise<SubjectDto[]> => {
    const rows = await subjectRepo.listSubjects()
    return rows.map(toDto)
  })

  ipcMain.handle(
    IPC_CHANNELS.SUBJECTS_GET,
    async (_event, id: number): Promise<SubjectDto | null> => {
      const row = await subjectRepo.getSubject(id)
      return row ? toDto(row) : null
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SUBJECTS_CREATE,
    async (_event, data: CreateSubjectRequest, performedBy?: number): Promise<SubjectDto> => {
      const row = await subjectRepo.createSubject(data)
      await audit(performedBy, 'subject.create', 'subject', `إضافة مادة: ${row.name}`, row.id)
      return toDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SUBJECTS_UPDATE,
    async (_event, data: UpdateSubjectRequest, performedBy?: number): Promise<SubjectDto> => {
      const row = await subjectRepo.updateSubject(data)
      await audit(performedBy, 'subject.update', 'subject', `تعديل مادة: ${row.name}`, row.id)
      return toDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SUBJECTS_TOGGLE_ACTIVE,
    async (_event, id: number, performedBy?: number): Promise<SubjectDto> => {
      const row = await subjectRepo.toggleActive(id)
      await audit(
        performedBy,
        'subject.toggle',
        'subject',
        `${row.isActive ? 'تفعيل' : 'تعطيل'} مادة: ${row.name}`,
        row.id
      )
      return toDto(row)
    }
  )
}

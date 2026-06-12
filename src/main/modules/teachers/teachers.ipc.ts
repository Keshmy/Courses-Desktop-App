import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  TeacherDto,
  CreateTeacherRequest,
  UpdateTeacherRequest
} from '../../../shared/types/teacher'
import { audit } from '../../lib/audit'
import * as teacherRepo from './teacher.repository'

/**
 * Maps a DB row to the IPC contract type.
 * isActive is stored as 0/1 in SQLite, converted to boolean for the renderer.
 */
function toDto(row: teacherRepo.TeacherRow): TeacherDto {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    specialization: row.specialization,
    isActive: row.isActive === 1,
    createdAt: row.createdAt
  }
}

/**
 * Registers teacher-related `ipcMain.handle` listeners.
 */
export function registerTeachersIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TEACHERS_LIST, async (): Promise<TeacherDto[]> => {
    const rows = await teacherRepo.listTeachers()
    return rows.map(toDto)
  })

  ipcMain.handle(
    IPC_CHANNELS.TEACHERS_GET,
    async (_event, id: number): Promise<TeacherDto | null> => {
      const row = await teacherRepo.getTeacher(id)
      return row ? toDto(row) : null
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TEACHERS_CREATE,
    async (_event, data: CreateTeacherRequest, performedBy?: number): Promise<TeacherDto> => {
      const row = await teacherRepo.createTeacher(data)
      await audit(performedBy, 'teacher.create', 'teacher', `إضافة مدرس: ${row.fullName}`, row.id)
      return toDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TEACHERS_UPDATE,
    async (_event, data: UpdateTeacherRequest, performedBy?: number): Promise<TeacherDto> => {
      const row = await teacherRepo.updateTeacher(data)
      await audit(performedBy, 'teacher.update', 'teacher', `تعديل مدرس: ${row.fullName}`, row.id)
      return toDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TEACHERS_TOGGLE_ACTIVE,
    async (_event, id: number, performedBy?: number): Promise<TeacherDto> => {
      const row = await teacherRepo.toggleActive(id)
      await audit(
        performedBy,
        'teacher.toggle',
        'teacher',
        `${row.isActive ? 'تفعيل' : 'تعطيل'} مدرس: ${row.fullName}`,
        row.id
      )
      return toDto(row)
    }
  )
}

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type { StudentDto, CreateStudentRequest, UpdateStudentRequest } from '../../../shared/types/student'
import { audit } from '../../lib/audit'
import * as repo from './student.repository'

function toDto(row: repo.StudentRow): StudentDto {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    notes: row.notes,
    isActive: row.isActive === 1,
    createdAt: row.createdAt
  }
}

export function registerStudentsIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STUDENTS_LIST, async (): Promise<StudentDto[]> => {
    const rows = await repo.listStudents()
    return rows.map(toDto)
  })

  ipcMain.handle(IPC_CHANNELS.STUDENTS_GET, async (_event, id: number): Promise<StudentDto | null> => {
    const row = await repo.getStudent(id)
    return row ? toDto(row) : null
  })

  ipcMain.handle(
    IPC_CHANNELS.STUDENTS_CREATE,
    async (_event, data: CreateStudentRequest, performedBy?: number): Promise<StudentDto> => {
      const row = await repo.createStudent(data)
      await audit(
        performedBy,
        'student.create',
        'student',
        `إضافة طالب: ${row.fullName}`,
        row.id
      )
      return toDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.STUDENTS_UPDATE,
    async (_event, data: UpdateStudentRequest, performedBy?: number): Promise<StudentDto> => {
      const row = await repo.updateStudent(data)
      await audit(
        performedBy,
        'student.update',
        'student',
        `تعديل بيانات الطالب: ${row.fullName}`,
        row.id
      )
      return toDto(row)
    }
  )

  ipcMain.handle(IPC_CHANNELS.STUDENTS_SEARCH, async (_event, query: string): Promise<StudentDto[]> => {
    const rows = await repo.searchStudents(query)
    return rows.map(toDto)
  })

  ipcMain.handle(
    IPC_CHANNELS.STUDENTS_TOGGLE_ACTIVE,
    async (_event, id: number, performedBy?: number): Promise<StudentDto> => {
      const before = await repo.getStudent(id)
      const row = await repo.toggleActive(id)
      await audit(
        performedBy,
        'student.toggle',
        'student',
        `${row.isActive ? 'تفعيل' : 'تعطيل'} الطالب: ${row.fullName}`,
        row.id,
        { wasActive: before?.isActive === 1 }
      )
      return toDto(row)
    }
  )
}

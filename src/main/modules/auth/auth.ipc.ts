import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  EmployeeDto,
  LoginRequest,
  LoginResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse
} from '../../../shared/types/employee'
import { audit } from '../../lib/audit'
import * as repo from './auth.repository'

// ── Row → DTO mapper (never expose passwordHash) ────────────────

function toDto(row: repo.EmployeeRow): EmployeeDto {
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    role: row.role,
    isActive: row.isActive === 1,
    createdAt: row.createdAt
  }
}

// ── Register all auth & employee IPC handlers ───────────────────

export function registerAuthIpcHandlers(): void {
  // ── Auth: login ──────────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    async (_event, request: LoginRequest): Promise<LoginResponse> => {
      const employee = await repo.findByUsername(request.username)

      if (!employee) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
      }

      const valid = repo.verifyPassword(request.password, employee.passwordHash)
      if (!valid) {
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
      }

      if (employee.isActive !== 1) {
        return { success: false, error: 'هذا الحساب معطّل، تواصل مع المدير' }
      }

      return { success: true, employee: toDto(employee) }
    }
  )

  // ── Auth: check first run ────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHECK_FIRST_RUN,
    async (): Promise<boolean> => {
      const employees = await repo.listEmployees()
      if (employees.length === 0) {
        await repo.createDefaultAdmin()
        return true
      }
      return false
    }
  )

  // ── Auth: reset password (login screen, not for default admin) ─
  ipcMain.handle(
    IPC_CHANNELS.AUTH_RESET_PASSWORD,
    async (_event, request: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
      return repo.resetPassword(request)
    }
  )

  // ── Auth: change own password (logged-in user, including admin) ─
  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
    async (_event, request: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
      return repo.changeOwnPassword(request)
    }
  )

  // ── Employees: list ──────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.EMPLOYEES_LIST, async (): Promise<EmployeeDto[]> => {
    const rows = await repo.listEmployees()
    return rows.map(toDto)
  })

  // ── Employees: get ───────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.EMPLOYEES_GET,
    async (_event, id: number): Promise<EmployeeDto | null> => {
      const row = await repo.getEmployee(id)
      return row ? toDto(row) : null
    }
  )

  // ── Employees: create ────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.EMPLOYEES_CREATE,
    async (_event, data: CreateEmployeeRequest, performedBy?: number): Promise<EmployeeDto> => {
      const row = await repo.createEmployee(data)
      await audit(
        performedBy,
        'employee.create',
        'employee',
        `إضافة موظف: ${row.fullName} (${row.username})`,
        row.id
      )
      return toDto(row)
    }
  )

  // ── Employees: update ────────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.EMPLOYEES_UPDATE,
    async (_event, data: UpdateEmployeeRequest, performedBy?: number): Promise<EmployeeDto | null> => {
      try {
        const row = await repo.updateEmployee(data)
        if (row) {
          await audit(
            performedBy,
            'employee.update',
            'employee',
            `تعديل موظف: ${row.fullName}`,
            row.id
          )
        }
        return row ? toDto(row) : null
      } catch (err) {
        throw err instanceof Error ? err : new Error('فشل تحديث الموظف')
      }
    }
  )

  // ── Employees: toggle active ─────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.EMPLOYEES_TOGGLE_ACTIVE,
    async (_event, id: number, performedBy?: number): Promise<EmployeeDto | null> => {
      const row = await repo.toggleActive(id)
      if (row) {
        await audit(
          performedBy,
          'employee.toggle',
          'employee',
          `${row.isActive ? 'تفعيل' : 'تعطيل'} موظف: ${row.fullName}`,
          row.id
        )
      }
      return row ? toDto(row) : null
    }
  )
}

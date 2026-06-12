import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  FinanceEntryDto,
  FinanceSummaryDto,
  CreateFinanceEntryRequest,
  TeacherSalaryDto,
  EmployeeSalaryDto,
  PaySalaryRequest
} from '../../../shared/types/finance'
import { audit } from '../../lib/audit'
import * as repo from './finance.repository'

// ── Row → DTO mappers ───────────────────────────────────────────

function toFinanceEntryDto(row: repo.FinanceEntryWithCreator): FinanceEntryDto {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    description: row.description,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    createdByName: row.createdByName,
    createdAt: row.createdAt
  }
}

function toTeacherSalaryDto(row: repo.TeacherSalaryWithName): TeacherSalaryDto {
  return {
    id: row.id,
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    amount: row.amount,
    period: row.period,
    notes: row.notes,
    paidByName: row.paidByName,
    paidAt: row.paidAt
  }
}

function toEmployeeSalaryDto(row: repo.EmployeeSalaryWithName): EmployeeSalaryDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    amount: row.amount,
    period: row.period,
    notes: row.notes,
    paidByName: row.paidByName,
    paidAt: row.paidAt
  }
}

// ── Handler registration ────────────────────────────────────────

export function registerFinancesIpcHandlers(): void {
  // ── Finance entries ─────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.FINANCE_LIST,
    async (
      _,
      filters?: { type?: 'income' | 'expense'; dateFrom?: string; dateTo?: string }
    ): Promise<FinanceEntryDto[]> => {
      const rows = await repo.listEntries(filters)
      return rows.map(toFinanceEntryDto)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.FINANCE_CREATE,
    async (_, data: CreateFinanceEntryRequest): Promise<FinanceEntryDto> => {
      const row = await repo.createEntry(data)
      // Re-fetch with join for createdByName
      const entries = await repo.listEntries()
      const entry = entries.find((e) => e.id === row.id)!
      const dto = toFinanceEntryDto(entry)
      await audit(
        data.createdBy,
        'finance.create',
        'finance',
        `${data.type === 'income' ? 'إيراد' : 'مصروف'}: ${data.amount} د.ل`,
        dto.id,
        { category: data.category }
      )
      return dto
    }
  )

  ipcMain.handle(IPC_CHANNELS.FINANCE_SUMMARY, async (): Promise<FinanceSummaryDto> => {
    return repo.getSummary()
  })

  ipcMain.handle(
    IPC_CHANNELS.FINANCE_DELETE,
    async (_, id: number, performedBy?: number): Promise<boolean> => {
      await repo.deleteEntry(id)
      await audit(performedBy, 'finance.delete', 'finance', `حذف قيد مالي #${id}`, id)
      return true
    }
  )

  // ── Salaries ────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.SALARIES_PAY_TEACHER,
    async (_, data: PaySalaryRequest): Promise<TeacherSalaryDto> => {
      await repo.payTeacherSalary({
        teacherId: data.targetId,
        amount: data.amount,
        period: data.period,
        notes: data.notes,
        paidBy: data.paidBy
      })
      // Fetch the latest salary for this teacher to get joined name
      const salaries = await repo.listTeacherSalaries(data.targetId)
      const dto = toTeacherSalaryDto(salaries[0])
      await audit(
        data.paidBy,
        'salary.pay_teacher',
        'salary',
        `دفع راتب مدرس ${dto.teacherName}: ${dto.amount} د.ل`,
        dto.id,
        { period: dto.period }
      )
      return dto
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SALARIES_PAY_EMPLOYEE,
    async (_, data: PaySalaryRequest): Promise<EmployeeSalaryDto> => {
      await repo.payEmployeeSalary({
        employeeId: data.targetId,
        amount: data.amount,
        period: data.period,
        notes: data.notes,
        paidBy: data.paidBy
      })
      const salaries = await repo.listEmployeeSalaries(data.targetId)
      const dto = toEmployeeSalaryDto(salaries[0])
      await audit(
        data.paidBy,
        'salary.pay_employee',
        'salary',
        `دفع راتب موظف ${dto.employeeName}: ${dto.amount} د.ل`,
        dto.id,
        { period: dto.period }
      )
      return dto
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SALARIES_LIST_TEACHER,
    async (_, teacherId?: number): Promise<TeacherSalaryDto[]> => {
      const rows = await repo.listTeacherSalaries(teacherId)
      return rows.map(toTeacherSalaryDto)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SALARIES_LIST_EMPLOYEE,
    async (_, employeeId?: number): Promise<EmployeeSalaryDto[]> => {
      const rows = await repo.listEmployeeSalaries(employeeId)
      return rows.map(toEmployeeSalaryDto)
    }
  )
}

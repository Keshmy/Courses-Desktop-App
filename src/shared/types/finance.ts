/**
 * Finance DTOs sent over IPC.
 */
export type FinanceEntryDto = {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  referenceType: string | null
  referenceId: number | null
  createdByName: string | null
  createdAt: string
}

export type CreateFinanceEntryRequest = {
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  createdBy: number
}

export type FinanceSummaryDto = {
  totalIncome: number
  totalExpenses: number
  balance: number
  monthlyIncome: number
  monthlyExpenses: number
}

export type TeacherSalaryDto = {
  id: number
  teacherId: number
  teacherName: string
  amount: number
  period: string
  notes: string | null
  paidByName: string | null
  paidAt: string
}

export type EmployeeSalaryDto = {
  id: number
  employeeId: number
  employeeName: string
  amount: number
  period: string
  notes: string | null
  paidByName: string | null
  paidAt: string
}

export type PaySalaryRequest = {
  targetId: number // teacher or employee id
  amount: number
  period: string
  notes?: string
  paidBy: number
}

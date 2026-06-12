/**
 * Settings DTOs sent over IPC.
 */
export type SettingsDto = {
  id: number
  centerName: string
  centerLogoPath: string | null
  autoBackupOnClose: boolean
  autoBackupDirectory: string | null
}

export type UpdateSettingsRequest = {
  centerName?: string
  centerLogoPath?: string
  autoBackupOnClose?: boolean
  autoBackupDirectory?: string | null
}

export type DashboardStatsDto = {
  activeStudents: number
  activeGroups: number
  activeTeachers: number
  monthlyIncome: number
  monthlyExpenses: number
  pendingPayments: number
}

export type RecentPaymentDto = {
  id: number
  amount: number
  method: string
  receiptNumber: string
  paidAt: string
  studentName: string
  subjectName: string
}

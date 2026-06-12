export type ActivityLogDto = {
  id: number
  employeeId: number | null
  employeeName: string
  employeeRole: 'admin' | 'employee'
  action: string
  entityType: string
  entityId: number | null
  summary: string
  details: string | null
  createdAt: string
}

export type ActivityLogFilters = {
  limit?: number
  offset?: number
  employeeId?: number
  role?: 'admin' | 'employee'
  dateFrom?: string
  dateTo?: string
  query?: string
}

export type ActivityLogListResult = {
  items: ActivityLogDto[]
  total: number
}

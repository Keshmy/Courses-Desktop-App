/**
 * Auth DTOs sent over IPC.
 */
export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  success: boolean
  employee?: EmployeeDto
  error?: string
}

export type EmployeeDto = {
  id: number
  fullName: string
  username: string
  role: 'admin' | 'employee'
  isActive: boolean
  createdAt: string
}

export type CreateEmployeeRequest = {
  fullName: string
  username: string
  password: string
  role: 'admin' | 'employee'
}

export type UpdateEmployeeRequest = {
  id: number
  fullName?: string
  username?: string
  password?: string
  role?: 'admin' | 'employee'
}

export type ResetPasswordRequest = {
  username: string
  fullName: string
  newPassword: string
  role: 'admin' | 'employee'
}

export type ResetPasswordResponse = {
  success: boolean
  error?: string
}

export type ChangePasswordRequest = {
  employeeId: number
  currentPassword: string
  newPassword: string
}

export type ChangePasswordResponse = {
  success: boolean
  error?: string
}

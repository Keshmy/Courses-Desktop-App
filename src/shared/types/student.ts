/**
 * Student DTOs sent over IPC.
 */
export type StudentDto = {
  id: number
  fullName: string
  phone: string | null
  guardianName: string | null
  guardianPhone: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export type CreateStudentRequest = {
  fullName: string
  phone?: string
  guardianName?: string
  guardianPhone?: string
  notes?: string
}

export type UpdateStudentRequest = {
  id: number
  fullName?: string
  phone?: string
  guardianName?: string
  guardianPhone?: string
  notes?: string
}

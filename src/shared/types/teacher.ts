/**
 * Teacher DTOs sent over IPC.
 */
export type TeacherDto = {
  id: number
  fullName: string
  phone: string | null
  specialization: string | null
  isActive: boolean
  createdAt: string
}

export type CreateTeacherRequest = {
  fullName: string
  phone?: string
  specialization?: string
}

export type UpdateTeacherRequest = {
  id: number
  fullName?: string
  phone?: string
  specialization?: string
}

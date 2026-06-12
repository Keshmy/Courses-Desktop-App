/**
 * Subject DTOs sent over IPC.
 */
export type SubjectDto = {
  id: number
  name: string
  description: string | null
  defaultPrice: number
  isActive: boolean
  createdAt: string
}

export type CreateSubjectRequest = {
  name: string
  description?: string
  defaultPrice: number
}

export type UpdateSubjectRequest = {
  id: number
  name?: string
  description?: string
  defaultPrice?: number
}

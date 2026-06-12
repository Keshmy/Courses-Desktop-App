/**
 * Group & Schedule DTOs sent over IPC.
 */
export type ScheduleSlotDto = {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
}

export type GroupDto = {
  id: number
  name: string
  subjectId: number
  subjectName: string
  teacherId: number
  teacherName: string
  capacity: number
  enrolledCount: number
  schedule: ScheduleSlotDto[]
  isActive: boolean
  createdAt: string
}

export type GroupListItemDto = {
  id: number
  name: string
  subjectId: number
  subjectName: string
  teacherId: number
  teacherName: string
  capacity: number
  enrolledCount: number
  isActive: boolean
}

export type CreateGroupRequest = {
  name: string
  subjectId: number
  teacherId: number
  capacity: number
  schedule: { dayOfWeek: string; startTime: string; endTime: string }[]
}

export type UpdateGroupRequest = {
  id: number
  name?: string
  teacherId?: number
  capacity?: number
  schedule?: { dayOfWeek: string; startTime: string; endTime: string }[]
}

/** طالب مسجّل في مجموعة (من groups:students) */
export type GroupStudentDto = {
  enrollmentId: number
  studentId: number
  fullName: string
  phone: string | null
  totalAmount: number
  paidAmount: number
  status: string
  enrolledAt: string
}

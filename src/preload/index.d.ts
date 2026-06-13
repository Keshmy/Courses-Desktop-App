import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  LoginRequest,
  LoginResponse,
  EmployeeDto,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse
} from '../shared/types/employee'
import type {
  StudentDto,
  CreateStudentRequest,
  UpdateStudentRequest
} from '../shared/types/student'
import type {
  TeacherDto,
  CreateTeacherRequest,
  UpdateTeacherRequest
} from '../shared/types/teacher'
import type {
  SubjectDto,
  CreateSubjectRequest,
  UpdateSubjectRequest
} from '../shared/types/subject'
import type {
  GroupDto,
  GroupListItemDto,
  GroupStudentDto,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../shared/types/group'
import type { EnrollmentDto, CreateEnrollmentRequest } from '../shared/types/payment'
import type {
  PaymentDto,
  PaymentListFilters,
  PaymentListResult,
  CreatePaymentRequest,
  ChangeEnrollmentGroupRequest,
  ReceiptData
} from '../shared/types/payment'
import type { ActivityLogFilters, ActivityLogListResult } from '../shared/types/activity-log'
import type {
  FinanceEntryDto,
  CreateFinanceEntryRequest,
  FinanceSummaryDto,
  TeacherSalaryDto,
  EmployeeSalaryDto,
  PaySalaryRequest
} from '../shared/types/finance'
import type {
  SettingsDto,
  UpdateSettingsRequest,
  DashboardStatsDto,
  RecentPaymentDto
} from '../shared/types/settings'
import type {
  ActivationInfo,
  ActivationStatus,
  LicenseData,
  LicensePlan,
  LicenseRenewResult,
  LicenseStatusResponse,
  LicenseSyncResult
} from '../shared/types/license'

export interface AppPreloadApi {
  openExternal: (url: string) => Promise<boolean>
  activation: {
    isActivated: () => Promise<boolean>
    activate: (licenseKey: string) => Promise<ActivationStatus>
    getInfo: () => Promise<ActivationInfo>
    checkLicense: () => Promise<ActivationStatus>
    syncLicense: () => Promise<LicenseSyncResult>
    getHWID: () => Promise<string>
    getWarningWindowDays: () => Promise<number>
    listPlans: () => Promise<LicensePlan[]>
    checkServerStatus: (hwid?: string) => Promise<LicenseStatusResponse>
    requestAccess: (request: {
      name: string
      phone: string
      planId: string
      hwid: string
    }) => Promise<LicenseRenewResult>
    renew: (customerId: string, hwid: string, planId: string) => Promise<LicenseRenewResult>
    cancelPending: (subscriptionId: string) => Promise<boolean>
    reset: () => Promise<boolean>
    onLicenseInvalid: (callback: (error: string) => void) => () => void
    onLicenseUpdated: (
      callback: (license: Pick<LicenseData, 'expiresAt' | 'customerId'>) => void
    ) => () => void
  }
  auth: {
    login: (request: LoginRequest) => Promise<LoginResponse>
    checkFirstRun: () => Promise<boolean>
    resetPassword: (request: ResetPasswordRequest) => Promise<ResetPasswordResponse>
    changePassword: (request: ChangePasswordRequest) => Promise<ChangePasswordResponse>
  }
  employees: {
    list: () => Promise<EmployeeDto[]>
    get: (id: number) => Promise<EmployeeDto | null>
    create: (data: CreateEmployeeRequest, performedBy?: number) => Promise<EmployeeDto>
    update: (data: UpdateEmployeeRequest, performedBy?: number) => Promise<EmployeeDto | null>
    toggleActive: (id: number, performedBy?: number) => Promise<EmployeeDto | null>
  }
  students: {
    list: () => Promise<StudentDto[]>
    get: (id: number) => Promise<StudentDto | null>
    create: (data: CreateStudentRequest, performedBy?: number) => Promise<StudentDto>
    update: (data: UpdateStudentRequest, performedBy?: number) => Promise<StudentDto | null>
    search: (query: string) => Promise<StudentDto[]>
    toggleActive: (id: number, performedBy?: number) => Promise<StudentDto | null>
  }
  teachers: {
    list: () => Promise<TeacherDto[]>
    get: (id: number) => Promise<TeacherDto | null>
    create: (data: CreateTeacherRequest, performedBy?: number) => Promise<TeacherDto>
    update: (data: UpdateTeacherRequest, performedBy?: number) => Promise<TeacherDto | null>
    toggleActive: (id: number, performedBy?: number) => Promise<TeacherDto | null>
  }
  subjects: {
    list: () => Promise<SubjectDto[]>
    get: (id: number) => Promise<SubjectDto | null>
    create: (data: CreateSubjectRequest, performedBy?: number) => Promise<SubjectDto>
    update: (data: UpdateSubjectRequest, performedBy?: number) => Promise<SubjectDto | null>
    toggleActive: (id: number, performedBy?: number) => Promise<SubjectDto | null>
  }
  groups: {
    list: () => Promise<GroupListItemDto[]>
    listBySubject: (subjectId: number) => Promise<GroupListItemDto[]>
    get: (id: number) => Promise<GroupDto | null>
    create: (data: CreateGroupRequest, performedBy?: number) => Promise<GroupDto>
    update: (data: UpdateGroupRequest, performedBy?: number) => Promise<GroupDto | null>
    students: (id: number) => Promise<GroupStudentDto[]>
    toggleActive: (id: number, performedBy?: number) => Promise<boolean>
  }
  enrollments: {
    create: (data: CreateEnrollmentRequest, performedBy?: number) => Promise<EnrollmentDto>
    listByStudent: (studentId: number) => Promise<EnrollmentDto[]>
    listByGroup: (groupId: number) => Promise<EnrollmentDto[]>
    updateStatus: (
      id: number,
      status: 'active' | 'completed' | 'cancelled',
      performedBy?: number
    ) => Promise<EnrollmentDto | null>
    changeGroup: (
      data: ChangeEnrollmentGroupRequest,
      performedBy?: number
    ) => Promise<EnrollmentDto>
  }
  activity: {
    list: (filters?: ActivityLogFilters) => Promise<ActivityLogListResult>
  }
  payments: {
    create: (data: CreatePaymentRequest) => Promise<PaymentDto>
    listByEnrollment: (enrollmentId: number) => Promise<PaymentDto[]>
    listByStudent: (studentId: number) => Promise<PaymentDto[]>
    listAll: (filters?: PaymentListFilters) => Promise<PaymentListResult>
    getReceipt: (paymentId: number) => Promise<ReceiptData | null>
  }
  finances: {
    listEntries: (filters?: {
      type?: 'income' | 'expense'
      dateFrom?: string
      dateTo?: string
    }) => Promise<FinanceEntryDto[]>
    createEntry: (data: CreateFinanceEntryRequest) => Promise<FinanceEntryDto>
    deleteEntry: (id: number, performedBy?: number) => Promise<boolean>
    getSummary: () => Promise<FinanceSummaryDto>
    payTeacherSalary: (data: PaySalaryRequest) => Promise<TeacherSalaryDto>
    payEmployeeSalary: (data: PaySalaryRequest) => Promise<EmployeeSalaryDto>
    listTeacherSalaries: (teacherId?: number) => Promise<TeacherSalaryDto[]>
    listEmployeeSalaries: (employeeId?: number) => Promise<EmployeeSalaryDto[]>
  }
  settings: {
    getSettings: () => Promise<SettingsDto>
    getLogoDataUrl: () => Promise<string | null>
    updateSettings: (data: UpdateSettingsRequest, performedBy?: number) => Promise<SettingsDto>
    selectBackupFolder: () => Promise<{ success: boolean; directory?: string }>
    backup: (createdBy: number) => Promise<{ success: boolean; filePath?: string }>
    restore: (performedBy?: number) => Promise<{ success: boolean }>
    uploadLogo: (performedBy?: number) => Promise<SettingsDto | null>
    getDashboardStats: () => Promise<DashboardStatsDto>
    getRecentPayments: (limit: number) => Promise<RecentPaymentDto[]>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppPreloadApi
  }
}

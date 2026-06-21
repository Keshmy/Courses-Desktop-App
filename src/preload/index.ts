import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc/channels'

// Auth & Employees
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
// Students
import type {
  StudentDto,
  CreateStudentRequest,
  UpdateStudentRequest
} from '../shared/types/student'
// Teachers
import type {
  TeacherDto,
  CreateTeacherRequest,
  UpdateTeacherRequest
} from '../shared/types/teacher'
// Subjects
import type {
  SubjectDto,
  CreateSubjectRequest,
  UpdateSubjectRequest
} from '../shared/types/subject'
// Groups
import type {
  GroupDto,
  GroupListItemDto,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../shared/types/group'
// Enrollments
import type { EnrollmentDto, CreateEnrollmentRequest } from '../shared/types/payment'
// Payments
import type {
  PaymentDto,
  PaymentListFilters,
  PaymentListResult,
  OutstandingListFilters,
  OutstandingListResult,
  CreatePaymentRequest,
  ChangeEnrollmentGroupRequest,
  ReceiptData
} from '../shared/types/payment'
import type { ActivityLogFilters, ActivityLogListResult } from '../shared/types/activity-log'
// Finances
import type {
  FinanceEntryDto,
  CreateFinanceEntryRequest,
  FinanceSummaryDto,
  TeacherSalaryDto,
  EmployeeSalaryDto,
  PaySalaryRequest
} from '../shared/types/finance'
// Settings
import type {
  SettingsDto,
  UpdateSettingsRequest,
  DashboardStatsDto,
  RecentPaymentDto
} from '../shared/types/settings'
import type {
  ActivationInfo,
  ActivationStatus,
  LicensePlan,
  LicenseRenewResult,
  LicenseStatusResponse,
  LicenseSyncResult
} from '../shared/types/license'
import type { UpdaterStatus } from '../shared/types/updater'

const api = {
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
  updater: {
    installNow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL_NOW),
    onStatus: (callback: (status: UpdaterStatus) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: UpdaterStatus): void =>
        callback(status)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS, handler)
    }
  },
  activation: {
    isActivated: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_IS_ACTIVATED),
    activate: (licenseKey: string): Promise<ActivationStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_ACTIVATE, licenseKey),
    getInfo: (): Promise<ActivationInfo> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_GET_INFO),
    checkLicense: (): Promise<ActivationStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_CHECK_LICENSE),
    syncLicense: (): Promise<LicenseSyncResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_SYNC_LICENSE),
    getHWID: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_GET_HWID),
    getWarningWindowDays: (): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_GET_WARNING_DAYS),
    listPlans: (): Promise<LicensePlan[]> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_LIST_PLANS),
    checkServerStatus: (hwid?: string): Promise<LicenseStatusResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_CHECK_SERVER_STATUS, hwid),
    requestAccess: (request: {
      name: string
      phone: string
      planId: string
      hwid: string
    }): Promise<LicenseRenewResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_REQUEST_ACCESS, request),
    renew: (customerId: string, hwid: string, planId: string): Promise<LicenseRenewResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_RENEW, customerId, hwid, planId),
    cancelPending: (subscriptionId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_CANCEL_PENDING, subscriptionId),
    reset: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.ACTIVATION_RESET),
    onLicenseInvalid: (callback: (error: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
      ipcRenderer.on('license:invalid', handler)
      return () => ipcRenderer.removeListener('license:invalid', handler)
    },
    onLicenseUpdated: (
      callback: (license: { expiresAt?: string; customerId?: string }) => void
    ): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        license: { expiresAt?: string; customerId?: string }
      ): void => callback(license)
      ipcRenderer.on('license:updated', handler)
      return () => ipcRenderer.removeListener('license:updated', handler)
    }
  },
  auth: {
    login: (request: LoginRequest): Promise<LoginResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, request),
    checkFirstRun: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHECK_FIRST_RUN),
    resetPassword: (request: ResetPasswordRequest): Promise<ResetPasswordResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_RESET_PASSWORD, request),
    changePassword: (request: ChangePasswordRequest): Promise<ChangePasswordResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, request)
  },
  employees: {
    list: (): Promise<EmployeeDto[]> => ipcRenderer.invoke(IPC_CHANNELS.EMPLOYEES_LIST),
    get: (id: number): Promise<EmployeeDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMPLOYEES_GET, id),
    create: (data: CreateEmployeeRequest, performedBy?: number): Promise<EmployeeDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMPLOYEES_CREATE, data, performedBy),
    update: (data: UpdateEmployeeRequest, performedBy?: number): Promise<EmployeeDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMPLOYEES_UPDATE, data, performedBy),
    toggleActive: (id: number, performedBy?: number): Promise<EmployeeDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMPLOYEES_TOGGLE_ACTIVE, id, performedBy)
  },
  students: {
    list: (): Promise<StudentDto[]> => ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_LIST),
    get: (id: number): Promise<StudentDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_GET, id),
    create: (data: CreateStudentRequest, performedBy?: number): Promise<StudentDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_CREATE, data, performedBy),
    update: (data: UpdateStudentRequest, performedBy?: number): Promise<StudentDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_UPDATE, data, performedBy),
    search: (query: string): Promise<StudentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_SEARCH, query),
    toggleActive: (id: number, performedBy?: number): Promise<StudentDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.STUDENTS_TOGGLE_ACTIVE, id, performedBy)
  },
  teachers: {
    list: (): Promise<TeacherDto[]> => ipcRenderer.invoke(IPC_CHANNELS.TEACHERS_LIST),
    get: (id: number): Promise<TeacherDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEACHERS_GET, id),
    create: (data: CreateTeacherRequest, performedBy?: number): Promise<TeacherDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEACHERS_CREATE, data, performedBy),
    update: (data: UpdateTeacherRequest, performedBy?: number): Promise<TeacherDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEACHERS_UPDATE, data, performedBy),
    toggleActive: (id: number, performedBy?: number): Promise<TeacherDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEACHERS_TOGGLE_ACTIVE, id, performedBy)
  },
  subjects: {
    list: (): Promise<SubjectDto[]> => ipcRenderer.invoke(IPC_CHANNELS.SUBJECTS_LIST),
    get: (id: number): Promise<SubjectDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBJECTS_GET, id),
    create: (data: CreateSubjectRequest, performedBy?: number): Promise<SubjectDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBJECTS_CREATE, data, performedBy),
    update: (data: UpdateSubjectRequest, performedBy?: number): Promise<SubjectDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBJECTS_UPDATE, data, performedBy),
    toggleActive: (id: number, performedBy?: number): Promise<SubjectDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUBJECTS_TOGGLE_ACTIVE, id, performedBy)
  },
  groups: {
    list: (): Promise<GroupListItemDto[]> => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_LIST),
    listBySubject: (subjectId: number): Promise<GroupListItemDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUPS_LIST_BY_SUBJECT, subjectId),
    get: (id: number): Promise<GroupDto | null> => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_GET, id),
    create: (data: CreateGroupRequest, performedBy?: number): Promise<GroupDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUPS_CREATE, data, performedBy),
    update: (data: UpdateGroupRequest, performedBy?: number): Promise<GroupDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUPS_UPDATE, data, performedBy),
    students: (id: number): Promise<StudentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUPS_STUDENTS, id),
    toggleActive: (id: number, performedBy?: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUPS_TOGGLE_ACTIVE, id, performedBy)
  },
  enrollments: {
    create: (data: CreateEnrollmentRequest, performedBy?: number): Promise<EnrollmentDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_CREATE, data, performedBy),
    listByStudent: (studentId: number): Promise<EnrollmentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_LIST_BY_STUDENT, studentId),
    listByGroup: (groupId: number): Promise<EnrollmentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_LIST_BY_GROUP, groupId),
    updateStatus: (
      id: number,
      status: 'active' | 'completed' | 'cancelled',
      performedBy?: number
    ): Promise<EnrollmentDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_UPDATE_STATUS, id, status, performedBy),
    changeGroup: (
      data: ChangeEnrollmentGroupRequest,
      performedBy?: number
    ): Promise<EnrollmentDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.ENROLLMENTS_CHANGE_GROUP, data, performedBy)
  },
  activity: {
    list: (filters?: ActivityLogFilters): Promise<ActivityLogListResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_LIST, filters)
  },
  payments: {
    create: (data: CreatePaymentRequest): Promise<PaymentDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_CREATE, data),
    listByEnrollment: (enrollmentId: number): Promise<PaymentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_LIST_BY_ENROLLMENT, enrollmentId),
    listByStudent: (studentId: number): Promise<PaymentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_LIST_BY_STUDENT, studentId),
    listAll: (filters?: PaymentListFilters): Promise<PaymentListResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_LIST_ALL, filters),
    listOutstanding: (filters?: OutstandingListFilters): Promise<OutstandingListResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_LIST_OUTSTANDING, filters),
    getReceipt: (paymentId: number): Promise<ReceiptData | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_GET_RECEIPT, paymentId)
  },
  finances: {
    listEntries: (filters?: {
      type?: 'income' | 'expense'
      dateFrom?: string
      dateTo?: string
    }): Promise<FinanceEntryDto[]> => ipcRenderer.invoke(IPC_CHANNELS.FINANCE_LIST, filters),
    createEntry: (data: CreateFinanceEntryRequest): Promise<FinanceEntryDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.FINANCE_CREATE, data),
    deleteEntry: (id: number, performedBy?: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.FINANCE_DELETE, id, performedBy),
    getSummary: (): Promise<FinanceSummaryDto> => ipcRenderer.invoke(IPC_CHANNELS.FINANCE_SUMMARY),
    payTeacherSalary: (data: PaySalaryRequest): Promise<TeacherSalaryDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.SALARIES_PAY_TEACHER, data),
    payEmployeeSalary: (data: PaySalaryRequest): Promise<EmployeeSalaryDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.SALARIES_PAY_EMPLOYEE, data),
    listTeacherSalaries: (teacherId?: number): Promise<TeacherSalaryDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SALARIES_LIST_TEACHER, teacherId),
    listEmployeeSalaries: (employeeId?: number): Promise<EmployeeSalaryDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SALARIES_LIST_EMPLOYEE, employeeId)
  },
  settings: {
    getSettings: (): Promise<SettingsDto> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    getLogoDataUrl: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LOGO),
    updateSettings: (data: UpdateSettingsRequest, performedBy?: number): Promise<SettingsDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data, performedBy),
    selectBackupFolder: (): Promise<{ success: boolean; directory?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER),
    backup: (createdBy: number): Promise<{ success: boolean; filePath?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_BACKUP, createdBy),
    restore: (performedBy?: number): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESTORE, performedBy),
    uploadLogo: (performedBy?: number): Promise<SettingsDto | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPLOAD_LOGO, performedBy),
    getDashboardStats: (): Promise<DashboardStatsDto> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS),
    getRecentPayments: (limit: number): Promise<RecentPaymentDto[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_RECENT_PAYMENTS, limit)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (defined in d.ts)
  window.electron = electronAPI
  // @ts-expect-error (defined in d.ts)
  window.api = api
}

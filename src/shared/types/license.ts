export type LicenseData = {
  name: string
  phone: string
  plan: 'basic' | 'premium' | string
  hwid: string
  expiresAt: string
  customerId: string
}

export type ActivationStatus = {
  activated: boolean
  license?: LicenseData
  error?: string
}

export type ActivationInfo = {
  activated: boolean
  license?: LicenseData
}

export type LicenseSyncResult =
  | { kind: 'updated'; status: ActivationStatus }
  | { kind: 'inactive'; reason: string }
  | null

export type LicenseRenewResult = {
  success?: boolean
  error?: string
  message?: string
  data?: {
    subscriptionId?: string
    payment_url?: string
    existing_pending?: boolean
    requires_payment?: boolean
  }
}

export type LicensePlan = {
  id: string
  name: string
  price: number
  durationDays: number
  isActive?: boolean
  system?: { name?: string; slug: string } | null
}

export type LicenseServerStatus =
  | 'CHECKING'
  | 'IDLE'
  | 'PENDING_APPROVAL'
  | 'RENEWAL_PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED'
  | 'PAYMENT_CANCELLED'
  | 'NOT_FOUND'
  | 'UNKNOWN'

export type LicenseStatusResponse = {
  status?: LicenseServerStatus
  licenseKey?: string
  customerId?: string
  subscriptionId?: string
  payment_url?: string
}

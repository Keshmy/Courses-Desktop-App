import { app, net } from 'electron'
import { execFile } from 'node:child_process'
import crypto, { scryptSync } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { hostname, homedir, platform, userInfo } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { LICENSE_SERVER_BASE_URL, LICENSE_SYSTEM_SLUG } from '../../../shared/license'
import type { ActivationStatus, LicenseData } from '../../../shared/types/license'

const execFileAsync = promisify(execFile)

const SHARED_SECRET = 'this is a test for now'
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzRUBzTMHh+50AJcKsty5
eQW2wl1tCDjRDI4oprhOWPSgO49QWPLImXVOB7QR2zoPjbpvizQIl0tlnLj/R/Ld
nLdWfiQIxEQHBWMFN7GTNR4lx5+4BIuSFhsyvZ9DdKAoayw+bX15Z+7kTQLlEEQg
FvBnebVY3hzRIlQg7zgZZtlu5AjBVM71o4yVROVBsRx6xn3O/tAQoLusl5mQLq7t
4iUP8YqpOYxxoOEod1vZXIkUXJ2fIKC7RgEcUqtq/C/stCo02piQQXR50oz7uDHx
n9eZjNGbw7FuZY5dLq/MV0RL2vvw6nDcendTvABtvHA4Ul6mMrDhpSmJQlU/I358
BQIDAQAB
-----END PUBLIC KEY-----`

const DATA_PATH = app.getPath('userData')
const TIME_ANCHOR_FILE = join(DATA_PATH, 'sys_config.dat')
const LICENSE_FILE = join(DATA_PATH, 'license.key')
const SERVER_LOCK_FILE = join(DATA_PATH, 'license_server_lock.json')
const NON_BLOCKING_SERVER_LOCK_REASONS = new Set([
  'PAYMENT_CANCELLED',
  'RENEWAL_PENDING',
  'PENDING_APPROVAL'
])
const HARD_SERVER_LOCK_REASONS = new Set(['EXPIRED', 'REJECTED', 'NOT_FOUND'])

type ServerLockState = {
  locked: boolean
  reason?: string
  lockedAt?: string
}

let cachedMachineId: string | null = null

function normalizeMachineId(raw: string): string {
  return crypto.createHash('sha256').update(raw.trim()).digest('hex')
}

async function readPlatformMachineId(): Promise<string> {
  const currentPlatform = platform()

  if (currentPlatform === 'darwin') {
    const { stdout } = await execFileAsync('/usr/sbin/ioreg', [
      '-rd1',
      '-c',
      'IOPlatformExpertDevice'
    ])
    const uuid = stdout.match(/"IOPlatformUUID"\s=\s"([^"]+)"/)?.[1]
    const serial = stdout.match(/"IOPlatformSerialNumber"\s=\s"([^"]+)"/)?.[1]
    if (uuid || serial) return `darwin:${uuid ?? serial}`
  }

  if (currentPlatform === 'win32') {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      '(Get-CimInstance Win32_ComputerSystemProduct).UUID'
    ])
    if (stdout.trim()) return `win32:${stdout.trim()}`
  }

  if (currentPlatform === 'linux') {
    for (const file of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      try {
        const value = await readFile(file, 'utf-8')
        if (value.trim()) return `linux:${value.trim()}`
      } catch {
        // Try the next known machine-id location.
      }
    }
  }

  return `${currentPlatform}:${hostname()}:${userInfo().username}:${homedir()}`
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value)
  }

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = (value as Record<string, unknown>)[key]
  }
  return JSON.stringify(sorted)
}

export const activationService = {
  logLicenseEvent(event: string, details: Record<string, unknown> = {}): void {
    try {
      console.info(`[LICENSE] ${event}`, JSON.stringify(details))
    } catch {
      console.info(`[LICENSE] ${event}`, details)
    }
  },

  deleteStoredLicense(reason: string): void {
    try {
      if (existsSync(LICENSE_FILE)) {
        unlinkSync(LICENSE_FILE)
        this.logLicenseEvent('local-license-deleted', { reason })
      }
    } catch (error) {
      console.error('Failed to delete local license file:', error)
    }
  },

  getServerLockState(): ServerLockState {
    try {
      if (!existsSync(SERVER_LOCK_FILE)) return { locked: false }
      const parsed = JSON.parse(readFileSync(SERVER_LOCK_FILE, 'utf-8')) as ServerLockState
      return {
        locked: parsed.locked === true,
        reason: parsed.reason,
        lockedAt: parsed.lockedAt
      }
    } catch (error) {
      console.error('Failed to read server lock file:', error)
      return { locked: false }
    }
  },

  async setServerLock(reason: string): Promise<void> {
    try {
      writeFileSync(
        SERVER_LOCK_FILE,
        JSON.stringify({
          locked: true,
          reason,
          lockedAt: new Date().toISOString()
        }),
        'utf-8'
      )
      this.logLicenseEvent('server-lock-set', { reason })
    } catch (error) {
      console.error('Failed to write server lock file:', error)
    }
  },

  clearServerLock(): void {
    try {
      if (existsSync(SERVER_LOCK_FILE)) {
        unlinkSync(SERVER_LOCK_FILE)
        this.logLicenseEvent('server-lock-cleared')
      }
    } catch (error) {
      console.error('Failed to clear server lock file:', error)
    }
  },

  async checkStoredLicense(): Promise<ActivationStatus> {
    if (!existsSync(LICENSE_FILE)) {
      return { activated: false, error: 'NO_LICENSE_FILE' }
    }

    const encryptedLicense = readFileSync(LICENSE_FILE, 'utf-8')
    return this.verifyLicense(encryptedLicense)
  },

  async getMachineId(): Promise<string> {
    if (cachedMachineId) return cachedMachineId

    try {
      cachedMachineId = normalizeMachineId(await readPlatformMachineId())
      return cachedMachineId
    } catch (error) {
      console.error('Failed to get machine ID:', error)
      cachedMachineId = normalizeMachineId(`fallback:${hostname()}:${homedir()}`)
      return cachedMachineId
    }
  },

  async verifyTimeAnchor(): Promise<boolean> {
    const now = Date.now()
    let lastKnownTime = 0

    try {
      if (existsSync(TIME_ANCHOR_FILE)) {
        const encoded = readFileSync(TIME_ANCHOR_FILE, 'utf-8')
        lastKnownTime = Number.parseInt(Buffer.from(encoded, 'hex').toString('utf-8'), 10) || 0
      }
    } catch (error) {
      console.error('Error reading time anchor:', error)
      lastKnownTime = 0
    }

    const toleranceMs = 5 * 60 * 1000
    if (now < lastKnownTime - toleranceMs) {
      const isFixed = await this.attemptOnlineResync(now)
      if (!isFixed) return false
    }

    this.updateTimeAnchor(now)
    return true
  },

  updateTimeAnchor(timestamp: number): void {
    try {
      writeFileSync(TIME_ANCHOR_FILE, Buffer.from(timestamp.toString(), 'utf-8').toString('hex'))
    } catch (error) {
      console.error('Failed to update time anchor:', error)
    }
  },

  async attemptOnlineResync(localTime: number): Promise<boolean> {
    return new Promise((resolve) => {
      const request = net.request('https://google.com')
      request.on('response', (response) => {
        const dateHeader = response.headers.date
        if (!dateHeader) {
          resolve(false)
          return
        }

        const serverTime = new Date(
          Array.isArray(dateHeader) ? dateHeader[0] : dateHeader
        ).getTime()
        resolve(Math.abs(serverTime - localTime) < 5 * 60 * 1000)
      })
      request.on('error', () => resolve(false))
      request.end()
    })
  },

  decryptLicense(encryptedString: string): { data?: LicenseData; signature?: string } {
    try {
      const parts = encryptedString.split(':')
      if (parts.length !== 3) throw new Error('Invalid format')

      const salt = Buffer.from(parts[0], 'hex')
      const iv = Buffer.from(parts[1], 'hex')
      const encryptedText = Buffer.from(parts[2], 'hex')
      const key = scryptSync(SHARED_SECRET, salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])

      return JSON.parse(decrypted.toString()) as { data?: LicenseData; signature?: string }
    } catch (error) {
      console.error('License decryption failed:', error)
      throw new Error('Invalid license key format')
    }
  },

  verifySignature(data: LicenseData, signature: string): boolean {
    try {
      const verify = crypto.createVerify('SHA256')
      verify.update(canonicalStringify(data))
      verify.end()
      return verify.verify(PUBLIC_KEY_PEM, Buffer.from(signature, 'base64'))
    } catch (error) {
      console.error('License signature verification failed:', error)
      return false
    }
  },

  async verifyLicense(encryptedLicense: string): Promise<ActivationStatus> {
    try {
      const isTimeValid = await this.verifyTimeAnchor()
      if (!isTimeValid) return { activated: false, error: 'TAMPERED_CLOCK' }

      let decrypted
      try {
        decrypted = this.decryptLicense(encryptedLicense)
      } catch {
        return { activated: false, error: 'INVALID_LICENSE' }
      }

      const { data, signature } = decrypted
      if (!data || !signature) return { activated: false, error: 'INVALID_FORMAT' }
      if (!this.verifySignature(data, signature))
        return { activated: false, error: 'INVALID_SIGNATURE' }

      const currentHwid = await this.getMachineId()
      if (data.hwid !== currentHwid) return { activated: false, error: 'HWID_MISMATCH' }

      if (new Date(data.expiresAt).getTime() < Date.now()) {
        return { activated: false, error: 'EXPIRED', license: data }
      }

      return { activated: true, license: data }
    } catch (error) {
      console.error('License verification error:', error)
      return { activated: false, error: 'UNKNOWN_ERROR' }
    }
  },

  async checkLicense(): Promise<ActivationStatus> {
    try {
      const serverLock = this.getServerLockState()
      if (serverLock.locked) {
        if (serverLock.reason && HARD_SERVER_LOCK_REASONS.has(serverLock.reason)) {
          this.deleteStoredLicense(serverLock.reason)
        }

        if (serverLock.reason && NON_BLOCKING_SERVER_LOCK_REASONS.has(serverLock.reason)) {
          const localStatus = await this.checkStoredLicense()
          if (localStatus.activated) {
            this.clearServerLock()
            return localStatus
          }
        }

        return {
          activated: false,
          error: serverLock.reason ? `SERVER_LOCKED:${serverLock.reason}` : 'SERVER_LOCKED'
        }
      }

      return this.checkStoredLicense()
    } catch {
      return { activated: false, error: 'CHECK_FAILED' }
    }
  },

  async activate(encryptedLicense: string): Promise<ActivationStatus> {
    const result = await this.verifyLicense(encryptedLicense)
    if (!result.activated) return result

    try {
      writeFileSync(LICENSE_FILE, encryptedLicense, 'utf-8')
      this.clearServerLock()
      return result
    } catch (error) {
      console.error('Failed to save license file:', error)
      return { activated: false, error: 'WRITE_ERROR' }
    }
  },

  async isActivated(): Promise<boolean> {
    const status = await this.checkLicense()
    return status.activated
  },

  async getActivationInfo(): Promise<{ activated: boolean; license?: LicenseData }> {
    const status = await this.checkLicense()
    if (status.license) return { activated: status.activated, license: status.license }

    const localStatus = await this.checkStoredLicense()
    return { activated: localStatus.activated, license: localStatus.license }
  },

  async syncLicense(): Promise<
    { kind: 'updated'; status: ActivationStatus } | { kind: 'inactive'; reason: string } | null
  > {
    try {
      const hwid = await this.getMachineId()
      const response = await fetch(
        `${LICENSE_SERVER_BASE_URL}/api/license/check-status/${encodeURIComponent(hwid)}/${LICENSE_SYSTEM_SLUG}`
      )

      if (!response.ok) return null

      const data = (await response.json()) as { status?: string; licenseKey?: string }
      if (data.status && data.status !== 'ACTIVE') {
        const serverLock = this.getServerLockState()
        const hasHardServerLock = Boolean(
          serverLock.locked &&
            serverLock.reason &&
            HARD_SERVER_LOCK_REASONS.has(serverLock.reason)
        )

        this.logLicenseEvent('server-status', {
          status: data.status,
          previousLock: serverLock.reason ?? null,
          hardLocked: hasHardServerLock
        })

        if (HARD_SERVER_LOCK_REASONS.has(data.status)) {
          this.deleteStoredLicense(data.status)
        }

        if (NON_BLOCKING_SERVER_LOCK_REASONS.has(data.status) && !hasHardServerLock) {
          const localStatus = await this.checkStoredLicense()
          if (localStatus.activated) {
            this.clearServerLock()
            this.logLicenseEvent('server-status-kept-local-access', { status: data.status })
            return null
          }
        }

        await this.setServerLock(data.status)
        return { kind: 'inactive', reason: data.status }
      }

      if (data.status !== 'ACTIVE' || !data.licenseKey) return null

      const activationResult = await this.activate(data.licenseKey)
      if (!activationResult.activated) {
        return { kind: 'inactive', reason: activationResult.error || 'LICENSE_INVALID' }
      }

      return { kind: 'updated', status: activationResult }
    } catch (error) {
      console.error('Failed to sync license:', error)
      return null
    }
  },

  async reset(): Promise<boolean> {
    try {
      const hwid = await this.getMachineId()
      fetch(
        `${LICENSE_SERVER_BASE_URL}/api/license/admin/reset/${encodeURIComponent(hwid)}/${LICENSE_SYSTEM_SLUG}`,
        {
          method: 'POST'
        }
      ).catch(() => undefined)

      for (const file of [LICENSE_FILE, SERVER_LOCK_FILE, TIME_ANCHOR_FILE]) {
        if (existsSync(file)) unlinkSync(file)
      }

      return true
    } catch (error) {
      console.error('Failed to reset license:', error)
      return false
    }
  }
}

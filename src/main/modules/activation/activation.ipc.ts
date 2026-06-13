import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import {
  LICENSE_SERVER_BASE_URL,
  LICENSE_SYSTEM_SLUG,
  LICENSE_WARNING_WINDOW_DAYS
} from '../../../shared/license'
import type {
  LicensePlan,
  LicenseRenewResult,
  LicenseStatusResponse
} from '../../../shared/types/license'
import { activationService } from './activation.service'

let guardInstalled = false

function isLicenseExemptChannel(channel: string): boolean {
  return channel.startsWith('activation:') || channel === IPC_CHANNELS.APP_OPEN_EXTERNAL
}

export function installLicenseGuard(): void {
  if (guardInstalled) return
  guardInstalled = true

  const originalHandle = ipcMain.handle.bind(ipcMain)
  ipcMain.handle = ((
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
  ) => {
    return originalHandle(channel, async (event, ...args: unknown[]) => {
      if (!isLicenseExemptChannel(channel)) {
        const status = await activationService.checkLicense()
        if (!status.activated) {
          const errorCode = status.error || 'LICENSE_INVALID'
          event.sender.send('license:invalid', errorCode)
          throw new Error(`LICENSE_BLOCKED:${errorCode}`)
        }
      }

      return listener(event, ...args)
    })
  }) as typeof ipcMain.handle
}

export function registerActivationIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url: string): Promise<boolean> => {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Unsupported URL protocol')
    }

    await shell.openExternal(url)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_IS_ACTIVATED, async (): Promise<boolean> => {
    return activationService.isActivated()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_ACTIVATE, async (_event, licenseKey: string) => {
    return activationService.activate(licenseKey)
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_GET_INFO, async () => {
    return activationService.getActivationInfo()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_CHECK_LICENSE, async () => {
    return activationService.checkLicense()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_SYNC_LICENSE, async () => {
    return activationService.syncLicense()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_GET_HWID, async (): Promise<string> => {
    return activationService.getMachineId()
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_GET_WARNING_DAYS, async (): Promise<number> => {
    return LICENSE_WARNING_WINDOW_DAYS
  })

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_LIST_PLANS, async (): Promise<LicensePlan[]> => {
    const response = await fetch(
      `${LICENSE_SERVER_BASE_URL}/api/plans/active?system=${LICENSE_SYSTEM_SLUG}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.status}`)
    }

    const plans = (await response.json()) as LicensePlan[]
    return plans.filter((plan) => !plan.system || plan.system.slug === LICENSE_SYSTEM_SLUG)
  })

  ipcMain.handle(
    IPC_CHANNELS.ACTIVATION_CHECK_SERVER_STATUS,
    async (_event, hwid?: string): Promise<LicenseStatusResponse> => {
      const machineId = hwid || (await activationService.getMachineId())
      const response = await fetch(
        `${LICENSE_SERVER_BASE_URL}/api/license/check-status/${encodeURIComponent(machineId)}/${LICENSE_SYSTEM_SLUG}`
      )
      if (!response.ok) {
        throw new Error(`Failed to check license status: ${response.status}`)
      }

      return response.json() as Promise<LicenseStatusResponse>
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACTIVATION_REQUEST_ACCESS,
    async (
      _event,
      request: { name: string; phone: string; planId: string; hwid: string }
    ): Promise<LicenseRenewResult> => {
      const response = await fetch(`${LICENSE_SERVER_BASE_URL}/api/license/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          systemSlug: LICENSE_SYSTEM_SLUG
        })
      })

      const data = (await response.json()) as LicenseRenewResult
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `Request failed: ${response.status}`,
          data: data.data
        }
      }

      return data
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACTIVATION_RENEW,
    async (
      _event,
      customerId: string,
      hwid: string,
      planId: string
    ): Promise<LicenseRenewResult> => {
      const response = await fetch(`${LICENSE_SERVER_BASE_URL}/api/license/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, hwid, planId, systemSlug: LICENSE_SYSTEM_SLUG })
      })

      return response.json()
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ACTIVATION_CANCEL_PENDING,
    async (_event, subscriptionId: string): Promise<boolean> => {
      if (!subscriptionId) return false

      const response = await fetch(
        `${LICENSE_SERVER_BASE_URL}/api/payments/mypay/cancel/${encodeURIComponent(subscriptionId)}?type=app_cancel`
      )

      return response.ok
    }
  )

  ipcMain.handle(IPC_CHANNELS.ACTIVATION_RESET, async (): Promise<boolean> => {
    return activationService.reset()
  })
}

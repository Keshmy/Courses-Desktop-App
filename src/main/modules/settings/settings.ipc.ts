import { copyFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { app, dialog, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc/channels'
import type {
  SettingsDto,
  UpdateSettingsRequest,
  DashboardStatsDto,
  RecentPaymentDto
} from '../../../shared/types/settings'
import { audit } from '../../lib/audit'
import { getLogoDataUrlOrDefault } from '../../lib/logo'
import * as repo from './settings.repository'

// ── Row → DTO mappers ───────────────────────────────────────────

function toSettingsDto(row: repo.SettingsRow): SettingsDto {
  return {
    id: row.id,
    centerName: row.centerName,
    centerLogoPath: row.centerLogoPath,
    autoBackupOnClose: row.autoBackupOnClose === 1,
    autoBackupDirectory: row.autoBackupDirectory ?? null
  }
}

function toRecentPaymentDto(row: repo.RecentPaymentRow): RecentPaymentDto {
  return {
    id: row.id,
    amount: row.amount,
    method: row.method,
    receiptNumber: row.receiptNumber,
    paidAt: row.paidAt,
    studentName: row.studentName,
    subjectName: row.subjectName
  }
}

// ── Handler registration ────────────────────────────────────────

export function registerSettingsIpcHandlers(): void {
  // ── Settings CRUD ──────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<SettingsDto> => {
    const row = await repo.getSettings()
    return toSettingsDto(row)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LOGO, async (): Promise<string | null> => {
    const row = await repo.getSettings()
    return getLogoDataUrlOrDefault(row.centerLogoPath)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_, data: UpdateSettingsRequest, performedBy?: number): Promise<SettingsDto> => {
      const row = await repo.updateSettings(data)
      await audit(performedBy, 'settings.update', 'settings', 'تحديث إعدادات المركز')
      return toSettingsDto(row)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SELECT_BACKUP_FOLDER,
    async (): Promise<{ success: boolean; directory?: string }> => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        title: 'اختيار مجلد النسخ الاحتياطي التلقائي',
        properties: ['openDirectory', 'createDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false }
      }

      return { success: true, directory: result.filePaths[0] }
    }
  )

  // ── Backup ─────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_BACKUP,
    async (_, createdBy: number): Promise<{ success: boolean; filePath?: string }> => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showSaveDialog(win!, {
        title: 'حفظ نسخة احتياطية',
        defaultPath: `courses-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      await repo.createBackup(result.filePath, createdBy)
      await audit(createdBy, 'settings.backup', 'settings', 'إنشاء نسخة احتياطية', undefined, {
        filePath: result.filePath
      })
      return { success: true, filePath: result.filePath }
    }
  )

  // ── Restore ────────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_RESTORE,
    async (_, performedBy?: number): Promise<{ success: boolean }> => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        title: 'استعادة نسخة احتياطية',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false }
      }

      await repo.restoreBackup(result.filePaths[0])
      await audit(performedBy, 'settings.restore', 'settings', 'استعادة نسخة احتياطية')
      return { success: true }
    }
  )

  // ── Upload Logo ────────────────────────────────
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPLOAD_LOGO,
    async (_, performedBy?: number): Promise<SettingsDto | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'اختيار شعار المركز',
      filters: [{ name: 'صور', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const sourcePath = result.filePaths[0]
    const fileName = `center-logo-${Date.now()}-${basename(sourcePath)}`
    const destPath = join(app.getPath('userData'), fileName)

    // Copy image to app userData folder
    copyFileSync(sourcePath, destPath)

    // Save path in settings
    const row = await repo.updateSettings({ centerLogoPath: destPath })
    await audit(performedBy, 'settings.upload_logo', 'settings', 'تحديث شعار المركز')
    return toSettingsDto(row)
  })

  // ── Dashboard ──────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, async (): Promise<DashboardStatsDto> => {
    return repo.getDashboardStats()
  })

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD_RECENT_PAYMENTS,
    async (_, limit: number = 10): Promise<RecentPaymentDto[]> => {
      const rows = await repo.getRecentPayments(limit)
      return rows.map(toRecentPaymentDto)
    }
  )
}

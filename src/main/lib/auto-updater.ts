import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC_CHANNELS } from '../../shared/ipc/channels'
import type { UpdaterStatus } from '../../shared/types/updater'

let updaterWindow: BrowserWindow | null = null
let listenersRegistered = false
let installHandlerRegistered = false

function sendUpdaterStatus(status: UpdaterStatus): void {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS, status)
  }
}

function registerAutoUpdaterListeners(): void {
  if (listenersRegistered) return
  listenersRegistered = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterStatus({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendUpdaterStatus({ type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendUpdaterStatus({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus({
      type: 'downloading',
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterStatus({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error)
    sendUpdaterStatus({ type: 'error', message: error.message })
  })
}

function registerInstallHandler(): void {
  if (installHandlerRegistered) return
  installHandlerRegistered = true

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL_NOW, async () => {
    sendUpdaterStatus({ type: 'installing' })

    if (updaterWindow && !updaterWindow.isDestroyed()) {
      updaterWindow.hide()
    }

    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 100)
  })
}

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  updaterWindow = mainWindow

  if (!app.isPackaged) {
    return
  }

  registerAutoUpdaterListeners()
  registerInstallHandler()

  const checkForUpdates = (): void => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Update check failed:', error)
      sendUpdaterStatus({ type: 'error', message: error.message })
    })
  }

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', checkForUpdates)
  } else {
    checkForUpdates()
  }
}

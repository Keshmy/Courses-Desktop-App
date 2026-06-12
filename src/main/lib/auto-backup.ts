import { app } from 'electron'
import { createAutoBackupOnClose } from '../modules/settings/settings.repository'

let quitHandled = false

export function setupAutoBackupOnQuit(): void {
  app.on('before-quit', (event) => {
    if (quitHandled) return

    event.preventDefault()
    quitHandled = true

    void (async () => {
      try {
        const filePath = await createAutoBackupOnClose()
        if (filePath) {
          console.log(`Auto backup saved: ${filePath}`)
        }
      } catch (err) {
        console.error('Auto backup on close failed:', err)
      } finally {
        app.exit(0)
      }
    })()
  })
}

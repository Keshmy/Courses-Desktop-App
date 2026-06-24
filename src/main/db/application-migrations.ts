import { app } from 'electron'
import { join } from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDefaultAdmin } from '../modules/auth/auth.repository'
import { getSettings } from '../modules/settings/settings.repository'
import { runBootstrapMigrations } from './bootstrap-migrations'
import { getDb } from './db'

/**
 * Prepares both fresh and upgraded installations before IPC handlers are exposed.
 * Electron's app path points inside app.asar in packaged builds, where the drizzle
 * directory is bundled by electron-builder.
 */
export async function runApplicationMigrations(): Promise<void> {
  await migrate(getDb(), {
    migrationsFolder: join(app.getAppPath(), 'drizzle')
  })
  await runBootstrapMigrations()
  await createDefaultAdmin()
  await getSettings()
}

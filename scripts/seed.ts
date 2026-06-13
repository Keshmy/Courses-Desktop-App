/**
 * Seeds default settings and admin employee for local development.
 *
 * Prerequisite: `npm run db:migrate`
 * Uses `DB_FILE_NAME` from `.env` (same as the app).
 */
import 'dotenv/config'
import { initializeDatabase } from '../src/main/db/db'
import { runBootstrapMigrations } from '../src/main/db/bootstrap-migrations'
import { createDefaultAdmin } from '../src/main/modules/auth/auth.repository'
import { getSettings } from '../src/main/modules/settings/settings.repository'

const url = process.env.DB_FILE_NAME
if (url === undefined || url.length === 0) {
  throw new Error('DB_FILE_NAME is missing. Set it in .env (e.g. file:local.db).')
}

initializeDatabase(url)

async function seed(): Promise<void> {
  await runBootstrapMigrations()
  await createDefaultAdmin()
  await getSettings()

  console.log('Seed completed: default settings + admin (admin / admin123) if none existed.')
}

seed().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

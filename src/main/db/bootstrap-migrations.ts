import { sql } from 'drizzle-orm'
import { getDb } from './db'

async function ensureSettingsBackupColumns(): Promise<void> {
  const db = getDb()
  const alters = [
    sql`ALTER TABLE settings ADD COLUMN auto_backup_on_close integer NOT NULL DEFAULT 0`,
    sql`ALTER TABLE settings ADD COLUMN auto_backup_directory text`
  ]

  for (const statement of alters) {
    try {
      await db.run(statement)
    } catch {
      // Column already exists on upgraded databases
    }
  }
}

/**
 * Applies lightweight schema patches for existing installations
 * without requiring a full drizzle-kit migrate run.
 */
export async function runBootstrapMigrations(): Promise<void> {
  const db = getDb()

  await ensureSettingsBackupColumns()

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      employee_id integer,
      employee_name text NOT NULL,
      employee_role text NOT NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id integer,
      summary text NOT NULL,
      details text,
      created_at text DEFAULT (datetime('now','localtime')) NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `)
}

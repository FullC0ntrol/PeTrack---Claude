import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

// Wykonuje po kolei pliki NNN_nazwa.sql, których nie ma jeszcze w schema_migrations.
// Blokada doradcza chroni przed dwoma serwerami migrującymi jednocześnie.
export async function migrate({ log = console.log } = {}) {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock(7240311)')
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)
    const { rows } = await client.query('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map((row) => row.name))
    const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(dir, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        log(`[db] migracja ${file} ✓`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Migracja ${file} nie powiodła się: ${error.message}`, { cause: error })
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(7240311)').catch(() => {})
    client.release()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => console.log('[db] schemat aktualny'))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
    .finally(() => pool.end())
}

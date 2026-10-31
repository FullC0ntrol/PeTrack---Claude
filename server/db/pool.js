import pg from 'pg'
import { config } from '../config.js'

// numeric (waga) jako liczba, a nie string – w tej aplikacji nie grozi utrata precyzji.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)))
// date jako 'YYYY-MM-DD' bez przesunięć strefy czasowej.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 })

export function query(text, params) {
  return pool.query(text, params)
}

// Kilka zapytań w jednej transakcji: albo wszystkie się udają, albo żadne.
export async function transaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

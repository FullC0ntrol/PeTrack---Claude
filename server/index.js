import { createApp } from './app.js'
import { config } from './config.js'
import { migrate } from './db/migrate.js'
import { pool } from './db/pool.js'
import { seedDemo } from './db/seed.js'

// Baza w Dockerze startuje chwilę – kilka prób zamiast natychmiastowego błędu.
async function waitForDatabase(attempts = 20) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      if (i === attempts) throw new Error(`Brak połączenia z bazą (${config.databaseUrl.replace(/:[^:@/]+@/, ':***@')}): ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

async function main() {
  await waitForDatabase()
  await migrate()
  if (config.seedDemo) await seedDemo()

  const app = createApp()
  const server = app.listen(config.port, () => {
    console.log(`[app] PeTrace Alt nasłuchuje na :${config.port} – ${config.appUrl}`)
    if (config.demoLogin) console.log(`[app] logowanie demo włączone (${config.demoEmail})`)
  })

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((error) => {
  console.error(`[app] start nieudany: ${error.message}`)
  process.exit(1)
})

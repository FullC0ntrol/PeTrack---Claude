import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import { config } from '../config.js'
import { migrate } from '../db/migrate.js'
import { pool } from '../db/pool.js'
import { generateTagCode } from '../services/crypto.js'

/*
  Generuje partię wolnych tagów i arkusz do druku.

    npm run tags:generate -- 24                    # 24 tagi, adresy z APP_URL
    npm run tags:generate -- 24 --url https://petrace.app
    docker compose exec app npm run tags:generate -- 24

  Wynik w katalogu print/:
    tagi-<partia>.html – arkusz A4 z kodami QR (otwórz w przeglądarce → Drukuj, skala 100%),
    tagi-<partia>.csv  – kody i adresy do zapisania na tagach NFC (np. aplikacją NFC Tools).
*/

function parseArgs(argv) {
  const args = { count: 12, url: config.appUrl }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = String(argv[++i] ?? '').replace(/\/$/, '')
    else if (/^\d+$/.test(argv[i])) args.count = Number(argv[i])
  }
  if (args.count < 1 || args.count > 500) throw new Error('Liczba tagów: od 1 do 500.')
  if (!/^https?:\/\//.test(args.url)) throw new Error('Adres (--url) musi zaczynać się od http:// lub https://')
  return args
}

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function insertTags(count, batch) {
  const codes = []
  while (codes.length < count) {
    const code = generateTagCode()
    // ON CONFLICT: przy (bardzo mało prawdopodobnym) powtórzeniu kodu po prostu losujemy kolejny.
    const { rowCount } = await pool.query(`INSERT INTO tags (code, batch) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [code, batch])
    if (rowCount) codes.push(code)
  }
  return codes
}

async function sheetHtml(batch, items) {
  const cells = await Promise.all(
    items.map(async ({ code, url }) => {
      const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#18171C', light: '#0000' } })
      return `<div class="tag"><div class="qr">${svg}</div><div class="code">${escapeHtml(code)}</div><div class="hint">Zeskanuj, jeśli mnie znalazłeś</div></div>`
    }),
  )
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><title>Tagi PeTrace – partia ${escapeHtml(batch)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #18171C; }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6mm; }
  header h1 { font-size: 14pt; margin: 0; }
  header p { margin: 0; font-size: 9pt; color: #67646A; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
  .tag { border: 0.3mm dashed #C9C7CE; border-radius: 6mm; padding: 4mm; text-align: center; break-inside: avoid; }
  .qr svg { width: 30mm; height: 30mm; display: block; margin: 0 auto; }
  .code { margin-top: 2mm; font: bold 11pt ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.5mm; }
  .hint { font-size: 7pt; color: #67646A; margin-top: 1mm; }
  @media screen { body { padding: 16px; background: #F5F5F3; } .grid { max-width: 190mm; } .tag { background: #fff; } }
</style></head>
<body>
  <header><h1>● PeTrace – partia ${escapeHtml(batch)}</h1><p>${items.length} tagów · wytnij po liniach przerywanych</p></header>
  <div class="grid">${cells.join('\n')}</div>
</body></html>`
}

async function main() {
  const { count, url } = parseArgs(process.argv.slice(2))
  await migrate({ log: () => {} })
  const batch = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')
  const codes = await insertTags(count, batch)
  const items = codes.map((code) => ({ code, url: `${url}/t/${code}` }))

  const outDir = path.resolve('print')
  await mkdir(outDir, { recursive: true })
  const htmlPath = path.join(outDir, `tagi-${batch}.html`)
  const csvPath = path.join(outDir, `tagi-${batch}.csv`)
  await writeFile(htmlPath, await sheetHtml(batch, items))
  await writeFile(csvPath, `kod;adres_nfc\n${items.map((i) => `${i.code};${i.url}`).join('\n')}\n`)

  console.log(`Utworzono ${codes.length} wolnych tagów (partia ${batch}).`)
  console.log(`  arkusz do druku: ${path.relative(process.cwd(), htmlPath)}`)
  console.log(`  adresy NFC:      ${path.relative(process.cwd(), csvPath)}`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())

import { spawn } from 'node:child_process'

/*
  `npm run dev` – serwer API (z przeładowaniem po zmianach) i Vite jednocześnie, w jednym
  terminalu, z kolorowym przedrostkiem przy każdej linii. Ctrl+C zatrzymuje oba.
  Baza: `docker compose up -d db` (raz, w osobnym kroku).
*/
const processes = [
  { name: 'api', color: '\x1b[38;5;209m', args: ['run', 'dev:server'] },
  { name: 'web', color: '\x1b[38;5;75m', args: ['run', 'dev:client'] },
]

const children = processes.map(({ name, color, args }) => {
  const child = spawn('npm', args, { shell: true, stdio: ['inherit', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } })
  const prefix = `${color}${name.padEnd(3)} │\x1b[0m `
  const pipe = (stream, target) => {
    let buffer = ''
    stream.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) target.write(`${prefix}${line}\n`)
    })
  }
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    console.log(`${prefix}zakończony (kod ${code ?? 0})`)
    shutdown(code ?? 0)
  })
  return child
})

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) if (!child.killed) child.kill()
  setTimeout(() => process.exit(code), 300)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

/*
  Ikony PWA (PNG) bez bibliotek graficznych: rysujemy logo (koralowy zaokrąglony kwadrat
  z łapką) jako funkcję „czy punkt jest w kształcie”, z wygładzaniem przez nadpróbkowanie,
  i zapisujemy PNG ręcznie (zlib z Node.js).

    npm run icons
*/

const CORAL = [0xff, 0x5a, 0x3d]
const INK = [0x1a, 0x0d, 0x09]

// Kształty w układzie 0..40 (jak favicon.svg).
function roundedRect(x, y, inset, radius) {
  const min = inset
  const max = 40 - inset
  const cx = Math.min(Math.max(x, min + radius), max - radius)
  const cy = Math.min(Math.max(y, min + radius), max - radius)
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 && x >= min && x <= max && y >= min && y <= max
}
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
const paw = (x, y) =>
  ellipse(x, y, 20, 25, 6.2, 5) ||
  ellipse(x, y, 12.5, 18, 2.6, 2.6) ||
  ellipse(x, y, 17, 12.8, 2.6, 2.6) ||
  ellipse(x, y, 23, 12.8, 2.6, 2.6) ||
  ellipse(x, y, 27.5, 18, 2.6, 2.6)

// maskable: tło na całej powierzchni, łapka pomniejszona do „bezpiecznej strefy” (80%).
function sample(x, y, maskable) {
  if (maskable) {
    const px = 20 + (x - 20) / 0.72
    const py = 20 + (y - 20) / 0.72
    return paw(px, py) ? [...INK, 255] : [...CORAL, 255]
  }
  if (!roundedRect(x, y, 2, 14)) return [0, 0, 0, 0]
  return paw(x, y) ? [...INK, 255] : [...CORAL, 255]
}

function render(size, { maskable = false, background = null } = {}) {
  const ss = 4
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((px + (sx + 0.5) / ss) / size) * 40
          const y = ((py + (sy + 0.5) / ss) / size) * 40
          let [cr, cg, cb, ca] = sample(x, y, maskable)
          if (background && ca === 0) [cr, cg, cb, ca] = [...background, 255]
          r += cr * ca
          g += cg * ca
          b += cb * ca
          a += ca
        }
      }
      const i = (py * size + px) * 4
      pixels[i] = a ? Math.round(r / a) : 0
      pixels[i + 1] = a ? Math.round(g / a) : 0
      pixels[i + 2] = a ? Math.round(b / a) : 0
      pixels[i + 3] = Math.round(a / (ss * ss))
    }
  }
  return pixels
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}
function png(size, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bitów na kanał
  header[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outputs = [
  ['public/pwa-192x192.png', 192, {}],
  ['public/pwa-512x512.png', 512, {}],
  ['public/maskable-512x512.png', 512, { maskable: true }],
  ['public/apple-touch-icon.png', 180, { background: [0xf5, 0xf5, 0xf3] }],
]
for (const [file, size, options] of outputs) {
  writeFileSync(file, png(size, render(size, options)))
  console.log(`✓ ${file}`)
}

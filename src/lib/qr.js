import QRCode from 'qrcode'

// Kod QR jako obrazek SVG (data URL) – ostry w każdym rozmiarze, także w druku.
export async function qrDataUrl(text, { dark = '#18171C', margin = 1 } = {}) {
  const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin, color: { dark, light: '#FFFFFF' } })
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const appOrigin = () => window.location.origin
export const tagUrl = (code, params = '') => `${appOrigin()}/t/${code}${params}`
export const vetUrl = (token) => `${appOrigin()}/v/${token}`

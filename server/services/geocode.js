import { config } from '../config.js'
import { query } from '../db/pool.js'

/*
  Odwrotne geokodowanie przez OpenStreetMap Nominatim: współrzędne → „okolice ul. Marszałkowskiej,
  Warszawa”. Wykonywane w tle po zapisaniu skanu, więc znalazca nie czeka na odpowiedź.
  Zasady Nominatim: maks. 1 zapytanie/s i identyfikujący User-Agent – kolejka pilnuje odstępu.
  Gdy usługa nie odpowie, w dzienniku zostają same współrzędne.
*/
let queue = Promise.resolve()

function labelFrom(address) {
  if (!address) return ''
  const street = address.road || address.pedestrian || address.footway || address.path || address.square
  const area = address.suburb || address.neighbourhood || address.quarter
  const city = address.city || address.town || address.village || address.municipality
  const parts = []
  if (street) parts.push(/^(ul\.|al\.|pl\.|aleja|plac|ulica)/i.test(street) ? street : `ul. ${street}`)
  else if (area) parts.push(area)
  if (city) parts.push(city)
  return parts.join(', ')
}

async function lookup(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=pl&lat=${lat}&lon=${lng}`
  const response = await fetch(url, {
    headers: { 'User-Agent': `PeTraceAlt/1.0 (+${config.appUrl})` },
    signal: AbortSignal.timeout(4000),
  })
  if (!response.ok) return ''
  const data = await response.json()
  return labelFrom(data.address)
}

export function geocodeScanInBackground(scanId, lat, lng) {
  if (!config.reverseGeocoding) return
  queue = queue
    .then(async () => {
      const label = await lookup(lat, lng)
      if (label) await query('UPDATE scans SET place_label = $2 WHERE id = $1', [scanId, label.slice(0, 120)])
      await new Promise((resolve) => setTimeout(resolve, 1100))
    })
    .catch(() => {})
}

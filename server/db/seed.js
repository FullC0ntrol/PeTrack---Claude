import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { migrate } from './migrate.js'
import { pool, transaction } from './pool.js'

/*
  Dane demonstracyjne: konto demo@petrace.app z trzema zwierzętami.
    Burek     – pies, tag BURK-7K2Q, stare skany i zakończone zaginięcie sprzed 3 miesięcy,
    Luna      – kotka, tag LUNA-4P9D, ZAGINIONA: trasa skanów po Mokotowie i wiadomości od znalazców,
    Fistaszek – świnka morska bez tagu (do pokazania przypisywania).
  Do tego 5 wolnych tagów PETS-2345 … PETS-6789.
  Czasy są liczone względem „teraz”, więc demo zawsze wygląda świeżo.
*/

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()
const H = 60
const D = 24 * H

export const DEMO_FREE_TAGS = ['PETS-2345', 'PETS-3456', 'PETS-4567', 'PETS-5678', 'PETS-6789']

async function insertPet(client, ownerId, pet, createdAt) {
  const keys = Object.keys(pet)
  const { rows } = await client.query(
    `INSERT INTO pets (owner_id, ${keys.join(', ')}, created_at)
     VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')}, $${keys.length + 2}) RETURNING id`,
    [ownerId, ...keys.map((key) => pet[key]), createdAt],
  )
  return rows[0].id
}

async function insertScan(client, scan) {
  const { rows } = await client.query(
    `INSERT INTO scans (tag_code, pet_id, source, scanned_at, lat, lng, accuracy_m, located_at, place_label, read_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $5::float8 IS NULL THEN NULL ELSE $4::timestamptz END, $8, $9)
     RETURNING id`,
    [
      scan.tag,
      scan.petId,
      scan.source ?? 'tag',
      scan.at,
      scan.lat ?? null,
      scan.lng ?? null,
      scan.lat ? (scan.accuracy ?? 25) : null,
      scan.place ?? '',
      scan.read ? scan.at : null,
    ],
  )
  return rows[0].id
}

export async function seedDemo({ reset = false, log = console.log } = {}) {
  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [config.demoEmail])
  if (existing[0] && !reset) return false

  await transaction(async (client) => {
    await client.query('DELETE FROM users WHERE email = $1', [config.demoEmail])
    await client.query(`DELETE FROM tags WHERE batch = 'seed'`)

    const { rows: users } = await client.query(
      `INSERT INTO users (email, name, phone, created_at) VALUES ($1, 'Ola', '+48 600 700 800', $2) RETURNING id`,
      [config.demoEmail, ago(210 * D)],
    )
    const ownerId = users[0].id

    const burek = await insertPet(client, ownerId, {
      name: 'Burek',
      species: 'dog',
      breed: 'Mieszaniec',
      sex: 'male',
      birth_date: '2019-05-12',
      weight_kg: 18.5,
      description: 'Rudy, biała łata na piersi. Przyjazny, ale boi się rowerów.',
      color: 'mandarin',
      chip_number: '616093900123456',
      allergies: 'Kurczak (wysypka)',
      medications: '',
      conditions: 'Po zabiegu lewej tylnej łapy – może lekko kuleć.',
      vaccinations: 'Wścieklizna – marzec 2026, zakaźne – maj 2026',
      vet_clinic: 'Przychodnia Łapa, ul. Puławska 12',
      vet_phone: '+48 22 600 11 22',
      contact_name: 'Ola Nowak',
      contact_phone: '+48 600 700 800',
    }, ago(200 * D))
    const luna = await insertPet(client, ownerId, {
      name: 'Luna',
      species: 'cat',
      breed: 'Europejska krótkowłosa',
      sex: 'female',
      birth_date: '2021-08-01',
      weight_kg: 4.2,
      description: 'Szara pręgowana z białym „krawacikiem”. Płochliwa – nie łap jej na siłę.',
      color: 'lavender',
      chip_number: '616093900654321',
      allergies: '',
      medications: 'Tiamazol 2,5 mg rano (tabletka w przysmaku)',
      conditions: 'Nadczynność tarczycy',
      vaccinations: 'Panleukopenia, katar koci – styczeń 2026',
      vet_clinic: 'Przychodnia Łapa, ul. Puławska 12',
      vet_phone: '+48 22 600 11 22',
      contact_name: 'Ola Nowak',
      contact_phone: '+48 600 700 800',
    }, ago(195 * D))
    const fistaszek = await insertPet(client, ownerId, {
      name: 'Fistaszek',
      species: 'other',
      breed: 'Świnka morska rozetka',
      sex: 'male',
      birth_date: '2023-03-10',
      weight_kg: 1.1,
      description: 'Biało-ruda, nastroszona sierść.',
      color: 'mint',
      contact_name: 'Ola Nowak',
      contact_phone: '+48 600 700 800',
    }, ago(150 * D))

    // Tagi: dwa przypisane i pięć wolnych.
    await client.query(
      `INSERT INTO tags (code, pet_id, batch, assigned_at, created_at) VALUES
         ('BURK-7K2Q', $1, 'seed', $3, $3),
         ('LUNA-4P9D', $2, 'seed', $3, $3)`,
      [burek, luna, ago(190 * D)],
    )
    for (const code of DEMO_FREE_TAGS) {
      await client.query(`INSERT INTO tags (code, batch, created_at) VALUES ($1, 'seed', $2)`, [code, ago(30 * D)])
    }

    // Burek: zakończone zaginięcie sprzed ~3 miesięcy (znaleziony po 5 godzinach) i zwykłe skany.
    await client.query(
      `INSERT INTO lost_reports (pet_id, last_seen_at, last_seen_lat, last_seen_lng, last_seen_place, message,
                                 show_phone, phone, created_at, resolved_at)
       VALUES ($1, $2, 52.1932, 21.0336, 'Park Arkadia, przy stawie', 'Burek uciekł przestraszony fajerwerkami.',
               true, '+48 600 700 800', $3, $4)`,
      [burek, ago(92 * D + 6 * H), ago(92 * D + 5.5 * H), ago(92 * D + H)],
    )
    await insertScan(client, { tag: 'BURK-7K2Q', petId: burek, at: ago(92 * D + 3 * H), lat: 52.1958, lng: 21.0279, place: 'ul. Dolna, Warszawa', read: true })
    await insertScan(client, { tag: 'BURK-7K2Q', petId: burek, at: ago(92 * D + 1.5 * H), lat: 52.2003, lng: 21.0231, place: 'ul. Odyńca, Warszawa', read: true })
    await insertScan(client, { tag: 'BURK-7K2Q', petId: burek, at: ago(41 * D), read: true })
    await insertScan(client, { tag: 'BURK-7K2Q', petId: burek, at: ago(6 * D + 3 * H), lat: 52.2041, lng: 21.0118, place: 'ul. Rakowiecka, Warszawa', read: false })

    // Weterynarz otworzył kiedyś kartę Burka (udostępnienie już wygasło).
    await client.query(
      `INSERT INTO vet_shares (pet_id, token_hash, duration, expires_at, open_count, last_opened_at, created_at)
       VALUES ($1, 'seed-expired-' || gen_random_uuid(), '1h', $2, 1, $3, $4)`,
      [burek, ago(20 * D - H), ago(20 * D - 20), ago(20 * D)],
    )

    // Luna: zaginiona od 2 dni. Trasa skanów od Pola Mokotowskiego w stronę pl. Zbawiciela.
    await client.query(
      `INSERT INTO lost_reports (pet_id, last_seen_at, last_seen_lat, last_seen_lng, last_seen_place, message,
                                 show_phone, phone, created_at)
       VALUES ($1, $2, 52.2118, 21.0019, 'Pole Mokotowskie, od strony ul. Żwirki i Wigury',
               'Luna jest płochliwa – proszę jej nie łapać. Napisz, gdzie ją widzisz, przyjadę od razu. Dziękuję!',
               true, '+48 600 700 800', $3)`,
      [luna, ago(2 * D + 2 * H), ago(2 * D + H)],
    )
    await insertScan(client, { tag: 'LUNA-4P9D', petId: luna, at: ago(D + 20 * H), lat: 52.2139, lng: 21.0052, place: 'ul. Stefana Batorego, Warszawa', read: true })
    const polna = await insertScan(client, { tag: 'LUNA-4P9D', petId: luna, at: ago(D + 2 * H), lat: 52.2161, lng: 21.0098, place: 'ul. Polna, Warszawa', read: true })
    await insertScan(client, { tag: 'LUNA-4P9D', petId: luna, source: 'poster', at: ago(9 * H) })
    await insertScan(client, { tag: 'LUNA-4P9D', petId: luna, at: ago(5 * H), lat: 52.2193, lng: 21.0142, place: 'pl. Zbawiciela, Warszawa' })
    const mokotowska = await insertScan(client, { tag: 'LUNA-4P9D', petId: luna, at: ago(78), lat: 52.2218, lng: 21.0185, place: 'ul. Mokotowska, Warszawa' })

    await client.query(
      `INSERT INTO finder_messages (pet_id, scan_id, pet_condition, body, finder_contact, created_at, read_at) VALUES
         ($1, $2, 'escaped', 'Chyba widziałem ją wczoraj wieczorem na Polnej – biegła w stronę placu.', '', $3, $3),
         ($1, $4, 'safe', 'Szara kotka z białym krawacikiem siedzi pod samochodem przy Mokotowskiej 51. Nie podchodziłam, żeby jej nie spłoszyć. Jestem tu jeszcze ok. godziny.', 'Kasia, 501 222 333', $5, NULL)`,
      [luna, polna, ago(D + 2 * H - 5), mokotowska, ago(74)],
    )
  })

  log(`[db] dane demo gotowe: ${config.demoEmail} (Burek, Luna – zaginiona, Fistaszek), wolne tagi: ${DEMO_FREE_TAGS.join(', ')}`)
  return true
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => seedDemo({ reset: process.argv.includes('--reset') }))
    .then((created) => {
      if (!created) console.log('[db] konto demo już istnieje (użyj --reset, aby odtworzyć)')
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => pool.end())
}

-- PeTrace Alt – schemat bazy. Migracje uruchamia server/db/migrate.js (przy każdym starcie
-- serwera); każdy plik wykonuje się raz, w transakcji, a jego nazwa trafia do schema_migrations.

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE CHECK (email = lower(email)),
  name       text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Jedno żądanie logowania = jeden link i jeden 6-cyfrowy kod. Oba tylko jako skróty:
--   token_hash – SHA-256 losowego tokenu z linku (256 bitów, odgadnięcie niemożliwe),
--   code_hash  – HMAC-SHA256(AUTH_SECRET, id + kod). Sam SHA-256 z 6 cyfr dałoby się
--                odwrócić w ułamku sekundy, HMAC bez sekretu serwera – nie.
-- attempts liczy błędne kody; po 5 próbach żądanie przestaje działać.
CREATE TABLE login_challenges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  code_hash  text NOT NULL,
  next_path  text,
  attempts   integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_challenges_email_idx ON login_challenges (email, created_at DESC);

-- Sesje w bazie (a nie JWT): wylogowanie naprawdę unieważnia sesję, a „Wyloguj wszędzie”
-- usuwa wszystkie wiersze użytkownika. W ciasteczku jest token, w bazie jego SHA-256.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  user_agent   text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE pets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  species        text NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed          text NOT NULL DEFAULT '',
  sex            text NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
  birth_date     date,
  weight_kg      numeric(5, 2) CHECK (weight_kg > 0 AND weight_kg < 200),
  description    text NOT NULL DEFAULT '',
  -- Kolor zwierzęcia barwi jego ekrany (lista w src/lib/petColors.js i server/validation.js).
  color          text NOT NULL DEFAULT 'coral',
  -- Zdrowie
  chip_number    text NOT NULL DEFAULT '',
  allergies      text NOT NULL DEFAULT '',
  medications    text NOT NULL DEFAULT '',
  conditions     text NOT NULL DEFAULT '',
  vaccinations   text NOT NULL DEFAULT '',
  vet_clinic     text NOT NULL DEFAULT '',
  vet_phone      text NOT NULL DEFAULT '',
  -- Kontakt (domyślnie z konta, ale można podać inną osobę, np. sąsiada)
  contact_name   text NOT NULL DEFAULT '',
  contact_phone  text NOT NULL DEFAULT '',
  -- Losowy klucz zdjęcia: zmienia się przy każdej zmianie zdjęcia, więc adres
  -- /api/public/photos/:key można cache'ować na zawsze, a starego zdjęcia nie da się odgadnąć.
  photo_key      uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pets_owner_id_idx ON pets (owner_id, created_at);

CREATE TABLE pet_photos (
  key        uuid PRIMARY KEY,
  pet_id     uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  mime       text NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pet_photos_pet_id_idx ON pet_photos (pet_id);

-- Tagi mają kod nadany wcześniej (seed albo `npm run tags:generate`). pet_id = NULL → wolny tag,
-- który właściciel przypisuje, skanując go albo wpisując kod.
CREATE TABLE tags (
  code        text PRIMARY KEY CHECK (code ~ '^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),
  pet_id      uuid REFERENCES pets (id) ON DELETE SET NULL,
  batch       text NOT NULL DEFAULT 'manual',
  assigned_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tags_pet_id_idx ON tags (pet_id);

-- Zgłoszenie zaginięcia. Zwierzę jest zaginione, dopóki ma zgłoszenie z resolved_at IS NULL.
CREATE TABLE lost_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  last_seen_at   timestamptz NOT NULL,
  last_seen_lat  double precision CHECK (last_seen_lat BETWEEN -90 AND 90),
  last_seen_lng  double precision CHECK (last_seen_lng BETWEEN -180 AND 180),
  last_seen_place text NOT NULL DEFAULT '',
  message        text NOT NULL DEFAULT '',
  show_phone     boolean NOT NULL DEFAULT false,
  phone          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE UNIQUE INDEX lost_reports_one_open_per_pet ON lost_reports (pet_id) WHERE resolved_at IS NULL;

-- Każde otwarcie strony tagu przez kogoś innego niż właściciel. Lokalizacja tylko, jeśli
-- znalazca sam ją udostępni (kolumny lat/lng uzupełnia osobne żądanie). Bez adresu IP.
CREATE TABLE scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code    text NOT NULL REFERENCES tags (code) ON DELETE CASCADE,
  pet_id      uuid REFERENCES pets (id) ON DELETE CASCADE,
  source      text NOT NULL DEFAULT 'tag' CHECK (source IN ('tag', 'poster')),
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  lat         double precision CHECK (lat BETWEEN -90 AND 90),
  lng         double precision CHECK (lng BETWEEN -180 AND 180),
  accuracy_m  integer CHECK (accuracy_m >= 0),
  located_at  timestamptz,
  place_label text NOT NULL DEFAULT '',
  read_at     timestamptz
);

CREATE INDEX scans_pet_id_idx ON scans (pet_id, scanned_at DESC);

-- Anonimowa wiadomość od znalazcy. Kontakt zwrotny jest opcjonalny – znalazca decyduje.
CREATE TABLE finder_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  scan_id        uuid REFERENCES scans (id) ON DELETE SET NULL,
  pet_condition  text NOT NULL DEFAULT 'unknown' CHECK (pet_condition IN ('safe', 'injured', 'escaped', 'unknown')),
  body           text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  finder_contact text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  read_at        timestamptz
);

CREATE INDEX finder_messages_pet_id_idx ON finder_messages (pet_id, created_at DESC);

-- Tymczasowy dostęp weterynarza do karty zdrowia (tylko odczyt). Token jest w kodzie QR,
-- w bazie jego SHA-256.
CREATE TABLE vet_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         uuid NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  token_hash     text NOT NULL UNIQUE,
  duration       text NOT NULL CHECK (duration IN ('1h', '24h', '7d')),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  open_count     integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vet_shares_pet_id_idx ON vet_shares (pet_id, created_at DESC);

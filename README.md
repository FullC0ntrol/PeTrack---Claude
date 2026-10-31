# PeTrace Alt

System identyfikacji zwierząt domowych przez tagi NFC/QR na obroży. Ta sama aplikacja co wersja klasyczna, ale z innym wyglądem i innymi przepływami. Zestawienie różnic: [docs/ROZNICE.md](docs/ROZNICE.md).

Znalazca skanuje tag telefonem i bez instalowania aplikacji przechodzi krótką ścieżkę: **„Cześć, jestem Burek!” → „Czy jestem bezpieczny?” → „Udostępnij, gdzie mnie znalazłeś” → wiadomość do opiekuna**. Właściciel ma ekran skupiony na jednym zwierzęciu, przełącznik zwierząt u góry i wszystkie akcje w arkuszu „Akcje”.

## Funkcje

| Obszar | Co robi |
|---|---|
| Logowanie | Bez hasła: mail z **linkiem i 6-cyfrowym kodem**. Kod wpisuje się na tej samej stronie, więc działa też w zainstalowanej PWA. |
| Zwierzęta | Kreator w 5 krokach (dane → zdjęcie → zdrowie → kontakt → kolor) z paskiem postępu. Każde zwierzę ma własny kolor, który barwi jego ekrany. |
| Tagi | Kody nadane wcześniej (seed albo skrypt). Zeskanowanie wolnego tagu przez zalogowanego właściciela otwiera ekran „Przypisz ten tag do zwierzęcia”. Kod można też wpisać ręcznie. |
| Zaginięcie | Kreator: pinezka na mapie → czas → komunikat (opcjonalnie z numerem telefonu). Potem plakat A4 z kodem QR, a na koniec przycisk „Znaleziony!” z ekranem potwierdzenia. |
| Znalazca `/t/:kod` | Prowadzona ścieżka, lokalizacja tylko za zgodą, **anonimowa wiadomość** do opiekuna. Numer telefonu widać tylko w trybie zaginięcia i tylko gdy właściciel na to pozwoli. |
| Dziennik | Kanał zdarzeń („Ktoś zeskanował tag Burka, 14:32, okolice ul. X”) z mapą punktów i trasą w czasie zaginięcia. Nieprzeczytane zdarzenia mają licznik. |
| Weterynarz | Duży kod QR na ekranie telefonu z odliczaniem ważności (1 h / 24 h / 7 dni) i przyciskiem natychmiastowego unieważnienia. |
| Wygląd | Jasny styl z koralowym akcentem, fonty Sora i Inter, ilustracje SVG rysowane w kodzie, tryb jasny i ciemny, mobile-first. |

## Stos

- **Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4, Leaflet + OpenStreetMap, `vite-plugin-pwa`. Kody QR generuje `qrcode`.
- **Backend:** Node.js 22, Express 5, PostgreSQL 17 (`pg`, SQL bez ORM), `cookie-parser`, `nodemailer`.
- **Wdrożenie:** Docker Compose z dwoma kontenerami: `app` (Express serwuje API i zbudowany frontend) i `db` (Postgres).

## Uruchomienie

### Docker (całość, jak na serwerze)

```bash
docker compose up --build
```

Otwórz **http://localhost:8090**. Przy pierwszym starcie aplikacja sama tworzy schemat i konto demo. Bez SMTP kod i link logowania trafiają do logów:

```bash
docker compose logs -f app
```

Zatrzymanie: `docker compose down`. Z usunięciem danych: `docker compose down -v`. Porty zmienisz w `.env` (`HTTP_PORT`, `DB_PORT`).

### Serwer VPS (2.petracker.pl)

Krok po kroku, obok działającej wersji klasycznej (nginx + certbot): [docs/DEPLOY.md](docs/DEPLOY.md). Gotowe pliki: [deploy/nginx-2.petracker.pl.conf](deploy/nginx-2.petracker.pl.conf) i [deploy/env.server.example](deploy/env.server.example).

### Tryb deweloperski

Wymagania: Node.js 22 i Docker (tylko dla bazy).

```bash
cp .env.example .env
npm install
docker compose up -d db      # sama baza na localhost:5442
npm run dev                  # API :3000 + Vite :5180 w jednym terminalu
```

Otwórz **http://localhost:5180**. Link i kod logowania wypisuje konsola (`api │ Kod: 123456`).

### Polecenia

| Polecenie | Co robi |
|---|---|
| `npm run dev` | API z przeładowaniem po zmianach + Vite |
| `npm run build` | produkcyjny build frontendu (`dist/`) |
| `npm start` | serwer produkcyjny: API + `dist/` |
| `npm run lint` | ESLint (frontend i backend) |
| `npm run db:migrate` | migracje z `server/db/migrations/*.sql` (uruchamiają się też same przy starcie) |
| `npm run db:seed` | odtwarza konto demo od nowa |
| `npm run tags:generate -- 24` | partia 24 wolnych tagów + arkusz QR do druku |
| `npm run icons` | ikony PWA w `public/` |

## Konto demo

| Co | Wartość |
|---|---|
| E-mail | `demo@petrace.app`. Na stronie logowania jest też przycisk **„Wejdź na konto demo”** (gdy `DEMO_LOGIN=true`). |
| Burek, pies | tag `BURK-7K2Q`, stare skany i zakończone zaginięcie sprzed 3 miesięcy |
| Luna, kotka | tag `LUNA-4P9D`, **zaginiona**: trasa skanów po Mokotowie i wiadomości od znalazców |
| Fistaszek, świnka morska | bez tagu |
| Wolne tagi | `PETS-2345`, `PETS-3456`, `PETS-4567`, `PETS-5678`, `PETS-6789` |

Do wypróbowania:
- `/t/LUNA-4P9D` w oknie prywatnym to ścieżka znalazcy zaginionej kotki;
- `/t/PETS-2345` na zalogowanym koncie demo to ekran „Przypisz ten tag do zwierzęcia”.

## Jak zapisać URL na tagu NFC

1. Kup tagi **NTAG213/215/216**: naklejki albo brelok na obrożę. NTAG213 (144 B) w zupełności wystarczy.
2. Zainstaluj na telefonie aplikację do zapisu NFC, np. **NFC Tools** (Android/iOS).
3. Wybierz *Zapisz → Dodaj rekord → URL/URI* i wpisz adres tagu: `https://twoja-domena.pl/t/KOD`, np. `https://petrace.app/t/PETS-2345`. Adresy całej partii są w pliku `print/tagi-*.csv`.
4. Przyłóż tag do telefonu i zapisz. Sprawdź: zbliż telefon do tagu, powinna otworzyć się strona tagu.
5. Opcjonalnie zablokuj tag (*Inne → Zablokuj tag*), żeby nikt go nie nadpisał. **Tej operacji nie da się cofnąć.**

Telefon otwiera adres w przeglądarce, więc znalazca nie potrzebuje żadnej aplikacji. Tag NFC nie ma baterii i nie da się go namierzyć: lokalizacja pochodzi wyłącznie z telefonu znalazcy i tylko za jego zgodą.

## Jak wydrukować partię tagów QR

```bash
npm run tags:generate -- 24                          # adresy z APP_URL
npm run tags:generate -- 24 --url https://petrace.app
docker compose exec app npm run tags:generate -- 24  # w Dockerze (plik trafi do ./print)
```

Skrypt dodaje do bazy 24 **wolne** tagi i zapisuje w katalogu `print/`:
- `tagi-<partia>.html` – arkusz A4: siatka 4 kolumn, kod QR ~30 mm, kod tekstowy pod spodem i linie cięcia;
- `tagi-<partia>.csv` – `kod;adres_nfc` do zapisania na tagach NFC.

Otwórz plik HTML w przeglądarce → *Drukuj* → skala **100%**, marginesy domyślne. Najlepiej drukować na papierze samoprzylepnym lub na folii. Wycięty kod można zalaminować i przyczepić do zawieszki.

## Konfiguracja

Wszystkie zmienne opisuje [.env.example](.env.example). Najważniejsze przed wdrożeniem:

- `APP_URL` / `DOCKER_APP_URL` – publiczny adres; z niego powstają linki w mailach, na tagach i plakatach;
- `AUTH_SECRET` – długi losowy sekret (`openssl rand -hex 32`). Serwer w produkcji nie wystartuje z domyślnym;
- `SMTP_*` – poczta. Bez niej kody są tylko w logach;
- `DEMO_LOGIN=false`, `SEED_DEMO=false`, `COOKIE_SECURE=true` na publicznym serwerze;
- `TRUST_PROXY=1`, gdy przed aplikacją stoi nginx/Caddy (wtedy limity żądań widzą prawdziwe IP).

## Bezpieczeństwo w skrócie

- Sesja to losowy token w ciasteczku `httpOnly` + `SameSite=Lax`, a w bazie leży tylko jego SHA-256. Wylogowanie naprawdę unieważnia sesję; jest też „Wyloguj wszędzie”.
- Link logowania jest w bazie jako SHA-256, a 6-cyfrowy kod jako HMAC z sekretem serwera. Kod ma maksymalnie 5 prób i wygasa po 15 minutach. Token weterynarza jest przechowywany jako SHA-256.
- Limity żądań obejmują logowanie (IP i e-mail), weryfikację kodu, stronę tagu, udostępnianie lokalizacji, wiadomości od znalazców (IP i tag), kartę weterynarza i ręczne przypisywanie tagów.
- Każde żądanie zmieniające dane wymaga nagłówka `X-PeTrace` (ochrona przed CSRF). Wszystkie dane wejściowe są walidowane na serwerze (`server/validation.js`), a typ zdjęcia jest sprawdzany po nagłówku pliku.
- Ustawione są nagłówki CSP, `X-Frame-Options`, `nosniff` i `Referrer-Policy`. Skany nie zapisują adresu IP.

## Struktura

```
├── src/                     frontend
│   ├── api/                 klient HTTP i lista endpointów
│   ├── components/          ui/ (przyciski, arkusz, pola), layout/, pets/, map/ (Leaflet), illustrations/ (SVG)
│   ├── context/ hooks/ lib/ stan, formatowanie (odmiana, daty), kolory zwierząt, QR, obrazy
│   └── pages/               public/, owner/, finder/, vet/
├── server/                  backend
│   ├── db/                  migrations/*.sql, migrate.js, seed.js
│   ├── routes/              auth, me, pets, events (dziennik i zaginięcia), tags, vet, public
│   ├── services/ middleware/
│   └── scripts/generate-tags.js
├── public/                  ikony PWA, theme-init.js
├── scripts/                 dev.mjs (API + Vite), generate-icons.mjs
├── docs/                    ROZNICE.md (porównanie z wersją klasyczną), DEPLOY.md (wdrożenie na VPS)
├── deploy/                  konfiguracja nginx i wzór .env dla serwera
└── Dockerfile, docker-compose.yml, .env.example
```

## Ograniczenia

- Brak powiadomień push (poza zakresem). O nowej wiadomości od znalazcy właściciel dowiaduje się z licznika w aplikacji, a przy skonfigurowanym SMTP także z maila.
- Limity żądań są trzymane w pamięci procesu, więc przy kilku instancjach aplikacji trzeba by je przenieść np. do Redisa.
- Nazwy ulic w dzienniku pochodzą z publicznego Nominatim (maks. 1 zapytanie/s). Bez internetu w dzienniku zostają same współrzędne (`REVERSE_GEOCODING=false` wyłącza zapytania).
- Kod QR weterynarza widać tylko na urządzeniu, które go utworzyło (serwer zna wyłącznie skrót tokenu). Na innym urządzeniu można go unieważnić i utworzyć nowy.

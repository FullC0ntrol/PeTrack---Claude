# Wdrożenie PeTrace Alt na VPS jako `2.petracker.pl`

PeTrace Alt staje **obok** tego, co już działa na serwerze, i niczego tam nie zmienia:

```
internet → nginx (HTTPS, certbot) ─┬─ petracker.pl       → 127.0.0.1:8080  wersja klasyczna (~/prototyp)
                                   ├─ plan.petracker.pl  → pliki z /var/www/plan.petracker.pl
                                   └─ 2.petracker.pl     → 127.0.0.1:8090  PeTrace Alt (/var/www/2.petracker.pl)
```

- Serwer: `57.131.193.154`, użytkownik `control` z `sudo`. Docker, nginx i certbot są już zainstalowane.
- **Node.js na serwerze nie jest potrzebny** – `npm install` i budowanie frontendu dzieją się wewnątrz obrazu Dockera.
- Kontenery należą do projektu `petrace-alt` (nazwa w `docker-compose.yml`), więc mają osobną bazę i wolumeny niż wersja klasyczna.
- Gotowe pliki: [`deploy/nginx-2.petracker.pl.conf`](../deploy/nginx-2.petracker.pl.conf) i [`deploy/env.server.example`](../deploy/env.server.example).
- nginx tylko przekazuje ruch do kontenera (`proxy_pass`, bez `root`), więc pliki projektu w `/var/www/2.petracker.pl`, w tym `.env`, nie są dostępne z internetu.

Kolejność: **DNS → kod → `.env` → start → nginx → HTTPS → test**.

---

## 1. DNS: rekord dla `2.petracker.pl`

W panelu domeny `petracker.pl` dodaj rekord:

| Typ | Nazwa (host) | Wartość | TTL |
|---|---|---|---|
| A | `2` | `57.131.193.154` | 3600 |

Sprawdź (na komputerze albo na serwerze) – w odpowiedzi powinien być `57.131.193.154`:

```bash
nslookup 2.petracker.pl
```

Bez tego nie powstanie certyfikat HTTPS (krok 6). Kroki 2–5 możesz robić w międzyczasie.

## 2. Kod na serwerze

Na komputerze, w katalogu projektu, wypchnij najnowszą wersję:

```bash
git push
```

Na serwerze pobierz projekt (pierwszy raz) albo zaktualizuj istniejący klon:

```bash
sudo git clone https://github.com/FullC0ntrol/PeTrack---Claude.git /var/www/2.petracker.pl   # tylko pierwszy raz
cd /var/www/2.petracker.pl
sudo git pull
```

Sprawdź, że jest katalog `deploy/` (wymaga kroku `git push` powyżej):

```bash
ls deploy
```

Kontener działa jako użytkownik `node` (uid 1000) i zapisuje arkusze tagów do `print/`. Katalog sklonowany przez `sudo` należy do roota, więc oddaj go kontenerowi:

```bash
sudo chown -R 1000:1000 print
```

## 3. Plik `.env`

Skopiuj wzór dla serwera i wygeneruj hasło do bazy oraz sekret logowania:

```bash
sudo cp deploy/env.server.example .env
sudo sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sudo sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(openssl rand -hex 32)/" .env
sudo chmod 600 .env
```

Sprawdź, że nic nie zostało do uzupełnienia – wynik powinien być `OK`:

```bash
sudo grep -n "<wklej>" .env || echo OK
```

Opcjonalnie poczta: jeśli wersja klasyczna ma SMTP, podejrzyj dane (`grep SMTP ~/prototyp/.env`) i wpisz je w `sudo nano .env`. Bez SMTP kod logowania jest w `sudo docker compose logs app`, a przycisk **„Wejdź na konto demo”** działa bez poczty.

| Zmienna | Wartość | Po co |
|---|---|---|
| `DOCKER_APP_URL` | `https://2.petracker.pl` | linki w mailach, na tagach, plakatach i kodach QR |
| `HTTP_PORT` | `127.0.0.1:8090` | aplikacja dostępna tylko dla nginx. Bez `127.0.0.1:` Docker wystawiłby port na świat z pominięciem zapory |
| `COOKIE_SECURE` | `true` | ciasteczko sesji tylko przez HTTPS |
| `TRUST_PROXY` | `1` | prawdziwe IP z nagłówka nginx (limity prób logowania) |
| `SEED_DEMO`, `DEMO_LOGIN` | `true` | konto demo do pokazu; dla prawdziwych użytkowników ustaw `false` |

## 4. Uruchomienie

Zbuduj obraz i uruchom kontenery w tle (pierwszy raz kilka minut; serwer ma 3,7 GB RAM, to wystarczy):

```bash
sudo docker compose up -d --build
```

Sprawdź, czy aplikacja odpowiada – wynik powinien zawierać `{"ok":true}`:

```bash
curl http://127.0.0.1:8090/api/health
```

W logach powinny być linie o migracji, danych demo i `nasłuchuje na :3000 – https://2.petracker.pl`:

```bash
sudo docker compose logs app
```

Wersja klasyczna działa dalej:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080
```

## 5. nginx

Skopiuj konfigurację subdomeny, włącz ją i sprawdź:

```bash
sudo cp deploy/nginx-2.petracker.pl.conf /etc/nginx/sites-available/2.petracker.pl
sudo ln -s /etc/nginx/sites-available/2.petracker.pl /etc/nginx/sites-enabled/2.petracker.pl
sudo nginx -t
```

Gdy wynik kończy się `test is successful`, przeładuj nginx. To `reload`, nie restart, więc pozostałe strony działają bez przerwy:

```bash
sudo systemctl reload nginx
```

> Konfiguracja ma `client_max_body_size 4m`: zdjęcia zwierząt mogą mieć do 3 MB, a domyślny limit nginx to 1 MB.

## 6. Certyfikat HTTPS

Gdy `nslookup 2.petracker.pl` zwraca adres serwera (krok 1), pobierz certyfikat. Certbot dopisze HTTPS i przekierowanie z HTTP do pliku z kroku 5, tak jak zrobił to dla `petracker.pl`:

```bash
sudo certbot --nginx -d 2.petracker.pl
```

Sprawdź odnawianie i działanie przez HTTPS:

```bash
sudo certbot renew --dry-run
curl https://2.petracker.pl/api/health
```

## 7. Test

1. `https://2.petracker.pl` → **Zobacz demo**: ekran Burka, przełącz na Lunę (zaginiona).
2. Na telefonie, w trybie prywatnym: `https://2.petracker.pl/t/LUNA-4P9D` – ścieżka znalazcy. Lokalizacja działa tylko przez HTTPS.
3. Logowanie zwykłym e-mailem: kod przyjdzie mailem albo (bez SMTP) pojawi się w `sudo docker compose logs app`.
4. Na telefonie w Chrome: menu → **Dodaj do ekranu głównego** (PWA).

## 8. Tagi do druku i NFC

Partia wolnych tagów; adresy dostaną domenę `https://2.petracker.pl`:

```bash
sudo docker compose exec app npm run tags:generate -- 24
```

Pliki są w `/var/www/2.petracker.pl/print/`. Pobierz je na komputer, otwórz HTML w przeglądarce i drukuj w skali 100%:

```bash
scp -r control@57.131.193.154:/var/www/2.petracker.pl/print ./print-serwer
```

Adresy do zapisania na tagach NFC są w pliku `.csv` (instrukcja w [README](../README.md#jak-zapisać-url-na-tagu-nfc)).

## 9. Kopia zapasowa bazy

```bash
sudo mkdir -p /var/backups/petrace-alt
sudo docker compose exec -T db pg_dump -U petrace petrace | sudo tee /var/backups/petrace-alt/petrace-alt-$(date +%F).sql > /dev/null
```

Kopia co noc o 3:30: otwórz harmonogram roota (`sudo crontab -e`) i dopisz wiersz:

```
30 3 * * * cd /var/www/2.petracker.pl && docker compose exec -T db pg_dump -U petrace petrace > /var/backups/petrace-alt/petrace-alt-$(date +\%F).sql && find /var/backups/petrace-alt -name '*.sql' -mtime +14 -delete
```

## 10. Aktualizacja

Na komputerze `git push`, a na serwerze:

```bash
cd /var/www/2.petracker.pl
sudo git pull
sudo docker compose up -d --build
sudo docker image prune -f
```

Nowe pliki w `server/db/migrations/` wykonują się same przy starcie. Przed zmianą schematu zrób kopię (krok 9).

Przywrócenie stanu demo (np. po pokazie):

```bash
sudo docker compose exec app npm run db:seed
```

## 11. Gdy coś nie działa

| Objaw | Co sprawdzić |
|---|---|
| `502 Bad Gateway` na `2.petracker.pl` | `sudo docker compose ps` – czy `app` jest `healthy`; `sudo docker compose logs app` |
| „AUTH_SECRET jest domyślny albo za krótki” w logach | w `.env` nie podmieniono `AUTH_SECRET` (krok 3) |
| `port is already allocated` | port 8090 lub 5442 zajęty – zmień `HTTP_PORT`/`DB_PORT` w `.env` (i port w konfiguracji nginx) |
| certbot: `NXDOMAIN` / `unauthorized` | rekord DNS z kroku 1 jeszcze nie działa (`nslookup 2.petracker.pl`) |
| „Brak uprawnień do zapisu w /app/print” | `sudo chown -R 1000:1000 print` (krok 2) |
| „Za dużo prób” u wszystkich | brak `TRUST_PROXY=1` albo nginx nie przekazuje `X-Forwarded-For` |
| Nie da się wysłać zdjęcia (413) | brak `client_max_body_size 4m` w konfiguracji nginx |
| Brak nazw ulic w dzienniku | serwer nie łączy się z `nominatim.openstreetmap.org` – zostają współrzędne; `REVERSE_GEOCODING=false` wyłącza zapytania |

Wyłączenie PeTrace Alt bez ruszania reszty:

```bash
cd /var/www/2.petracker.pl && sudo docker compose down
sudo rm /etc/nginx/sites-enabled/2.petracker.pl && sudo systemctl reload nginx
```

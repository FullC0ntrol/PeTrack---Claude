# Wdrożenie PeTrace Alt na VPS jako `2.petracker.pl`

PeTrace Alt staje **obok** wersji klasycznej na tym samym serwerze. Każda wersja ma osobny katalog, osobne kontenery i osobną bazę, więc nic się nie miesza.

```
internet → nginx (HTTPS, certbot) ─┬─ petracker.pl    → 127.0.0.1:8080  Caddy → api → db     (/opt/petrace, bez zmian)
                                   └─ 2.petracker.pl  → 127.0.0.1:8090  app (Express) → db   (/opt/petrace-alt)
```

- Serwer: `57.131.193.154` (na ten adres wskazuje `petracker.pl`). Docker, nginx i certbot są już zainstalowane przy wersji klasycznej.
- Kontenery PeTrace Alt należą do projektu `petrace-alt` (nazwa w `docker-compose.yml`). Wolumeny i sieci nie kolidują z projektem `petrace`.
- Pliki do wdrożenia: [`deploy/nginx-2.petracker.pl.conf`](../deploy/nginx-2.petracker.pl.conf) i [`deploy/env.server.example`](../deploy/env.server.example).

Kolejność: **DNS → kod na GitHubie → serwer (kod, `.env`, start) → nginx → HTTPS → test**.

---

## 1. DNS: rekord dla `2.petracker.pl`

W panelu domeny `petracker.pl` dodaj rekord:

| Typ | Nazwa (host) | Wartość | TTL |
|---|---|---|---|
| A | `2` | `57.131.193.154` | 3600 |

Nie dodawaj rekordu `AAAA`, chyba że serwer ma IPv6 i `petracker.pl` też ma `AAAA`.

Na komputerze sprawdź, czy rekord już działa – w odpowiedzi powinien być `57.131.193.154` (zmiana rozchodzi się od kilku minut do kilku godzin):

```bash
nslookup 2.petracker.pl
```

Bez tego certyfikat HTTPS w kroku 7 się nie wygeneruje. Kroki 2–6 możesz robić w międzyczasie.

## 2. Kod na GitHubie (na komputerze)

Na github.com utwórz **nowe, prywatne repozytorium** `petrace-alt`, **bez** README, `.gitignore` i licencji (projekt ma już własne pliki).

W katalogu projektu dodaj je jako zdalne repozytorium i wypchnij kod:

```bash
git remote add origin https://github.com/FullC0ntrol/petrace-alt.git
git push -u origin main
```

> Bez GitHuba: `git bundle create petrace-alt.bundle --all`, skopiuj plik na serwer (`scp petrace-alt.bundle root@57.131.193.154:/root/`) i w kroku 3 zamiast `git clone git@…` użyj `git clone /root/petrace-alt.bundle /opt/petrace-alt`.

## 3. Pobranie projektu na serwer

Połącz się z serwerem:

```bash
ssh root@57.131.193.154
```

GitHub nie pozwala użyć tego samego klucza jako „deploy key” w dwóch repozytoriach. Klucz serwera jest już przypięty do repozytorium `petracer`, więc utwórz drugi (Enter przy każdym pytaniu):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_petrace_alt -C "serwer-petrace-alt"
```

Dopisz alias, który mówi SSH, którego klucza użyć dla tego repozytorium:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-petrace-alt
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_petrace_alt
    IdentitiesOnly yes
EOF
```

Wypisz klucz publiczny i skopiuj cały wiersz:

```bash
cat ~/.ssh/id_petrace_alt.pub
```

Na GitHubie: repozytorium `petrace-alt` → **Settings → Deploy keys → Add deploy key**. Wklej klucz i zapisz bez zaznaczania „Allow write access”.

Pobierz projekt. Zwróć uwagę na `github-petrace-alt` zamiast `github.com`:

```bash
git clone git@github-petrace-alt:FullC0ntrol/petrace-alt.git /opt/petrace-alt
cd /opt/petrace-alt
```

Wszystkie kolejne polecenia wykonujesz w `/opt/petrace-alt`.

## 4. Plik `.env`

Skopiuj wzór dla serwera:

```bash
cp deploy/env.server.example .env
```

Wygeneruj i wpisz hasło do bazy oraz sekret logowania:

```bash
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(openssl rand -hex 32)/" .env
```

Opcjonalnie poczta: jeśli wersja klasyczna ma ustawiony SMTP, podejrzyj jego dane (`grep SMTP /opt/petrace/.env`) i wpisz je do `.env` (`nano .env`). Bez SMTP kod logowania jest tylko w logach (`docker compose logs app`). Przycisk **„Wejdź na konto demo”** działa bez poczty.

Sprawdź, że w pliku nie zostało żadne `<wklej>`:

```bash
grep -n "<wklej>" .env || echo "OK"
```

Najważniejsze wartości w `.env`:

| Zmienna | Wartość | Po co |
|---|---|---|
| `DOCKER_APP_URL` | `https://2.petracker.pl` | linki w mailach, na tagach, plakatach i kodach QR |
| `HTTP_PORT` | `127.0.0.1:8090` | aplikacja dostępna tylko dla nginx, nie z internetu |
| `COOKIE_SECURE` | `true` | ciasteczko sesji tylko przez HTTPS |
| `TRUST_PROXY` | `1` | prawdziwe IP z nagłówka nginx (limity prób logowania) |
| `SEED_DEMO`, `DEMO_LOGIN` | `true` | konto demo do pokazu; dla prawdziwych użytkowników ustaw `false` |

## 5. Uruchomienie

Zbuduj obraz i uruchom kontenery w tle (pierwszy raz trwa kilka minut):

```bash
docker compose up -d --build
```

Sprawdź, czy aplikacja odpowiada – wynik powinien zawierać `{"ok":true}`:

```bash
curl http://127.0.0.1:8090/api/health
```

W logach powinny być linie o migracji, danych demo i `nasłuchuje na :3000 – https://2.petracker.pl`:

```bash
docker compose logs app
```

Upewnij się, że wersja klasyczna dalej działa:

```bash
curl http://127.0.0.1:8080/api/health
```

## 6. nginx

Skopiuj gotową konfigurację subdomeny i włącz ją:

```bash
cp deploy/nginx-2.petracker.pl.conf /etc/nginx/sites-available/2.petracker.pl
ln -s /etc/nginx/sites-available/2.petracker.pl /etc/nginx/sites-enabled/2.petracker.pl
```

Sprawdź konfigurację – wynik powinien kończyć się `test is successful`:

```bash
nginx -t
```

Przeładuj nginx. Inne strony działają bez przerwy, bo `reload` to nie restart:

```bash
systemctl reload nginx
```

> Konfiguracja ma `client_max_body_size 4m`: zdjęcia zwierząt mogą mieć do 3 MB, a domyślny limit nginx to 1 MB.

## 7. Certyfikat HTTPS

Gdy `nslookup 2.petracker.pl` zwraca adres serwera (krok 1), pobierz certyfikat. Certbot sam dopisze HTTPS i przekierowanie z HTTP do pliku z kroku 6:

```bash
certbot --nginx -d 2.petracker.pl
```

Sprawdź automatyczne odnawianie i działanie przez HTTPS:

```bash
certbot renew --dry-run
curl https://2.petracker.pl/api/health
```

## 8. Test

W przeglądarce:

1. `https://2.petracker.pl` → **Zobacz demo**: ekran Burka, przełącz na Lunę (zaginiona).
2. Z telefonu, w trybie prywatnym: `https://2.petracker.pl/t/LUNA-4P9D` – ścieżka znalazcy. Lokalizacja działa tylko przez HTTPS.
3. Logowanie zwykłym e-mailem: kod przyjdzie mailem albo (bez SMTP) pojawi się w `docker compose logs app`.
4. Na telefonie z Chrome: menu → **Dodaj do ekranu głównego** (PWA).

## 9. Tagi do druku i NFC

Wygeneruj partię wolnych tagów. Adresy dostaną domenę z `DOCKER_APP_URL`:

```bash
docker compose exec app npm run tags:generate -- 24
```

Pliki są w `/opt/petrace-alt/print/`. Pobierz je na komputer, otwórz HTML w przeglądarce i wydrukuj w skali 100%:

```bash
scp -r root@57.131.193.154:/opt/petrace-alt/print ./print-serwer
```

Adresy do zapisania na tagach NFC są w pliku `.csv` (instrukcja zapisu w [README](../README.md#jak-zapisać-url-na-tagu-nfc)).

## 10. Kopia zapasowa bazy

Na serwerze:

```bash
mkdir -p /opt/petrace-alt-backups
docker compose exec -T db pg_dump -U petrace petrace > /opt/petrace-alt-backups/petrace-alt-$(date +%F).sql
```

Kopia co noc o 3:30 (obok kopii wersji klasycznej o 3:00). Otwórz `crontab -e` i dopisz wiersz:

```
30 3 * * * cd /opt/petrace-alt && docker compose exec -T db pg_dump -U petrace petrace > /opt/petrace-alt-backups/petrace-alt-$(date +\%F).sql && find /opt/petrace-alt-backups -name '*.sql' -mtime +14 -delete
```

## 11. Aktualizacja

Na komputerze wypchnij zmiany (`git push`), a potem na serwerze:

```bash
cd /opt/petrace-alt
git pull
docker compose up -d --build
docker image prune -f
```

Nowe pliki w `server/db/migrations/` wykonują się same przy starcie aplikacji. Przed aktualizacją zmieniającą schemat zrób kopię (krok 10).

Przywrócenie stanu demo (np. po pokazie):

```bash
docker compose exec app npm run db:seed
```

## 12. Gdy coś nie działa

| Objaw | Co sprawdzić |
|---|---|
| `502 Bad Gateway` na `2.petracker.pl` | `docker compose ps` – czy `app` jest `healthy`; `docker compose logs app` |
| Aplikacja nie startuje: „AUTH_SECRET jest domyślny…” | w `.env` nie podmieniono `AUTH_SECRET` (krok 4) |
| `port is already allocated` | port 8090 lub 5442 jest zajęty – zmień `HTTP_PORT`/`DB_PORT` w `.env` (i port w konfiguracji nginx) |
| certbot: `NXDOMAIN` / `unauthorized` | rekord DNS z kroku 1 jeszcze nie działa (`nslookup 2.petracker.pl`) |
| Logowanie „Za dużo prób” dla wszystkich | brak `TRUST_PROXY=1` albo nginx nie przekazuje `X-Forwarded-For` |
| Nie da się wysłać zdjęcia (413) | brak `client_max_body_size 4m` w konfiguracji nginx |
| Mało pamięci przy `--build` | `free -h`; w razie potrzeby dodaj swap 2 GB (`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`) |
| Brak nazw ulic w dzienniku | serwer nie łączy się z `nominatim.openstreetmap.org` – w dzienniku zostają współrzędne; `REVERSE_GEOCODING=false` wyłącza zapytania |

Wyłączenie PeTrace Alt bez ruszania wersji klasycznej: `cd /opt/petrace-alt && docker compose down` oraz usunięcie `/etc/nginx/sites-enabled/2.petracker.pl` i `systemctl reload nginx`.

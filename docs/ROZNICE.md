# PeTrace Alt a wersja klasyczna – różnice

Obie wersje mają ten sam cel i tę samą technologię (React + Vite, Express, PostgreSQL, Leaflet, PWA, logowanie magic link). Różnią się wyglądem i tym, **jak** użytkownik przechodzi przez każdą funkcję. Dla każdej funkcji podaję: jak było, jak jest teraz, dlaczego, oraz wady i zalety z perspektywy **właściciela** i **znalazcy**.

Wersja klasyczna to projekt `petracer`, porównywany na podstawie kodu z 17.10.2026.

---

## 1. Wygląd

| | Klasyczna | Alt |
|---|---|---|
| Kolory | Stonowana zieleń (`pine`), kremowe, „papierowe” tło, ciepłe brązowe cienie | Neutralne tło (`#F5F5F3` / `#121214`), jeden nasycony akcent – koral `#FF5A3D` |
| Fonty | Bricolage Grotesque + Plus Jakarta Sans | **Sora** (geometryczny, nagłówki) + **Inter** (tekst) |
| Kształty | Umiarkowane zaokrąglenia, karty z obramowaniem | Duże zaokrąglenia (`2–2.75rem`), „squircle” zamiast kół, miękkie cienie, przyciski-pigułki |
| Kolor zwierzęcia | Brak – wszystkie ekrany w barwach aplikacji | Każde zwierzę ma jeden z 8 kolorów, który barwi jego ekrany, mapę, kartę znalazcy, plakat i kartę weterynarza |
| Ikony i grafika | `lucide-react`, ilustracja na stronie głównej | Własny zestaw ikon i ilustracje pustych stanów rysowane w SVG w kodzie |
| Ruch | Proste przejścia | Mikroanimacje: wjazd kroków kreatora, arkusz od dołu, „pop” potwierdzeń, rysowany znak ✓, konfetti przy „Znaleziony!” (CSS, bez bibliotek, z `prefers-reduced-motion`) |
| Motyw | Jasny | Jasny i ciemny (systemowy albo wybrany), kontrasty sprawdzone pod WCAG AA |

**Dlaczego:** aplikacja ma być „jak dobra aplikacja konsumencka” – energiczna i rozpoznawalna. Kolor zwierzęcia od razu mówi, czyj to ekran, co pomaga przy kilku zwierzętach.

- **Właściciel:** ➕ szybciej rozróżnia zwierzęta; ciemny motyw wieczorem; całość jest bardziej „osobista”. ➖ więcej koloru może męczyć osoby, które wolą spokojny, „papierowy” styl klasycznej wersji; 8 kolorów to ograniczony wybór.
- **Znalazca:** ➕ duży portret i kolor zwierzęcia budzą sympatię, a ekran wygląda wiarygodnie, nie jak formularz. ➖ ilustracja zamiast zdjęcia (gdy właściciel go nie doda) gorzej pomaga rozpoznać zwierzę – dlatego kreator mocno zachęca do zdjęcia.

## 2. Nawigacja

| Klasyczna | Alt |
|---|---|
| Dolne menu (Panel, Spacery, Harmonogram, Ustawienia) na telefonie i sidebar na desktopie; panel z listą wszystkich zwierząt | **Ekran skupiony na jednym zwierzęciu**: przewijany przełącznik awatarów u góry (z licznikiem nowych zdarzeń i kropką zaginięcia) i przycisk **„Akcje”**, który otwiera arkusz od dołu z kafelkami akcji. Na desktopie ta sama wyśrodkowana kolumna, bez sidebara |

**Dlaczego:** właściciel prawie zawsze robi coś *z konkretnym zwierzęciem*. Zamiast szukać funkcji w menu, wybiera zwierzę, a potem akcję. Arkusz od dołu jest w zasięgu kciuka.

- **Właściciel:** ➕ mniej elementów na ekranie; najważniejsze (zaginięcie, dziennik, weterynarz) są dwa dotknięcia od startu; licznik nowych zdarzeń przy awatarze. ➖ brak widoku „wszystko naraz” (np. skany wszystkich zwierząt na jednej liście); funkcje są mniej odkrywalne, bo schowane w arkuszu – stąd dodatkowy link „Więcej akcji…” pod treścią.
- **Znalazca:** bez zmian – nie korzysta z panelu.

## 3. Logowanie

| Klasyczna | Alt |
|---|---|
| Magic link w mailu; ekran „Sprawdź pocztę” i osobna strona weryfikacji | Jeden mail zawiera **link i 6-cyfrowy kod**. Kod wpisuje się na tej samej stronie, na której podano e-mail (6 pól, wklejanie i autouzupełnianie `one-time-code`, ponowne wysłanie po 30 s). Link działa jak dotąd |

**Dlaczego:** w zainstalowanej PWA link z maila otwiera się w zwykłej przeglądarce, więc sesja ląduje nie tam, gdzie trzeba. Kod przepisany ręcznie loguje *tę* aplikację.

Szczegóły techniczne: kod jest w bazie jako HMAC z sekretem serwera (6 cyfr to tylko milion kombinacji – zwykły skrót dałoby się odwrócić). Każde żądanie logowania ma limit 5 prób, a do tego obowiązuje limit na IP. Sesja w Alt jest zapisana w bazie (losowy token w ciasteczku, w bazie skrót), a nie jako JWT. Dzięki temu wylogowanie naprawdę ją unieważnia i jest „Wyloguj ze wszystkich urządzeń”.

- **Właściciel:** ➕ działa w PWA i na drugim urządzeniu (mail na komputerze, logowanie na telefonie); ➕ można się wylogować wszędzie. ➖ kod da się teoretycznie zgadywać (stąd limity), a jeden mail ma dwie drogi, co może przez chwilę zdezorientować.
- **Znalazca:** nie dotyczy.

## 4. Dodawanie zwierzęcia

| Klasyczna | Alt |
|---|---|
| Jeden długi formularz (`PetForm`) | **Kreator w 5 krokach**: podstawowe dane → zdjęcie → zdrowie → kontakt → kolor. Pasek postępu „Krok 2 z 5”, przycisk „Wstecz”, walidacja przy każdym kroku, szkic zapisywany w sesji przeglądarki, podgląd karty w wybranym kolorze. Ten sam kreator służy do edycji, a wtedy kroki są klikalne i „Zapisz” działa z każdego z nich |

**Dlaczego:** na telefonie długi formularz zniechęca, a dane zdrowotne i kontakt łatwo pominąć. Krok „Zdjęcie” z dużym podglądem podnosi szansę, że zdjęcie w ogóle zostanie dodane (zmniejszamy je w przeglądarce do ~150 KB).

- **Właściciel:** ➕ jedno pytanie naraz; ważne pola (alergie, zdjęcie) są wyeksponowane; błąd z serwera przenosi do właściwego kroku. ➖ więcej dotknięć niż w jednym formularzu; przy edycji jednego pola trzeba znaleźć właściwy krok (pomagają linki „edytuj” z kart, np. `?krok=zdrowie`).
- **Znalazca:** ➕ pośrednio – pełniejsze profile (opis, zdjęcie, alergie).

## 5. Parowanie tagu

| Klasyczna | Alt |
|---|---|
| Właściciel **generuje** kod w aplikacji („Wygeneruj zawieszkę”), dostaje QR do wydrukowania i adres do zapisania na NFC | Tagi mają **wcześniej nadane kody** (seed i skrypt `npm run tags:generate` z arkuszem QR do druku). Zalogowany właściciel skanuje wolny tag i widzi ekran **„Przypisz ten tag do zwierzęcia”** (wybór zwierzęcia albo „dla nowego zwierzęcia”, wtedy kreator przypisze tag na końcu). Kod można też wpisać ręcznie (`XXXX-XXXX`, bez mylących się znaków 0/O, 1/I). Zwierzę może mieć kilka tagów, a tag można odpiąć |

**Dlaczego:** tak działa prawdziwy produkt fizyczny – zawieszka przychodzi już zaprogramowana, a właściciel ją tylko „aktywuje”. Skan telefonem jest naturalniejszy niż przepisywanie adresu do aplikacji NFC.

- **Właściciel:** ➕ zero konfiguracji NFC po stronie właściciela; ➕ kilka tagów (np. obroża + szelki). ➖ nie da się „wyczarować” tagu z niczego – trzeba mieć fizyczny tag z partii (albo kod z arkusza); ➖ ktoś musi zarządzać partiami (skrypt zamiast panelu admina).
- **Znalazca:** ➕ wolny tag pokazuje jasną informację („Ten tag jest jeszcze wolny… weterynarz sprawdzi chip”) zamiast błędu.

## 6. Zgłoszenie zaginięcia

| Klasyczna | Alt |
|---|---|
| **Przełącznik** „tryb zaginięcia” w profilu + okno potwierdzenia z komunikatem; włączenie zawsze upublicznia numer telefonu | **Kreator „Zgłoś zaginięcie”**: 1) gdzie (pinezka na mapie, „Jestem w tym miejscu”, opis słowami), 2) kiedy (szybkie wybory „Godzinę temu”, „Wczoraj wieczorem” + dokładna data), 3) komunikat dla znalazcy + **osobna zgoda na pokazanie numeru**, 4) podsumowanie. Potem ekran z **plakatem A4 do druku** (zdjęcie, opis, miejsce, komunikat, QR) i udostępnianiem linku. Zakończenie przyciskiem **„Znaleziony!”** z ekranem potwierdzenia (konfetti, czas poszukiwań, liczba skanów i wiadomości). Zgłoszenia są zapisywane jako historia (`lost_reports`), a nie jako flaga |

**Dlaczego:** w stresie łatwiej odpowiedzieć na 3 krótkie pytania niż wypełnić formularz. Miejsce i czas ostatniego widzenia są dla znalazców i dla trasy na mapie cenniejsze niż sam przełącznik. Plakat to pierwsza rzecz, którą ludzie robią po zgubieniu zwierzęcia.

- **Właściciel:** ➕ gotowy plakat z QR (skany z plakatu są w dzienniku oznaczone osobno); ➕ numer telefonu pokazywany świadomie i do wyłączenia jednym przełącznikiem w trakcie; ➕ historia zaginięć i trasa. ➖ zgłoszenie trwa dłużej niż jedno dotknięcie przełącznika (ok. 20–30 s); ➖ bez tagu plakat nie ma kodu QR.
- **Znalazca:** ➕ widzi, gdzie i kiedy zwierzę zaginęło oraz prośbę opiekuna (np. „nie łap, jest płochliwa”). ➖ numer telefonu bywa ukryty – musi napisać wiadomość.

## 7. Strona znalazcy `/t/:kod`

| Klasyczna | Alt |
|---|---|
| Jeden ekran z wariantem zależnym od sytuacji (`found` / `lost` / `inactive` / `owner`): imię, przyciski „Zadzwoń” i (przy zaginięciu) „Wyślij SMS z lokalizacją”, notatki medyczne | **Prowadzona ścieżka w 4 krokach** z kropkami postępu: **„Cześć, jestem Burek!”** (duży portret, opis, baner zaginięcia z komunikatem) → **„Czy jestem bezpieczny?”** (3 karty: jest ze mną / ranny / uciekł; przy „ranny” wskazówki i telefon do przychodni; „Ważne o mnie”: alergie, leki, choroby) → **„Udostępnij, gdzie mnie znalazłeś”** (geolokalizacja dopiero po kliknięciu, podgląd na mapie, można pominąć) → **kontakt** |

**Dlaczego:** znalazca jest zaskoczony i nie wie, co zrobić. Pytania zadawane „głosem zwierzęcia” prowadzą go krok po kroku i zbierają informacje, które naprawdę pomagają opiekunowi (stan zdrowia, miejsce).

- **Właściciel:** ➕ dostaje ustrukturyzowaną informację: stan zwierzęcia + punkt na mapie + treść. ➖ część znalazców odpadnie przy dłuższej ścieżce (każdy krok da się jednak pominąć).
- **Znalazca:** ➕ jasne „co teraz”; ➕ informacje o zdrowiu pojawiają się w odpowiednim momencie. ➖ do kontaktu potrzeba 3–4 dotknięć zamiast jednego „Zadzwoń”.

## 8. Kontakt znalazca → właściciel

| Klasyczna | Alt |
|---|---|
| Numer telefonu widoczny zawsze (przycisk „Zadzwoń”), w trybie zaginięcia także SMS z lokalizacją | **Anonimowa wiadomość** wysyłana przez aplikację (z sugerowaną treścią zależną od stanu zwierzęcia, opcjonalnym kontaktem zwrotnym znalazcy). Właściciel widzi ją w dzienniku (oraz mailem, jeśli jest SMTP). Numer telefonu jest pokazywany **tylko** w trybie zaginięcia **i tylko** jeśli właściciel na to pozwolił. Limity wiadomości na IP i na tag |

**Dlaczego:** numer telefonu na obroży to dane osobowe dostępne dla każdego przechodnia (spam, nękanie). Wiadomość daje te same informacje bez ujawniania danych żadnej ze stron.

- **Właściciel:** ➕ prywatność; ➕ wiadomość ma miejsce na mapie i stan zwierzęcia. ➖ bez push wiadomość może czekać, aż właściciel zajrzy do aplikacji – dlatego w zaginięciu warto włączyć numer telefonu.
- **Znalazca:** ➕ nie musi dzwonić do obcego; sam decyduje, czy zostawić kontakt. ➖ nie dostaje natychmiastowej odpowiedzi.

## 9. Skany tagu – dziennik

| Klasyczna | Alt |
|---|---|
| Lista/tabela skanów przy tagu: data, „właściciel/obcy”; bez lokalizacji | **Kanał zdarzeń** pogrupowany po dniach: „Ktoś zeskanował tag Burka · 14:32 · okolice: ul. Mokotowska” (nazwa ulicy z OpenStreetMap), wiadomości znalazców, zgłoszenie i zakończenie zaginięcia, otwarcie karty przez weterynarza. Nad kanałem **mapa ze wszystkimi punktami i ponumerowaną trasą w czasie zaginięcia**, od pinezki „ostatnio widziany”. Dotknięcie wpisu przenosi mapę do punktu. **Nieprzeczytane** wpisy są wyróżnione, a licznik widać przy awatarze zwierzęcia i w arkuszu akcji |

**Dlaczego:** tabela odpowiada na pytanie „kiedy”, a właściciel zaginionego zwierzęcia pyta „gdzie i w którą stronę”. Kanał z językiem naturalnym (z poprawną odmianą imienia: „tag Burka”, „tag Luny”) czyta się jak powiadomienia.

- **Właściciel:** ➕ widzi kierunek wędrówki; ➕ wie, co nowego. ➖ skan bez zgody na lokalizację to tylko czas; ➖ zależność od zewnętrznego Nominatim (przy awarii zostają współrzędne).
- **Znalazca:** ➕ jego lokalizacja trafia wyłącznie do opiekuna, tylko raz i tylko po kliknięciu; adresu IP nie zapisujemy.

## 10. Udostępnienie weterynarzowi

| Klasyczna | Alt |
|---|---|
| Szkic ekranu (link z czasem ważności – niezaimplementowany) | Wybór czasu (**1 h / 24 h / 7 dni**) → **duży kod QR na ekranie telefonu** w pierścieniu, który kurczy się razem z czasem, i **odliczanie** `23:59:12` → przycisk **„Unieważnij teraz”**. Weterynarz skanuje kod i widzi kartę zdrowia (alergie wyróżnione, leki, choroby, szczepienia, chip, kontakt) z własnym odliczaniem. Po czasie karta znika nawet z otwartej strony. Właściciel widzi, ile razy kartę otwarto |

**Dlaczego:** w gabinecie łatwiej pokazać telefon niż dyktować link. Krótki, widoczny czas ważności i jeden przycisk unieważnienia budują zaufanie.

- **Właściciel:** ➕ pełna kontrola i widoczność (licznik otwarć); ➕ nowe udostępnienie unieważnia poprzednie. ➖ kod widać tylko na urządzeniu, które go utworzyło (serwer zna tylko skrót tokenu) – na innym trzeba utworzyć nowy.
- **Znalazca:** nie dotyczy. **Weterynarz:** ➕ zero logowania, dane czytelne na telefonie; ➖ dostęp kończy się bez ostrzeżenia, jeśli właściciel wybrał krótki czas.

## 11. Właściciel skanuje własny tag

| Klasyczna | Alt |
|---|---|
| Szybki zapis karmienia/spaceru (`OwnerQuickLog`) | Potwierdzenie „To tag Burka – działa!” (skan nie trafia do dziennika) + **podgląd „oczami znalazcy”** (`?podglad=1`), w którym ścieżka niczego nie zapisuje i nie wysyła |

**Dlaczego:** spacery i harmonogram są poza zakresem tej wersji. Ważniejsze jest, żeby właściciel mógł sprawdzić, czy tag działa i co zobaczy znalazca.

- **Właściciel:** ➕ test tagu bez zaśmiecania dziennika. ➖ brak szybkiego zapisu aktywności z klasycznej wersji.

## 12. Wdrożenie

| Klasyczna | Alt |
|---|---|
| Trzy kontenery: Postgres, API, Caddy (HTTPS + pliki frontendu) | Dwa kontenery: **Postgres** i **aplikacja**, w której Express serwuje API i zbudowany frontend (z nagłówkami CSP i cache). Migracje SQL z rejestrem `schema_migrations` uruchamiają się przy starcie |

- ➕ prostsze uruchomienie (`docker compose up`), jeden obraz. ➖ HTTPS trzeba zapewnić z zewnątrz (reverse proxy lub platforma) – klasyczna wersja miała go wbudowanego przez Caddy.

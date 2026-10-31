# Zadanie: PeTrace Alt – ta sama aplikacja, inny wygląd i inne UX

Zbuduj od zera w tym repozytorium **kompletną, działającą aplikację** PeTrace Alt w jednym
podejściu. Bez TODO, pustych plików i zaślepek. Aplikacja ma się uruchamiać poleceniem
`docker compose up` i być gotowa do pokazania.

## Kontekst
PeTrace to system identyfikacji zwierząt domowych przez tagi NFC/QR na obroży. Znalazca skanuje
tag telefonem i bez instalowania aplikacji (PWA) widzi profil zwierzęcia i może pomóc w jego
powrocie. Właściciel zarządza zwierzętami w panelu.
Istnieje już wersja „klasyczna”. Jeśli masz dostęp do jej kodu (projekt `petracer`), przejrzyj
go najpierw, żeby świadomie się od niego odróżnić – zarówno wizualnie, jak i w przepływach.

## Technologie (bez zmian względem wersji klasycznej)
- Frontend: React + Vite (JavaScript, JSX), React Router, Tailwind CSS, Leaflet/OpenStreetMap, PWA
  (`vite-plugin-pwa`).
- Backend: Node.js + Express.js, PostgreSQL.
- Uwierzytelnianie: passwordless (magic link).
- Wdrożenie: Docker (`docker-compose.yml` z kontenerem aplikacji i Postgresem, `.env.example`).
Nie dodawaj innych frameworków ani zamienników tych bibliotek.

## Zakres funkcji
Logowanie bez hasła, zwierzęta właściciela (profil ze zdjęciem, dane medyczne, kontakt), tagi
NFC/QR, publiczna strona znalazcy, tryb zagubienia, dziennik skanów na mapie, tymczasowe
udostępnienie danych weterynarzowi. Poza zakresem: spacery, push, płatności, panel admina.

## Inny wygląd
- Kierunek wizualny wyraźnie inny niż wersja klasyczna (tam: stonowana zieleń i papierowe,
  kremowe tło). Tutaj: jasny, energiczny styl z jednym nasyconym kolorem akcentu (np. koral
  lub mandarynka) i neutralnym tłem, duże zaokrąglenia, miękkie cienie, wyrazisty geometryczny
  font nagłówków (Google Fonts) i czytelny font tekstu.
- Dla każdego zwierzęcia własny kolor (wybierany przy tworzeniu), który barwi jego ekrany.
- Ilustracyjne puste stany (SVG rysowane w kodzie, bez zewnętrznych grafik), mikroanimacje
  przejść i potwierdzeń (CSS/Tailwind, bez dodatkowych bibliotek).
- Tryb jasny i ciemny, kontrasty WCAG AA, mobile-first; na desktopie układ wyśrodkowany,
  a nie klasyczny sidebar.

## Inne podejście z poziomu użytkownika
1. **Logowanie**: oprócz linku w mailu także 6-cyfrowy kod do wpisania na tej samej stronie
   (rozwiązuje problem PWA, w której link otwiera się w innej przeglądarce). W trybie dev link
   i kod wypisywane w konsoli serwera.
2. **Nawigacja**: zamiast dolnego menu i sidebara – ekran skupiony na jednym zwierzęciu, z
   przełącznikiem zwierząt u góry (przesuwane karty/awatary) i akcjami w arkuszu wysuwanym
   od dołu (bottom sheet) pod przyciskiem „+”/„Akcje”.
3. **Dodawanie zwierzęcia**: kreator krok po kroku (podstawowe dane → zdjęcie → zdrowie →
   kontakt → kolor), z paskiem postępu i możliwością powrotu, zamiast jednego długiego formularza.
4. **Parowanie tagu**: tagi mają wcześniej nadane identyfikatory (seed + skrypt generujący
   partię tagów z kodami QR do druku). Właściciel zeskanowawszy nieprzypisany tag widzi ekran
   „Przypisz ten tag do zwierzęcia”. Wciąż możliwe ręczne wpisanie kodu tagu.
5. **Zgłoszenie zaginięcia**: zamiast przełącznika – krótki kreator „Zgłoś zaginięcie”:
   gdzie i kiedy widziane ostatnio (pinezka na mapie), komunikat dla znalazcy. Po zgłoszeniu
   generuje się plakat do druku (osobny widok z CSS do druku: zdjęcie, opis, QR). Zakończenie
   przyciskiem „Znaleziony!” z ekranem potwierdzenia.
6. **Strona znalazcy `/t/:tagId`**: prowadzona ścieżka zamiast listy przycisków:
   „Cześć, jestem Burek!” → „Czy jestem bezpieczny?” → „Udostępnij, gdzie mnie znalazłeś”
   (Geolocation za zgodą) → kontakt. Kontakt przez **anonimową wiadomość** wysyłaną przez
   aplikację (właściciel widzi ją w panelu), a numer telefonu pokazywany tylko w trybie
   zagubienia, jeśli właściciel na to pozwoli.
7. **Skany tagu**: zamiast tabeli – kanał zdarzeń („Ktoś zeskanował tag Burka, 14:32, okolice
   ul. X”) z mapą pokazującą wszystkie punkty i trasę w czasie zaginięcia; nieprzeczytane
   zdarzenia wyróżnione licznikiem.
8. **Udostępnienie weterynarzowi**: duży kod QR pokazywany na ekranie telefonu właściciela
   z widocznym odliczaniem ważności (wybór: 1 h / 24 h / 7 dni) i przyciskiem natychmiastowego
   unieważnienia, zamiast samego linku.

Cały interfejs po polsku, przyjazny, z krótkimi komunikatami.

## Dane i backend
- Schemat PostgreSQL z migracjami (SQL w repo) i seed: konto demo, 3 zwierzęta (jedno
  zaginione z kilkoma skanami i wiadomością od znalazcy), 5 nieprzypisanych tagów.
- Rate limit na logowanie, wiadomości od znalazców i stronę tagu; tokeny i kody przechowywane
  jako hash; sesja w ciasteczku httpOnly; walidacja wszystkich danych wejściowych.
- W produkcji Express serwuje zbudowany frontend.

## Jakość i weryfikacja (przed zakończeniem)
- `npm run lint` i `npm run build` bez błędów.
- Uruchom całość lokalnie, przejdź każdą ścieżkę z sekcji „Inne podejście” i napraw błędy.

## Dokumentacja
- `README.md`: opis, uruchomienie (dev i Docker), konto demo, jak zapisać URL na tagu NFC,
  jak wydrukować partię tagów QR.
- `docs/ROZNICE.md`: zestawienie różnic względem wersji klasycznej – dla każdej funkcji: jak
  było, jak jest teraz, dlaczego, wady i zalety z perspektywy właściciela i znalazcy.

## Sposób pracy
Najpierw krótko przedstaw strukturę katalogów, model danych i paletę/fonty, potem od razu
implementuj, bez czekania na potwierdzenie. Commituj logicznymi krokami (opisy po polsku).
Na końcu wypisz: jak uruchomić, dane konta demo i ewentualne ograniczenia.
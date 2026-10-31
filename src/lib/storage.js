// localStorage/sessionStorage potrafią rzucić wyjątek (tryb prywatny, zablokowane dane strony).
function safe(storage) {
  return {
    get(key, fallback = null) {
      try {
        const raw = storage().getItem(key)
        return raw === null ? fallback : JSON.parse(raw)
      } catch {
        return fallback
      }
    },
    set(key, value) {
      try {
        storage().setItem(key, JSON.stringify(value))
      } catch {
        /* brak miejsca albo zablokowane – to tylko wygoda, aplikacja działa dalej */
      }
    },
    remove(key) {
      try {
        storage().removeItem(key)
      } catch {
        /* jw. */
      }
    },
  }
}

export const local = safe(() => window.localStorage)
export const session = safe(() => window.sessionStorage)

// Klucze zapamiętywanych ustawień.
export const LAST_PET_KEY = 'petrace-last-pet'

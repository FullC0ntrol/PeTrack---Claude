// Geolokalizacja jako Promise z polskimi komunikatami błędów.
export function getPosition({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Ta przeglądarka nie udostępnia lokalizacji.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Brak zgody na lokalizację. Możesz ją włączyć w ustawieniach przeglądarki albo pominąć ten krok.'))
        } else if (error.code === error.TIMEOUT) {
          reject(new Error('Lokalizacja nie przyszła na czas. Spróbuj jeszcze raz, najlepiej na zewnątrz.'))
        } else {
          reject(new Error('Nie udało się ustalić lokalizacji.'))
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
}

// Domyślny środek mapy, gdy nie znamy żadnego punktu: centrum Warszawy.
export const DEFAULT_CENTER = { lat: 52.2297, lng: 21.0122 }

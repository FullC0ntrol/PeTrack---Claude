export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message)
    this.status = status
    this.field = data.field
    this.data = data
  }
}

/*
  Jedyny punkt kontaktu z serwerem. Nagłówek X-PeTrace jest wymagany przez serwer dla żądań
  zmieniających dane (ochrona przed CSRF). 401 rozgłaszamy zdarzeniem – AuthProvider wyloguje
  wtedy użytkownika w interfejsie i przekieruje do logowania.
*/
export async function request(path, { method = 'GET', body, raw } = {}) {
  const headers = { 'X-PeTrace': '1' }
  const init = { method, headers, credentials: 'same-origin' }
  if (raw) {
    init.body = raw
    headers['Content-Type'] = raw.type
  } else if (body !== undefined) {
    init.body = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`/api${path}`, init)
  } catch {
    throw new ApiError(0, 'Brak połączenia. Sprawdź internet i spróbuj ponownie.')
  }
  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('petrace:unauthorized'))
    throw new ApiError(response.status, data.error ?? 'Coś poszło nie tak. Spróbuj ponownie.', data)
  }
  return data
}

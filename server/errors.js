// Błąd z kodem HTTP i komunikatem, który można bezpiecznie pokazać użytkownikowi.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const notFound = (what = 'Nie znaleziono.') => new HttpError(404, what)

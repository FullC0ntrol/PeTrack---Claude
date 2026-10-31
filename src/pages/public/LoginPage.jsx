import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../../api/endpoints.js'
import { MailArt } from '../../components/illustrations/Scenes.jsx'
import PublicShell from '../../components/layout/PublicShell.jsx'
import Button from '../../components/ui/Button.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import Icon from '../../components/ui/Icon.jsx'
import OtpInput from '../../components/ui/OtpInput.jsx'
import { useAuth } from '../../context/contexts.js'
import { session } from '../../lib/storage.js'

const PENDING_KEY = 'petrace-login'
const RESEND_SECONDS = 30
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)

function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/app'
}

/*
  Logowanie w dwóch krokach na JEDNYM ekranie: e-mail → 6 cyfr z maila. Link z maila też działa,
  ale w zainstalowanej aplikacji (PWA) otwiera się zwykle w innej przeglądarce – dlatego kod.
  Wysłany adres pamiętamy w sessionStorage: odświeżenie strony nie cofa do pierwszego kroku.
*/
export default function LoginPage() {
  const { user, setUser, demoLogin } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [pending, setPending] = useState(() => session.get(PENDING_KEY))
  const [email, setEmail] = useState(pending?.email ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [devCode, setDevCode] = useState(null)

  useEffect(() => {
    if (!pending) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending])

  if (user) return <Navigate to={next} replace />

  const resendIn = pending ? Math.max(0, Math.ceil((pending.sentAt + RESEND_SECONDS * 1000 - now) / 1000)) : 0

  const sendCode = async (event) => {
    event?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await authApi.start(email, next)
      const value = { email: result.email, sentAt: Date.now() }
      session.set(PENDING_KEY, value)
      setPending(value)
      setDevCode(result.devCode ?? null)
      setCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== 6 || busy) return
    setError(null)
    setBusy(true)
    try {
      const result = await authApi.verifyCode(pending.email, value)
      session.remove(PENDING_KEY)
      setUser(result.user)
      navigate(safeNext(result.next ?? next), { replace: true })
    } catch (err) {
      setError(err.message)
      setShake((n) => n + 1)
      setCode('')
      if (err.data?.expired) {
        session.remove(PENDING_KEY)
        setPending(null)
      }
    } finally {
      setBusy(false)
    }
  }

  const enterDemo = async () => {
    setBusy(true)
    try {
      const result = await authApi.demo(next)
      setUser(result.user)
      navigate(safeNext(result.next ?? next), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const changeEmail = () => {
    session.remove(PENDING_KEY)
    setPending(null)
    setCode('')
    setError(null)
  }

  return (
    <PublicShell>
      <div className="card mt-4 overflow-hidden p-6 sm:p-8">
        <MailArt className="mx-auto -mt-2 w-56" />

        {devCode && (
          <p className="mb-4 rounded-2xl bg-pet-soft p-3 text-center text-sm">
            Tryb dev – kod logowania: <strong className="font-mono text-lg tracking-widest">{devCode}</strong>
          </p>
        )}

        {!pending ? (
          <form onSubmit={sendCode} className="animate-rise" noValidate>
            <h1 className="text-3xl font-bold">Cześć! Zaloguj się</h1>
            <p className="mt-2 text-muted">Bez hasła. Wyślemy Ci kod i link – wystarczy jedno z nich. Konto założy się samo.</p>
            <TextField
              className="mt-6"
              label="Twój e-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="np. ola@poczta.pl"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error}
            />
            <Button type="submit" full size="lg" className="mt-5" loading={busy} disabled={!email.includes('@')} iconRight="forward">
              Wyślij kod
            </Button>
          </form>
        ) : (
          <div className="animate-rise">
            <h1 className="text-3xl font-bold">Sprawdź skrzynkę</h1>
            <p className="mt-2 text-muted">
              Wpisz 6 cyfr z maila wysłanego na <strong className="text-ink">{pending.email}</strong>. Możesz też kliknąć link w mailu.
            </p>
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault()
                verify()
              }}
            >
              <OtpInput
                key={shake}
                value={code}
                onChange={(value) => {
                  setCode(value)
                  if (error) setError(null)
                }}
                onComplete={verify}
                invalid={Boolean(error)}
                disabled={busy}
                autoFocus
                describedBy={error ? 'otp-error' : undefined}
              />
              {error && (
                <p id="otp-error" role="alert" className="mt-3 animate-fade text-sm font-medium text-alert-text">
                  {error}
                </p>
              )}
              <Button type="submit" full size="lg" className="mt-5" loading={busy} disabled={code.length !== 6}>
                Zaloguj się
              </Button>
            </form>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" onClick={changeEmail} className="font-semibold text-muted underline-offset-4 hover:underline">
                Zmień e-mail
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={resendIn > 0 || busy}
                className="font-semibold text-accent-text underline-offset-4 hover:underline disabled:text-muted disabled:no-underline"
              >
                {resendIn > 0 ? `Wyślij ponownie za ${resendIn} s` : 'Wyślij nowy kod'}
              </button>
            </div>
          </div>
        )}

        {(import.meta.env.DEV || isLocalhost) && (
          <p className="mt-6 flex gap-2 rounded-2xl bg-raised p-3 text-sm text-muted">
            <Icon name="info" size={18} className="mt-0.5" />
            <span>
              Tryb lokalny: kod i link znajdziesz w konsoli serwera (<code className="font-mono">npm run dev</code> albo{' '}
              <code className="font-mono">docker compose logs app</code>).
            </span>
          </p>
        )}
      </div>

      {demoLogin && (
        <div className="mt-4 flex animate-rise flex-col items-center gap-2 text-center" style={{ animationDelay: '120ms' }}>
          <p className="text-sm text-muted">Chcesz się tylko rozejrzeć?</p>
          <Button variant="secondary" onClick={enterDemo} disabled={busy} icon="paw">
            Wejdź na konto demo
          </Button>
        </div>
      )}
    </PublicShell>
  )
}

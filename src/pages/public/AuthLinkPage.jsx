import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../../api/endpoints.js'
import { SearchArt } from '../../components/illustrations/Scenes.jsx'
import PublicShell from '../../components/layout/PublicShell.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckBurst } from '../../components/ui/Celebrate.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useAuth } from '../../context/contexts.js'
import { session } from '../../lib/storage.js'

// Wejście z linku w mailu: /auth/link?token=…
export default function AuthLinkPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [state, setState] = useState({ status: 'loading' })
  // StrictMode w dev uruchamia efekty dwa razy – token jest jednorazowy, więc pilnujemy jednego wywołania.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    authApi
      .verifyLink(params.get('token') ?? '')
      .then((result) => {
        session.remove('petrace-login')
        setUser(result.user)
        setState({ status: 'ok' })
        setTimeout(() => navigate(result.next ?? '/app', { replace: true }), 900)
      })
      .catch((error) => setState({ status: 'error', message: error.message }))
  }, [params, navigate, setUser])

  return (
    <PublicShell>
      <div className="card mt-8 flex flex-col items-center p-8 text-center">
        {state.status === 'loading' && <Spinner size={36} label="Loguję…" className="py-10 text-accent-text" />}
        {state.status === 'ok' && (
          <>
            <CheckBurst />
            <h1 className="mt-6 text-2xl font-bold">Jesteś zalogowany</h1>
            <p className="mt-1 text-muted">Za chwilę przeniesiemy Cię dalej…</p>
          </>
        )}
        {state.status === 'error' && (
          <>
            <SearchArt className="w-56" />
            <h1 className="mt-2 text-2xl font-bold">Ten link już nie działa</h1>
            <p className="mt-1 text-muted">{state.message}</p>
            <Button to="/zaloguj" className="mt-6">
              Poproś o nowy kod
            </Button>
          </>
        )}
      </div>
    </PublicShell>
  )
}

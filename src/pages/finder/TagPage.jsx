import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { publicApi } from '../../api/endpoints.js'
import { SearchArt, TagArt } from '../../components/illustrations/Scenes.jsx'
import { LogoMark } from '../../components/layout/Logo.jsx'
import ThemeToggle from '../../components/layout/ThemeToggle.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckBurst } from '../../components/ui/Celebrate.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useAuth } from '../../context/contexts.js'
import { genitive } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'
import ClaimTag from './ClaimTag.jsx'
import FinderFlow from './FinderFlow.jsx'

/*
  /t/:code – adres zapisany na tagu NFC i w kodzie QR. Serwer mówi, co pokazać:
    free   → zalogowany: „Przypisz ten tag do zwierzęcia”, niezalogowany: „Ten tag jest wolny”,
    own    → właściciel skanuje swój tag: potwierdzenie, że działa + podgląd,
    active → znalazca: prowadzona ścieżka (FinderFlow).
  ?podglad=1 – właściciel ogląda ścieżkę znalazcy bez zapisywania skanu.
  ?src=plakat – wejście z kodu QR na plakacie (w dzienniku jako „plakat”).
*/
export default function TagPage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const { user, loading } = useAuth()
  const preview = params.get('podglad') === '1'
  const source = params.get('src') === 'plakat' ? 'poster' : 'tag'

  // Czekamy na sesję – od niej zależy, czy to właściciel (i czy w ogóle zapisać skan).
  if (loading) return <PageSpinner label="Sprawdzam tag…" />
  return <TagVisit key={`${code}|${user?.id ?? 'anon'}|${preview}`} code={code} source={source} preview={preview} />
}

function TagVisit({ code, source, preview }) {
  const [state, setState] = useState({ status: 'loading' })
  // Jedno wejście = jeden zapis skanu. StrictMode w dev wywołuje efekty dwukrotnie – ref to blokuje.
  const started = useRef(false)

  const load = () => {
    setState({ status: 'loading' })
    publicApi
      .visit(code, { source, preview })
      .then((visit) => setState({ status: 'ok', visit }))
      .catch((error) => setState({ status: 'error', error }))
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (state.status === 'loading') return <PageSpinner label="Sprawdzam tag…" />
  if (state.status === 'error') {
    return (
      <FinderShell>
        <div className="flex animate-rise flex-col items-center pt-6 text-center">
          <SearchArt className="w-64" />
          <h1 className="mt-2 text-3xl font-bold">{state.error.status === 404 ? 'Nie znamy tego tagu' : 'Coś poszło nie tak'}</h1>
          <p className="mt-2 max-w-sm text-muted">
            {state.error.status === 404
              ? 'Sprawdź, czy adres jest pełny. Jeśli znalazłeś zwierzę – zaprowadź je do weterynarza, sprawdzi chip.'
              : state.error.message}
          </p>
          {state.error.status !== 404 && (
            <Button className="mt-6" onClick={load} icon="refresh">
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </FinderShell>
    )
  }

  const { visit } = state
  if (visit.status === 'free') {
    return <FinderShell>{visit.pets ? <ClaimTag code={visit.code} pets={visit.pets} /> : <FreeTag code={visit.code} />}</FinderShell>
  }
  if (visit.status === 'own') {
    return (
      <FinderShell color={visit.pet.color}>
        <OwnTag visit={visit} />
      </FinderShell>
    )
  }
  return (
    <FinderShell color={visit.pet.color} lost={visit.lost ? (visit.pet.sex === 'female' ? 'Zaginiona' : 'Zaginiony') : null}>
      <FinderFlow visit={visit} />
    </FinderShell>
  )
}

export function FinderShell({ color, lost, children }) {
  return (
    <div className={`${petClass(color)} min-h-dvh`}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-linear-to-b from-pet-soft to-transparent" />
      <header className="mx-auto flex h-16 max-w-xl items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <span className="inline-flex items-center gap-2 font-display font-bold">
          <LogoMark size={28} /> PeTrace
          {lost && <span className="ml-1 rounded-full bg-alert px-2.5 py-0.5 text-xs font-bold text-white uppercase">{lost}</span>}
        </span>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pb-12">{children}</main>
    </div>
  )
}

function FreeTag({ code }) {
  return (
    <div className="flex animate-rise flex-col items-center text-center">
      <TagArt code={code} className="w-64" />
      <h1 className="mt-2 text-3xl font-bold">Ten tag jest jeszcze wolny</h1>
      <p className="mt-2 max-w-sm text-muted">Nikt go jeszcze nie przypisał do swojego zwierzęcia.</p>
      <div className="mt-6 grid w-full max-w-sm gap-3">
        <Button to={`/zaloguj?next=${encodeURIComponent(`/t/${code}`)}`} size="lg" icon="tag">
          To mój tag – przypisz go
        </Button>
      </div>
      <div className="card mt-8 w-full max-w-sm text-left text-sm">
        <p className="font-bold">Znalazłeś zwierzę z tym tagiem?</p>
        <p className="mt-1 text-muted">Opiekun nie aktywował jeszcze tagu. Najszybciej pomoże weterynarz lub schronisko – sprawdzą, czy zwierzę ma chip.</p>
      </div>
    </div>
  )
}

function OwnTag({ visit }) {
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <CheckBurst />
      <h1 className="mt-6 animate-rise text-3xl font-bold">To tag {genitive(visit.pet.name)} – działa!</h1>
      <p className="mt-2 max-w-sm animate-rise text-muted" style={{ animationDelay: '80ms' }}>
        Jesteś zalogowany jako opiekun, więc ten skan nie trafił do dziennika. Kod: <span className="font-mono font-semibold">{visit.code}</span>
      </p>
      <div className="mt-8 grid w-full max-w-sm animate-rise gap-3" style={{ animationDelay: '160ms' }}>
        <Button to={`/app/p/${visit.petId}`} variant="pet" size="lg" icon="paw">
          Profil {genitive(visit.pet.name)}
        </Button>
        <Button to={`/t/${visit.code}?podglad=1`} variant="secondary" size="lg" icon="eye">
          Zobacz, co widzi znalazca
        </Button>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/contexts.js'
import PetsProvider from '../../context/PetsProvider.jsx'
import { IconButton } from '../ui/Button.jsx'
import { PageSpinner } from '../ui/Spinner.jsx'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'

// Strefa właściciela wymaga logowania – inaczej przekierowanie z powrotem tutaj po zalogowaniu.
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to={`/zaloguj?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

/*
  Układ panelu właściciela: bez sidebara i bez dolnego menu. Wąska, wyśrodkowana kolumna
  (również na desktopie), pasek z logo u góry; nawigacja odbywa się przez przełącznik
  zwierząt i arkusz „Akcje” na ekranie zwierzęcia.
*/
export default function AppShell() {
  const { user } = useAuth()
  return (
    <RequireAuth>
      <PetsProvider>
        <div className="min-h-dvh">
          <header className="sticky top-0 z-40 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
              <Logo to="/app" />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <IconButton
                  to="/app/konto"
                  icon="user"
                  label={`Konto: ${user?.name || user?.email || ''}`}
                  className="bg-ink text-bg hover:opacity-90"
                />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-2xl px-4 pt-2 pb-36">
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </PetsProvider>
    </RequireAuth>
  )
}

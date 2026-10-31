import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import AppShell, { RequireAuth } from './components/layout/AppShell.jsx'
import TagPage from './pages/finder/TagPage.jsx'
import AuthLinkPage from './pages/public/AuthLinkPage.jsx'
import LandingPage from './pages/public/LandingPage.jsx'
import LoginPage from './pages/public/LoginPage.jsx'
import NotFoundPage from './pages/public/NotFoundPage.jsx'
import { PageSpinner } from './components/ui/Spinner.jsx'

// Panel właściciela i karta weterynarza ładują się osobno – strona tagu (najczęściej otwierana
// przez znalazcę na telefonie, często na słabym zasięgu) pobiera tylko to, czego potrzebuje.
const AccountPage = lazy(() => import('./pages/owner/AccountPage.jsx'))
const AppHome = lazy(() => import('./pages/owner/AppHome.jsx'))
const EventsPage = lazy(() => import('./pages/owner/EventsPage.jsx'))
const FoundPage = lazy(() => import('./pages/owner/FoundPage.jsx'))
const LostWizardPage = lazy(() => import('./pages/owner/LostWizardPage.jsx'))
const PetPage = lazy(() => import('./pages/owner/PetPage.jsx'))
const PetWizardPage = lazy(() => import('./pages/owner/PetWizardPage.jsx'))
const PosterPage = lazy(() => import('./pages/owner/PosterPage.jsx'))
const TagsPage = lazy(() => import('./pages/owner/TagsPage.jsx'))
const VetSharePage = lazy(() => import('./pages/owner/VetSharePage.jsx'))
const VetCardPage = lazy(() => import('./pages/vet/VetCardPage.jsx'))

// Po zmianie ekranu – na górę strony (jak w natywnej aplikacji).
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/zaloguj" element={<LoginPage />} />
          <Route path="/auth/link" element={<AuthLinkPage />} />
          <Route path="/t/:code" element={<TagPage />} />
          <Route path="/v/:token" element={<VetCardPage />} />

          <Route
            path="/app/p/:petId/plakat"
            element={
              <RequireAuth>
                <PosterPage />
              </RequireAuth>
            }
          />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<AppHome />} />
            <Route path="nowe" element={<PetWizardPage />} />
            <Route path="konto" element={<AccountPage />} />
            <Route path="p/:petId" element={<PetPage />} />
            <Route path="p/:petId/edytuj" element={<PetWizardPage />} />
            <Route path="p/:petId/zdarzenia" element={<EventsPage />} />
            <Route path="p/:petId/zaginiecie" element={<LostWizardPage />} />
            <Route path="p/:petId/znaleziony" element={<FoundPage />} />
            <Route path="p/:petId/weterynarz" element={<VetSharePage />} />
            <Route path="p/:petId/tagi" element={<TagsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

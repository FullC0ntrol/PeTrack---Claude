import { Navigate } from 'react-router'
import { EmptyPetsArt } from '../../components/illustrations/Scenes.jsx'
import Button from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/Controls.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useAuth, usePets } from '../../context/contexts.js'
import { LAST_PET_KEY, local } from '../../lib/storage.js'

// /app – otwiera ostatnio oglądane zwierzę (albo pierwsze), a bez zwierząt pokazuje powitanie.
export default function AppHome() {
  const { pets, loading, error, reload } = usePets()
  const { user } = useAuth()

  if (loading) return <PageSpinner />
  if (error) return <ErrorState error={error} onRetry={reload} />

  if (pets.length > 0) {
    const last = local.get(LAST_PET_KEY)
    const target = pets.find((pet) => pet.id === last) ?? pets[0]
    return <Navigate to={`/app/p/${target.id}`} replace />
  }

  return (
    <section className="flex animate-rise flex-col items-center pt-6 text-center">
      <EmptyPetsArt className="w-72 max-w-full" />
      <h1 className="mt-4 text-3xl font-bold">Tu zamieszka Twój pupil{user?.name ? `, ${user.name}` : ''}</h1>
      <p className="mt-2 max-w-sm text-muted">
        Dodaj pierwsze zwierzę – zajmie to minutę. Potem przypiszesz mu tag i gotowe.
      </p>
      <Button to="/app/nowe" size="lg" icon="plus" className="mt-7">
        Dodaj zwierzę
      </Button>
      <div className="mt-10 grid w-full max-w-md gap-3 text-left">
        {[
          ['paw', 'Profil ze zdjęciem', 'Imię, wygląd, zdrowie i kontakt – krok po kroku.'],
          ['tag', 'Tag NFC lub QR', 'Zeskanuj nowy tag telefonem, a aplikacja zapyta, do kogo go przypisać.'],
          ['heart', 'Spokojna głowa', 'Gdy zwierzę się zgubi, zgłosisz to w kilka sekund i wydrukujesz plakat.'],
        ].map(([icon, title, text], i) => (
          <div key={title} className="card flex animate-rise items-start gap-4 p-4" style={{ animationDelay: `${120 + i * 80}ms` }}>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text">
              <Icon name={icon} />
            </span>
            <span>
              <strong className="block">{title}</strong>
              <span className="text-sm text-muted">{text}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

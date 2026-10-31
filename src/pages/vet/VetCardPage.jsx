import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { publicApi } from '../../api/endpoints.js'
import { SearchArt } from '../../components/illustrations/Scenes.jsx'
import PublicShell from '../../components/layout/PublicShell.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { formatCountdown, useCountdown } from '../../hooks/useCountdown.js'
import { ageFromBirthDate, ageLabel, formatDate, SEX_LABELS, speciesLabel, telHref } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  Karta zdrowia dla weterynarza (/v/:token) – tylko do odczytu, ważna do końca odliczania.
  Po wygaśnięciu znika z ekranu, nawet jeśli strona jest dalej otwarta.
*/
export default function VetCardPage() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    publicApi
      .vetCard(token)
      .then((card) => setState({ status: 'ok', card }))
      .catch((error) => setState({ status: 'error', message: error.message }))
  }, [token])

  if (state.status === 'loading') return <PageSpinner label="Otwieram kartę zdrowia…" />
  if (state.status === 'error') return <Expired message={state.message} />
  return <VetCard card={state.card} />
}

function Expired({ message }) {
  return (
    <PublicShell>
      <div className="flex animate-rise flex-col items-center pt-6 text-center">
        <SearchArt className="w-60" />
        <h1 className="mt-2 text-3xl font-bold">Dostęp wygasł</h1>
        <p className="mt-2 max-w-sm text-muted">{message ?? 'Poproś opiekuna o nowy kod QR.'}</p>
        <Button to="/" variant="secondary" className="mt-6">
          Czym jest PeTrace?
        </Button>
      </div>
    </PublicShell>
  )
}

function VetCard({ card }) {
  const remaining = useCountdown(card.expiresAt)
  const { pet, owner } = card
  if (remaining <= 0) return <Expired message="Czas udostępnienia minął. Poproś opiekuna o nowy kod QR." />

  const age = ageLabel(ageFromBirthDate(pet.birthDate))
  const sections = [
    { label: 'Alergie', value: pet.allergies, icon: 'alert', important: true },
    { label: 'Leki', value: pet.medications, icon: 'medical' },
    { label: 'Choroby', value: pet.conditions, icon: 'heart' },
    { label: 'Szczepienia', value: pet.vaccinations, icon: 'shield' },
  ]

  return (
    <div className={petClass(pet.color)}>
      <PublicShell>
        <p className="mb-4 flex animate-rise-back items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          <Icon name="timer" size={18} />
          Dostęp tylko do odczytu · wygasa za <span className="font-mono tabular-nums">{formatCountdown(remaining)}</span>
        </p>

        <section className="relative animate-rise overflow-hidden rounded-5xl bg-pet p-6 text-on-pet shadow-lift">
          <span aria-hidden="true" className="absolute -top-14 -right-10 size-44 rounded-full bg-white/20" />
          <p className="relative text-sm font-bold tracking-wide uppercase opacity-80">Karta zdrowia</p>
          <div className="relative mt-3 flex items-center gap-4">
            <PetAvatar pet={pet} size={96} className="ring-4 ring-white/70" />
            <div className="min-w-0">
              <h1 className="truncate text-4xl font-extrabold">{pet.name}</h1>
              <p className="font-medium opacity-85">{[speciesLabel(pet.species, pet.sex), pet.breed].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <dl className="relative mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ['Wiek', age || '—'],
              ['Waga', pet.weightKg ? `${String(pet.weightKg).replace('.', ',')} kg` : '—'],
              ['Płeć', SEX_LABELS[pet.sex] ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/45 p-2">
                <dt className="text-xs font-semibold opacity-80">{label}</dt>
                <dd className="font-display font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-4 space-y-3">
          {sections.map((section, i) => (
            <section
              key={section.label}
              className={`card flex animate-rise gap-4 ${section.important && section.value ? 'ring-2 ring-alert' : ''}`}
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${section.important && section.value ? 'bg-alert text-white' : 'bg-pet-soft text-pet-text'}`}
              >
                <Icon name={section.icon} />
              </span>
              <div>
                <h2 className="font-bold">{section.label}</h2>
                <p className={`mt-0.5 whitespace-pre-line ${section.value ? '' : 'text-muted'}`}>{section.value || 'Brak informacji'}</p>
              </div>
            </section>
          ))}

          <section className="card animate-rise" style={{ animationDelay: '300ms' }}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Numer chipa</dt>
                <dd className="font-mono text-lg font-semibold">{pet.chipNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Data urodzenia</dt>
                <dd className="text-lg font-semibold">{pet.birthDate ? formatDate(pet.birthDate) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Stała przychodnia</dt>
                <dd>{[pet.vetClinic, pet.vetPhone].filter(Boolean).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Znaki szczególne</dt>
                <dd>{pet.description || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="card flex animate-rise flex-wrap items-center gap-4" style={{ animationDelay: '340ms' }}>
            <span className="grid size-11 place-items-center rounded-2xl bg-ink text-bg">
              <Icon name="user" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Opiekun</p>
              <p className="font-bold">{owner.name || '—'}</p>
              {owner.email && <p className="truncate text-sm text-muted">{owner.email}</p>}
            </div>
            {owner.phone && (
              <Button href={telHref(owner.phone)} variant="pet" size="sm" icon="phone">
                {owner.phone}
              </Button>
            )}
          </section>
        </div>
      </PublicShell>
    </div>
  )
}

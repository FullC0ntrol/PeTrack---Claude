import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import EventItem from '../../components/pets/EventItem.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import PetSwitcher from '../../components/pets/PetSwitcher.jsx'
import Button from '../../components/ui/Button.jsx'
import { Badge, ErrorState, Switch } from '../../components/ui/Controls.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Sheet from '../../components/ui/Sheet.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { usePets, useToast } from '../../context/contexts.js'
import { useResource } from '../../hooks/useResource.js'
import {
  ageFromBirthDate,
  ageLabel,
  byGender,
  countLabel,
  durationLabel,
  formatDateTime,
  genitive,
  SEX_LABELS,
  speciesLabel,
} from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'
import { LAST_PET_KEY, local } from '../../lib/storage.js'

/*
  Ekran skupiony na JEDNYM zwierzęciu. Zamiast menu: przełącznik zwierząt u góry, a wszystkie
  akcje w arkuszu wysuwanym od dołu pod przyciskiem „Akcje”. Cały ekran barwi kolor zwierzęcia.
*/
export default function PetPage() {
  const { petId } = useParams()
  const { pets } = usePets()
  const { data, error, loading, reload, setData } = useResource(
    () => Promise.all([petsApi.get(petId), petsApi.events(petId)]).then(([p, e]) => ({ pet: p.pet, events: e })),
    [petId],
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    local.set(LAST_PET_KEY, petId)
  }, [petId])

  const summary = pets.find((p) => p.id === petId)
  const color = data?.pet.id === petId ? data.pet.color : summary?.color

  return (
    <div className={petClass(color)}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[460px] bg-linear-to-b from-pet-soft to-transparent transition-colors"
      />
      <PetSwitcher pets={pets} activeId={petId} />

      {error ? (
        <div className="mt-6">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : loading || data?.pet.id !== petId ? (
        <PageSpinner />
      ) : (
        <PetContent
          key={petId}
          pet={data.pet}
          events={data.events}
          onPetChange={(pet) => setData((d) => ({ ...d, pet: { ...d.pet, ...pet } }))}
          onOpenActions={() => setSheetOpen(true)}
        />
      )}

      {data?.pet.id === petId && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center px-4">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="pointer-events-auto inline-flex min-h-15 animate-pop items-center gap-3 rounded-full bg-ink py-2 pr-7 pl-2 font-display text-lg font-bold text-bg shadow-lift transition-transform active:scale-95"
            >
              <span className={`grid size-11 place-items-center rounded-full bg-pet text-on-pet transition-transform duration-300 ${sheetOpen ? 'rotate-45' : ''}`}>
                <Icon name="plus" size={24} strokeWidth={2.5} />
              </span>
              Akcje
            </button>
          </div>
          <ActionsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pet={data.pet} unread={data.events.unread} />
        </>
      )}
    </div>
  )
}

function PetContent({ pet, events, onPetChange, onOpenActions }) {
  const age = ageLabel(ageFromBirthDate(pet.birthDate))
  const subtitle = [speciesLabel(pet.species, pet.sex), pet.breed, age].filter(Boolean).join(' · ')

  return (
    <div className="space-y-4 pt-2">
      <section className="relative animate-rise overflow-hidden rounded-5xl bg-pet p-5 text-on-pet shadow-lift sm:p-7">
        <span aria-hidden="true" className="absolute -top-16 -right-10 size-48 rounded-full bg-white/20" />
        <span aria-hidden="true" className="absolute -bottom-20 left-24 size-40 rounded-full bg-white/15" />
        <div className="relative flex items-center gap-4 sm:gap-6">
          <PetAvatar pet={pet} size={116} rounded="rounded-[36%]" className="shadow-lift ring-4 ring-white/70" />
          <div className="min-w-0">
            {pet.isLost ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-alert px-3 py-1 text-sm font-bold text-white">
                <span className="relative grid size-2.5 place-items-center">
                  <span className="absolute size-full animate-ping-soft rounded-full bg-white" />
                  <span className="size-2.5 rounded-full bg-white" />
                </span>
                {byGender(pet, 'Zaginiony', 'Zaginiona')} · {durationLabel(pet.lostReport.lastSeenAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-sm font-bold">
                <Icon name="home" size={16} /> {byGender(pet, 'Bezpieczny', 'Bezpieczna')} w domu
              </span>
            )}
            <h1 className="mt-2 truncate text-4xl font-extrabold sm:text-5xl">{pet.name}</h1>
            <p className="mt-1 truncate font-medium opacity-85">{subtitle}</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm font-semibold">
          <Link to={`/app/p/${pet.id}/tagi`} className="inline-flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1.5 hover:bg-white/65">
            <Icon name="tag" size={16} /> {pet.tags.length ? countLabel(pet.tags.length, 'tag', 'tagi', 'tagów') : 'Brak tagu'}
          </Link>
          <Link to={`/app/p/${pet.id}/zdarzenia`} className="inline-flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1.5 hover:bg-white/65">
            <Icon name="bell" size={16} /> {pet.unread ? countLabel(pet.unread, 'nowe', 'nowe', 'nowych') : 'Dziennik'}
          </Link>
          {pet.activeVetShares > 0 && (
            <Link to={`/app/p/${pet.id}/weterynarz`} className="inline-flex items-center gap-1.5 rounded-full bg-white/45 px-3 py-1.5 hover:bg-white/65">
              <Icon name="medical" size={16} /> Weterynarz ma dostęp
            </Link>
          )}
        </div>
      </section>

      {pet.isLost && <LostPanel pet={pet} onPetChange={onPetChange} />}

      <NewsCard pet={pet} events={events} />

      {pet.tags.length === 0 && (
        <section className="card flex animate-rise items-center gap-4" style={{ animationDelay: '120ms' }}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pet-soft text-pet-text">
            <Icon name="tag" />
          </span>
          <div className="flex-1">
            <h2 className="font-bold">{pet.name} nie ma jeszcze tagu</h2>
            <p className="text-sm text-muted">Przyłóż telefon do nowego tagu albo wpisz jego kod.</p>
          </div>
          <Button to={`/app/p/${pet.id}/tagi`} variant="pet" size="sm">
            Przypisz
          </Button>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Zdrowie" icon="medical" editTo={`/app/p/${pet.id}/edytuj?krok=zdrowie`} delay={160}>
          <InfoRows
            empty="Brak informacji o zdrowiu."
            rows={[
              ['Alergie', pet.allergies, true],
              ['Leki', pet.medications],
              ['Choroby', pet.conditions],
              ['Szczepienia', pet.vaccinations],
              ['Chip', pet.chipNumber],
              ['Weterynarz', [pet.vetClinic, pet.vetPhone].filter(Boolean).join(', ')],
            ]}
          />
        </InfoCard>
        <InfoCard title="Wygląd i kontakt" icon="user" editTo={`/app/p/${pet.id}/edytuj?krok=kontakt`} delay={220}>
          <InfoRows
            empty="Uzupełnij opis i kontakt."
            rows={[
              ['Znaki szczególne', pet.description],
              ['Płeć', pet.sex !== 'unknown' ? SEX_LABELS[pet.sex] : ''],
              ['Waga', pet.weightKg ? `${String(pet.weightKg).replace('.', ',')} kg` : ''],
              ['Opiekun', [pet.contactName, pet.contactPhone].filter(Boolean).join(', ')],
            ]}
          />
          <p className="mt-3 flex gap-2 rounded-2xl bg-raised p-3 text-xs text-muted">
            <Icon name="shield" size={16} />
            Znalazca nie widzi numeru – pisze do Ciebie przez aplikację.
          </p>
        </InfoCard>
      </div>

      <button
        type="button"
        onClick={onOpenActions}
        className="mx-auto mt-2 block text-sm font-semibold text-muted underline-offset-4 hover:underline"
      >
        Więcej akcji: zaginięcie, weterynarz, tagi, edycja…
      </button>
    </div>
  )
}

function LostPanel({ pet, onPetChange }) {
  const report = pet.lostReport
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const togglePhone = async (showPhone) => {
    setSaving(true)
    try {
      const { report: updated } = await petsApi.updateLost(pet.id, { showPhone })
      onPetChange({ lostReport: updated })
      toast.show(showPhone ? 'Numer widoczny dla znalazców' : 'Numer ukryty')
    } catch (error) {
      toast.show(error.message, { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="animate-rise rounded-4xl border-2 border-alert bg-surface p-5 shadow-soft" style={{ animationDelay: '60ms' }}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-alert text-white">
          <Icon name="alert" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">
            {pet.name} {byGender(pet, 'zaginął', 'zaginęła')} {durationLabel(report.lastSeenAt)} temu
          </h2>
          <p className="text-sm text-muted">
            Ostatnio: {report.lastSeenPlace || 'miejsce zaznaczone na mapie'} · {formatDateTime(report.lastSeenAt)}
          </p>
        </div>
      </div>
      {report.message && <p className="mt-3 rounded-2xl bg-alert-soft px-4 py-3 text-sm">„{report.message}”</p>}
      <div className="mt-4">
        <Switch
          checked={report.showPhone}
          disabled={saving || !report.phone}
          onChange={togglePhone}
          label="Pokaż mój numer znalazcom"
          description={report.phone ? `${report.phone} – tylko na czas zaginięcia` : 'Brak numeru w zgłoszeniu'}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button to={`/app/p/${pet.id}/znaleziony`} variant="primary" icon="heart" className="col-span-2 sm:col-span-1">
          Znaleziony!
        </Button>
        <Button to={`/app/p/${pet.id}/plakat`} variant="secondary" icon="print">
          Plakat
        </Button>
        <Button to={`/app/p/${pet.id}/zdarzenia`} variant="secondary" icon="route">
          Trasa
        </Button>
      </div>
    </section>
  )
}

function NewsCard({ pet, events }) {
  const latest = events.items.slice(0, 3)
  return (
    <section className="card animate-rise" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          Co słychać
          {events.unread > 0 && <Badge>{countLabel(events.unread, 'nowe', 'nowe', 'nowych')}</Badge>}
        </h2>
        <Link to={`/app/p/${pet.id}/zdarzenia`} className="inline-flex items-center gap-1 text-sm font-semibold text-pet-text">
          Dziennik <Icon name="forward" size={16} />
        </Link>
      </div>
      {latest.length === 0 ? (
        <p className="mt-3 text-muted">Cisza i spokój – nikt jeszcze nie skanował tagu {genitive(pet.name)}.</p>
      ) : (
        <div className="-mx-2 mt-2 space-y-1">
          {latest.map((item) => (
            <EventItem key={item.id} item={item} pet={pet} compact />
          ))}
        </div>
      )}
    </section>
  )
}

function InfoCard({ title, icon, editTo, children, delay = 0 }) {
  return (
    <section className="card animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-pet-soft text-pet-text">
            <Icon name={icon} size={18} />
          </span>
          {title}
        </h2>
        <Link to={editTo} aria-label={`Edytuj: ${title}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-raised">
          <Icon name="edit" size={18} />
        </Link>
      </div>
      {children}
    </section>
  )
}

function InfoRows({ rows, empty }) {
  const filled = rows.filter(([, value]) => value)
  if (filled.length === 0) return <p className="text-muted">{empty}</p>
  return (
    <dl className="space-y-2.5">
      {filled.map(([label, value, important]) => (
        <div key={label}>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
          <dd className={important ? 'font-semibold text-alert-text' : ''}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ActionsSheet({ open, onClose, pet, unread }) {
  const navigate = useNavigate()
  const firstTag = pet.tags[0]?.code
  const go = (to) => {
    onClose()
    navigate(to)
  }

  const tiles = [
    pet.isLost
      ? { icon: 'heart', label: 'Znaleziony!', hint: 'Zakończ zgłoszenie', to: `/app/p/${pet.id}/znaleziony`, tone: 'bg-accent text-on-accent' }
      : { icon: 'alert', label: 'Zgłoś zaginięcie', hint: 'Kreator w 4 krokach', to: `/app/p/${pet.id}/zaginiecie`, tone: 'bg-alert text-white' },
    { icon: 'route', label: 'Dziennik skanów', hint: unread ? countLabel(unread, 'nowe', 'nowe', 'nowych') : 'Mapa i zdarzenia', to: `/app/p/${pet.id}/zdarzenia`, badge: unread },
    { icon: 'qr', label: 'Dla weterynarza', hint: 'Kod QR na czas wizyty', to: `/app/p/${pet.id}/weterynarz` },
    { icon: 'tag', label: 'Tagi', hint: firstTag ? `Przypisane: ${pet.tags.length}` : 'Przypisz pierwszy tag', to: `/app/p/${pet.id}/tagi` },
    ...(pet.isLost ? [{ icon: 'print', label: 'Plakat', hint: 'Do druku, z kodem QR', to: `/app/p/${pet.id}/plakat` }] : []),
    { icon: 'edit', label: 'Edytuj profil', hint: 'Dane, zdjęcie, kolor', to: `/app/p/${pet.id}/edytuj` },
    ...(firstTag ? [{ icon: 'eye', label: 'Oczami znalazcy', hint: 'Podgląd bez zapisu skanu', to: `/t/${firstTag}?podglad=1` }] : []),
    { icon: 'plus', label: 'Nowe zwierzę', hint: 'Kreator profilu', to: '/app/nowe' },
  ]

  return (
    <Sheet open={open} onClose={onClose} title={`Akcje: ${pet.name}`} className={petClass(pet.color)}>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile, i) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => go(tile.to)}
            className="relative flex animate-rise flex-col items-start gap-3 rounded-3xl bg-raised p-4 text-left transition-transform active:scale-[0.97]"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <span className={`grid size-11 place-items-center rounded-2xl ${tile.tone ?? 'bg-pet text-on-pet'}`}>
              <Icon name={tile.icon} />
            </span>
            <span>
              <span className="block leading-tight font-bold">{tile.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{tile.hint}</span>
            </span>
            {tile.badge > 0 && (
              <span className="absolute top-3 right-3 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">
                {tile.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => go('/app/konto')}
        className="mt-3 flex w-full items-center gap-3 rounded-3xl p-4 text-left font-semibold hover:bg-raised"
      >
        <Icon name="user" /> Konto i ustawienia <Icon name="forward" size={18} className="ml-auto text-muted" />
      </button>
    </Sheet>
  )
}

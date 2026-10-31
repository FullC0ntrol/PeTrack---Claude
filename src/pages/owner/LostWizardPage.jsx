import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import LeafletMap from '../../components/map/LeafletMap.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button, { IconButton } from '../../components/ui/Button.jsx'
import { CheckBurst } from '../../components/ui/Celebrate.jsx'
import { ErrorState, ProgressBar, Switch } from '../../components/ui/Controls.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useAuth, usePets, useToast } from '../../context/contexts.js'
import { useResource } from '../../hooks/useResource.js'
import { byGender, formatCoords, formatDateTime, genitive } from '../../lib/format.js'
import { DEFAULT_CENTER, getPosition } from '../../lib/geo.js'
import { petClass } from '../../lib/petColors.js'
import { tagUrl } from '../../lib/qr.js'

const STEPS = [
  { id: 'gdzie', title: 'Gdzie widziany ostatnio?', lead: 'Dotknij mapy, żeby postawić pinezkę.' },
  { id: 'kiedy', title: 'Kiedy?', lead: 'Wystarczy w przybliżeniu.' },
  { id: 'komunikat', title: 'Komunikat dla znalazcy', lead: 'Zobaczy go każdy, kto zeskanuje tag.' },
  { id: 'sprawdz', title: 'Wszystko się zgadza?', lead: 'Po zgłoszeniu możesz wydrukować plakat.' },
]

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

function quickTimes() {
  const now = new Date()
  const at = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3_600_000)
  const todayAt = (h) => {
    const d = new Date(now)
    d.setHours(h, 0, 0, 0)
    return d
  }
  const yesterdayAt = (h) => {
    const d = todayAt(h)
    d.setDate(d.getDate() - 1)
    return d
  }
  const list = [
    { label: 'Przed chwilą', date: now },
    { label: 'Godzinę temu', date: at(1) },
    { label: '3 godziny temu', date: at(3) },
  ]
  if (now.getHours() >= 10) list.push({ label: 'Dziś rano', date: todayAt(8) })
  list.push({ label: 'Wczoraj wieczorem', date: yesterdayAt(20) })
  return list
}

/*
  Kreator „Zgłoś zaginięcie” zamiast przełącznika: miejsce (pinezka) → czas → komunikat → podsumowanie.
  Po zgłoszeniu: ekran z plakatem do druku i linkiem do udostępnienia.
*/
export default function LostWizardPage() {
  const { petId } = useParams()
  const { data, error, loading, reload } = useResource(() => petsApi.get(petId), [petId])
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <PageSpinner />
  return <LostWizard pet={data.pet} />
}

function LostWizard({ pet }) {
  const { user } = useAuth()
  const { reload: reloadPets } = usePets()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [point, setPoint] = useState(null)
  const [me, setMe] = useState(null)
  const [focus, setFocus] = useState(null)
  const [locating, setLocating] = useState(false)
  const [place, setPlace] = useState('')
  const [when, setWhen] = useState(() => toLocalInput(new Date()))
  const [message, setMessage] = useState(
    `Jeśli mnie widzisz – nie goń mnie, tylko daj znać, gdzie ${byGender(pet, 'byłem', 'byłam')}. Mój opiekun przyjedzie od razu. Dziękuję!`,
  )
  const [showPhone, setShowPhone] = useState(Boolean(pet.contactPhone || user?.phone))
  const [phone, setPhone] = useState(pet.contactPhone || user?.phone || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(pet.isLost)
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const locate = async () => {
    setLocating(true)
    setErrors({})
    try {
      const pos = await getPosition()
      setMe(pos)
      setPoint({ lat: pos.lat, lng: pos.lng })
      setFocus({ lat: pos.lat, lng: pos.lng })
    } catch (err) {
      setErrors({ location: err.message })
    } finally {
      setLocating(false)
    }
  }

  const validate = (id) => {
    const e = {}
    if (id === 'gdzie' && !point && !place.trim()) e.location = 'Postaw pinezkę na mapie albo opisz miejsce słowami.'
    if (id === 'kiedy') {
      const date = new Date(when)
      if (!when || Number.isNaN(date.getTime())) e.when = 'Podaj datę i godzinę.'
      else if (date.getTime() > Date.now() + 60_000) e.when = 'To jeszcze nie nastąpiło 🙂 Wybierz czas z przeszłości.'
    }
    if (id === 'komunikat' && showPhone && !/^\+?[\d\s()-]{6,20}$/.test(phone)) e.phone = 'Podaj numer, np. +48 600 100 200.'
    return e
  }

  const goTo = (index) => {
    setDirection(index < step ? 'back' : 'forward')
    setStep(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = async () => {
    const e = validate(STEPS[step].id)
    setErrors(e)
    if (Object.keys(e).length) return
    if (step < STEPS.length - 1) return goTo(step + 1)

    setSaving(true)
    try {
      await petsApi.reportLost(pet.id, {
        lastSeenAt: new Date(when).toISOString(),
        lat: point?.lat ?? null,
        lng: point?.lng ?? null,
        place: place.trim(),
        message: message.trim(),
        showPhone,
        phone: showPhone ? phone.trim() : '',
      })
      await reloadPets()
      setDone(true)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (done) return <LostDone pet={pet} toast={toast} />

  const current = STEPS[step]
  return (
    <div className={`${petClass(pet.color)} pb-8`}>
      <div className="sticky top-16 z-20 -mx-4 bg-bg/85 px-4 pt-2 pb-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <IconButton to={`/app/p/${pet.id}`} icon="close" label="Anuluj zgłoszenie" />
          <div className="flex-1">
            <ProgressBar step={step} total={STEPS.length} label={`Zaginięcie: ${pet.name}`} />
          </div>
        </div>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          next()
        }}
      >
        <section key={current.id} className={`${direction === 'back' ? 'animate-rise-back' : 'animate-rise'} card p-5 sm:p-7`}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-alert text-white">
              <Icon name="alert" />
            </span>
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">
                {current.title}
              </h1>
              <p className="text-muted">{current.lead}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {current.id === 'gdzie' && (
              <>
                <div className="overflow-hidden rounded-3xl ring-2 ring-line">
                  <LeafletMap
                    center={point ?? me ?? DEFAULT_CENTER}
                    zoom={point ? 16 : 12}
                    fit={false}
                    focus={focus}
                    onPick={(lat, lng) => {
                      setPoint({ lat, lng })
                      setErrors({})
                    }}
                    markers={[
                      ...(me ? [{ id: 'me', kind: 'me', lat: me.lat, lng: me.lng }] : []),
                      ...(point ? [{ id: 'pin', kind: 'lastSeen', lat: point.lat, lng: point.lng, label: 'Tu widziany ostatnio' }] : []),
                    ]}
                    className="h-80"
                    label="Mapa – dotknij, aby zaznaczyć miejsce"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="soft" size="sm" icon="locate" loading={locating} onClick={locate}>
                    Jestem w tym miejscu
                  </Button>
                  {point && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-sm text-muted">
                      <Icon name="pin" size={16} /> {formatCoords(point.lat, point.lng)}
                      <button type="button" className="ml-1 font-semibold text-ink" onClick={() => setPoint(null)} aria-label="Usuń pinezkę">
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  )}
                </div>
                <TextField
                  label="Opis miejsca"
                  optional={Boolean(point)}
                  placeholder="np. Park Skaryszewski, przy stawie"
                  maxLength={120}
                  value={place}
                  onChange={(event) => {
                    setPlace(event.target.value)
                    setErrors({})
                  }}
                  error={errors.location}
                />
              </>
            )}

            {current.id === 'kiedy' && (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Szybki wybór">
                  {quickTimes().map((option) => {
                    const value = toLocalInput(option.date)
                    const selected = value === when
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setWhen(value)}
                        aria-pressed={selected}
                        className={`rounded-full px-4 py-2.5 font-semibold transition-all ${selected ? 'scale-105 bg-pet text-on-pet shadow-soft' : 'bg-raised hover:bg-line'}`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                <TextField
                  label="Dokładnie"
                  type="datetime-local"
                  max={toLocalInput(new Date())}
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  error={errors.when}
                />
              </>
            )}

            {current.id === 'komunikat' && (
              <>
                <TextField
                  label="Twoja wiadomość"
                  multiline
                  rows={4}
                  maxLength={500}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  hint="Np. czy zwierzę jest płochliwe, czy można je wziąć na ręce, czy ma nagrodę."
                />
                <Switch
                  checked={showPhone}
                  onChange={setShowPhone}
                  label="Pokaż mój numer znalazcom"
                  description="Tylko na czas zaginięcia. Wyłączysz to w każdej chwili."
                />
                {showPhone && (
                  <TextField
                    label="Numer telefonu"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    error={errors.phone}
                  />
                )}
              </>
            )}

            {current.id === 'sprawdz' && (
              <>
                <div className="flex items-center gap-4 rounded-3xl bg-pet-soft p-4">
                  <PetAvatar pet={pet} size={64} />
                  <div>
                    <p className="font-display text-xl font-bold">{pet.name}</p>
                    <p className="text-sm text-muted">
                      {byGender(pet, 'Zaginął', 'Zaginęła')} {formatDateTime(when)}
                    </p>
                  </div>
                </div>
                <dl className="divide-y divide-line">
                  <SummaryRow label="Miejsce" onEdit={() => goTo(0)}>
                    {place || (point ? `Pinezka: ${formatCoords(point.lat, point.lng)}` : '—')}
                  </SummaryRow>
                  <SummaryRow label="Czas" onEdit={() => goTo(1)}>
                    {formatDateTime(when)}
                  </SummaryRow>
                  <SummaryRow label="Komunikat" onEdit={() => goTo(2)}>
                    {message || '—'}
                  </SummaryRow>
                  <SummaryRow label="Telefon dla znalazcy" onEdit={() => goTo(2)}>
                    {showPhone ? phone : 'Ukryty – tylko anonimowe wiadomości'}
                  </SummaryRow>
                </dl>
                {pet.tags.length === 0 && (
                  <p className="flex gap-2 rounded-2xl bg-alert-soft p-3 text-sm text-alert-text">
                    <Icon name="info" size={18} />
                    {pet.name} nie ma tagu – plakat nie będzie miał kodu QR. Możesz przypisać tag później.
                  </p>
                )}
              </>
            )}
          </div>

          {errors.submit && (
            <p role="alert" className="mt-5 rounded-2xl bg-alert-soft p-3 text-sm font-medium text-alert-text">
              {errors.submit}
            </p>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/90 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-3 px-4 pt-3">
            {step > 0 && (
              <Button variant="secondary" size="lg" icon="back" onClick={() => goTo(step - 1)}>
                <span className="sr-only sm:not-sr-only">Wstecz</span>
              </Button>
            )}
            <Button
              type="submit"
              variant={step === STEPS.length - 1 ? 'danger' : 'pet'}
              size="lg"
              className="flex-1"
              loading={saving}
              icon={step === STEPS.length - 1 ? 'alert' : undefined}
              iconRight={step === STEPS.length - 1 ? undefined : 'forward'}
            >
              {step === STEPS.length - 1 ? 'Zgłoś zaginięcie' : 'Dalej'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function SummaryRow({ label, children, onEdit }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
      <button type="button" onClick={onEdit} className="grid size-9 place-items-center rounded-full text-muted hover:bg-raised" aria-label={`Zmień: ${label}`}>
        <Icon name="edit" size={18} />
      </button>
    </div>
  )
}

function LostDone({ pet, toast }) {
  const code = pet.tags[0]?.code
  const share = async () => {
    const url = tagUrl(code)
    const text = `Pomóż znaleźć: ${pet.name}. Jeśli ${byGender(pet, 'go', 'ją')} widzisz, daj znać tutaj:`
    try {
      if (navigator.share) await navigator.share({ title: `Zaginął pupil: ${pet.name}`, text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        toast.show('Skopiowano link')
      }
    } catch {
      /* użytkownik zamknął okno udostępniania */
    }
  }

  return (
    <div className={`${petClass(pet.color)} flex flex-col items-center pt-8 text-center`}>
      <CheckBurst />
      <h1 className="mt-6 animate-rise text-3xl font-bold">Zgłoszenie aktywne</h1>
      <p className="mt-2 max-w-md animate-rise text-muted" style={{ animationDelay: '80ms' }}>
        Każdy, kto zeskanuje tag {genitive(pet.name)}, zobaczy Twój komunikat i może od razu wysłać Ci wiadomość z miejscem na mapie.
      </p>
      <div className="mt-8 grid w-full max-w-sm animate-rise gap-3" style={{ animationDelay: '160ms' }}>
        <Button to={`/app/p/${pet.id}/plakat`} size="lg" icon="print">
          Wydrukuj plakat
        </Button>
        {code && (
          <Button variant="secondary" size="lg" icon="share" onClick={share}>
            Udostępnij link
          </Button>
        )}
        <Button variant="ghost" size="lg" to={`/app/p/${pet.id}`}>
          Wróć do profilu
        </Button>
      </div>
    </div>
  )
}

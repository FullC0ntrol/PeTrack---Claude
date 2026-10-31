import { useEffect, useRef, useState } from 'react'
import { publicApi } from '../../api/endpoints.js'
import LeafletMap from '../../components/map/LeafletMap.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button, { IconButton } from '../../components/ui/Button.jsx'
import { CheckBurst } from '../../components/ui/Celebrate.jsx'
import { ChoiceCards, StepDots } from '../../components/ui/Controls.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { ageLabel, byGender, durationLabel, formatDateTime, SEX_LABELS, speciesLabel, telHref } from '../../lib/format.js'
import { getPosition } from '../../lib/geo.js'

const STEPS = ['hello', 'safe', 'where', 'contact']

function suggestion(pet, condition, located) {
  const where = located ? ' Miejsce jest zaznaczone w aplikacji.' : ''
  switch (condition) {
    case 'safe':
      return `Dzień dobry! ${pet.name} jest ze mną, ${byGender(pet, 'cały i zdrowy', 'cała i zdrowa')}.${where} Proszę o kontakt.`
    case 'injured':
      return `Dzień dobry, ${pet.name} jest ze mną, ale wygląda na ${byGender(pet, 'rannego albo chorego', 'ranną albo chorą')}.${where} Proszę o pilny kontakt.`
    case 'escaped':
      return `Dzień dobry, ${pet.name} ${byGender(pet, 'był', 'była')} w pobliżu, ale ${byGender(pet, 'uciekł', 'uciekła')}.${where}`
    default:
      return `Dzień dobry, ${pet.name} jest ze mną.${where}`
  }
}

/*
  Ścieżka znalazcy – zamiast listy przycisków cztery krótkie kroki, każdy z jednym pytaniem:
    1. „Cześć, jestem Burek!”  – kto to jest (zdjęcie, opis, komunikat o zaginięciu),
    2. „Czy jestem bezpieczny?” – stan zwierzęcia + ważne informacje o zdrowiu,
    3. „Udostępnij, gdzie mnie znalazłeś” – geolokalizacja tylko po kliknięciu (zgoda),
    4. kontakt – anonimowa wiadomość do opiekuna; telefon tylko w trybie zaginięcia, jeśli opiekun pozwolił.
*/
export default function FinderFlow({ visit }) {
  const { pet, lost, preview, scanId, code } = visit
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState('forward')
  const [condition, setCondition] = useState(null)
  const [location, setLocation] = useState({ status: 'idle' })
  const headingRef = useRef(null)

  useEffect(() => {
    if (step > 0) headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const goTo = (index) => {
    setDirection(index < step ? 'back' : 'forward')
    setStep(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = () => goTo(step + 1)
  const id = STEPS[step]
  const animation = direction === 'back' ? 'animate-rise-back' : 'animate-rise'

  return (
    <div>
      {preview && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-bg">
          <Icon name="eye" size={18} /> Podgląd opiekuna – skan i wiadomości nie są zapisywane.
        </p>
      )}
      <div className="mb-4 flex h-11 items-center justify-between">
        {step > 0 ? <IconButton icon="back" label="Wstecz" onClick={() => goTo(step - 1)} /> : <span />}
        <StepDots step={step} total={STEPS.length} />
        <span className="w-11" />
      </div>

      <div key={id} className={animation}>
        {id === 'hello' && <HelloStep pet={pet} lost={lost} onNext={next} />}
        {id === 'safe' && (
          <SafeStep
            pet={pet}
            condition={condition}
            setCondition={setCondition}
            onNext={next}
            headingRef={headingRef}
          />
        )}
        {id === 'where' && (
          <WhereStep scanId={scanId} preview={preview} location={location} setLocation={setLocation} onNext={next} headingRef={headingRef} />
        )}
        {id === 'contact' && (
          <ContactStep
            pet={pet}
            lost={lost}
            code={code}
            scanId={scanId}
            preview={preview}
            condition={condition}
            located={location.status === 'done'}
            headingRef={headingRef}
          />
        )}
      </div>
    </div>
  )
}

function HelloStep({ pet, lost, onNext }) {
  const facts = [speciesLabel(pet.species, pet.sex), pet.breed, ageLabel(pet.ageYears), pet.sex !== 'unknown' ? SEX_LABELS[pet.sex] : ''].filter(Boolean)
  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative">
        <span aria-hidden="true" className="absolute -inset-4 animate-ping-soft rounded-[40%] bg-pet/40 [animation-duration:2.6s]" />
        <span className="relative block animate-wiggle">
          <PetAvatar pet={pet} size={184} rounded="rounded-[38%]" className="shadow-lift ring-8 ring-surface" />
        </span>
      </div>
      <h1 className="mt-7 text-4xl font-extrabold sm:text-5xl">Cześć, jestem {pet.name}!</h1>
      <p className="mt-3 flex flex-wrap justify-center gap-2">
        {facts.map((fact) => (
          <span key={fact} className="rounded-full bg-pet-soft px-3 py-1 text-sm font-semibold text-pet-text">
            {fact}
          </span>
        ))}
      </p>

      {lost && (
        <div className="mt-6 w-full rounded-4xl bg-alert p-5 text-left text-white shadow-lift">
          <p className="flex items-center gap-2 font-display text-xl font-bold">
            <Icon name="alert" /> {byGender(pet, 'Zgubiłem się!', 'Zgubiłam się!')}
          </p>
          <p className="mt-1 text-white/90">
            Mój opiekun szuka mnie od {durationLabel(lost.lastSeenAt)}
            {lost.lastSeenPlace ? ` – ostatnio ${byGender(pet, 'widziany', 'widziana')}: ${lost.lastSeenPlace}` : ''}.
          </p>
          {lost.message && <p className="mt-3 rounded-2xl bg-white/15 px-4 py-3">„{lost.message}”</p>}
        </div>
      )}

      {pet.description && (
        <p className="card mt-4 w-full text-left">
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">Jak mnie poznać</span>
          {pet.description}
        </p>
      )}

      <Button variant="pet" size="xl" full className="mt-6" iconRight="forward" onClick={onNext}>
        Pomóż mi wrócić do domu
      </Button>
      <p className="mt-3 text-sm text-muted">Zajmie to minutę. Twoje dane zostają prywatne.</p>
    </section>
  )
}

function SafeStep({ pet, condition, setCondition, onNext, headingRef }) {
  const health = [
    ['Alergie', pet.allergies],
    ['Leki', pet.medications],
    ['Choroby', pet.conditions],
  ].filter(([, value]) => value)

  return (
    <section>
      <h1 ref={headingRef} tabIndex={-1} className="text-center text-3xl font-bold outline-none sm:text-4xl">
        Czy jestem {byGender(pet, 'bezpieczny', 'bezpieczna')}?
      </h1>
      <p className="mt-2 text-center text-muted">Wybierz, co najlepiej opisuje sytuację.</p>
      <div className="mt-6">
        <ChoiceCards
          name="condition"
          value={condition}
          onChange={setCondition}
          columns={1}
          options={[
            { value: 'safe', label: 'Tak, jest ze mną', description: byGender(pet, 'Trzymam go bezpiecznie', 'Trzymam ją bezpiecznie'), icon: 'heart' },
            { value: 'injured', label: byGender(pet, 'Jest ranny lub chory', 'Jest ranna lub chora'), description: 'Potrzebuje pomocy', icon: 'medical' },
            { value: 'escaped', label: byGender(pet, 'Był tu, ale uciekł', 'Była tu, ale uciekła'), description: 'Nie udało się podejść', icon: 'route' },
          ]}
        />
      </div>

      {condition === 'injured' && (
        <div className="mt-4 animate-rise rounded-4xl bg-alert-soft p-5">
          <p className="font-bold text-alert-text">Najpierw bezpieczeństwo</p>
          <p className="mt-1 text-sm">Nie podawaj jedzenia ani leków. Jeśli możesz, zaprowadź zwierzę do najbliższego weterynarza.</p>
          {pet.vetClinic && (
            <p className="mt-3 text-sm">
              Mój weterynarz: <strong>{pet.vetClinic}</strong>
            </p>
          )}
          {pet.vetPhone && (
            <Button href={telHref(pet.vetPhone)} variant="danger" size="sm" icon="phone" className="mt-3">
              Zadzwoń do przychodni
            </Button>
          )}
        </div>
      )}

      {health.length > 0 && (
        <div className="card mt-4">
          <p className="flex items-center gap-2 font-bold">
            <Icon name="medical" className="text-pet-text" /> Ważne o mnie
          </p>
          <dl className="mt-3 space-y-2">
            {health.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
                <dd className={label === 'Alergie' ? 'font-semibold text-alert-text' : ''}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Button variant="pet" size="xl" full className="mt-6" iconRight="forward" onClick={onNext} disabled={!condition}>
        Dalej
      </Button>
    </section>
  )
}

function WhereStep({ scanId, preview, location, setLocation, onNext, headingRef }) {
  const share = async () => {
    setLocation({ status: 'locating' })
    try {
      const pos = await getPosition()
      if (!preview && scanId) await publicApi.shareLocation(scanId, { lat: pos.lat, lng: pos.lng, accuracy: Math.round(pos.accuracy) })
      setLocation({ status: 'done', ...pos })
    } catch (error) {
      setLocation({ status: 'error', message: error.message })
    }
  }

  return (
    <section>
      <h1 ref={headingRef} tabIndex={-1} className="text-center text-3xl font-bold outline-none sm:text-4xl">
        Udostępnij, gdzie mnie znalazłeś
      </h1>
      <p className="mt-2 text-center text-muted">Mój opiekun zobaczy to miejsce na mapie. Nikt inny.</p>

      {location.status === 'done' ? (
        <div className="mt-6 animate-rise">
          <div className="overflow-hidden rounded-4xl shadow-soft">
            <LeafletMap
              center={{ lat: location.lat, lng: location.lng }}
              zoom={16}
              fit={false}
              markers={[{ id: 'here', kind: 'pin', lat: location.lat, lng: location.lng }]}
              className="h-56"
              label="Udostępnione miejsce"
            />
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 font-semibold text-ok-text">
            <Icon name="check" strokeWidth={3} /> Dziękuję! Opiekun widzi to miejsce.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-4xl bg-surface p-6 text-center shadow-soft">
          <span className="relative grid size-24 place-items-center">
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-pet/40" />
            <span className="relative grid size-20 place-items-center rounded-full bg-pet text-on-pet">
              <Icon name="locate" size={38} />
            </span>
          </span>
          <Button variant="pet" size="lg" className="mt-6" loading={location.status === 'locating'} onClick={share} icon="pin">
            Udostępnij lokalizację
          </Button>
          <p className="mt-3 text-sm text-muted">Przeglądarka zapyta o zgodę. Lokalizację wysyłamy tylko raz, teraz.</p>
          {location.status === 'error' && <p className="mt-3 text-sm font-medium text-alert-text">{location.message}</p>}
        </div>
      )}

      <Button variant={location.status === 'done' ? 'pet' : 'ghost'} size="xl" full className="mt-6" iconRight="forward" onClick={onNext}>
        {location.status === 'done' ? 'Dalej' : 'Pomiń ten krok'}
      </Button>
    </section>
  )
}

function ContactStep({ pet, lost, code, scanId, preview, condition, located, headingRef }) {
  const [body, setBody] = useState(() => suggestion(pet, condition, located))
  const [contact, setContact] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const owner = pet.ownerFirstName

  const send = async (event) => {
    event.preventDefault()
    if (!body.trim()) {
      setState({ status: 'error', message: 'Napisz kilka słów.' })
      return
    }
    setState({ status: 'sending' })
    try {
      if (!preview) await publicApi.sendMessage(code, { body, condition: condition ?? 'unknown', contact, scanId })
      setState({ status: 'sent' })
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  const phoneCard = lost?.phone && (
    <div className="card mt-4 flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-alert text-white">
        <Icon name="phone" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">Pilne? Zadzwoń{owner ? ` do: ${owner}` : ''}</p>
        <p className="text-sm text-muted">Opiekun udostępnił numer na czas poszukiwań.</p>
      </div>
      <Button href={telHref(lost.phone)} variant="danger" size="sm" icon="phone">
        {lost.phone}
      </Button>
    </div>
  )

  if (state.status === 'sent') {
    return (
      <section className="flex flex-col items-center pt-4 text-center">
        <CheckBurst />
        <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-3xl font-bold outline-none">
          Wiadomość wysłana!
        </h1>
        <p className="mt-2 max-w-sm text-muted">
          {owner ? `${owner} zobaczy ją` : 'Opiekun zobaczy ją'} w aplikacji{contact ? ' i odezwie się do Ciebie' : ''}. Dziękuję za pomoc!
        </p>
        <PetAvatar pet={pet} size={96} className="mt-6 animate-wiggle shadow-soft" />
        <div className="w-full">{phoneCard}</div>
      </section>
    )
  }

  return (
    <section>
      <h1 ref={headingRef} tabIndex={-1} className="text-center text-3xl font-bold outline-none sm:text-4xl">
        Napisz do {owner ? `mojego opiekuna – ${owner}` : 'mojego opiekuna'}
      </h1>
      <p className="mt-2 text-center text-muted">Wiadomość jest anonimowa. Nie widzisz danych opiekuna, a on Twoich – chyba że je podasz.</p>
      {phoneCard}
      <form onSubmit={send} className="card mt-4 space-y-4" noValidate>
        <TextField label="Wiadomość" multiline rows={4} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} />
        <TextField
          label="Twój telefon lub e-mail"
          optional
          maxLength={120}
          autoComplete="tel"
          placeholder="Jeśli chcesz, żeby opiekun mógł odpisać"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
        {state.status === 'error' && (
          <p role="alert" className="text-sm font-medium text-alert-text">
            {state.message}
          </p>
        )}
        <Button type="submit" variant="pet" size="xl" full icon="send" loading={state.status === 'sending'}>
          Wyślij wiadomość
        </Button>
      </form>
      {lost && <p className="mt-4 text-center text-xs text-muted">Zgłoszenie z {formatDateTime(lost.lastSeenAt)}</p>}
    </section>
  )
}

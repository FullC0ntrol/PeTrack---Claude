import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { petsApi, tagsApi } from '../../api/endpoints.js'
import PetArt from '../../components/illustrations/PetArt.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button, { IconButton } from '../../components/ui/Button.jsx'
import { ChoiceCards, ErrorState, ProgressBar } from '../../components/ui/Controls.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import Field from '../../components/ui/Field.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Sheet from '../../components/ui/Sheet.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useAuth, usePets, useToast } from '../../context/contexts.js'
import { ageFromBirthDate, ageLabel, speciesLabel } from '../../lib/format.js'
import { resizeImage } from '../../lib/image.js'
import { PET_COLORS, petClass } from '../../lib/petColors.js'
import { session } from '../../lib/storage.js'

const DRAFT_KEY = 'petrace-new-pet'

const STEPS = [
  { id: 'podstawy', title: 'Podstawowe dane', lead: 'Zacznijmy od najważniejszego.' },
  { id: 'zdjecie', title: 'Zdjęcie', lead: 'Wyraźne zdjęcie bardzo pomaga znalazcy.' },
  { id: 'zdrowie', title: 'Zdrowie', lead: 'Co powinien wiedzieć znalazca albo weterynarz?' },
  { id: 'kontakt', title: 'Kontakt', lead: 'Kto się nim opiekuje?' },
  { id: 'kolor', title: 'Kolor', lead: 'Ten kolor będzie barwił ekrany zwierzęcia.' },
]

const FIELD_STEP = {
  name: 'podstawy',
  species: 'podstawy',
  breed: 'podstawy',
  sex: 'podstawy',
  birthDate: 'podstawy',
  weightKg: 'podstawy',
  description: 'podstawy',
  chipNumber: 'zdrowie',
  allergies: 'zdrowie',
  medications: 'zdrowie',
  conditions: 'zdrowie',
  vaccinations: 'zdrowie',
  vetClinic: 'zdrowie',
  vetPhone: 'zdrowie',
  contactName: 'kontakt',
  contactPhone: 'kontakt',
  color: 'kolor',
}

const EMPTY = {
  name: '',
  species: 'dog',
  breed: '',
  sex: 'unknown',
  birthDate: '',
  weightKg: '',
  description: '',
  chipNumber: '',
  allergies: '',
  medications: '',
  conditions: '',
  vaccinations: '',
  vetClinic: '',
  vetPhone: '',
  contactName: '',
  contactPhone: '',
  color: 'coral',
}

const PHONE_RE = /^\+?[\d\s()-]{6,20}$/

// Walidacja po stronie przeglądarki – te same zasady co na serwerze (server/validation.js).
function validateStep(stepId, form) {
  const errors = {}
  if (stepId === 'podstawy') {
    if (!form.name.trim()) errors.name = 'Jak ma na imię?'
    else if (form.name.trim().length > 40) errors.name = 'Maksymalnie 40 znaków.'
    if (form.birthDate && new Date(form.birthDate) > new Date()) errors.birthDate = 'Data nie może być z przyszłości.'
    if (form.weightKg !== '') {
      const w = Number(String(form.weightKg).replace(',', '.'))
      if (!Number.isFinite(w) || w <= 0 || w >= 200) errors.weightKg = 'Podaj wagę w kg, np. 4,5.'
    }
  }
  if (stepId === 'zdrowie') {
    const chip = form.chipNumber.replace(/\s/g, '')
    if (chip && !/^\d{9,15}$/.test(chip)) errors.chipNumber = 'Numer chipa to 9–15 cyfr.'
    if (form.vetPhone && !PHONE_RE.test(form.vetPhone)) errors.vetPhone = 'Wpisz sam numer, np. +48 22 600 11 22.'
  }
  if (stepId === 'kontakt') {
    if (form.contactPhone && !PHONE_RE.test(form.contactPhone)) errors.contactPhone = 'Wpisz sam numer, np. +48 600 100 200.'
  }
  return errors
}

function toPayload(form) {
  return {
    ...form,
    birthDate: form.birthDate || null,
    weightKg: form.weightKg === '' ? null : String(form.weightKg),
  }
}

/*
  Kreator profilu zwierzęcia: podstawowe dane → zdjęcie → zdrowie → kontakt → kolor.
  Ten sam komponent edytuje istniejący profil (/app/p/:id/edytuj) – wtedy kroki są klikalne,
  a „Zapisz” działa z każdego kroku. ?krok=zdrowie otwiera od razu wybrany krok.
  ?tag=KOD (z ekranu wolnego tagu) – po utworzeniu profilu tag przypisuje się sam.
*/
export default function PetWizardPage() {
  const { petId } = useParams()
  const isEdit = Boolean(petId)
  const [loadState, setLoadState] = useState({ loading: isEdit, error: null, pet: null })

  useEffect(() => {
    if (!isEdit) return
    let active = true
    petsApi
      .get(petId)
      .then(({ pet }) => active && setLoadState({ loading: false, error: null, pet }))
      .catch((error) => active && setLoadState({ loading: false, error, pet: null }))
    return () => {
      active = false
    }
  }, [isEdit, petId])

  if (loadState.loading) return <PageSpinner />
  if (loadState.error) return <ErrorState error={loadState.error} />
  return <Wizard key={petId ?? 'new'} existing={loadState.pet} />
}

function Wizard({ existing }) {
  const isEdit = Boolean(existing)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { reload: reloadPets } = usePets()
  const toast = useToast()

  const [form, setForm] = useState(() => {
    if (existing) {
      const base = { ...EMPTY }
      for (const key of Object.keys(EMPTY)) base[key] = existing[key] ?? EMPTY[key]
      base.weightKg = existing.weightKg ? String(existing.weightKg).replace('.', ',') : ''
      return base
    }
    return { ...EMPTY, contactName: user?.name ?? '', contactPhone: user?.phone ?? '', ...session.get(DRAFT_KEY, {}) }
  })
  const initialStep = Math.max(0, STEPS.findIndex((s) => s.id === params.get('krok')))
  const [step, setStep] = useState(initialStep)
  const [direction, setDirection] = useState('forward')
  const [errors, setErrors] = useState({})
  const [photo, setPhoto] = useState({ blob: null, preview: existing?.photoUrl ?? null, removed: false })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const headingRef = useRef(null)

  const tagToClaim = params.get('tag')
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    if (!isEdit) session.set(DRAFT_KEY, form)
  }, [form, isEdit])

  // Zwolnienie podglądu zdjęcia z pamięci.
  useEffect(() => {
    const url = photo.preview
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [photo.preview])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const bind = (key) => ({ value: form[key], onChange: (event) => set(key)(event.target.value), error: errors[key] })

  const goTo = (index) => {
    setDirection(index < step ? 'back' : 'forward')
    setStep(index)
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const stepErrors = validateStep(current.id, form)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length) return
    if (isLast) save()
    else goTo(step + 1)
  }

  const save = async () => {
    // Przed zapisem sprawdzamy wszystkie kroki – w edycji można zapisać z dowolnego miejsca.
    for (const [index, s] of STEPS.entries()) {
      const stepErrors = validateStep(s.id, form)
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors)
        goTo(index)
        return
      }
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = toPayload(form)
      const { pet } = isEdit ? await petsApi.update(existing.id, payload) : await petsApi.create(payload)
      if (photo.blob) await petsApi.uploadPhoto(pet.id, photo.blob)
      else if (photo.removed && existing?.photoUrl) await petsApi.removePhoto(pet.id)

      let claimMessage = null
      if (!isEdit && tagToClaim) {
        try {
          await tagsApi.claim(tagToClaim, pet.id)
          claimMessage = `Tag ${tagToClaim} przypisany`
        } catch (error) {
          toast.show(error.message, { tone: 'error' })
        }
      }
      if (!isEdit) session.remove(DRAFT_KEY)
      await reloadPets()
      toast.show(claimMessage ?? (isEdit ? 'Zapisano zmiany' : `Witaj, ${pet.name}!`))
      navigate(`/app/p/${pet.id}`, { replace: true })
    } catch (error) {
      if (error.field && FIELD_STEP[error.field]) {
        setErrors({ [error.field]: error.message })
        goTo(STEPS.findIndex((s) => s.id === FIELD_STEP[error.field]))
      } else {
        setFormError(error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await petsApi.remove(existing.id)
      await reloadPets()
      toast.show(`Usunięto profil: ${existing.name}`)
      navigate('/app', { replace: true })
    } catch (error) {
      setFormError(error.message)
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  const previewPet = useMemo(
    () => ({ ...form, photoUrl: photo.preview, name: form.name || 'Twój pupil' }),
    [form, photo.preview],
  )
  const closeTo = isEdit ? `/app/p/${existing.id}` : '/app'

  return (
    <div className={`${petClass(form.color)} pb-8`}>
      <div className="sticky top-16 z-20 -mx-4 bg-bg/85 px-4 pt-2 pb-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <IconButton to={closeTo} icon="close" label={isEdit ? 'Zamknij edycję' : 'Przerwij dodawanie'} />
          <div className="flex-1">
            <ProgressBar step={step} total={STEPS.length} label={isEdit ? `Edycja: ${existing.name}` : 'Nowe zwierzę'} />
          </div>
        </div>
        {isEdit && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? 'step' : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${i === step ? 'bg-pet text-on-pet' : 'bg-raised text-muted hover:text-ink'}`}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          next()
        }}
      >
        <section key={current.id} className={`${direction === 'back' ? 'animate-rise-back' : 'animate-rise'} card p-5 sm:p-7`}>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
            {current.title}
          </h1>
          <p className="mt-1 text-muted">{current.lead}</p>

          <div className="mt-6 space-y-5">
            {current.id === 'podstawy' && (
              <>
                <TextField label="Imię" autoComplete="off" maxLength={40} placeholder="np. Burek" required {...bind('name')} />
                <ChoiceCards
                  legend="Gatunek"
                  name="species"
                  value={form.species}
                  onChange={set('species')}
                  size="lg"
                  options={[
                    { value: 'dog', label: 'Pies', art: <SpeciesArt species="dog" /> },
                    { value: 'cat', label: 'Kot', art: <SpeciesArt species="cat" /> },
                    { value: 'other', label: 'Inne', art: <SpeciesArt species="other" /> },
                  ]}
                />
                <TextField label="Rasa" optional placeholder="np. mieszaniec" maxLength={60} {...bind('breed')} />
                <ChoiceCards
                  legend="Płeć"
                  name="sex"
                  value={form.sex}
                  onChange={set('sex')}
                  options={[
                    { value: 'male', label: form.species === 'cat' ? 'Kocur' : 'Samiec' },
                    { value: 'female', label: speciesLabel(form.species, 'female') },
                    { value: 'unknown', label: 'Nie wiem' },
                  ]}
                />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Data urodzenia" optional type="date" max={new Date().toISOString().slice(0, 10)} {...bind('birthDate')} />
                  <TextField label="Waga (kg)" optional inputMode="decimal" placeholder="np. 4,5" {...bind('weightKg')} />
                </div>
                <TextField
                  label="Znaki szczególne"
                  optional
                  multiline
                  maxLength={400}
                  placeholder="Kolor sierści, łatki, obroża, charakter…"
                  hint="Znalazca zobaczy ten opis – pomoże mu rozpoznać zwierzę."
                  {...bind('description')}
                />
              </>
            )}

            {current.id === 'zdjecie' && <PhotoStep pet={previewPet} photo={photo} setPhoto={setPhoto} />}

            {current.id === 'zdrowie' && (
              <>
                <TextField
                  label="Alergie"
                  optional
                  multiline
                  rows={2}
                  placeholder="np. kurczak"
                  hint="Ważne dla znalazcy, który chciałby dać coś do jedzenia."
                  {...bind('allergies')}
                />
                <TextField label="Leki" optional multiline rows={2} placeholder="Nazwa, dawka, pora" {...bind('medications')} />
                <TextField label="Choroby" optional multiline rows={2} {...bind('conditions')} />
                <TextField label="Szczepienia" optional multiline rows={2} placeholder="np. wścieklizna – marzec 2026" {...bind('vaccinations')} />
                <TextField label="Numer chipa" optional inputMode="numeric" placeholder="15 cyfr" hint="Widzi go tylko weterynarz z Twoim kodem QR." {...bind('chipNumber')} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Przychodnia" optional placeholder="Nazwa i adres" {...bind('vetClinic')} />
                  <TextField label="Telefon przychodni" optional type="tel" inputMode="tel" {...bind('vetPhone')} />
                </div>
              </>
            )}

            {current.id === 'kontakt' && (
              <>
                <TextField label="Imię opiekuna" optional autoComplete="name" placeholder="np. Ola" hint="Znalazca zobaczy tylko imię." {...bind('contactName')} />
                <TextField
                  label="Telefon"
                  optional
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+48 600 100 200"
                  hint="Domyślnie ukryty. Pokażesz go znalazcom tylko w trybie zaginięcia, jeśli zechcesz."
                  {...bind('contactPhone')}
                />
                <div className="flex gap-3 rounded-3xl bg-pet-soft p-4 text-sm">
                  <Icon name="shield" className="text-pet-text" />
                  <p>
                    Znalazca kontaktuje się przez <strong>anonimową wiadomość</strong> w aplikacji. Ty widzisz ją w dzienniku, a on nie widzi Twoich danych.
                  </p>
                </div>
              </>
            )}

            {current.id === 'kolor' && <ColorStep form={form} setColor={set('color')} pet={previewPet} />}
          </div>

          {formError && (
            <p role="alert" className="mt-5 rounded-2xl bg-alert-soft p-3 text-sm font-medium text-alert-text">
              {formError}
            </p>
          )}
        </section>

        {isEdit && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-alert-text underline-offset-4 hover:underline">
              Usuń profil zwierzęcia
            </button>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/90 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl gap-3 px-4 pt-3">
            {step > 0 && (
              <Button variant="secondary" size="lg" icon="back" onClick={() => goTo(step - 1)}>
                <span className="sr-only sm:not-sr-only">Wstecz</span>
              </Button>
            )}
            {isEdit && !isLast ? (
              <>
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => goTo(step + 1)} iconRight="forward">
                  Dalej
                </Button>
                <Button variant="pet" size="lg" className="flex-1" loading={saving} onClick={save} icon="check">
                  Zapisz
                </Button>
              </>
            ) : (
              <Button type="submit" variant="pet" size="lg" className="flex-1" loading={saving} iconRight={isLast ? 'check' : 'forward'}>
                {isLast ? (isEdit ? 'Zapisz zmiany' : `Gotowe – dodaj ${form.name || 'pupila'}`) : current.id === 'zdjecie' && !photo.preview ? 'Pomiń' : 'Dalej'}
              </Button>
            )}
          </div>
        </div>
      </form>

      {isEdit && (
        <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Usunąć ${existing.name}?`}>
          <p className="px-2 text-muted">
            Znikną profil, dziennik skanów i wiadomości. Tagi wrócą do puli wolnych – możesz je przypisać innemu zwierzęciu.
          </p>
          <div className="mt-5 grid gap-2">
            <Button variant="danger" size="lg" loading={saving} onClick={remove} icon="trash">
              Tak, usuń profil
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setConfirmDelete(false)}>
              Anuluj
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function SpeciesArt({ species }) {
  return (
    <span className="block size-14 overflow-hidden rounded-[38%]">
      <PetArt species={species} className="size-full" />
    </span>
  )
}

function PhotoStep({ pet, photo, setPhoto }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const blob = await resizeImage(file)
      setPhoto({ blob, preview: URL.createObjectURL(blob), removed: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative rounded-[38%] transition-transform active:scale-95"
        aria-label={photo.preview ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
      >
        <PetAvatar key={photo.preview ?? 'art'} pet={pet} size={200} className="animate-pop shadow-lift" />
        <span className="absolute right-1 bottom-1 grid size-14 place-items-center rounded-full bg-ink text-bg shadow-lift ring-4 ring-surface transition-transform group-hover:scale-110">
          <Icon name="camera" size={26} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={onFile} tabIndex={-1} aria-hidden="true" />
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="soft" icon="image" loading={busy} onClick={() => inputRef.current?.click()}>
          {photo.preview ? 'Wybierz inne' : 'Zrób lub wybierz zdjęcie'}
        </Button>
        {photo.preview && (
          <Button variant="ghost" icon="trash" onClick={() => setPhoto({ blob: null, preview: null, removed: true })}>
            Usuń
          </Button>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-alert-text">{error}</p>}
      <p className="mt-4 max-w-sm text-sm text-muted">
        Najlepiej całe zwierzę, w dziennym świetle. Zmniejszymy zdjęcie przed wysłaniem. Bez zdjęcia pokażemy rysunek w wybranym kolorze.
      </p>
    </div>
  )
}

function ColorStep({ form, setColor, pet }) {
  const age = ageLabel(ageFromBirthDate(form.birthDate))
  return (
    <>
      <Field label="Wybierz kolor">
        {(a11y) => (
          <div role="radiogroup" aria-describedby={a11y['aria-describedby']} className="grid grid-cols-4 gap-3">
            {PET_COLORS.map((c) => {
              const selected = c.id === form.color
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setColor(c.id)}
                  className={`${petClass(c.id)} flex flex-col items-center gap-1.5 rounded-3xl p-2 transition-all ${selected ? 'bg-pet-soft' : 'hover:bg-raised'}`}
                >
                  <span
                    className={`grid size-14 place-items-center rounded-[38%] bg-pet text-on-pet transition-transform duration-300 ease-spring ${selected ? 'scale-110 shadow-lift' : ''}`}
                  >
                    {selected && <Icon name="check" size={26} strokeWidth={3} className="animate-pop" />}
                  </span>
                  <span className={`text-xs font-semibold ${selected ? 'text-ink' : 'text-muted'}`}>{c.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold">Podgląd</p>
        <div className="relative overflow-hidden rounded-4xl bg-pet p-5 text-on-pet transition-colors duration-300">
          <span aria-hidden="true" className="absolute -top-12 -right-8 size-36 rounded-full bg-white/20" />
          <div className="relative flex items-center gap-4">
            <PetAvatar pet={pet} size={84} className="ring-4 ring-white/70" />
            <div className="min-w-0">
              <p className="truncate font-display text-3xl font-extrabold">{pet.name}</p>
              <p className="truncate font-medium opacity-85">{[speciesLabel(form.species, form.sex), form.breed, age].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

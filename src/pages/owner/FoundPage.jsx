import { useState } from 'react'
import { useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import { HomeArt } from '../../components/illustrations/Scenes.jsx'
import SubHeader from '../../components/layout/SubHeader.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button from '../../components/ui/Button.jsx'
import { Confetti } from '../../components/ui/Celebrate.jsx'
import { ErrorState } from '../../components/ui/Controls.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { usePets } from '../../context/contexts.js'
import { useResource } from '../../hooks/useResource.js'
import { byGender, countLabel, durationLabel } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  Zakończenie zaginięcia: ekran potwierdzenia („Czy jest już bezpieczny?”), a po kliknięciu
  „Znaleziony!” – świętowanie z konfetti i krótkie podsumowanie poszukiwań.
*/
export default function FoundPage() {
  const { petId } = useParams()
  const { reload: reloadPets } = usePets()
  const { data, error, loading, reload } = useResource(() => petsApi.get(petId), [petId])
  const [summary, setSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <PageSpinner />
  const pet = data.pet

  const confirm = async () => {
    setSaving(true)
    setSubmitError(null)
    try {
      const result = await petsApi.found(pet.id)
      setSummary(result.summary)
      reloadPets()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (summary) {
    return (
      <div className={`${petClass(pet.color)} relative -mx-4 -mt-2 min-h-[80dvh] overflow-hidden px-4 pt-10 text-center`}>
        <Confetti />
        <div className="relative mx-auto max-w-md">
          <div className="relative mx-auto w-fit animate-pop">
            <PetAvatar pet={pet} size={148} rounded="rounded-[36%]" className="shadow-lift ring-8 ring-pet" />
          </div>
          <h1 className="mt-6 animate-rise text-4xl font-extrabold">Witaj w domu, {pet.name}!</h1>
          <p className="mt-2 animate-rise text-lg text-muted" style={{ animationDelay: '100ms' }}>
            Zgłoszenie zakończone. Znalazcy zobaczą już zwykły profil, bez komunikatu o zaginięciu.
          </p>
          <dl className="mt-8 grid animate-rise grid-cols-3 gap-3" style={{ animationDelay: '200ms' }}>
            {[
              ['Poszukiwania', durationLabel(summary.lostSince, summary.foundAt)],
              ['Skany', countLabel(summary.scans, 'skan', 'skany', 'skanów')],
              ['Wiadomości', String(summary.messages)],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
                <dd className="mt-1 font-display text-lg leading-tight font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 animate-rise text-sm text-muted" style={{ animationDelay: '260ms' }}>
            Tag działa dalej – nic nie musisz zmieniać. Historię znajdziesz w dzienniku.
          </p>
          <div className="mt-6 grid animate-rise gap-3" style={{ animationDelay: '300ms' }}>
            <Button to={`/app/p/${pet.id}`} size="lg" variant="pet" icon="home">
              Wróć do profilu
            </Button>
            <Button to={`/app/p/${pet.id}/zdarzenia`} size="lg" variant="ghost" icon="route">
              Zobacz trasę poszukiwań
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={petClass(pet.color)}>
      <SubHeader back={`/app/p/${pet.id}`} title="Znaleziony?" pet={pet} />
      {!pet.isLost ? (
        <div className="card animate-rise text-center">
          <p className="text-lg">
            {pet.name} nie jest {byGender(pet, 'zgłoszony', 'zgłoszona')} jako {byGender(pet, 'zaginiony', 'zaginiona')}. Wszystko w porządku!
          </p>
          <Button to={`/app/p/${pet.id}`} className="mt-4" variant="pet">
            Wróć do profilu
          </Button>
        </div>
      ) : (
        <section className="card flex animate-rise flex-col items-center p-6 text-center sm:p-8">
          <HomeArt className="w-64 max-w-full" />
          <h1 className="mt-2 text-3xl font-bold">
            Czy {pet.name} jest już {byGender(pet, 'bezpieczny', 'bezpieczna')}?
          </h1>
          <p className="mt-2 max-w-sm text-muted">
            Zakończymy zgłoszenie. Znalazcy przestaną widzieć komunikat o zaginięciu i Twój numer telefonu.
          </p>
          {submitError && <p className="mt-4 text-sm font-medium text-alert-text">{submitError}</p>}
          <Button size="xl" className="mt-6 w-full max-w-xs" onClick={confirm} loading={saving} icon="heart">
            Znaleziony!
          </Button>
          <Button variant="ghost" to={`/app/p/${pet.id}`} className="mt-2">
            Jeszcze nie
          </Button>
        </section>
      )}
    </div>
  )
}

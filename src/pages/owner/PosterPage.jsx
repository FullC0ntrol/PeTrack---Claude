import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import PetArt from '../../components/illustrations/PetArt.jsx'
import Button, { IconButton } from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/Controls.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { useResource } from '../../hooks/useResource.js'
import { ageFromBirthDate, ageLabel, formatDateTime, speciesLabel } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'
import { qrDataUrl, tagUrl } from '../../lib/qr.js'

function headline(pet) {
  if (pet.sex === 'female') return 'Zaginęła'
  if (pet.sex === 'male') return 'Zaginął'
  return 'Zaginione zwierzę'
}

/*
  Plakat „Zaginął” do druku (A4). Osobny widok bez panelu aplikacji: na ekranie widać kartkę
  i pasek z przyciskiem „Drukuj”, w druku – tylko kartkę (style print:* i @page w index.css).
  Kod QR prowadzi do strony tagu z ?src=plakat – w dzienniku taki skan jest oznaczony jako „plakat”.
*/
export default function PosterPage() {
  const { petId } = useParams()
  const { data, error, loading, reload } = useResource(() => petsApi.get(petId), [petId])
  const [qr, setQr] = useState(null)
  const pet = data?.pet
  const code = pet?.tags[0]?.code

  useEffect(() => {
    if (!code) return
    let active = true
    qrDataUrl(tagUrl(code, '?src=plakat'), { margin: 0 }).then((url) => active && setQr(url))
    return () => {
      active = false
    }
  }, [code])

  useEffect(() => {
    if (pet) document.title = `Plakat – ${pet.name}`
    return () => {
      document.title = 'PeTrace'
    }
  }, [pet])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !pet) return <PageSpinner />

  const report = pet.lostReport
  const age = ageLabel(ageFromBirthDate(pet.birthDate))
  const facts = [speciesLabel(pet.species, pet.sex), pet.breed, age, pet.weightKg ? `${String(pet.weightKg).replace('.', ',')} kg` : ''].filter(Boolean)

  return (
    <div className={`${petClass(pet.color)} min-h-dvh bg-raised print:bg-white`}>
      <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <IconButton to={`/app/p/${pet.id}`} icon="back" label="Wróć do profilu" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">Plakat: {pet.name}</h1>
            <p className="truncate text-sm text-muted">A4, pionowo. W oknie drukowania wyłącz „nagłówki i stopki”.</p>
          </div>
          <Button icon="print" onClick={() => window.print()}>
            Drukuj
          </Button>
        </div>
        {(!report || !code) && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <p className="flex gap-2 rounded-2xl bg-alert-soft p-3 text-sm text-alert-text">
              <Icon name="info" size={18} />
              {!report ? `${pet.name} nie ma aktywnego zgłoszenia – plakat pokazuje sam profil.` : 'Brak tagu – plakat nie ma kodu QR. Przypisz tag, aby go dodać.'}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-6 print:p-0">
        {/* Kartka A4: 210 × 297 mm. Rozmiary w em, a font w jednostkach kontenera (cqw) –
            na telefonie kartka skaluje się w całości, w druku 1,52cqw = 3,2 mm. */}
        <div className="@container mx-auto w-full max-w-[210mm] print:w-[210mm] print:max-w-none">
        <article
          className="flex aspect-[210/297] w-full flex-col overflow-hidden bg-white text-[#18171C] shadow-lift print:aspect-auto print:h-[297mm] print:shadow-none"
          style={{ fontSize: '1.52cqw' }}
        >
          <header className="bg-alert px-[7%] py-[4%] text-white">
            <p className="font-display text-[3.2em] leading-none font-extrabold tracking-tight uppercase">{headline(pet)}</p>
            <p className="mt-[1%] text-[1.5em] font-semibold">Pomóż mi wrócić do domu!</p>
          </header>

          <div className="relative mx-[7%] mt-[5%] aspect-[4/3] overflow-hidden rounded-[2.5em] bg-pet">
            {pet.photoUrl ? (
              <img src={pet.photoUrl} alt={pet.name} className="size-full object-cover" />
            ) : (
              <PetArt species={pet.species} className="size-full" />
            )}
          </div>

          <div className="mx-[7%] mt-[4%] flex-1">
            <p className="font-display text-[4.6em] leading-none font-extrabold">{pet.name}</p>
            <p className="mt-[1.5%] text-[1.5em] font-semibold text-[#67646A]">{facts.join(' · ')}</p>
            {pet.description && <p className="mt-[2.5%] text-[1.45em] leading-snug">{pet.description}</p>}
            {report && (
              <p className="mt-[2.5%] text-[1.45em] leading-snug">
                <strong>{pet.sex === 'female' ? 'Ostatnio widziana' : 'Ostatnio widziany'}:</strong> {report.lastSeenPlace || 'okolica zaznaczona na mapie'}, {formatDateTime(report.lastSeenAt)}
              </p>
            )}
            {report?.message && <p className="mt-[2.5%] rounded-[1.2em] bg-[#FFE4E9] px-[3%] py-[2%] text-[1.4em] leading-snug">„{report.message}”</p>}
          </div>

          <footer className="mx-[7%] mt-[3%] mb-[6%] flex items-center gap-[5%] rounded-[2em] bg-[#F5F5F3] p-[4%]">
            {qr && <img src={qr} alt={`Kod QR do strony ${pet.name}`} className="w-[30%] shrink-0" />}
            <div>
              <p className="font-display text-[1.9em] leading-tight font-bold">
                {qr ? 'Widzisz mnie? Zeskanuj kod' : 'Widzisz mnie? Daj znać!'}
              </p>
              <p className="mt-[3%] text-[1.3em] leading-snug text-[#3a383f]">
                {qr ? 'Otworzy się moja strona – wyślesz opiekunowi miejsce i wiadomość. Bez instalowania aplikacji.' : 'Zadzwoń do mojego opiekuna.'}
              </p>
              {report?.showPhone && report.phone && (
                <p className="mt-[3%] inline-flex items-center gap-[0.4em] font-display text-[2.1em] font-extrabold">
                  <Icon name="phone" size={24} /> {report.phone}
                </p>
              )}
            </div>
          </footer>
        </article>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import SubHeader from '../../components/layout/SubHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import { ChoiceCards, ErrorState } from '../../components/ui/Controls.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { usePets, useToast } from '../../context/contexts.js'
import { formatCountdown, useCountdown } from '../../hooks/useCountdown.js'
import { useResource } from '../../hooks/useResource.js'
import { formatDateTime, genitive } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'
import { qrDataUrl, vetUrl } from '../../lib/qr.js'
import { local } from '../../lib/storage.js'

const DURATIONS = [
  { value: '1h', label: '1 godzina', description: 'wizyta', ms: 3_600_000 },
  { value: '24h', label: '24 godziny', description: 'zabieg', ms: 86_400_000 },
  { value: '7d', label: '7 dni', description: 'leczenie', ms: 7 * 86_400_000 },
]

// Token jest tylko na tym urządzeniu (serwer zna jego skrót). Bez niego da się kod unieważnić, ale nie pokazać.
const storageKey = (petId) => `petrace-vet-${petId}`

/*
  Udostępnienie weterynarzowi: wybór czasu → duży kod QR na ekranie telefonu z odliczaniem
  i przyciskiem natychmiastowego unieważnienia. Weterynarz skanuje kod swoim telefonem
  i widzi kartę zdrowia (tylko do odczytu) do końca odliczania.
*/
export default function VetSharePage() {
  const { petId } = useParams()
  const { pets } = usePets()
  const pet = pets.find((p) => p.id === petId)
  const { data, error, loading, reload, setData } = useResource(() => petsApi.vetShares(petId), [petId])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <PageSpinner />

  const active = data.shares[0] ?? null
  const stored = local.get(storageKey(petId))
  const token = active && stored?.id === active.id ? stored.token : null

  return (
    <div className={petClass(pet?.color)}>
      <SubHeader back={`/app/p/${petId}`} title="Dla weterynarza" subtitle={pet ? `Karta zdrowia ${genitive(pet.name)}` : undefined} pet={pet} />
      {active ? (
        <ActiveShare
          key={active.id}
          share={active}
          token={token}
          petName={pet?.name ?? ''}
          onEnded={() => {
            local.remove(storageKey(petId))
            setData({ shares: [] })
          }}
        />
      ) : (
        <CreateShare
          petId={petId}
          petName={pet?.name ?? ''}
          onCreated={(share) => {
            local.set(storageKey(petId), { id: share.id, token: share.token })
            setData({ shares: [share] })
          }}
        />
      )}
    </div>
  )
}

function CreateShare({ petId, petName, onCreated }) {
  const [duration, setDuration] = useState('1h')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const create = async () => {
    setSaving(true)
    setError(null)
    try {
      const { share } = await petsApi.createVetShare(petId, duration)
      onCreated(share)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <section className="card animate-rise p-5 sm:p-7">
      <div className="flex gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pet text-on-pet">
          <Icon name="qr" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Pokaż kod w gabinecie</h2>
          <p className="mt-1 text-muted">
            Weterynarz zeskanuje go telefonem i zobaczy kartę zdrowia {genitive(petName)}: alergie, leki, szczepienia, chip i Twój kontakt. Bez
            możliwości edycji.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <ChoiceCards legend="Na jak długo?" name="duration" value={duration} onChange={setDuration} options={DURATIONS} size="lg" />
      </div>
      {error && <p className="mt-4 text-sm font-medium text-alert-text">{error}</p>}
      <Button variant="pet" size="lg" full className="mt-6" icon="qr" loading={saving} onClick={create}>
        Pokaż kod QR
      </Button>
      <p className="mt-4 flex gap-2 text-sm text-muted">
        <Icon name="shield" size={18} />
        Dostęp wygaśnie sam. Możesz go też unieważnić w każdej chwili.
      </p>
    </section>
  )
}

function ActiveShare({ share, token, petName, onEnded }) {
  const toast = useToast()
  const remaining = useCountdown(share.expiresAt)
  const [qr, setQr] = useState(null)
  const [revoking, setRevoking] = useState(false)
  const total = (DURATIONS.find((d) => d.value === share.duration)?.ms ?? 3_600_000)
  const progress = Math.max(0, Math.min(1, remaining / total))
  const expired = remaining <= 0

  useEffect(() => {
    if (!token) return
    let active = true
    qrDataUrl(vetUrl(token), { margin: 1 }).then((url) => active && setQr(url))
    return () => {
      active = false
    }
  }, [token])

  const revoke = async () => {
    setRevoking(true)
    try {
      await petsApi.revokeVetShare(share.id)
      toast.show('Dostęp unieważniony')
      onEnded()
    } catch (err) {
      toast.show(err.message, { tone: 'error' })
      setRevoking(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(vetUrl(token))
      toast.show('Skopiowano link')
    } catch {
      toast.show('Nie udało się skopiować', { tone: 'error' })
    }
  }

  if (expired) {
    return (
      <section className="card animate-rise text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-raised text-muted">
          <Icon name="timer" size={28} />
        </span>
        <h2 className="mt-4 text-xl font-bold">Kod wygasł</h2>
        <p className="mt-1 text-muted">Weterynarz nie ma już dostępu do karty zdrowia.</p>
        <Button variant="pet" className="mt-5" onClick={onEnded} icon="refresh">
          Utwórz nowy kod
        </Button>
      </section>
    )
  }

  return (
    <section className="animate-rise">
      <div className="card flex flex-col items-center p-5 sm:p-8">
        {token ? (
          <div className="relative w-full max-w-[340px]">
            {/* Pierścień postępu wokół kodu – kurczy się razem z czasem ważności. */}
            <div
              className="rounded-[2.5rem] p-1.5 transition-[background] duration-1000"
              style={{ background: `conic-gradient(var(--pet) ${progress * 360}deg, var(--c-line) 0deg)` }}
            >
              <div className="rounded-[2.2rem] bg-white p-5">
                {qr ? (
                  <img src={qr} alt={`Kod QR karty zdrowia ${genitive(petName)}`} className="aspect-square w-full animate-pop" />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-2xl bg-[#F0EFEE]" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-3xl bg-raised p-6 text-center">
            <Icon name="qr" size={40} className="text-muted" />
            <p className="mt-3 font-semibold">Kod utworzono na innym urządzeniu</p>
            <p className="mt-1 text-sm text-muted">Ze względów bezpieczeństwa pokazujemy go tylko tam. Unieważnij i utwórz nowy, jeśli trzeba.</p>
          </div>
        )}

        <p className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Ważny jeszcze</p>
        <p className="font-display text-5xl font-extrabold tabular-nums" aria-live="off">
          {formatCountdown(remaining)}
        </p>
        <p className="mt-1 text-sm text-muted">do {formatDateTime(share.expiresAt)}</p>
        {share.openCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok-text">
            <Icon name="eye" size={16} /> Otwarto {share.openCount}× · ostatnio {formatDateTime(share.lastOpenedAt)}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button variant="danger" size="lg" icon="ban" loading={revoking} onClick={revoke}>
          Unieważnij teraz
        </Button>
        {token && (
          <Button variant="secondary" size="lg" icon="copy" onClick={copy}>
            Kopiuj link
          </Button>
        )}
      </div>
      <p className="mt-4 flex gap-2 text-sm text-muted">
        <Icon name="info" size={18} />
        Podkręć jasność ekranu – kod skanuje się wtedy szybciej.
      </p>
    </section>
  )
}

import { useState } from 'react'
import { useParams } from 'react-router'
import { petsApi, tagsApi } from '../../api/endpoints.js'
import { EmptyTagsArt } from '../../components/illustrations/Scenes.jsx'
import NfcClaimSheet from '../../components/pets/NfcClaimSheet.jsx'
import SubHeader from '../../components/layout/SubHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import { ErrorState } from '../../components/ui/Controls.jsx'
import Field from '../../components/ui/Field.jsx'
import Icon from '../../components/ui/Icon.jsx'
import Sheet from '../../components/ui/Sheet.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { usePets, useToast } from '../../context/contexts.js'
import { useResource } from '../../hooks/useResource.js'
import { formatDate, formatTagInput, genitive, relativeTime } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  Tagi zwierzęcia. Główna ścieżka to zeskanowanie nowego tagu telefonem (ekran „Przypisz ten tag”),
  a tutaj – lista przypisanych tagów, odpinanie i ręczne wpisanie kodu.
*/
export default function TagsPage() {
  const { petId } = useParams()
  const { reload: reloadPets } = usePets()
  const toast = useToast()
  const { data, error, loading, reload } = useResource(() => petsApi.get(petId), [petId])
  const [code, setCode] = useState('')
  const [claimError, setClaimError] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [justAdded, setJustAdded] = useState(null)
  const [toRemove, setToRemove] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [nfcWriting, setNfcWriting] = useState(null)
  const [nfcOpen, setNfcOpen] = useState(false)

  const writeNfc = async (code) => {
    if (!('NDEFReader' in window)) {
      toast.show('Web NFC działa tylko w Chrome na Androidzie', { tone: 'error' })
      return
    }
    setNfcWriting(code)
    try {
      const ndef = new window.NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: `${window.location.origin}/t/${code}` }] })
      toast.show(`Tag ${code} zakodowany ✓`)
    } catch (err) {
      if (err.name !== 'AbortError') toast.show(err.message || 'Błąd zapisu NFC', { tone: 'error' })
    } finally {
      setNfcWriting(null)
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <PageSpinner />
  const pet = data.pet

  const claim = async (event) => {
    event.preventDefault()
    setClaimError(null)
    setClaiming(true)
    try {
      const result = await tagsApi.claim(code, pet.id)
      setJustAdded(result.tag.code)
      setCode('')
      toast.show(`Tag ${result.tag.code} przypisany`)
      await Promise.all([reload({ silent: true }), reloadPets()])
    } catch (err) {
      setClaimError(err.message)
    } finally {
      setClaiming(false)
    }
  }

  const unassign = async () => {
    setRemoving(true)
    try {
      await tagsApi.unassign(toRemove)
      toast.show('Tag odpięty')
      setToRemove(null)
      await Promise.all([reload({ silent: true }), reloadPets()])
    } catch (err) {
      toast.show(err.message, { tone: 'error' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={petClass(pet.color)}>
      <SubHeader back={`/app/p/${pet.id}`} title="Tagi" subtitle={`Zawieszki ${genitive(pet.name)}`} pet={pet} />

      {pet.tags.length === 0 ? (
        <section className="flex animate-rise flex-col items-center text-center">
          <EmptyTagsArt className="w-64 max-w-full" />
          <h2 className="mt-2 text-2xl font-bold">{pet.name} nie ma jeszcze tagu</h2>
          <p className="mt-1 max-w-sm text-muted">Najprościej: przyłóż telefon do nowego tagu NFC albo zeskanuj jego kod QR – zapytamy, do kogo go przypisać.</p>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pet.tags.map((tag, i) => (
            <li
              key={tag.code}
              className={`relative animate-rise overflow-hidden rounded-4xl bg-pet p-5 text-on-pet shadow-soft ${justAdded === tag.code ? 'ring-4 ring-accent' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span aria-hidden="true" className="absolute top-4 right-4 size-5 rounded-full bg-bg ring-4 ring-white/50" />
              <p className="text-sm font-semibold opacity-80">Kod tagu</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-wider">{tag.code}</p>
              <p className="mt-3 text-sm opacity-85">
                Przypisany {formatDate(tag.assignedAt)} · {tag.lastScanAt ? `ostatni skan ${relativeTime(tag.lastScanAt)}` : 'jeszcze nieskanowany'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button to={`/t/${tag.code}?podglad=1`} variant="dark" size="sm" icon="eye">
                  Oczami znalazcy
                </Button>
                <Button variant="ghost" size="sm" icon="nfc" className="bg-white/40 hover:bg-white/60" loading={nfcWriting === tag.code} onClick={() => writeNfc(tag.code)}>
                  {nfcWriting === tag.code ? 'Przyłóż tag…' : 'Zapisz NFC'}
                </Button>
                <Button variant="ghost" size="sm" icon="ban" className="bg-white/40 hover:bg-white/60" onClick={() => setToRemove(tag.code)}>
                  Odepnij
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="pet" size="xl" full icon="nfc" className="mt-5 animate-rise" style={{ animationDelay: '90ms' }} onClick={() => setNfcOpen(true)}>
        Przyłóż nowy tag
      </Button>

      <form onSubmit={claim} className="card mt-5 animate-rise" style={{ animationDelay: '120ms' }} noValidate>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="tag" className="text-pet-text" /> Wpisz kod z zawieszki
        </h2>
        <p className="mt-1 text-sm text-muted">8 znaków na odwrocie tagu, np. PETS-2345. Wielkość liter nie ma znaczenia.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field label="Kod tagu" error={claimError} className="flex-1">
            {(a11y) => (
              <input
                {...a11y}
                className="field font-mono text-xl tracking-[0.2em] uppercase"
                placeholder="XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                onChange={(event) => {
                  setCode(formatTagInput(event.target.value))
                  setClaimError(null)
                }}
              />
            )}
          </Field>
          <Button type="submit" variant="pet" size="lg" loading={claiming} disabled={code.replace('-', '').length !== 8} className="sm:mt-7" icon="plus">
            Przypisz
          </Button>
        </div>
      </form>

      <div className="mt-4 flex animate-rise gap-3 rounded-4xl bg-pet-soft p-5 text-sm" style={{ animationDelay: '180ms' }}>
        <Icon name="nfc" className="text-pet-text" />
        <p>
          <strong>Nie masz NFC?</strong> Zeskanuj kod QR z zawieszki zwykłym aparatem – jeśli jesteś zalogowany, od razu zobaczysz ekran „Przypisz ten tag do
          zwierzęcia”.
        </p>
      </div>

      <NfcClaimSheet
        open={nfcOpen}
        onClose={() => setNfcOpen(false)}
        pet={pet}
        onClaimed={(tagCode) => {
          setJustAdded(tagCode)
          return Promise.all([reload({ silent: true }), reloadPets()])
        }}
      />

      <Sheet open={Boolean(toRemove)} onClose={() => setToRemove(null)} title={`Odpiąć tag ${toRemove ?? ''}?`}>
        <p className="px-2 text-muted">
          Po zeskanowaniu znalazca zobaczy, że tag jest wolny. Historia skanów zostaje w dzienniku. Tag możesz przypisać ponownie, wpisując jego kod.
        </p>
        <div className="mt-5 grid gap-2">
          <Button variant="danger" size="lg" loading={removing} onClick={unassign} icon="ban">
            Odepnij tag
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setToRemove(null)}>
            Anuluj
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

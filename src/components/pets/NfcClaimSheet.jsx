import { useCallback, useEffect, useRef, useState } from 'react'
import { tagsApi } from '../../api/endpoints.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Icon from '../ui/Icon.jsx'
import Sheet from '../ui/Sheet.jsx'
import { formatTagInput, genitive } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  „Przyłóż tag” – arkusz otwierany przyciskiem „Przypisz”. Od razu włącza czytnik Web NFC
  (klik dał przeglądarce zgodę na pytanie o uprawnienie) i czeka na tag:
    • tag z adresem …/t/KOD albo samym kodem → od razu przypisujemy go do zwierzęcia,
    • tag pusty lub z obcym adresem → prosimy o kod z zawieszki, zapisujemy go na tagu i przypisujemy.
  Gdy NFC nie działa (iPhone, inna przeglądarka, brak zgody, wyłączone NFC) – mówimy dlaczego,
  a pod spodem zawsze jest ręczne wpisanie kodu.
*/
const isFullCode = (code) => code.replace('-', '').length === 8

function codeFromRecords(records) {
  for (const record of records) {
    if (!record.data) continue
    const text = new TextDecoder(record.encoding || 'utf-8').decode(record.data)
    if (record.recordType === 'url' || record.recordType === 'absolute-url') {
      const match = text.match(/\/t\/([^/?#]+)/)
      const code = match && formatTagInput(decodeURIComponent(match[1]))
      if (code && isFullCode(code)) return { code }
      return { foreign: text }
    }
    if (record.recordType === 'text') {
      const code = formatTagInput(text)
      if (isFullCode(code) && text.replace(/[^0-9A-Za-z]/g, '').length === 8) return { code }
      return { foreign: text }
    }
  }
  return {}
}

function nfcProblem(err) {
  if (!('NDEFReader' in window)) {
    if (!window.isSecureContext) return 'NFC działa tylko na stronie otwartej przez https://.'
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return 'iPhone nie pozwala stronom używać NFC. Zeskanuj kod QR aparatem albo wpisz kod poniżej.'
    return 'Ta przeglądarka nie obsługuje NFC. Otwórz stronę w Chrome na Androidzie – Samsung Internet, Firefox i Opera tego nie potrafią.'
  }
  if (err?.name === 'NotAllowedError')
    return 'Brak zgody na NFC. Stuknij kłódkę obok adresu strony → Uprawnienia → Urządzenia NFC → Zezwól, a potem „Spróbuj ponownie”.'
  if (err?.name === 'NotReadableError') return 'NFC w telefonie jest wyłączone. Włącz je w Ustawieniach (Połączenia → NFC) i stuknij „Spróbuj ponownie”.'
  if (err?.name === 'NotSupportedError') return 'Ten telefon nie ma czytnika NFC. Wpisz kod z zawieszki poniżej.'
  return err?.message || 'Nie udało się włączyć NFC.'
}

export default function NfcClaimSheet({ open, onClose, pet, onClaimed }) {
  // Sheet nie renderuje dzieci, gdy jest zamknięty – każde otwarcie zaczyna od czystego stanu.
  return (
    <Sheet open={open} onClose={onClose} title={`Nowy tag dla: ${pet.name}`}>
      <NfcClaim onClose={onClose} pet={pet} onClaimed={onClaimed} />
    </Sheet>
  )
}

function NfcClaim({ onClose, pet, onClaimed }) {
  // waiting → (claiming | blank → writing) → done; problem = NFC niedostępne
  const [phase, setPhase] = useState('waiting')
  const [problem, setProblem] = useState(() => ('NDEFReader' in window ? null : nfcProblem()))
  const [message, setMessage] = useState(null)
  const [foreign, setForeign] = useState(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [claimed, setClaimed] = useState(null)
  const controllerRef = useRef(null)
  const busyRef = useRef(false)
  // Rodzic zwykle podaje funkcję inline – w ref, żeby skanowanie nie restartowało się co render.
  const onClaimedRef = useRef(onClaimed)
  useEffect(() => {
    onClaimedRef.current = onClaimed
  })

  const stopScan = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }

  const claim = useCallback(
    async (tagCode) => {
      busyRef.current = true
      setPhase('claiming')
      setMessage(null)
      try {
        const result = await tagsApi.claim(tagCode, pet.id)
        stopScan()
        setClaimed(result.tag.code)
        setPhase('done')
        onClaimedRef.current?.(result.tag.code)
      } catch (err) {
        setMessage(err.message)
        setPhase('waiting')
      } finally {
        busyRef.current = false
      }
    },
    [pet.id],
  )

  // Czytnik działa, dopóki arkusz jest otwarty; każdy przyłożony tag trafia do onreading.
  const listen = useCallback(() => {
    stopScan()
    if (!('NDEFReader' in window)) return
    const controller = new AbortController()
    controllerRef.current = controller
    const reader = new window.NDEFReader()
    reader.onreading = (event) => {
      if (busyRef.current) return
      const found = codeFromRecords(event.message.records)
      if (found.code) return claim(found.code)
      setForeign(found.foreign ?? null)
      setPhase('blank')
    }
    reader.onreadingerror = () => {
      if (!busyRef.current) setMessage('Nie udało się odczytać tagu. Przytrzymaj go dłużej przy środku pleców telefonu.')
    }
    reader.scan({ signal: controller.signal }).catch((err) => {
      if (err.name !== 'AbortError') setProblem(nfcProblem(err))
    })
  }, [claim])

  useEffect(() => {
    listen()
    return stopScan
  }, [listen])

  // „Spróbuj ponownie” / „Przyłóż inny tag” – klik daje przeglądarce zgodę na ponowne pytanie o NFC.
  const startScan = () => {
    setProblem(null)
    setMessage(null)
    setForeign(null)
    setPhase('waiting')
    listen()
  }

  // Pusty tag: zapisujemy na nim adres z kodem z zawieszki, potem przypisujemy.
  const writeAndClaim = async (event) => {
    event.preventDefault()
    if (!isFullCode(code)) return setCodeError('Kod ma 8 znaków, np. PETS-2345.')
    stopScan()
    busyRef.current = true
    setPhase('writing')
    setCodeError(null)
    try {
      await new window.NDEFReader().write(
        {
          records: [{ recordType: 'url', data: `${window.location.origin}/t/${code}` }],
        },
        { overwrite: true },
      )
      busyRef.current = false
      // Wznawiamy czytnik, żeby po ewentualnym błędzie przypisania dało się od razu przyłożyć inny tag.
      listen()
      await claim(code)
    } catch (err) {
      busyRef.current = false
      setCodeError(err.name === 'NotAllowedError' || err.name === 'NotReadableError' ? nfcProblem(err) : err.message || 'Błąd zapisu tagu.')
      setPhase('blank')
    }
  }

  const claimManually = (event) => {
    event.preventDefault()
    if (!isFullCode(code)) return setCodeError('Kod ma 8 znaków, np. PETS-2345.')
    setCodeError(null)
    claim(code)
  }

  const codeInput = (
    <Field label="Kod z zawieszki" error={codeError}>
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
            setCodeError(null)
          }}
        />
      )}
    </Field>
  )

  const close = () => {
    stopScan()
    onClose()
  }

  return (
    <div className={`${petClass(pet.color)} px-2`}>
      {phase === 'done' ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="grid size-24 animate-pop place-items-center rounded-full bg-pet text-on-pet">
            <Icon name="check" size={44} />
          </span>
          <p className="mt-4 text-xl font-bold">Tag {claimed} przypisany</p>
          <p className="mt-1 text-muted">Znalazca, który go zeskanuje, zobaczy profil {genitive(pet.name)}.</p>
          <Button variant="pet" size="lg" full className="mt-6" onClick={close}>
            Gotowe
          </Button>
        </div>
      ) : phase === 'blank' || phase === 'writing' ? (
        <form onSubmit={writeAndClaim} noValidate>
          <p className="text-muted">
            {foreign ? 'Na tym tagu jest inny zapis. Nadpiszemy go adresem PeTrace.' : 'Ten tag jest jeszcze pusty.'} Wpisz kod z odwrotu zawieszki – zapiszemy
            go na tagu i od razu przypiszemy.
          </p>
          <div className="mt-4">{codeInput}</div>
          {phase === 'writing' && (
            <p className="mt-3 flex items-center gap-2 font-semibold text-pet-text">
              <Icon name="nfc" /> Przyłóż tag jeszcze raz i przytrzymaj…
            </p>
          )}
          <div className="mt-5 grid gap-2">
            <Button type="submit" variant="pet" size="lg" icon="nfc" loading={phase === 'writing'}>
              Zapisz na tagu i przypisz
            </Button>
            <Button variant="ghost" size="lg" onClick={startScan} disabled={phase === 'writing'}>
              Przyłóż inny tag
            </Button>
          </div>
        </form>
      ) : (
        <>
          {problem ? (
            <div className="flex flex-col items-center py-2 text-center">
              <span className="grid size-20 place-items-center rounded-full bg-alert-soft text-alert-text">
                <Icon name="alert" size={36} />
              </span>
              <p className="mt-4 max-w-sm">{problem}</p>
              {'NDEFReader' in window && (
                <Button variant="pet" size="md" icon="refresh" className="mt-4" onClick={startScan}>
                  Spróbuj ponownie
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center" aria-live="polite">
              <span className="relative grid size-28 place-items-center">
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-pet/40" />
                <span className="absolute inset-0 animate-ping-soft rounded-full bg-pet/30 [animation-delay:0.9s]" />
                <span className="relative grid size-28 place-items-center rounded-full bg-pet text-on-pet shadow-soft">
                  <Icon name="nfc" size={48} />
                </span>
              </span>
              <p className="mt-6 text-xl font-bold">{phase === 'claiming' ? 'Przypisuję tag…' : 'Przyłóż tag do telefonu'}</p>
              <p className="mt-1 max-w-xs text-muted">Dotknij zawieszką środka pleców telefonu i przytrzymaj chwilę.</p>
              {message && <p className="mt-3 animate-fade font-medium text-alert-text">{message}</p>}
            </div>
          )}

          <details className="mt-4 rounded-3xl bg-raised p-4" open={Boolean(problem)}>
            <summary className="cursor-pointer font-semibold">Nie działa? Wpisz kod ręcznie</summary>
            <form onSubmit={claimManually} className="mt-3 grid gap-3" noValidate>
              {codeInput}
              <Button type="submit" variant="pet" size="lg" icon="plus" loading={phase === 'claiming'} disabled={!isFullCode(code)}>
                Przypisz kod
              </Button>
              {problem && message && <p className="animate-fade font-medium text-alert-text">{message}</p>}
              <p className="text-sm text-muted">Możesz też zeskanować kod QR z zawieszki zwykłym aparatem.</p>
            </form>
          </details>
        </>
      )}
    </div>
  )
}

import { byGender, formatTime, genitive, placeLabel, telHref } from '../../lib/format.js'
import { CONDITION_LABELS } from '../../lib/labels.js'
import Icon from '../ui/Icon.jsx'

const ICONS = { scan: 'nfc', message: 'message', lost: 'alert', found: 'heart', vet: 'medical' }

function title(item, pet) {
  switch (item.type) {
    case 'scan':
      return `Ktoś zeskanował ${item.source === 'poster' ? 'plakat' : 'tag'} ${genitive(pet.name)}`
    case 'message':
      return 'Wiadomość od znalazcy'
    case 'lost':
      return 'Zgłoszono zaginięcie'
    case 'found':
      return `${pet.name} ${byGender(pet, 'wrócił', 'wróciła')} do domu!`
    case 'vet':
      return `Weterynarz otworzył kartę zdrowia${item.openCount > 1 ? ` (${item.openCount}×)` : ''}`
    default:
      return 'Zdarzenie'
  }
}

function meta(item) {
  const time = formatTime(item.at)
  if (item.type === 'scan' || item.type === 'message') return `${time} · ${placeLabel(item)}`
  if (item.type === 'lost') return `${time}${item.place ? ` · ostatnio: ${item.place}` : ''}`
  return time
}

const looksLikePhone = (value) => /\+?\d[\d\s-]{7,}/.test(value)

/*
  Jeden wpis kanału zdarzeń. Nieprzeczytane mają akcentowe tło i kropkę.
  Wpis z lokalizacją jest przyciskiem – kliknięcie pokazuje miejsce na mapie.
*/
export default function EventItem({ item, pet, onSelect, active = false, compact = false }) {
  const hasPoint = item.lat !== null && item.lat !== undefined
  const clickable = Boolean(onSelect && hasPoint)
  const iconTone =
    item.type === 'lost'
      ? 'bg-alert text-white'
      : item.type === 'found'
        ? 'bg-ok-soft text-ok-text'
        : item.type === 'message'
          ? 'bg-ink text-bg'
          : 'bg-pet text-on-pet'

  const body = (
    <>
      <span className={`relative mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl ${iconTone}`}>
        <Icon name={item.type === 'scan' && item.source === 'poster' ? 'print' : ICONS[item.type]} size={20} />
        {item.unread && <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-accent ring-2 ring-surface" aria-label="nowe" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={`leading-snug ${item.unread ? 'font-bold' : 'font-semibold'}`}>{title(item, pet)}</span>
          {clickable && <Icon name="pin" size={18} className={`mt-0.5 ${active ? 'text-accent-text' : 'text-muted'}`} />}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{meta(item)}</span>
        {item.type === 'message' && !compact && (
          <>
            <span className="mt-2 block rounded-2xl rounded-tl-md bg-raised px-4 py-3 whitespace-pre-line">{item.body}</span>
            <span className="mt-2 flex flex-wrap gap-2">
              {CONDITION_LABELS[item.condition] && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CONDITION_LABELS[item.condition].tone}`}>
                  {CONDITION_LABELS[item.condition].label}
                </span>
              )}
              {item.contact &&
                (looksLikePhone(item.contact) ? (
                  <a
                    href={telHref(item.contact.match(/\+?\d[\d\s-]{7,}/)[0])}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-text"
                  >
                    <Icon name="phone" size={14} /> {item.contact}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-text">
                    <Icon name="user" size={14} /> {item.contact}
                  </span>
                ))}
            </span>
          </>
        )}
        {item.type === 'message' && compact && <span className="mt-1 line-clamp-2 block text-sm">„{item.body}”</span>}
      </span>
    </>
  )

  const base = `flex w-full items-start gap-3 rounded-3xl p-3 text-left transition-colors ${item.unread ? 'bg-accent-soft/70' : ''} ${active ? 'ring-2 ring-accent' : ''}`

  if (clickable) {
    return (
      <button type="button" onClick={() => onSelect(item)} className={`${base} hover:bg-raised`}>
        {body}
      </button>
    )
  }
  return <div className={base}>{body}</div>
}

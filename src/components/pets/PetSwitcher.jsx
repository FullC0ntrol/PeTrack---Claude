import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { petClass } from '../../lib/petColors.js'
import Icon from '../ui/Icon.jsx'
import PetAvatar from './PetAvatar.jsx'

/*
  Przełącznik zwierząt u góry ekranu: poziomo przewijane karty z awatarami (scroll-snap).
  Aktywne zwierzę ma obwódkę w swoim kolorze; licznik pokazuje nieprzeczytane zdarzenia,
  a pulsująca kropka – zaginięcie. Ostatnia karta „+” otwiera kreator.
*/
export default function PetSwitcher({ pets, activeId }) {
  const activeRef = useRef(null)
  const listRef = useRef(null)

  // Aktywna karta na środek – przewijamy tylko listę, nie całą stronę.
  useEffect(() => {
    const list = listRef.current
    const item = activeRef.current
    if (!list || !item) return
    list.scrollTo({ left: item.offsetLeft - list.clientWidth / 2 + item.clientWidth / 2, behavior: 'smooth' })
  }, [activeId])

  return (
    <nav aria-label="Twoje zwierzęta" className="-mx-4 sm:mx-0">
      <ul ref={listRef} className="no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 sm:px-1">
        {pets.map((pet) => {
          const active = pet.id === activeId
          return (
            <li key={pet.id} className="snap-center" ref={active ? activeRef : undefined}>
              <Link
                to={`/app/p/${pet.id}`}
                aria-current={active ? 'page' : undefined}
                className={`${petClass(pet.color)} group flex w-20 flex-col items-center gap-1.5 rounded-3xl pt-1 pb-1.5 transition-transform duration-200 active:scale-95`}
              >
                <span className="relative">
                  <span
                    className={`block rounded-[42%] p-[3px] transition-all duration-300 ${active ? 'bg-pet scale-105' : 'bg-transparent group-hover:bg-line'}`}
                  >
                    <PetAvatar pet={pet} size={60} className="ring-3 ring-bg" />
                  </span>
                  {pet.isLost && (
                    <span className="absolute -top-0.5 -left-0.5 grid size-5 place-items-center" title="Zaginiony">
                      <span className="absolute inset-0 animate-ping-soft rounded-full bg-alert" />
                      <span className="relative size-3.5 rounded-full bg-alert ring-2 ring-bg" />
                    </span>
                  )}
                  {pet.unread > 0 && (
                    <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent ring-2 ring-bg">
                      {pet.unread > 99 ? '99+' : pet.unread}
                      <span className="sr-only"> nowych zdarzeń</span>
                    </span>
                  )}
                </span>
                <span className={`max-w-full truncate text-sm ${active ? 'font-bold text-ink' : 'font-medium text-muted'}`}>{pet.name}</span>
              </Link>
            </li>
          )
        })}
        <li className="snap-center">
          <Link to="/app/nowe" className="group flex w-20 flex-col items-center gap-1.5 pt-1 pb-1.5 active:scale-95">
            <span className="grid size-[66px] place-items-center rounded-[42%] border-2 border-dashed border-line text-muted transition-colors group-hover:border-accent group-hover:text-accent-text">
              <Icon name="plus" size={26} />
            </span>
            <span className="text-sm font-medium text-muted">Dodaj</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

import { useState } from 'react'
import { tagsApi } from '../../api/endpoints.js'
import { TagArt } from '../../components/illustrations/Scenes.jsx'
import PetAvatar from '../../components/pets/PetAvatar.jsx'
import Button from '../../components/ui/Button.jsx'
import { CheckBurst } from '../../components/ui/Celebrate.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { countLabel } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  Zalogowany właściciel zeskanował nieprzypisany tag → „Przypisz ten tag do zwierzęcia”.
  Bez zwierząt: przejście do kreatora z ?tag=KOD – tag przypisze się po utworzeniu profilu.
*/
export default function ClaimTag({ code, pets }) {
  const [selected, setSelected] = useState(pets.length === 1 ? pets[0].id : null)
  const [state, setState] = useState({ status: 'idle' })
  const pet = pets.find((p) => p.id === selected)

  const claim = async () => {
    setState({ status: 'saving' })
    try {
      await tagsApi.claim(code, selected)
      setState({ status: 'done' })
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  if (state.status === 'done') {
    return (
      <div className={`${petClass(pet.color)} flex flex-col items-center pt-6 text-center`}>
        <CheckBurst />
        <h1 className="mt-6 animate-rise text-3xl font-bold">Gotowe!</h1>
        <p className="mt-2 max-w-sm animate-rise text-muted" style={{ animationDelay: '80ms' }}>
          Tag <span className="font-mono font-semibold text-ink">{code}</span> należy teraz do: <strong className="text-ink">{pet.name}</strong>. Każdy, kto go
          zeskanuje, zobaczy profil i będzie mógł Ci napisać.
        </p>
        <PetAvatar pet={pet} size={112} className="mt-6 animate-pop shadow-lift" />
        <Button to={`/app/p/${pet.id}`} variant="pet" size="lg" className="mt-8" iconRight="forward">
          Przejdź do profilu
        </Button>
      </div>
    )
  }

  return (
    <div className={petClass(pet?.color)}>
      <div className="flex animate-rise flex-col items-center text-center">
        <TagArt code={code} className="w-60" />
        <h1 className="mt-1 text-3xl font-bold">Przypisz ten tag do zwierzęcia</h1>
        <p className="mt-2 max-w-sm text-muted">Ten tag jest wolny. Wybierz, kto będzie go nosić na obroży.</p>
      </div>

      {pets.length === 0 ? (
        <div className="card mt-6 animate-rise text-center">
          <p className="font-semibold">Nie masz jeszcze żadnego zwierzęcia.</p>
          <p className="mt-1 text-sm text-muted">Dodaj profil – tag przypisze się automatycznie na końcu kreatora.</p>
          <Button to={`/app/nowe?tag=${encodeURIComponent(code)}`} className="mt-4" icon="plus">
            Dodaj zwierzę z tym tagiem
          </Button>
        </div>
      ) : (
        <>
          <fieldset className="mt-6 grid animate-rise gap-3" style={{ animationDelay: '80ms' }}>
            <legend className="sr-only">Wybierz zwierzę</legend>
            {pets.map((p) => {
              const active = p.id === selected
              return (
                <label
                  key={p.id}
                  className={`${petClass(p.color)} flex cursor-pointer items-center gap-4 rounded-4xl border-2 p-3 pr-5 transition-all has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    active ? 'scale-[1.01] border-pet bg-pet-soft shadow-soft' : 'border-transparent bg-surface shadow-soft hover:border-line'
                  }`}
                >
                  <input type="radio" name="pet" value={p.id} checked={active} onChange={() => setSelected(p.id)} className="sr-only" />
                  <PetAvatar pet={p} size={60} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl font-bold">{p.name}</span>
                    <span className="text-sm text-muted">{p.tagCount ? `Ma już ${countLabel(p.tagCount, 'tag', 'tagi', 'tagów')}` : 'Bez tagu'}</span>
                  </span>
                  <span className={`grid size-8 place-items-center rounded-full border-2 ${active ? 'border-pet bg-pet text-on-pet' : 'border-line'}`}>
                    {active && <Icon name="check" size={16} strokeWidth={3} className="animate-pop" />}
                  </span>
                </label>
              )
            })}
          </fieldset>
          {state.status === 'error' && (
            <p role="alert" className="mt-4 rounded-2xl bg-alert-soft p-3 text-sm font-medium text-alert-text">
              {state.message}
            </p>
          )}
          <Button variant="pet" size="xl" full className="mt-6" disabled={!selected} loading={state.status === 'saving'} onClick={claim} icon="tag">
            {pet ? `Przypisz do: ${pet.name}` : 'Wybierz zwierzę'}
          </Button>
          <Button to={`/app/nowe?tag=${encodeURIComponent(code)}`} variant="ghost" full className="mt-2" icon="plus">
            To tag dla nowego zwierzęcia
          </Button>
        </>
      )}
    </div>
  )
}

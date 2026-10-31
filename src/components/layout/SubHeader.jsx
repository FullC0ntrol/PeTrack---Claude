import { IconButton } from '../ui/Button.jsx'
import PetAvatar from '../pets/PetAvatar.jsx'

// Nagłówek podstron zwierzęcia: strzałka powrotu, tytuł i mały awatar, żeby było wiadomo „czyje to”.
export default function SubHeader({ title, subtitle, back, pet, action }) {
  return (
    <div className="mb-5 flex animate-rise-back items-center gap-3 pt-2">
      <IconButton to={back} icon="back" label="Wstecz" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
      {pet && <PetAvatar pet={pet} size={44} />}
    </div>
  )
}

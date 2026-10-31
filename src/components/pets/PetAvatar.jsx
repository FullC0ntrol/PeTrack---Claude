import { petClass } from '../../lib/petColors.js'
import PetArt from '../illustrations/PetArt.jsx'

/*
  Zdjęcie zwierzęcia albo rysowany portret w jego kolorze. Kształt „squircle” (duże zaokrąglenie)
  zamiast koła – charakterystyczny element tej wersji.
*/
export default function PetAvatar({ pet, size = 56, className = '', rounded = 'rounded-[38%]' }) {
  return (
    <span
      className={`${petClass(pet?.color)} relative inline-block shrink-0 overflow-hidden bg-pet ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      {pet?.photoUrl ? (
        <img src={pet.photoUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <PetArt species={pet?.species} className="size-full" />
      )}
    </span>
  )
}

/*
  Rysowane w kodzie „portrety” zwierząt, gdy nie ma zdjęcia. Tło bierze kolor zwierzęcia z
  otaczającego kontenera (.pet-<kolor>), więc ta sama grafika pasuje do każdego profilu.
*/
const INK = '#18171C'

function Dog() {
  return (
    <>
      <path d="M30 38c-9 2-14 14-12 28 1 8 8 10 12 4l8-22c2-6-2-11-8-10z" fill={INK} opacity="0.85" />
      <path d="M90 38c9 2 14 14 12 28-1 8-8 10-12 4l-8-22c-2-6 2-11 8-10z" fill={INK} opacity="0.85" />
      <ellipse cx="60" cy="64" rx="31" ry="30" fill="#fff" />
      <ellipse cx="60" cy="80" rx="15" ry="11" fill="var(--pet)" opacity="0.35" />
      <circle cx="48" cy="60" r="4.2" fill={INK} />
      <circle cx="72" cy="60" r="4.2" fill={INK} />
      <circle cx="49.4" cy="58.6" r="1.3" fill="#fff" />
      <circle cx="73.4" cy="58.6" r="1.3" fill="#fff" />
      <path d="M53.5 73.5c0-2 2.9-3.2 6.5-3.2s6.5 1.2 6.5 3.2-3.4 5-6.5 5-6.5-3-6.5-5z" fill={INK} />
      <path d="M60 78.5v4M60 82.5c-2.5 3-6 3-8 1M60 82.5c2.5 3 6 3 8 1" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  )
}

function Cat() {
  return (
    <>
      <path d="M33 52L36 24l22 18z" fill="#fff" />
      <path d="M87 52L84 24 62 42z" fill="#fff" />
      <path d="M38 44l1.5-12 9.5 8z" fill="var(--pet)" opacity="0.5" />
      <path d="M82 44l-1.5-12-9.5 8z" fill="var(--pet)" opacity="0.5" />
      <ellipse cx="60" cy="66" rx="32" ry="27" fill="#fff" />
      <ellipse cx="47" cy="62" rx="4" ry="5.2" fill={INK} />
      <ellipse cx="73" cy="62" rx="4" ry="5.2" fill={INK} />
      <circle cx="48.3" cy="60.2" r="1.3" fill="#fff" />
      <circle cx="74.3" cy="60.2" r="1.3" fill="#fff" />
      <path d="M56.5 71h7l-3.5 4z" fill="#F472B6" />
      <path d="M60 75c-1.5 3-5 3.5-7 1.8M60 75c1.5 3 5 3.5 7 1.8" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M38 70l-12-2M38 75l-11 3M82 70l12-2M82 75l11 3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </>
  )
}

function Other() {
  return (
    <>
      <circle cx="38" cy="44" r="9" fill="#fff" />
      <circle cx="82" cy="44" r="9" fill="#fff" />
      <circle cx="38" cy="44" r="4.5" fill="var(--pet)" opacity="0.5" />
      <circle cx="82" cy="44" r="4.5" fill="var(--pet)" opacity="0.5" />
      <ellipse cx="60" cy="68" rx="34" ry="29" fill="#fff" />
      <path d="M60 39c-8 6-10 15-8 22 4-3 12-3 16 0 2-7 0-16-8-22z" fill="var(--pet)" opacity="0.35" />
      <circle cx="47" cy="65" r="4" fill={INK} />
      <circle cx="73" cy="65" r="4" fill={INK} />
      <circle cx="48.3" cy="63.6" r="1.2" fill="#fff" />
      <circle cx="74.3" cy="63.6" r="1.2" fill="#fff" />
      <ellipse cx="38" cy="75" rx="6" ry="3.5" fill="#F472B6" opacity="0.45" />
      <ellipse cx="82" cy="75" rx="6" ry="3.5" fill="#F472B6" opacity="0.45" />
      <path d="M57 73.5h6l-3 3z" fill={INK} />
      <path d="M60 76.5c-1 2.5-4 3-5.5 1.5M60 76.5c1 2.5 4 3 5.5 1.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  )
}

export default function PetArt({ species = 'dog', className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <rect width="120" height="120" fill="var(--pet)" />
      <circle cx="98" cy="18" r="26" fill="#fff" opacity="0.18" />
      <circle cx="14" cy="108" r="20" fill="#fff" opacity="0.14" />
      <g transform="translate(0 6)">{species === 'cat' ? <Cat /> : species === 'other' ? <Other /> : <Dog />}</g>
    </svg>
  )
}

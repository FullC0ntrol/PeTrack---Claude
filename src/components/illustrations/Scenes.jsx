/*
  Ilustracje pustych stanów i ekranów potwierdzeń – płaskie kształty rysowane w SVG.
  Kolory przez zmienne CSS: --pet (kolor zwierzęcia/akcentu), --pet-soft, --c-surface, --c-ink,
  --c-line, więc grafiki same dopasowują się do motywu jasnego i ciemnego.
*/
const INK = 'var(--c-ink)'
const SURFACE = 'var(--c-surface)'
const LINE = 'var(--c-line)'
const PET = 'var(--pet)'
const SOFT = 'var(--pet-soft)'

function Frame({ children, className = '', label, viewBox = '0 0 240 180' }) {
  return (
    <svg viewBox={viewBox} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  )
}

function Blob({ fill = SOFT }) {
  return <path d="M42 98c-6-38 26-70 70-74 46-4 92 18 90 62-2 40-36 70-84 72-44 2-70-24-76-60z" fill={fill} />
}

function Sparkle({ x, y, s = 1, fill = PET }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-9l2.4 6.6L9 0l-6.6 2.4L0 9l-2.4-6.6L-9 0l6.6-2.4z" fill={fill} />
}

// Pusta lista zwierząt: miska i domek czekający na lokatora.
export function EmptyPetsArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <path d="M70 128V86l44-34 44 34v42z" fill={SURFACE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 92l54-44 54 44" fill="none" stroke={PET} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M98 128v-22a16 16 0 0132 0v22z" fill={INK} />
      <path d="M150 140c0-10 9-14 24-14s24 4 24 14z" fill={PET} />
      <ellipse cx="174" cy="127" rx="20" ry="4" fill={INK} opacity="0.25" />
      <path d="M40 140h168" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <g fill={INK} opacity="0.35">
        <circle cx="44" cy="120" r="3" />
        <circle cx="50" cy="114" r="3" />
        <circle cx="57" cy="117" r="3" />
        <ellipse cx="51" cy="124" rx="5" ry="4" />
      </g>
      <Sparkle x={186} y={64} />
      <Sparkle x={52} y={60} s={0.7} />
    </Frame>
  )
}

// Pusty dziennik: mapa z przerywaną trasą i śpiący kot.
export function EmptyEventsArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <path d="M52 52l42-14 52 14 42-14v92l-42 14-52-14-42 14z" fill={SURFACE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M94 38v92M146 52v92" stroke={LINE} strokeWidth="3" />
      <path d="M66 112c16-4 18-30 40-30s24 24 44 18 20-26 30-30" fill="none" stroke={PET} strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
      <path d="M180 58c0 9-9 18-9 18s-9-9-9-18a9 9 0 0118 0z" fill={PET} stroke={INK} strokeWidth="3" />
      <circle cx="171" cy="58" r="3.2" fill={SURFACE} />
      <g transform="translate(58 128)">
        <ellipse cx="22" cy="12" rx="24" ry="12" fill={INK} />
        <path d="M38 4l4-12 6 10z" fill={INK} />
        <path d="M28 2l2-12 8 9z" fill={INK} />
        <path d="M33 10q3 2 6 0" stroke={SURFACE} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <text x="108" y="128" fontFamily="var(--font-display)" fontWeight="700" fontSize="14" fill={INK} opacity="0.55">
        z z z
      </text>
    </Frame>
  )
}

// Brak tagów: obroża z pustą zawieszką.
export function EmptyTagsArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <path d="M48 64c40 34 104 34 144 0" fill="none" stroke={PET} strokeWidth="16" strokeLinecap="round" />
      <path d="M48 64c40 34 104 34 144 0" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="1 12" strokeLinecap="round" opacity="0.4" />
      <circle cx="120" cy="91" r="7" fill="none" stroke={INK} strokeWidth="4" />
      <g className="animate-float">
        <circle cx="120" cy="128" r="28" fill={SURFACE} stroke={INK} strokeWidth="4" />
        <circle cx="120" cy="108" r="4" fill={INK} />
        <path d="M108 130h24M112 140h16" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      </g>
      <Sparkle x={168} y={124} />
      <Sparkle x={70} y={118} s={0.7} />
    </Frame>
  )
}

// Zawieszka z wypisanym kodem – ekran przypisywania tagu.
export function TagArt({ code, className }) {
  return (
    <Frame className={className} viewBox="0 0 240 200" label={code ? `Tag ${code}` : undefined}>
      <Blob />
      <path d="M120 10v34" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="50" r="9" fill="none" stroke={INK} strokeWidth="4" />
      <g className="origin-[120px_50px] animate-wiggle">
        <rect x="58" y="62" width="124" height="112" rx="40" fill={PET} stroke={INK} strokeWidth="4" />
        <circle cx="120" cy="80" r="6" fill={SURFACE} stroke={INK} strokeWidth="3" />
        <rect x="76" y="100" width="88" height="40" rx="14" fill={SURFACE} />
        <text x="120" y="126" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize="15" fill="#18171C">
          {code ?? '????-????'}
        </text>
        <path d="M100 154c6 4 14 4 20 0s14-4 20 0" stroke="#18171C" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>
      <Sparkle x={196} y={70} />
      <Sparkle x={44} y={150} s={0.7} />
    </Frame>
  )
}

// Logowanie: koperta z kodem.
export function MailArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <g className="animate-float">
        <rect x="58" y="56" width="124" height="84" rx="18" fill={SURFACE} stroke={INK} strokeWidth="4" />
        <path d="M62 64l58 40 58-40" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <rect x="132" y="30" width="76" height="34" rx="17" fill={PET} stroke={INK} strokeWidth="3" />
        <g fill="#18171C">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={146 + i * 9.6} cy="47" r="3.2" />
          ))}
        </g>
      </g>
      <Sparkle x={48} y={50} />
      <Sparkle x={196} y={130} s={0.8} />
    </Frame>
  )
}

// Nie znaleziono: lupa nad śladami łap.
export function SearchArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <g fill={INK} opacity="0.3">
        {[
          [62, 138],
          [86, 118],
          [112, 128],
        ].map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="4" rx="6" ry="5" />
            <circle cx="-6" cy="-4" r="2.6" />
            <circle cx="0" cy="-7" r="2.6" />
            <circle cx="6" cy="-4" r="2.6" />
          </g>
        ))}
      </g>
      <circle cx="146" cy="80" r="34" fill={SURFACE} stroke={INK} strokeWidth="5" />
      <circle cx="146" cy="80" r="24" fill={PET} opacity="0.35" />
      <path d="M170 104l26 26" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <text x="146" y="90" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="28" fill={INK}>
        ?
      </text>
    </Frame>
  )
}

// Telefon skanujący tag – strona główna.
export function ScanArt({ className }) {
  return (
    <Frame className={className} viewBox="0 0 280 240">
      <path d="M30 128c-8-56 36-100 102-104 70-4 124 30 122 90-2 62-50 104-118 106-62 2-98-34-106-92z" fill={SOFT} />
      <g className="animate-float">
        <rect x="132" y="36" width="96" height="172" rx="24" fill={INK} />
        <rect x="140" y="48" width="80" height="148" rx="16" fill={SURFACE} />
        <rect x="150" y="60" width="60" height="44" rx="12" fill={PET} />
        <circle cx="168" cy="82" r="10" fill={SURFACE} />
        <rect x="150" y="114" width="44" height="8" rx="4" fill={INK} opacity="0.8" />
        <rect x="150" y="128" width="60" height="6" rx="3" fill={LINE} />
        <rect x="150" y="140" width="52" height="6" rx="3" fill={LINE} />
        <rect x="150" y="160" width="60" height="22" rx="11" fill="#FF5A3D" />
      </g>
      <g stroke="#FF5A3D" strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M112 102a22 22 0 010 30" />
        <path d="M100 92a36 36 0 010 50" opacity="0.6" />
      </g>
      <g className="origin-[66px_92px] animate-wiggle">
        <path d="M66 52v26" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="66" cy="84" r="7" fill="none" stroke={INK} strokeWidth="4" />
        <circle cx="66" cy="126" r="34" fill={PET} stroke={INK} strokeWidth="4" />
        <circle cx="66" cy="104" r="4" fill={INK} />
        <g fill="#18171C" transform="translate(66 132)">
          <ellipse cx="0" cy="5" rx="9" ry="7" />
          <circle cx="-10" cy="-5" r="3.6" />
          <circle cx="-3.5" cy="-10" r="3.6" />
          <circle cx="3.5" cy="-10" r="3.6" />
          <circle cx="10" cy="-5" r="3.6" />
        </g>
      </g>
      <Sparkle x={246} y={56} />
      <Sparkle x={36} y={196} s={0.8} />
    </Frame>
  )
}

// Powrót do domu – ekran „Znaleziony!”.
export function HomeArt({ className }) {
  return (
    <Frame className={className}>
      <Blob />
      <path d="M68 140V88l52-40 52 40v52z" fill={SURFACE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 94l62-50 62 50" fill="none" stroke={PET} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path className="origin-center animate-pop" d="M120 128s-20-12-20-26a10.5 10.5 0 0120-4 10.5 10.5 0 0120 4c0 14-20 26-20 26z" fill="#FF5A3D" />
      <path d="M40 140h160" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <Sparkle x={190} y={54} />
      <Sparkle x={48} y={62} s={0.8} />
      <Sparkle x={200} y={112} s={0.6} />
    </Frame>
  )
}

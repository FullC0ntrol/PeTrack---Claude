/*
  Własny zestaw ikon (siatka 24×24, obrys 2 px, zaokrąglone końce) – bez biblioteki ikon,
  żeby całość miała jeden, miękki charakter. Ikona dziedziczy kolor z `currentColor`.
*/
const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  forward: <path d="M9 5l7 7-7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  paw: (
    <>
      <ellipse cx="12" cy="16.2" rx="4.6" ry="3.6" />
      <circle cx="6" cy="10.5" r="1.9" />
      <circle cx="9.5" cy="6.5" r="1.9" />
      <circle cx="14.5" cy="6.5" r="1.9" />
      <circle cx="18" cy="10.5" r="1.9" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="4" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4.5-2.2 1.4a11 11 0 005.8 5.8l1.4-2.2 4.5 1.5v3a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7a2 2 0 012-2.2z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3a2 2 0 013.4 0l7.4 12.9A2 2 0 0119.4 20H4.6a2 2 0 01-1.7-2.8z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.4a4.3 4.3 0 017.5 2.4C19.5 15.4 12 20 12 20z" />,
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h.01M20 14h.01" />
    </>
  ),
  tag: (
    <>
      <path d="M12.6 3.5H19a1.5 1.5 0 011.5 1.5v6.4a2 2 0 01-.6 1.4l-7.6 7.6a1.5 1.5 0 01-2.1 0l-6.6-6.6a1.5 1.5 0 010-2.1l7.6-7.6a2 2 0 011.4-.6z" />
      <circle cx="16" cy="8" r="1.4" />
    </>
  ),
  nfc: (
    <>
      <path d="M8.5 8.5a5 5 0 010 7" />
      <path d="M12 6a8.5 8.5 0 010 12" />
      <path d="M15.5 3.5a12 12 0 010 17" />
      <circle cx="5" cy="12" r="1.2" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4h10v5" />
      <rect x="3.5" y="9" width="17" height="8" rx="3" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M8 7.5L12 3.5l4 4" />
      <path d="M7 11H6a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2v-5a2 2 0 00-2-2h-1" />
    </>
  ),
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />,
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 016.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  medical: (
    <>
      <rect x="3.5" y="6" width="17" height="14" rx="4" />
      <path d="M9 6V4.5h6V6M12 10v6M9 13h6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </>
  ),
  logout: <path d="M14 4.5h3.5a2 2 0 012 2v11a2 2 0 01-2 2H14M10 16l-4-4 4-4M6 12h9.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" />,
  system: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="3" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  bell: <path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 004 0" />,
  message: <path d="M5 5h14a2 2 0 012 2v8.5a2 2 0 01-2 2h-7l-4.5 3.5V17.5H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H15a3 3 0 000-6H9a3 3 0 010-6h6.8" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  send: <path d="M4 12l16-7.5-5.5 16-3-6.5zM11.5 14l3-3" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="3" />
      <path d="M15.5 8.5V6.5a2.5 2.5 0 00-2.5-2.5H6.5A2.5 2.5 0 004 6.5V13a2.5 2.5 0 002.5 2.5h2" />
    </>
  ),
  home: <path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 014 19z" />,
  sparkle: <path d="M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2zM19 3v3M17.5 4.5h3" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 15.5l-5-5-9 9" />
    </>
  ),
  menu: <path d="M5 8h14M5 12h14M5 16h9" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 01-13.3 4.8M4.5 12A7.5 7.5 0 0117.8 7.2M18 3.5v4h-4M6 20.5v-4h4" />,
  link: <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.5 1.5M9.5 2.5h5" />
    </>
  ),
}

export default function Icon({ name, size = 22, strokeWidth = 2, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name] ?? PATHS.paw}
    </svg>
  )
}

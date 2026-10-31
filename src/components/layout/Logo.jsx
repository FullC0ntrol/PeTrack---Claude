import { Link } from 'react-router'

// Znak: koralowa „kropla-zawieszka” z łapką + nazwa w Sorze.
export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="14" fill="#FF5A3D" />
      <g fill="#1A0D09">
        <ellipse cx="20" cy="25" rx="6.2" ry="5" />
        <circle cx="12.5" cy="18" r="2.6" />
        <circle cx="17" cy="12.8" r="2.6" />
        <circle cx="23" cy="12.8" r="2.6" />
        <circle cx="27.5" cy="18" r="2.6" />
      </g>
    </svg>
  )
}

export default function Logo({ to = '/', size = 34 }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-full font-display text-xl font-bold tracking-tight">
      <LogoMark size={size} />
      <span>
        PeTrace<span className="text-accent-text">.</span>
      </span>
    </Link>
  )
}

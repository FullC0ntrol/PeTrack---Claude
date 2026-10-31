import { Link } from 'react-router'
import Icon from './Icon.jsx'
import Spinner from './Spinner.jsx'

const VARIANTS = {
  primary: 'bg-accent text-on-accent shadow-glow hover:brightness-105',
  pet: 'bg-pet text-on-pet shadow-soft hover:brightness-105',
  dark: 'bg-ink text-bg hover:opacity-90',
  secondary: 'bg-surface text-ink ring-2 ring-line ring-inset hover:ring-ink/30',
  soft: 'bg-pet-soft text-pet-text hover:brightness-[0.98]',
  ghost: 'text-ink hover:bg-raised',
  danger: 'bg-alert text-white hover:brightness-110',
  'danger-soft': 'bg-alert-soft text-alert-text hover:brightness-[0.98]',
}

const SIZES = {
  sm: 'min-h-10 px-4 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-[15px] gap-2',
  lg: 'min-h-14 px-6 text-base gap-2.5',
  xl: 'min-h-16 px-7 text-lg gap-3',
}

/*
  Przycisk w kształcie pigułki. Z `to` renderuje Link, z `href` zwykły <a> (np. tel:).
  `loading` blokuje ponowne kliknięcie i pokazuje spinner w miejscu ikony.
*/
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  full = false,
  to,
  href,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const classes = [
    'inline-flex select-none items-center justify-center rounded-full font-semibold transition-[transform,filter,opacity,box-shadow] duration-150 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    full ? 'w-full' : '',
    className,
  ].join(' ')
  const iconSize = size === 'sm' ? 18 : size === 'xl' ? 24 : 20
  const content = (
    <>
      {loading ? <Spinner size={iconSize} /> : icon && <Icon name={icon} size={iconSize} />}
      {children && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={iconSize} />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  )
}

export function IconButton({ icon, label, to, onClick, className = '', size = 44, badge, ...rest }) {
  const classes = `relative inline-grid shrink-0 place-items-center rounded-full transition active:scale-95 ${className || 'bg-surface text-ink shadow-soft hover:bg-raised'}`
  const style = { width: size, height: size }
  const inner = (
    <>
      <Icon name={icon} size={Math.round(size * 0.48)} />
      {badge ? (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent ring-2 ring-bg">
          {badge}
        </span>
      ) : null}
    </>
  )
  if (to) {
    return (
      <Link to={to} aria-label={label} title={label} className={classes} style={style} {...rest}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={classes} style={style} {...rest}>
      {inner}
    </button>
  )
}

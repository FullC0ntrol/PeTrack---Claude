import { useThemeMode } from '../../context/contexts.js'
import { IconButton } from '../ui/Button.jsx'

const NEXT = { system: 'light', light: 'dark', dark: 'system' }
const META = {
  system: { icon: 'system', label: 'Motyw: systemowy (zmień na jasny)' },
  light: { icon: 'sun', label: 'Motyw: jasny (zmień na ciemny)' },
  dark: { icon: 'moon', label: 'Motyw: ciemny (zmień na systemowy)' },
}

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode()
  return <IconButton icon={META[mode].icon} label={META[mode].label} onClick={() => setMode(NEXT[mode])} />
}

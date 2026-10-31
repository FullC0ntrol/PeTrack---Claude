import { useCallback, useEffect, useState } from 'react'
import { local } from '../lib/storage.js'

const KEY = 'petrace-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply(mode) {
  const dark = mode === 'dark' || (mode === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121214' : '#FF5A3D')
}

// Motyw: 'system' | 'light' | 'dark'. Wybór zapamiętany w przeglądarce (public/theme-init.js czyta go przed renderem).
export function useTheme() {
  const [mode, setModeState] = useState(() => local.get(KEY, 'system'))

  useEffect(() => {
    apply(mode)
    if (mode !== 'system') return undefined
    const query = media()
    const onChange = () => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [mode])

  const setMode = useCallback((next) => {
    if (next === 'system') local.remove(KEY)
    else local.set(KEY, next)
    setModeState(next)
  }, [])

  return { mode, setMode }
}

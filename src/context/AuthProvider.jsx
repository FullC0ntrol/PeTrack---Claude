import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/endpoints.js'
import { AuthContext } from './contexts.js'

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, demoLogin: false })

  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((data) => active && setState({ user: data.user, loading: false, demoLogin: data.demoLogin }))
      .catch(() => active && setState((s) => ({ ...s, loading: false })))
    // Sesja wygasła w trakcie pracy (401 z dowolnego zapytania) → interfejs wylogowuje.
    const onUnauthorized = () => setState((s) => ({ ...s, user: null }))
    window.addEventListener('petrace:unauthorized', onUnauthorized)
    return () => {
      active = false
      window.removeEventListener('petrace:unauthorized', onUnauthorized)
    }
  }, [])

  const setUser = useCallback((user) => setState((s) => ({ ...s, user })), [])

  const logout = useCallback(async ({ everywhere = false } = {}) => {
    try {
      await (everywhere ? authApi.logoutAll() : authApi.logout())
    } finally {
      setState((s) => ({ ...s, user: null }))
    }
  }, [])

  const value = useMemo(() => ({ ...state, setUser, logout }), [state, setUser, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

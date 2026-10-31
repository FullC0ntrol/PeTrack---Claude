import { useCallback, useEffect, useMemo, useState } from 'react'
import { petsApi } from '../api/endpoints.js'
import { PetsContext } from './contexts.js'

// Lista zwierząt (podsumowania) dla przełącznika u góry i liczników nieprzeczytanych zdarzeń.
export default function PetsProvider({ children }) {
  const [state, setState] = useState({ pets: [], loading: true, error: null })

  const reload = useCallback(async () => {
    try {
      const { pets } = await petsApi.list()
      setState({ pets, loading: false, error: null })
      return pets
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }))
      return null
    }
  }, [])

  useEffect(() => {
    let active = true
    petsApi
      .list()
      .then(({ pets }) => active && setState({ pets, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({ ...state, reload }), [state, reload])
  return <PetsContext.Provider value={value}>{children}</PetsContext.Provider>
}

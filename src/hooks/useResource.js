import { useCallback, useEffect, useRef, useState } from 'react'

/*
  Wczytanie danych z API: { data, error, loading, reload, setData }.
  Odpowiedź, która przyjdzie po zmianie zależności (np. przełączeniu zwierzęcia), jest ignorowana –
  na ekranie nie mignie poprzednie zwierzę.
*/
export function useResource(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const requestId = useRef(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++requestId.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loadRef.current()
      if (id === requestId.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  return { ...state, reload: run, setData }
}

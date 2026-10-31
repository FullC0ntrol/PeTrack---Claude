import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { petsApi } from '../../api/endpoints.js'
import { EmptyEventsArt } from '../../components/illustrations/Scenes.jsx'
import SubHeader from '../../components/layout/SubHeader.jsx'
import LeafletMap from '../../components/map/LeafletMap.jsx'
import EventItem from '../../components/pets/EventItem.jsx'
import { Badge, ErrorState } from '../../components/ui/Controls.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PageSpinner } from '../../components/ui/Spinner.jsx'
import { usePets } from '../../context/contexts.js'
import { useResource } from '../../hooks/useResource.js'
import { byGender, countLabel, dayLabel, durationLabel, formatTime, genitive } from '../../lib/format.js'
import { petClass } from '../../lib/petColors.js'

/*
  Dziennik zdarzeń zamiast tabeli: kanał wpisów pogrupowanych po dniach i mapa ze wszystkimi
  punktami. Trasa (linia + numery) pokazuje kolejne skany w czasie zaginięcia.
  Nieprzeczytane wpisy są wyróżnione; po otwarciu dziennika oznaczamy je jako przeczytane
  na serwerze, ale wyróżnienie zostaje do wyjścia z ekranu.
*/
export default function EventsPage() {
  const { petId } = useParams()
  const { reload: reloadPets, pets } = usePets()
  const { data, error, loading, reload } = useResource(() => petsApi.events(petId), [petId])
  const [focus, setFocus] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const markedRef = useRef(false)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!data || data.unread === 0 || markedRef.current) return
    markedRef.current = true
    const timer = setTimeout(() => {
      petsApi.markRead(petId).then(reloadPets).catch(() => {})
    }, 1200)
    return () => clearTimeout(timer)
  }, [data, petId, reloadPets])

  const summary = pets.find((p) => p.id === petId)
  const pet = data?.pet ?? summary

  const { markers, route, routeIds } = useMemo(() => {
    if (!data) return { markers: [], route: [], routeIds: new Map() }
    const numbering = new Map(data.route.filter((p) => !p.lastSeen).map((p, i) => [p.id, i + 1]))
    const list = []
    for (const point of data.route) {
      if (point.lastSeen) list.push({ id: 'last-seen', lat: point.lat, lng: point.lng, kind: 'lastSeen', label: `Ostatnio widziany: ${point.place || ''}` })
    }
    for (const item of data.items) {
      if ((item.type !== 'scan' && item.type !== 'message') || item.lat === null || item.lat === undefined) continue
      list.push({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        kind: item.type,
        number: numbering.get(item.id),
        active: item.id === activeId,
        label: `${formatTime(item.at)} · ${item.place || 'skan'}`,
      })
    }
    return { markers: list, route: data.route.map((p) => [p.lat, p.lng]), routeIds: numbering }
  }, [data, activeId])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <PageSpinner />

  const groups = []
  for (const item of data.items) {
    const label = dayLabel(item.at)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }

  const select = (item) => {
    setActiveId(item.id)
    setFocus({ lat: item.lat, lng: item.lng, t: Date.now() })
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const report = data.report
  const isLost = report && !report.resolvedAt

  return (
    <div className={petClass(pet?.color)}>
      <SubHeader
        back={`/app/p/${petId}`}
        title={`Dziennik: ${data.pet.name}`}
        subtitle={data.unread ? countLabel(data.unread, 'nowe zdarzenie', 'nowe zdarzenia', 'nowych zdarzeń') : 'Wszystko przeczytane'}
        pet={summary}
      />

      {markers.length > 0 && (
        <section ref={mapRef} className="relative animate-rise overflow-hidden rounded-4xl bg-surface shadow-soft">
          <LeafletMap markers={markers} route={route} focus={focus} className="h-72 sm:h-96" label={`Mapa skanów: ${data.pet.name}`} />
          {route.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Icon name="route" size={18} className="text-accent-text" />
                Trasa {isLost ? 'od zaginięcia' : 'z ostatniego zaginięcia'}: {countLabel(routeIds.size, 'punkt', 'punkty', 'punktów')}
              </span>
              {report && (
                <span className="text-muted">
                  {isLost
                    ? `${byGender(data.pet, 'zaginiony', 'zaginiona')} od ${durationLabel(report.lastSeenAt)}`
                    : `znaleziony po ${durationLabel(report.lastSeenAt, report.resolvedAt)}`}
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {data.items.length === 0 ? (
        <section className="flex animate-rise flex-col items-center pt-6 text-center">
          <EmptyEventsArt className="w-72 max-w-full" />
          <h2 className="mt-2 text-2xl font-bold">Na razie cisza</h2>
          <p className="mt-1 max-w-sm text-muted">
            Gdy ktoś zeskanuje tag {genitive(data.pet.name)} albo napisze wiadomość, zobaczysz to tutaj – razem z miejscem na mapie.
          </p>
        </section>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((group, gi) => (
            <section key={group.label} className="animate-rise" style={{ animationDelay: `${Math.min(gi, 5) * 60}ms` }}>
              <h2 className="sticky top-16 z-10 -mx-1 mb-2 flex items-center gap-2 bg-bg/85 px-1 py-2 text-sm font-bold tracking-wide text-muted uppercase backdrop-blur">
                {group.label}
                {group.items.some((i) => i.unread) && <Badge>nowe</Badge>}
              </h2>
              <div className="card space-y-1 p-2">
                {group.items.map((item) => (
                  <EventItem key={item.id} item={item} pet={data.pet} onSelect={select} active={item.id === activeId} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

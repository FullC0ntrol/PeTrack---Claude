import L from 'leaflet'
import { useEffect, useRef } from 'react'

/*
  Cienka nakładka na Leaflet (bez react-leaflet): mapa tworzona raz, a znaczniki i trasa
  przerysowywane przy zmianie danych. Znaczniki to divIcon z HTML/CSS – nie potrzebują
  obrazków, więc nie ma problemu z brakującymi ikonami Leaflet po zbudowaniu aplikacji.

  markers: [{ id, lat, lng, kind: 'scan'|'message'|'lastSeen'|'me'|'pin', label?, number?, active? }]
  route:   [[lat, lng], …] – linia trasy (np. w czasie zaginięcia)
  onPick:  (lat, lng) => void – kliknięcie w mapę (wybór miejsca)
  focus:   { lat, lng } – przelot do punktu (np. po kliknięciu w zdarzenie)
*/
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function markerIcon(marker) {
  if (marker.kind === 'lastSeen' || marker.kind === 'pin') {
    const ring = marker.kind === 'lastSeen' ? '#E11D48' : '#FF5A3D'
    return L.divIcon({
      className: 'map-pin',
      iconSize: [36, 46],
      iconAnchor: [18, 44],
      html: `<svg width="36" height="46" viewBox="0 0 36 46"><path d="M18 44S3 29 3 17a15 15 0 0130 0c0 12-15 27-15 27z" fill="${ring}" stroke="#fff" stroke-width="3"/><circle cx="18" cy="17" r="6" fill="#fff"/></svg>`,
    })
  }
  if (marker.kind === 'me') {
    return L.divIcon({
      className: 'map-pin',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: '<span style="display:block;width:22px;height:22px;border-radius:999px;background:#4D9DE0;border:4px solid #fff;box-shadow:0 2px 8px rgb(0 0 0/.3)"></span>',
    })
  }
  const size = marker.active ? 34 : 28
  const bg = marker.kind === 'message' ? '#18171C' : 'var(--pet)'
  const color = marker.kind === 'message' ? '#fff' : '#18171C'
  const content = marker.number ?? (marker.kind === 'message' ? '✉' : '•')
  return L.divIcon({
    className: 'map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:38%;background:${bg};color:${color};font:700 13px var(--font-sans);border:3px solid #fff;box-shadow:0 4px 12px rgb(0 0 0/.25);transition:transform .2s">${escapeHtml(content)}</span>`,
  })
}

export default function LeafletMap({ markers = [], route = [], onPick, focus, center, zoom = 14, fit = true, className = '', label }) {
  const elementRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  })

  // Mapa – raz.
  useEffect(() => {
    const map = L.map(elementRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
    map.setView(center ? [center.lat, center.lng] : [52.2297, 21.0122], zoom)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event) => onPickRef.current?.(event.latlng.lat, event.latlng.lng))
    // Mapa w kontenerze, który zmienia rozmiar (animacje, arkusze) – przelicz kafelki.
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(elementRef.current)
    mapRef.current = map
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Znaczniki i trasa – przy każdej zmianie danych.
  const markersKey = JSON.stringify(markers)
  const routeKey = JSON.stringify(route)
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (route.length > 1) {
      L.polyline(route, { color: '#18171C', weight: 5, opacity: 0.18, lineJoin: 'round' }).addTo(layer)
      L.polyline(route, { color: '#FF5A3D', weight: 3, dashArray: '2 8', lineCap: 'round' }).addTo(layer)
    }
    for (const marker of markers) {
      const m = L.marker([marker.lat, marker.lng], {
        icon: markerIcon(marker),
        keyboard: false,
        zIndexOffset: marker.active ? 1000 : marker.kind === 'lastSeen' ? 500 : 0,
      })
      if (marker.label) m.bindTooltip(escapeHtml(marker.label), { direction: 'top', offset: [0, -14] })
      m.addTo(layer)
    }
    if (fit && markers.length > 1) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), { padding: [36, 36], maxZoom: 16 })
    } else if (fit && markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], Math.max(map.getZoom(), 15))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, routeKey, fit])

  useEffect(() => {
    if (focus && mapRef.current) mapRef.current.flyTo([focus.lat, focus.lng], 17, { duration: 0.6 })
  }, [focus])

  return <div ref={elementRef} role="region" aria-label={label ?? 'Mapa'} className={`isolate z-0 overflow-hidden ${className}`} />
}

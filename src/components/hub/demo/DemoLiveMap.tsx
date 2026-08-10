"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import { cn } from "@/lib/utils"

/**
 * A REAL map for the demo: Leaflet over free OSM tiles (same stack as the
 * live fleet map, no token needed) with the truck animating along an actual
 * highway corridor, a pulsing destination geofence, and a dropped origin pin.
 * Non-interactive on purpose — it's a scene, not a control. Reduced motion
 * parks the truck at progress end instead of animating.
 */

// Seattle → Boise the way a truck actually runs it: I-90 over Snoqualmie,
// down through Yakima, I-82/I-84 through the Gorge's east end to Boise.
const ROUTE: [number, number][] = [
  [47.6062, -122.3321], // Seattle
  [47.4245, -121.5847], // Snoqualmie Pass
  [46.9971, -120.5478], // Ellensburg
  [46.6021, -120.5059], // Yakima
  [46.2396, -119.1006], // Kennewick
  [45.9317, -119.3011], // Umatilla
  [45.6721, -118.7886], // Pendleton
  [45.3311, -118.0855], // La Grande
  [44.7749, -117.8344], // Baker City
  [44.0266, -116.9629], // Ontario
  [43.615, -116.2023], // Boise
]

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Point along the whole route at t ∈ [0,1] (segment-uniform, close enough). */
function routePoint(t: number): [number, number] {
  const scaled = t * (ROUTE.length - 1)
  const i = Math.min(ROUTE.length - 2, Math.floor(scaled))
  return lerp(ROUTE[i], ROUTE[i + 1], scaled - i)
}

export function DemoLiveMap({
  play,
  progressCap = 0.72,
  className,
  heightClass = "h-[190px]",
  label = "Live truck position between Seattle and Boise",
}: {
  /** Animation runs only while true (scene stage reached). */
  play: boolean
  /** Where the truck stops, as route fraction. */
  progressCap?: number
  className?: string
  heightClass?: string
  label?: string
}) {
  const holderRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const truckRef = useRef<import("leaflet").Marker | null>(null)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!holderRef.current || mapRef.current) return
      const L = (await import("leaflet")).default
      if (cancelled || !holderRef.current || mapRef.current) return

      const map = L.map(holderRef.current, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: true,
      })
      mapRef.current = map
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      map.fitBounds(L.latLngBounds(ROUTE.map(([lat, lng]) => L.latLng(lat, lng))), {
        padding: [26, 26],
      })

      L.polyline(ROUTE, {
        color: "var(--accent)",
        weight: 3,
        opacity: 0.9,
        dashArray: "1 7",
        lineCap: "round",
      }).addTo(map)

      const pin = (kind: "origin" | "dest") =>
        L.divIcon({
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          html: `<span class="demo-map-pin demo-map-pin--${kind}"></span>`,
        })
      L.marker(ROUTE[0], { icon: pin("origin"), interactive: false }).addTo(map)
      L.marker(ROUTE[ROUTE.length - 1], { icon: pin("dest"), interactive: false }).addTo(map)

      const truckIcon = L.divIcon({
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: '<span class="demo-map-truck"></span>',
      })
      truckRef.current = L.marker(routePoint(0), {
        icon: truckIcon,
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map)
    }
    boot()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      mapRef.current?.remove()
      mapRef.current = null
      truckRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!play) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // One clock per mount: stage changes must not teleport the truck back.
    startRef.current ??= performance.now()
    const start = startRef.current
    const durationMs = 8000
    const tick = (now: number) => {
      const truck = truckRef.current
      if (!truck) {
        // Leaflet still booting (dynamic import) — try again next frame.
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const t = reduce
        ? progressCap
        : Math.min(progressCap, ((now - start) / durationMs) * progressCap)
      truck.setLatLng(routePoint(t))
      if (t < progressCap && !reduce) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [play, progressCap])

  return (
    <div
      ref={holderRef}
      role="img"
      aria-label={label}
      className={cn("demo-map w-full bg-surface-2", heightClass, className)}
    />
  )
}

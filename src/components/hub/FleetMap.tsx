"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import type { TruckPosition } from "@/lib/hub/fleet"

/** Live fleet map — Leaflet + OpenStreetMap tiles (free, no API key). */
export function FleetMap({ positions }: { positions: TruckPosition[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!containerRef.current || mapRef.current) return
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [44.5, -110],
        zoom: 4,
        scrollWheelZoom: true,
      })
      mapRef.current = map

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const bounds: [number, number][] = []
      for (const pos of positions) {
        const marker = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#E0392F;color:#fff;font-weight:800;font-size:11px;padding:3px 7px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);white-space:nowrap;">#${pos.unit_number}</div>`,
            iconSize: [0, 0],
            iconAnchor: [20, 12],
          }),
        }).addTo(map)
        marker.bindPopup(
          `<strong>Truck #${pos.unit_number}</strong><br/>${pos.driver_name ?? "No driver"}<br/>` +
            `<span style="color:#666">${new Date(pos.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>`
        )
        bounds.push([pos.lat, pos.lng])
      }
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 })
      }
    }

    init()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // positions are server-rendered per request; re-mount handles updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-[60vh] min-h-[360px] w-full rounded-2xl border border-white/10 overflow-hidden z-0"
      aria-label="Fleet map"
    />
  )
}

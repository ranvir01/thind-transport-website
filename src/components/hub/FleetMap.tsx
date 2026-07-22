"use client"

import { useEffect, useRef } from "react"
import "leaflet/dist/leaflet.css"
import type { TruckPosition } from "@/lib/hub/fleet"

/** Live fleet map — Leaflet with Mapbox tiles when NEXT_PUBLIC_MAPBOX_TOKEN is set, else free OSM tiles. */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
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

      if (MAPBOX_TOKEN) {
        L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
          {
            maxZoom: 20,
            tileSize: 512,
            zoomOffset: -1,
            attribution:
              '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }
        ).addTo(map)
      } else {
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)
      }

      const bounds: [number, number][] = []
      for (const pos of positions) {
        const marker = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({
            className: "",
            // iconSize [0,0] gives the Leaflet wrapper zero width — without
            // width:max-content the pill collapses and the label spills onto the map.
            html: `<div style="width:max-content;background:#F26419;color:#fff;font-weight:800;font-size:11px;padding:3px 7px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);white-space:nowrap;">#${pos.unit_number}</div>`,
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
      className="h-[60vh] min-h-[360px] w-full rounded-2xl border border-border overflow-hidden z-0"
      aria-label="Fleet map"
    />
  )
}

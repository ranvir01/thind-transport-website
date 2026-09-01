# Thind Transport — Generated Media Inventory

AI-generated photographic assets. Style: golden-hour / overcast PNW light, navy/red/gold grade,
photorealistic, no text baked in, no identifiable faces. New raster assets must be WebP ≤ 350KB
(heroes ≤ 600KB). Update this file when adding or re-pointing assets.

## Video

| File | Used in |
|---|---|
| `hero-american-fleet.mp4` | `cinematic/HeroBackground.tsx` (homepage hero), `fleet/page.tsx` (optional hero video) |

## WebP (current generation — preferred)

| File | Subject | Used in |
|---|---|---|
| `hero-poster.webp` | Hero video poster | `cinematic/HeroBackground.tsx` |
| `hero-cascadia-highway.webp` | Cascadia on PNW highway, golden hour | `fleet/page.tsx` hero, `about/page.tsx` CTA band, `routes/page.tsx` hero |
| `fleet-lineup-kent.webp` | 5-truck lineup at Kent yard | `fleet/page.tsx` yard band, `about/page.tsx` footprint card |
| `driver-cab-interior.webp` | Over-shoulder sleeper cab at golden hour | `home/EquipmentSection.tsx` comfort band, `pay-breakdown/page.tsx` CTA band, `benefits/page.tsx` hero |
| `truck-mountain-pass.webp` | Truck climbing pass, Rainier behind | `about/page.tsx` hero, `routes/page.tsx` CTA band |
| `driver-pretrip-walkaround.webp` | Driver pre-trip inspection (no face) | `about/page.tsx` story photo, `testimonials/page.tsx` CTA band |
| `truck-night-highway.webp` | Night lane outside Seattle | `pay-breakdown/page.tsx` hero, `pay-rates/page.tsx` hero |
| `yard-morning-kent.webp` | Sunrise yard, Rainier, coffee on truck step | `home/ThindPromise.tsx`, `benefits/page.tsx` CTA band |
| `dispatch-desk-kent.webp` | Dispatcher at desk, blurred load board (no face) | `home/OperationSection.tsx` |

## PNG (earlier generation — still in use)

| File | Used in |
|---|---|
| `dispatch-team.png` | `home/DispatchBand.tsx` |
| `truck-cascadia.png` | `home/EquipmentSection.tsx`, `fleet/page.tsx` truck card |
| `truck-cascadia-2.png`, `truck-volvo.png`, `truck-volvo-2.png` | `fleet/page.tsx` truck cards |
| `trailer-dry-van.png`, `trailer-reefer.png`, `trailer-flatbed.png` | `home/EquipmentSection.tsx`, `fleet/page.tsx` trailer cards |
| `fmcsa-compliance-badge.png` | `home/TrustStrip.tsx` |

Deleted 2026-08-30 as unreferenced: `driver-portrait-1/2/3.png` (their component,
`SuccessStoriesSection`, was removed with the fabricated testimonials),
`fleet-kent-wa.png` (no `/testimonials` route exists), `hero-fleet-sunset.png`,
`fleet-aerial-view.png`, `fleet-manager.png`, `images/loadoff/driver.png`, the two
`branding/image_*.png` exports (2.8 MB between them) and the eleven third-party
carrier/shipper logos. Re-shoot from `docs/real-photos-shotlist.md` if a section
needs them again.

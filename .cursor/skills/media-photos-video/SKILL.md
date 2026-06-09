---
name: media-photos-video
description: Standards for photos, video, and image assets on the Thind Transport website - where assets live, naming, next/image usage, video hero rules, optimization, and what subjects to depict. Use when adding, generating, replacing, or optimizing any image or video, or when editing components that render media.
---

# Photos & Video Standards

## Asset Locations

| Path | Contents |
|---|---|
| `public/images/generated/` | All photographic content + hero video. Tracked in `IMAGE_CHECKLIST.md` (update it when adding/using assets). |
| `public/branding/` | Logos, business cards, tagline SVGs. |
| `public/logos/` | Partner/shipper logos (Amazon, Walmart, etc.) — SVG only, monochrome treatment. |

Naming: `kebab-case` describing subject (`truck-cascadia-2.png`, `dispatch-team.png`). Number variants with `-2`, `-3`.

## Subject Matter (brand-correct imagery)

- **Show:** the actual fleet (Freightliner Cascadia, Volvo), Kent WA yard, drivers/dispatch as people (current generated portraits avoid identifiable faces — keep that convention unless real staff photos with consent arrive), Pacific Northwest highways, trailer types (dry van, reefer, flatbed).
- **Avoid:** generic stock-photo handshakes, watermarked images, exotic trucks the fleet doesn't run, empty corporate offices.
- Every major page needs at least one real-feeling photo or video. Text-only pages read as fake to drivers.
- When generating new images, match the existing set: golden-hour or overcast PNW light, navy/red/gold grade, photorealistic, no text baked into images.

## Rendering Images

- Always `next/image` (`<Image>`), never raw `<img>`. Required: meaningful `alt`, correct `width`/`height` or `fill` + `sizes` to prevent layout shift.
- Above-the-fold hero images: `priority` prop. Everything else lazy-loads (default).
- Decorative/background images: `alt=""` and `aria-hidden`.
- Overlay gradients (`from-navy/90`) for text legibility — never place text on raw photos.

## Video Rules

- Hero video pattern (`hero-american-fleet.mp4` in cinematic Hero): `autoPlay muted loop playsInline`, `poster` set to a matching still, `preload="metadata"`.
- Budget: hero video ≤ 6MB, ≤ 15s loop, 1080p max, no audio track. Compress with: `ffmpeg -i in.mp4 -vcodec libx264 -crf 28 -an -movflags +faststart out.mp4`.
- On mobile or `prefers-reduced-motion`/save-data, render the poster image instead of the video.
- New videos: same subjects as photos (fleet rolling, yard, dispatch). One video per page maximum.

## Optimization (run before committing any new raster asset)

`sharp` is installed. Convert large PNGs to web-appropriate sizes:
```bash
node -e "require('sharp')('in.png').resize({width:1920,withoutEnlargement:true}).webp({quality:80}).toFile('out.webp')"
```
- Photographic content: WebP (quality ~80). Keep PNG only for transparency.
- No source image wider than 1920px (2400px for full-bleed heroes).
- Target: every image file ≤ 350KB; hero ≤ 600KB.

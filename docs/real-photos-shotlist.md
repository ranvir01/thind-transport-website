# Real-photo shot list — replace the AI placeholders with the actual fleet

The site currently runs on generated imagery in `public/images/generated/`.
Every file below is referenced by exact name, so a real photo saved over the
placeholder (same filename, roughly same crop) goes live site-wide on the next
deploy with zero code changes. A phone camera is plenty — golden hour (first/
last hour of daylight) makes trucks look their best, and slightly imperfect
framing reads MORE authentic, not less.

| Replace this file | The shot | Where it shows |
|---|---|---|
| `fleet-lineup-kent.webp` | 4–6 Cascadias nose-out in a row at the Kent yard, shot low from ~30° | Homepage photo band #1 |
| `truck-mountain-pass.webp` | Any truck on I-90/Snoqualmie or a scenic grade, from a safe pullout | Homepage photo band #2 |
| `hero-cascadia-highway.webp` | Lead truck rolling, 3/4 front view, motion in background | Homepage hero |
| `truck-night-highway.webp` | Truck at dusk/night, headlights on — truck stop is fine | /shippers hero |
| `fleet-kent-wa.png` | Wide yard shot with several trucks + trailers | /loadoff, fleet contexts |
| `dispatch-desk-kent.webp` | The real dispatch desk — screens, coffee, person on the phone | "How you'll run" section |
| `driver-pretrip-walkaround.webp` | A driver doing a walkaround, hand on the hood/tires | Culture sections |
| `driver-cab-interior.webp` | Clean cab interior from the driver's seat | Driver-life sections |
| `yard-morning-kent.webp` | Yard at sunrise, frost/coffee-steam era energy | Ambient sections |
| `driver-portrait-1..3.png` | Real drivers (with written permission), yard background, natural smile | Testimonials |

Ten minutes of video worth shooting on the same trip (landscape, phone):
- 10s slow walk past the truck lineup → future homepage hero video
- 15s dispatch answering a call → /shippers trust clip
- 20s driver tapping "Confirm dispatch" in the LoadOff app → /loadoff

Guidelines: no filters (the site applies one consistent grade), wipe the
number plates or leave them — either is fine, get faces only with permission,
and prefer WebP ≤ 300KB (`npx sharp-cli` or any converter; the fleet can
compress anything dropped in as PNG/JPG — just keep the filename).

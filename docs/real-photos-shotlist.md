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
| `dispatch-desk-kent.webp` | The real dispatch desk — screens, coffee, person on the phone | "How you'll run" section |
| `driver-pretrip-walkaround.webp` | A driver doing a walkaround, hand on the hood/tires | Culture sections |
| `driver-cab-interior.webp` | Clean cab interior from the driver's seat | Driver-life sections |
| `yard-morning-kent.webp` | Yard at sunrise, frost/coffee-steam era energy | Ambient sections |

Ten minutes of video worth shooting on the same trip (landscape, phone):
- 10s slow walk past the truck lineup → future homepage hero video
- 15s dispatch answering a call → /shippers trust clip
- 20s driver tapping "Confirm dispatch" in the LoadOff app → /loadoff

Guidelines: no filters (the site applies one consistent grade), wipe the
number plates or leave them — either is fine, get faces only with permission,
and prefer WebP ≤ 300KB (`npx sharp-cli` or any converter; the fleet can
compress anything dropped in as PNG/JPG — just keep the filename).

---

## Interim: vetted real photographs (added 2026-08-14)

The site currently ships AI-generated imagery from `public/images/generated/`.
Until the shots above exist, these are **real photographs** under the
[Unsplash License](https://unsplash.com/license) — free for commercial use, no
permission or attribution required (attribution is still good manners, and the
photographers are named below).

They were selected but **not** installed: this sandbox's network policy blocks
every image host (`images.unsplash.com`, `res.cloudinary.com`, `picsum.photos`
all refuse CONNECT), so the bytes could not be fetched. Downloading them is a
two-minute job on any unrestricted machine.

| Target file | Unsplash ID | What it is | Photographer |
|---|---|---|---|
| `hero-cascadia-highway` | `P0bVatS8Jdw` | Two tractor-trailers on a highway, mountains behind | Bhargav Panchal |
| `truck-mountain-pass` | `g_FizakXz50` | Semi on a scenic highway near mountains | Mason Gemelke |
| `truck-night-highway` | `lz0guF9OVxU` | Truck headlights at night | paws and prints |
| `driver-cab-interior` | `TH6IjM_b_vg` | Driver in a cab, large west-coast mirror | Polina Kuzovkova |
| `fleet-lineup-kent` | `O8dcG8oniJU` | Tractor-trailer parked, three-quarter view | Christopher Paul High |

Download: `https://unsplash.com/photos/<ID>/download` — put them in
`public/images/stock/` (NOT `generated/`, the folder name is itself a claim)
and repoint the components.

### The rule that matters more than which photo

A stock photo of somebody else's Peterbilt presented as "our truck" is a
**worse** problem than an obviously-synthetic one — it is a real, identifiable
vehicle belonging to another company, captioned as Thind's. Every alt text on
non-Thind imagery now says "Illustration of…" for exactly this reason. When a
real photo of a real Thind truck goes in, the caption can name the company
again — and only then.

Owner photos beat both. Ten minutes with a phone at the yard closes this
permanently, and a slightly crooked real photo of your own truck sells better
than a perfect render of a truck that does not exist.

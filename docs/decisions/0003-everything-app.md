# 0003 — The "everything app" surface: what the web can keep inside, and what it can't

**Status:** accepted · 2026-08-04
**Owner request:** "the user does not need to leave the app no matter what — DAT login,
regulations, Google, anything pops up inside, like X — fully custom for trucking."

## The constraint that shapes everything

X, WeChat, and every "super app" keep users inside because a **native app owns a
webview** — a browser the app embeds and controls, which can be pointed at any site.
A web app (which LoadOff is, PWA included) has no webview. Its only embedding
primitive is the iframe, and the *target site* decides whether an iframe renders:
DAT, Google, banks, and most SaaS send `X-Frame-Options: DENY` or
`Content-Security-Policy: frame-ancestors 'none'`, and the frame shows a refusal,
not the site. No amount of client code changes this — it is the site's server
refusing, by design, largely as clickjacking defense.

So "everything inside" decomposes into four honest strategies, strongest first:

1. **Integrate the data, not the page.** DAT search inside LoadOff's own UI via the
   DAT API (built, awaiting seat), ELD feeds via aggregators, fuel-card feeds, QBO.
   This is *better* than an embedded DAT tab — the load lands in the dispatch
   board. This is the real X-pattern: X doesn't embed news sites' pages for the
   feed, it ingests content into its own UI.
2. **Embed what we own.** Same-origin pages (calculators, state guides, resources)
   iframe perfectly. The Toolbox (`/hub/toolbox`) does this today.
3. **Sheet what we don't.** `window.open` keeps LoadOff running behind the opened
   page. On the installed iOS app this is the in-app browser sheet — close it and
   you are exactly where you were, which IS the X in-app-browser experience,
   delivered by the OS. The Toolbox labels these honestly ("opens on top").
4. **Go native when justified.** A Capacitor/native shell wrapping the existing
   app would add a true webview (real embedded DAT login, à la X). That is a
   product-strategy decision with real costs (app-store review, update latency,
   a second build pipeline) — research queued, not assumed.

## What shipped now

- `/hub/toolbox` — the stay-inside surface: our calculators/guides embedded
  in-frame; official references (eCFR 395/396/382, FMCSA ELD registry, SAFER,
  WSDOT/TripCheck/Idaho 511 pass reports, NWS, EIA diesel, IFTA) as sheets.
  Registry is data (`lib/hub/workbench.ts`); promoting an external site to
  in-frame requires header verification, enforced by test.
- Reachable from ⌘K and the nav's More list like every other screen.

## Customization (owner idea #2) — what exists, what's next

Already shipped and easy to miss: per-user **theme** (indigo/teal/ink × light/dark,
HubAppearanceMenu), **small-carrier mode** trimming nav + ⌘K to what a small fleet
runs, per-tenant **branding accent** flowing into PDFs/manifest/portal, **pay rules
as data** (per-driver programs without code), **import templates** (column maps
saved per carrier), per-carrier integration credentials. The pattern to extend —
"features as data, per-tenant flags, never forks" — is the same one the provider
registry uses. Next candidates (backlog, not yet built): per-role dashboard tiles,
per-carrier nav pinning, per-driver app language, feature flags table read by the
shell. The research prompts cover the platform-shaped version (mini-app/plugin
architecture) properly.

## Revisit when

- A DAT/Truckstop seat exists → measure whether in-app search kills the "embed
  DAT" want entirely (expected: yes).
- Carrier count or driver count makes the native-shell webview worth its costs.
- Any external resource's headers are verified frameable → flip its registry row.

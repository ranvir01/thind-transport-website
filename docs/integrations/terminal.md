# Terminal (withterminal.com) — TSP aggregator for ELD/telematics

Researched: 2026-07-08 (refresh; first pass 2026-07-06). Status: **built adapter**, live in
`src/lib/hub/telematics.ts`
(`terminalSource`) and wired into the 30-min cron sync (`runTelematicsSync`) and the manual
"sync now" action (`src/app/hub/_actions/integrations.ts`). This is the only provider in
`docs/integrations/scout-rotation.md` with real outbound API calls at write time, so an
API change here is the one that can silently break production.

## Why we use it

TruckX (the driver-facing ELD our carriers already run) has no public API of its own — it only
exposes data through TSP aggregators. Terminal is the first (and so far only) adapter; the code
comment in `telematics.ts` notes TruckerCloud as a drop-in second aggregator, not yet built.
Terminal bills itself as "Plaid for telematics data in commercial trucking": one normalized API
in front of many underlying ELD/GPS providers, plus a hosted auth-link flow so the carrier
connects their TruckX account without us handling raw ELD provider credentials.

## Auth model (as implemented, confirmed against our code)

- Base URL: `https://api.withterminal.com/tsp/v1`, overridable via `TERMINAL_API_BASE` (not
  currently listed in `.env.example` — worth adding if a future docs pass touches that file).
- Two credential fields stored per carrier, AES-256-GCM encrypted (`src/lib/hub/credentials.ts`):
  `apiKey` and `connectionToken`.
- Every request sends both: `Authorization: Bearer {apiKey}` **and** a custom
  `Connection-Token: {connectionToken}` header. This matches Terminal's documented model of a
  per-application API key plus a per-end-customer "connection" token issued after the carrier
  completes Terminal's hosted Connect/link flow (their public docs describe a "Link" component
  used to standardize auth across underlying TSPs — analogous to Plaid Link).
- No OAuth token refresh in our code — both values are treated as long-lived and only rotate if
  the owner re-enters them via Settings → Integrations.

## Endpoints we call

| Our code | Purpose | Response mapping |
|---|---|---|
| `GET /vehicles?expand=latestLocation` | Vehicle list + last known position/odometer | `id`, `name`/`licensePlate`, `latestLocation.{latitude,longitude,odometer,locatedAt}` → `position_pings` |
| `GET /hos/available-time` | Driver HOS remaining time | `driverId`, `driverName`, `dutyStatus`, `driveRemaining`/`shiftRemaining`/`cycleRemaining` (seconds) → `hos_snapshots` (converted to minutes) |

Both are documented by Terminal as "real-time" endpoints — i.e., Terminal makes a live call
through to the underlying TSP (TruckX) at request time rather than serving a cache, so latency
depends on the upstream provider, not just Terminal.

## Rate limits

**Still could not get numeric rate-limit figures.** `docs.withterminal.com` still returns HTTP 403
to direct automated fetches (confirmed again this cycle via `WebFetch` — same Cloudflare-style
block as 2026-07-06), so this remains search-snippet-only, not a full page read. No numeric
requests-per-minute/hour figure surfaced in any indexed snippet this cycle either. Our adapter
still has no rate-limit handling at all — a single `fetch` per vehicle/HOS pull with a 15s
timeout, any non-2xx throws and aborts that sync run (`runTelematicsSync` swallows nothing; a
thrown error in `source.vehicles()`/`source.hos()` propagates up through the cron job). If
Terminal starts 429-ing under load (more trucks, more frequent syncs), the cron job has no
backoff/retry — it just fails that cycle silently until the next scheduled run.

**Backlog** (not urgent — no confirmed breaking change, but a real robustness gap): add basic
429/5xx retry-with-backoff to `terminalSource`'s `request()` helper, and surface sync failures
somewhere visible (currently a failed cron run has no owner-facing alert).

## Sandbox

**Confirmed this cycle (new finding, corrects the 2026-07-06 pass):** Terminal does publish a
sandbox — `docs.withterminal.com/api-reference/environments` states Terminal "provides a sandbox
and production environment for you to test and launch your integration with our Unified APIs"
(confirmed via indexed search snippet; the page itself is still 403'd to direct fetch). The
previous research pass said "no public sandbox/test-credential program found" — that was wrong,
or at least incomplete; a sandbox environment exists, we just don't yet know how a carrier/we
provision sandbox credentials (whether it's a self-serve toggle vs. requesting a test connection
from Terminal support). Nothing in our code (`terminalSource` / `TERMINAL_API_BASE`) currently
points at a sandbox host or reads an environment flag — we only ever hit the production base URL.

**Backlog:** wire up a sandbox-mode toggle (env var or per-carrier flag pointing `TERMINAL_API_BASE`
at the sandbox host once we confirm its URL) so this adapter can be exercised end-to-end without
a live TruckX-connected vehicle — useful for onboarding QA and for catching response-shape drift
before it hits a real carrier's cron sync.

## Webhooks (new finding — not used by our adapter)

Terminal's docs describe a webhook system (`docs.withterminal.com/terminal-platform/webhooks`)
built on Svix: HTTP POST callbacks on events, signature verification, a dashboard for delivery
status/replay. Our integration is 100% poll-based (30-min cron, no webhook receiver) — this
wasn't mentioned in the 2026-07-06 pass. Polling is simpler and matches the pattern the other
integrations lane already uses (`src/app/api/hub/webhooks/**` exists for QBO/factor, not
telematics), so this isn't a defect, but it's worth flagging as a latency/cost opportunity: a
webhook-driven position update would beat waiting up to 30 minutes for the next cron tick, and
would cut API calls to only when something actually changed.

**Backlog** (roadmap-lane sized, not urgent): evaluate adding a Terminal webhook receiver
(`src/app/api/hub/webhooks/terminal`) for near-real-time vehicle/HOS updates, falling back to the
existing 30-min poll as a reconciliation pass. Needs Svix signature verification wired the same
way the existing webhook routes handle it.

## Pricing / vendor risk

No public per-request or per-vehicle pricing found (typical for aggregator APIs — usage-based,
quoted per deal). Vendor context worth knowing for risk assessment:
- Y Combinator S23 (Toronto), founded 2023 by Raghav Midha (CEO) and Connor Giles (CTO),
  formerly of NorthOne.
- Raised a $3.1M USD ($4.2M CAD) seed round (Dec 2023, led by Golden Ventures per BetaKit/
  FreightWaves coverage) — no Series A announced as of this research date.
- Grown from ~13 to ~52 employees per public profiles — still small, single-vendor dependency
  for all our live GPS/HOS data with no second aggregator wired up (TruckerCloud is a stub).

This is a normal seed-stage SaaS risk profile, not a red flag, but it's worth the owner knowing
we have zero redundancy if Terminal has an outage or changes terms — the system already degrades
gracefully to the CSV import path per the code comments, which is the right mitigation already
in place.

## What this scout could and couldn't verify

- **Confirmed from source**: exact endpoints, headers, base URL, response field names our code
  expects, encryption/storage of credentials, cron wiring, graceful CSV fallback when
  disconnected.
- **Confirmed from public search (2026-07-06 pass)**: product positioning, hosted Link/Connect
  auth pattern, "real-time" (live-passthrough, not cached) nature of the vehicles/HOS endpoints,
  company funding/size.
- **Newly confirmed this cycle (2026-07-08)**: the Authentication doc page content matches our
  implementation verbatim (Bearer token + `Connection-Token` header, connection tokens issued by
  the linking flow); a sandbox environment exists (previous pass said none was found — corrected
  above); a Svix-based webhook system exists that our adapter doesn't use; a weekly changelog page
  exists (`docs.withterminal.com` — "releases dozens of updates a day," publishes a changelog
  every week) — worth a periodic skim for breaking API changes even between full scout cycles.
- **Still not verifiable**: exact rate-limit numbers, current usage-based pricing, and whether the
  `/vehicles` or `/hos/available-time` response shape has changed since this adapter was written
  (Phase 6, commit `484fb92`, 2026-06-11) — `docs.withterminal.com` still returns HTTP 403 to
  direct automated fetches (Cloudflare bot protection), so only search-indexed snippets were
  readable, not the full current page content for those two specific endpoint references.

**Backlog** (urgent-leaning, unchanged from last cycle — still a verification gap, not a
confirmed break): someone with interactive browser access (not blocked by Cloudflare) should log
into `docs.withterminal.com` and diff the `/vehicles` and `/hos/available-time` request/response
shape against what `src/lib/hub/telematics.ts` expects, and check the changelog for anything
affecting those two endpoints since 2026-06-11. This scout still could not rule out drift —
absence of evidence isn't evidence of no breaking change, and this is the one adapter actually
moving live GPS/HOS data into dispatch and IFTA-adjacent workflows.

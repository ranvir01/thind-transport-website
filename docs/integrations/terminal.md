# Terminal (withterminal.com) — TSP aggregator for ELD/telematics

Researched: 2026-07-19 (third pass; prior 2026-07-08, first 2026-07-06). Status: **built
adapter**, live in `src/lib/hub/telematics.ts` (`terminalSource`), wired into the **daily**
telematics cron (`/api/hub/cron/telematics-sync`, `0 12 * * *` UTC per `vercel.json`) and the
manual "sync now" action (`src/app/hub/_actions/integrations.ts`). This is the only provider in
`docs/integrations/scout-rotation.md` with real outbound API calls at write time, so an
API change here is the one that can silently break production.

**Headline from this pass: no adapter-breaking change found.** The auth model (Bearer +
`Connection-Token`) and the `latestLocation` / HOS available-time data models are still exactly
what our code expects, per current search-indexed doc snippets. New findings below: how sandbox
credentials are actually provisioned, a cheap credential health-check endpoint, official Link
embed SDKs on npm, and a cron-cadence correction to this doc itself.

## Cron cadence — doc correction (2026-07-19)

Earlier versions of this doc said the adapter ran on a "30-min cron". That predates the
Hobby-plan daily-only fix: `vercel.json` schedules `/api/hub/cron/telematics-sync` at
`0 12 * * *` — **once a day at 12:00 UTC**. Practical consequence: a vehicle position or HOS
clock can be up to ~24h stale between syncs unless someone presses "sync now" in Settings →
Integrations. That materially strengthens the case for the webhook receiver flagged below —
with a daily poll, webhooks are no longer just a latency optimization, they're the difference
between live dispatch data and yesterday's snapshot.

## Why we use it

TruckX (the driver-facing ELD our carriers already run) has no public API of its own — it only
exposes data through TSP aggregators. Terminal is the first (and so far only) adapter; the code
comment in `telematics.ts` notes TruckerCloud as the drop-in second aggregator
(`truckerCloudSource`, since shipped — `activeTelematicsSource()` prefers Terminal). Terminal
bills itself as "Plaid for telematics data in commercial trucking": one normalized API in front
of many underlying ELD/GPS providers (marketing now claims ~316 providers / 290 maintained
integrations, up from earlier counts), plus a hosted auth-link flow so the carrier connects
their TruckX account without us handling raw ELD provider credentials.

**TruckX partnership health (checked 2026-07-19):** TruckX itself actively markets the Terminal
integration on truckx.com (two dedicated pages: a glossary entry and an announcement post,
"WithTerminal connects to multiple providers so that TruckX only needs to integrate once" —
vehicle locations, HOS, driver data, performance, safety events). The underlying
TruckX-via-Terminal relationship looks healthy, not deprecated.

## Auth model (reconfirmed 2026-07-19, unchanged)

- Base URL: `https://api.withterminal.com/tsp/v1`, overridable via `TERMINAL_API_BASE` (not
  currently listed in `.env.example` — worth adding if a future docs pass touches that file).
- Two credential fields stored per carrier, AES-256-GCM encrypted (`src/lib/hub/credentials.ts`):
  `apiKey` and `connectionToken`.
- Every request sends both: `Authorization: Bearer {apiKey}` **and** a custom
  `Connection-Token: {connectionToken}` header. Current doc snippets for the Connections API
  confirm this exact pattern verbatim (per-application Bearer token + per-end-customer
  connection token issued after the carrier completes Terminal's hosted Connect/Link flow).
- No OAuth token refresh in our code — both values are treated as long-lived and only rotate if
  the owner re-enters them via Settings → Integrations.
- **New finding:** `GET /connections/current` (`api.withterminal.com/tsp/v1/connections/current`)
  returns the connection the presented token belongs to. This is a cheap, side-effect-free
  credential health-check — a natural "Test connection" button target for Settings →
  Integrations, much lighter than pulling the whole vehicle list to see if creds work.
- **New finding:** Terminal publishes official Link-embed SDKs on npm — `@terminal-api/link-sdk`
  and `@terminal-api/link-react` (both v0.5.0, released 2025-06-03; registry metadata touched
  2026-07-09, so the package is maintained, low release cadence). Today our flow is
  "owner pastes a connectionToken they got out-of-band"; embedding Link would let the carrier
  self-serve connect TruckX from inside our Settings page and hand us the token
  programmatically. Roadmap-lane sized, not required for activation.

## Endpoints we call

| Our code | Purpose | Response mapping |
|---|---|---|
| `GET /vehicles?expand=latestLocation` | Vehicle list + last known position/odometer | `id`, `name`/`licensePlate`, `latestLocation.{latitude,longitude,odometer,locatedAt}` → `position_pings` |
| `GET /hos/available-time` | Driver HOS remaining time | `driverId`, `driverName`, `dutyStatus`, `driveRemaining`/`shiftRemaining`/`cycleRemaining` (seconds) → `hos_snapshots` (converted to minutes) |

Terminal's models overview still lists `latestLocation` ("the latest record of a vehicle's
location according to the provider") and an HOS available-time model ("available time left on
the clock for a specific driver") — the two models our mapper depends on both still exist under
those names as of this pass. Both endpoints are documented as "real-time": Terminal makes a live
call through to the underlying TSP (TruckX) at request time rather than serving a cache, and
their docs note availability "can be affected by provider API rate limits or outages" — i.e.,
upstream flakiness surfaces as our request failing, which feeds directly into the retry gap
below.

## Rate limits

**Numeric figures still unobtainable.** Terminal's docs nav now includes a dedicated "Rate
Limits" page (`docs.withterminal.com/api-reference/rate-limits` — new since our first pass), but
`docs.withterminal.com` remains unreadable from this environment: this cycle the block is at the
network-policy level (proxy CONNECT 403 to the whole host), on top of the Cloudflare bot
protection seen in earlier passes. No numeric requests-per-minute figure has ever surfaced in an
indexed snippet. Our adapter still has no rate-limit handling at all — a single `fetch` per
vehicles/HOS pull with a 15s timeout; any non-2xx throws and aborts that sync run
(`runTelematicsSync` swallows nothing). With the cron now confirmed **daily**, a failed run
means a ~24h data gap, not a 30-minute one — which raises the stakes on both retry handling and
failure visibility.

**Backlog** (not urgent — no confirmed breaking change, but a real robustness gap, now with a
bigger blast radius than previously documented): add basic 429/5xx retry-with-backoff to
`terminalSource`'s `request()` helper, and surface sync failures somewhere owner-visible
(currently a failed cron run has no alert and the next attempt is a day away).

## Sandbox (provisioning path now known — new finding 2026-07-19)

Terminal provides sandbox and production environments; the sandbox mirrors production **but is
limited to mock data**. This pass pinned down how credentials are provisioned (the open question
from 2026-07-08): existing Terminal customers get a **sandbox secret key + publishable key from
the Sandbox Dashboard**, and the hosted Link flow has a sandbox counterpart at
`link.sandbox.withterminal.com`. So sandbox access is dashboard-self-serve once we're a Terminal
customer — not a support-ticket request. The sandbox API host itself was not visible in any
snippet; given the `link.sandbox.withterminal.com` pattern it is *very likely*
`api.sandbox.withterminal.com`, but treat that as inferred, not confirmed — verify in the
dashboard before wiring anything.

Nothing in our code (`terminalSource` / `TERMINAL_API_BASE`) currently points at a sandbox host
or reads an environment flag — we only ever hit the production base URL. Because the base URL is
already env-overridable, sandbox mode needs zero code: set `TERMINAL_API_BASE` to the sandbox
host and paste sandbox keys into Settings → Integrations.

**Backlog:** once a Terminal account exists, pull sandbox keys from the Sandbox Dashboard,
confirm the sandbox API host, and run the adapter end-to-end against mock data (onboarding QA +
response-shape drift detection without touching a real carrier's sync).

## Webhooks (still unused by our adapter)

Terminal's webhook system (`docs.withterminal.com/terminal-platform/webhooks`) is built on Svix:
HTTP POST callbacks, signature verification, retry with idempotency expectations ("your endpoint
should be idempotent and able to handle duplicate events gracefully"), a dashboard for delivery
status/replay. This pass surfaced a per-event reference catalog
(`docs.withterminal.com/api-reference/webhook-events/…` — e.g. `connection.completed`,
`vehicle.removed`), with payloads carrying the full related entity. Our integration is 100%
poll-based — and with the poll now confirmed daily rather than every 30 minutes, a
webhook-driven update path has been upgraded from "latency nicety" to the only realistic way to
get same-hour position/HOS data without burning manual "sync now" clicks.

**Backlog** (roadmap-lane sized; priority raised by the daily-cron correction): evaluate a
Terminal webhook receiver (`src/app/api/hub/webhooks/terminal`) for near-real-time vehicle/HOS
updates, keeping the daily poll as a reconciliation pass. Needs Svix signature verification;
`connection.completed` is also the natural trigger to flip an integration to "connected" if we
ever embed Link.

## Pricing / vendor risk

Still no public per-request or per-vehicle pricing (typical for aggregator APIs — usage-based,
quoted per deal; sales contact `connect@withterminal.com`, support `support@withterminal.com`).
Vendor context, rechecked this pass:
- Y Combinator S23 (Toronto), founded 2023 by Raghav Midha (CEO) and Connor Giles (CTO),
  formerly of NorthOne.
- **Still seed-stage as of 2026-07-19**: the $3.1M USD seed (Dec 2023, led by Golden Ventures)
  remains the only announced round — no Series A across Crunchbase/Tracxn/press. Roughly 2.5
  years post-seed with no follow-on announced is worth watching: it could mean revenue-funded
  growth (their integration/provider counts keep climbing, and the TruckX partnership is
  actively co-marketed) or a tightening runway. Not a red flag, but the single-vendor exposure
  note below is doing real work.
- Mitigation already in place and improved since the last pass: TruckerCloud is no longer a
  stub — `truckerCloudSource` shipped, and `activeTelematicsSource()` falls back to it, so we
  have a second aggregator path (pending real TruckerCloud credentials) plus the CSV import
  fallback.

## What this scout could and couldn't verify

- **Confirmed from source (code)**: exact endpoints, headers, base URL, response field names our
  code expects, encryption/storage of credentials, daily cron wiring (`vercel.json`), graceful
  CSV fallback, TruckerCloud fallback ordering.
- **Reconfirmed from public snippets (2026-07-19)**: Bearer + `Connection-Token` auth pattern
  (verbatim match to our implementation); `latestLocation` and HOS available-time models still
  present under those names; real-time (live-passthrough) semantics of the endpoints we call;
  Svix-based webhooks with a per-event reference catalog; sandbox exists, is mock-data-only,
  and is provisioned self-serve via the Sandbox Dashboard (secret + publishable key);
  still-seed-stage funding status; TruckX partnership actively marketed by TruckX.
- **Newly found (2026-07-19)**: `GET /connections/current` as a credential health-check;
  official `@terminal-api/link-sdk` / `@terminal-api/link-react` npm packages (v0.5.0,
  2025-06-03, still maintained); dedicated Rate Limits docs page exists; sandbox Link host
  `link.sandbox.withterminal.com`; corrected this doc's stale "30-min cron" claim to the actual
  daily 12:00 UTC schedule.
- **Still not verifiable from here**: numeric rate limits (page exists, host is
  network-policy-blocked — proxy CONNECT 403, upgraded from the earlier Cloudflare-only block),
  current usage-based pricing, the exact sandbox API host, and a field-by-field diff of the
  `/vehicles` / `/hos/available-time` response shapes against `src/lib/hub/telematics.ts`
  (written Phase 6, commit `484fb92`, 2026-06-11). Model names surviving in current docs is
  good evidence against a breaking change, but not a substitute for reading the full endpoint
  pages.

**Backlog** (unchanged in kind, evidence slightly better this cycle): someone with interactive
browser access should log into `docs.withterminal.com`, read `api-reference/rate-limits`, and
diff the `/vehicles` and `/hos/available-time` request/response shapes against what
`src/lib/hub/telematics.ts` expects, plus skim the weekly changelog for anything affecting those
two endpoints since 2026-06-11. Three scout passes have now failed to read the full docs from
this environment; that check needs a human or an unblocked network path.

# TruckerCloud ELD — scouting notes

Status: **adapter shipped, feed shape still unconfirmed.** TruckerCloud (truckercloud.com) is the
drop-in second aggregator `src/lib/hub/telematics.ts`'s header comment has promised since
Terminal shipped — same `TelematicsSource` interface (`connected`/`vehicles`/`hos`), its own
credentials. `activeTelematicsSource()` in that file picks whichever of the two a carrier
actually connected (Terminal wins if somehow both are).

_Last researched: 2026-07-20 (5th pass). No adapter-breaking change observed — but the vendor's
own site, docs, help center, and every trade-press mirror remain HTTP 403 to this environment,
so auth model / token endpoint / rate limits / sandbox are still guesses, not page reads. The
one substantive correction this pass: **carrier/TMS API access is NOT foreclosed** — "Carrier
TMS" is still a named, marketed TruckerCloud solution (see Market positioning), which softens the
earlier "redirect to Axle" contingency._

## Why TruckerCloud specifically

TruckX (the ELD our carriers already run) has no public API of its own — it only exposes data
through TSP aggregators, and TruckerCloud is the second one after Terminal. Public marketing
describes TruckerCloud as an "API-based telematics data aggregator" fronting a large roster of
underlying ELD/camera providers under one normalized API, the same value proposition as Terminal.
Provider-count marketing is inconsistent across their pages — snippets this pass ranged from "30+
connected ELDs" (Open Visibility Network announcement) through "over 50 ELD providers"
(developer-platform copy) to **"175+ ELDs and Cameras"** (current headline claim). Treat "175+"
as the current top-line number; the point that matters for us is unchanged: TruckX is a named,
supported integration with its own connector page, not an inferred one.

**Correction still standing (from 2026-07-10):** an even earlier pass claimed TruckerCloud's
product is "branded the Apollo API". That was a misreading — **Apollo ELD is one of the ELD
providers TruckerCloud aggregates** (its own connector page at
`truckercloud.com/integrations/connect-apollo-eld`, alongside `connect-truckx-eld-d`,
`connect-fleetcomplete-eld`, `connect-eroad-eld`, etc.). No public brand name for TruckerCloud's
own API has ever surfaced; don't go looking for "Apollo API" docs. **Note:** the code comment in
`telematics.ts` (`* TruckerCloud (truckercloud.com, "Apollo API") ...`) still carries this stale
"Apollo API" label — a code fix, so it belongs to the integrations lane, filed as a Backlog item
below.

## Market positioning — insurer-primary, but carrier/TMS still marketed (2026-07-20 pass)

The insurer repositioning noted in earlier passes **continued and deepened through 2025** — every
new public partnership this pass is insurer-side:

- **RLI Transportation** (division of RLI Insurance) — telematics/camera data partnership (2025).
- **Cable Insurance** — named TruckerCloud its "strategic telematics partner" (May 15, 2025).
- **QEO Insurance Group** — underwriting / loss-control / claims analytics (Sept 2025).
- **Sentry** — lets trucking companies share already-collected driving data with the insurer
  (Oct 21, 2025).
- **Fusable Risk Intelligence** — TruckerCloud telematics embedded in Fusable's Central Analysis
  Bureau risk platform.

Homepage still titles itself **"Auto Insurance Telematics Aggregator"**, and the marketed
customer is the commercial-auto insurer. Backing unchanged: **Rule 1 Ventures** (2021), CEO
Spencer Mitchell, Atlanta; **no acquisition or new funding round** surfaced through mid-2026
(Tracxn/PitchBook/Crunchbase profiles all still show the single Rule 1 investment).

**But — and this revises the prior pass's worry — carrier/TMS access is explicitly still on the
menu.** Search snippets this pass repeatedly list the carrier-facing use case as a first-class
product, not a legacy leftover:

- Marketing solution list: *"Solutions that utilize TruckerCloud include: Payment Solutions,
  **Carrier TMS**, Load Visibility, Insurance, Asset Leasing and more."*
- *"Thanks to its open API, TruckerCloud simplifies and accelerates integrations, allowing for a
  seamless flow of data between ELDs and **TMSs**."*
- Open Visibility Network membership copy: carriers *"instantly connect their ELD data with their
  technology and service providers, and use telematics data to improve efficiencies by connecting
  this data to their **fleet management system**, insurers, fuel cards, and payment providers."*
- *"TruckerCloud's open API is the fastest way to integrate ELD data into your freight-tech
  solution ... one API for one clearinghouse for visibility data."*

Implication for us: our exact use case (a carrier-facing TMS pulling its own trucks'
positions/HOS) **is** a marketed use case, so a developer/API account for LoadOff should be
obtainable — the insurer branding is a go-to-market emphasis, not a foreclosure of the TMS
channel. Terminal remains the primary aggregator bet and this adapter stays the fallback, but the
prior pass's contingency ("if the insurer focus forecloses a carrier account, redirect this slot
to Axle") is **downgraded from likely to unlikely**. Still worth confirming in outreach, but no
longer the default expectation. Contact: support@truckercloud.com, help center at
`truckercloud.zendesk.com`.

## Carrier-side onboarding flow (confirmed from TruckX/TruckerCloud snippets)

How a carrier authorizes TruckX→TruckerCloud data sharing. **This is consent plumbing performed
in the ELD portal, not our API auth** — but it's the part the owner would actually perform, and
it clarifies what "credentials" mean on the carrier side:

1. In the **ELD provider's** portal (e.g. TruckX), open the **Users** page under the **Admin**
   tab. The **"Webservices API Key"** is the token in the API-key column next to your name.
2. Copy that Webservices API Key and paste it into the **api key field on TruckerCloud's
   Onboarding page** (this is what "obtain API credentials from your ELD provider" means in the
   Zendesk guides).
3. For TruckX specifically the older flow was portal → "API Key" → "+ Share API Key" → select
   partner **TruckerCloud** → select all drivers/trucks/trailers → accept terms → "Send API
   Key", then on TruckerCloud check "Utilize my existing ELD provider credentials". The
   Webservices-API-Key copy/paste above is the same consent under the current UI.

Data surfaced per their connector pages and the "A Report on ELD API Functionality" blog:
**real-time location, driver ID, hours of service, duty status, driving time, speeding/braking
events, and vehicle engine/diagnostics.** "Basic" ELD API functionality is HOS + limited vehicle
data; "advanced" adds real-time tracking + diagnostics. This is consistent with the
`vehicles` (location/odometer) / `hos` (duty status + clocks) split our adapter assumes. Instant
Carrier Onboarding (patent-pending, launched post-Rule-1) additionally links FMCSA records to
verify a carrier is active before adding it to a network — not something we consume, but it's why
their onboarding is "up and running in a matter of days".

## Competitive context

Terminal advertises ~300+ supported telematics providers vs TruckerCloud's "175+ ELDs and
Cameras"; a third aggregator, **Axle** (axle.insure / getaxle.com — "universal telematics API"),
also fronts TruckX and is carrier/fleet-app oriented. Axle remains the natural fallback-of-the-
fallback if a TruckerCloud carrier account ever proves unobtainable — but per Market positioning
above, that contingency is now unlikely, so no work should pre-empt it.

## Auth model (assumed, unconfirmed — 5th consecutive 403 wall)

- **Still could not fetch any TruckerCloud-controlled page** as of 2026-07-20:
  `truckercloud.com/*` (homepage, `/integrations/connect-*`, `/blog/*`),
  `truckercloud.zendesk.com/*`, and even trade-press mirrors (`freightwaves.com`,
  `prnewswire.com`) all returned **HTTP 403** to this scout's fetch tooling — the same
  Cloudflare-style / network-policy block seen on the 2026-07-06 and 2026-07-10 ×2 passes, and
  the same wall documented for `docs.withterminal.com` (`terminal.md`), `mobile.fmcsa.dot.gov`
  (`fmcsa.md`), and the EFS help pages (`efs.md`). Everything below is a best-effort guess from
  search-result snippets, not a page read in full. **Anonymous scouting for the API contract is
  now exhausted — five passes, zero page reads. The only remaining path to confirmation is human
  outreach (email support@truckercloud.com) or a human with a browser.**
- What the snippets *do* consistently confirm (marketing, not contract): a "one-to-many" open
  API, 175+ ELD/camera integrations, TruckX named + supported, and a carrier-side
  **Webservices API Key** handoff (above). None of that pins our server-to-server auth.
- `docs/hub-go-live-requirements.md` lists TruckerCloud as needing **"Client ID + secret"**
  credentials, not a static API key — so the registry (`src/lib/hub/integrations/registry.ts`)
  scopes `truckercloud` to `clientId` + `clientSecret`, and `truckerCloudSource()` in
  `telematics.ts` exchanges them for a bearer token via an OAuth2 client-credentials grant
  (`POST {base}/oauth/token`) before every request. **This "Client ID + secret → OAuth2
  client-credentials" assumption is the single load-bearing guess and remains unverified after
  five passes.** No token caching yet — each sync fetches a fresh token, which is correct but not
  optimal.
- Base URL is an env override (`TRUCKERCLOUD_API_BASE`), defaulting to a placeholder host
  (`https://api.truckercloud.com/v1`) — never treated as confirmed. New white-label subdomains
  seen in snippets this pass (`truckerpath.truckercloud.com`) suggest a per-tenant host scheme may
  exist; do not hardcode `api.truckercloud.com` as certain.

## Feed shape (assumed, unconfirmed)

`normalizeTruckerCloudVehicle` and `normalizeTruckerCloudHos` in `telematics.ts` are the two
places the guessed shape is read — swapping in the real one only touches those two functions,
same doctrine as `normalizeEfsRecord`. Assumed shape:

```json
// GET /vehicles → { "vehicles": [ ... ] }
{
  "assetId": "string — becomes externalId",
  "unitNumber": "string — matched against hub.trucks.unit_number",
  "lastLocation": { "lat": 0, "lng": 0, "odometer": 0, "timestamp": "ISO 8601" }
}

// GET /hos → { "logs": [ ... ] }
{
  "driverId": "string",
  "driverName": "string — matched against hub.drivers full name",
  "status": "duty status string",
  "driveTimeRemainingSec": 0,
  "shiftTimeRemainingSec": 0,
  "cycleTimeRemainingSec": 0,
  "recordedAt": "ISO 8601"
}
```

If the real endpoints, auth flow, or field names differ (very likely — these are guesses, not
observed responses), only the two normalizer functions, the `/oauth/token` exchange, and the
two `request(...)` path strings in `truckerCloudSource()` change; the sync loop, ingestion, and
cron wiring don't move. The field categories the vendor advertises (location, driver ID, duty
status, HOS clocks, diagnostics) map cleanly onto the two-normalizer split, so the *structure* of
the guess is safe even though the exact field *names* are not.

## Rate limits / sandbox

Not found in any accessible search result across five passes. No numeric limits, no public
sandbox/test-key program has ever surfaced. Ask when a TruckerCloud contact is available for real
credentials. (Contrast Terminal, whose sandbox is self-serve dashboard keys per `terminal.md` —
no equivalent has been confirmed for TruckerCloud.)

## Sync loop

Shares Terminal's cron job (`telematics-sync`, `vercel.json`) and "Sync now" action —
`activeTelematicsSource()` means there is exactly one sync path regardless of which aggregator
is connected, so no new cron entry was needed. `runTelematicsSync` tags every
`position_pings`/`hos_snapshots` row it writes with `source = 'truckercloud'` (vs `'terminal'`)
via the connected `TelematicsSource`'s own `provider` field.

## What ships today without any of this

Manual truck location entry on the dispatch board keeps working with neither aggregator
connected — this adapter, like Terminal's, is additive.

## Open questions for the next pass

- **Human outreach is now the only lever.** Confirm the real token endpoint path and grant type
  against an actual TruckerCloud developer packet — the #1 blocker to flipping status from stub to
  live. Five anonymous scout fetch attempts (2026-07-06, 2026-07-10 ×2, 2026-07-20, plus the
  original) have hit the same 403 wall on every `truckercloud.com/*`, `docs.truckercloud.com`,
  `truckercloud.zendesk.com`, and trade-press mirror; archive.org is blocked by network policy.
  Next step: email support@truckercloud.com asking specifically whether **carrier/TMS API access**
  (not insurer access) is offered — likely YES per Market positioning — and for a developer packet
  with the OAuth token endpoint + `/vehicles` + `/hos` response schemas.
- Confirm `/vehicles` and `/hos` response field names (best guess above).
- The prior pass's "confirm they still sell API access to carrier platforms at all" question is
  **largely answered — yes, Carrier TMS is a marketed solution** — so the Axle redirect drops off
  the critical path. Keep Axle noted only as a distant fallback.
- Same open item as Terminal and EFS: no 429/5xx retry-with-backoff on the single `fetch` calls
  in `truckerCloudSource`'s `request()`/token exchange — a transient error fails that day's sync
  silently.
- Confirm whether a carrier can have both Terminal AND TruckerCloud credentials saved at once
  (e.g. mid-migration between aggregators); if so, `activeTelematicsSource`'s "first connected
  wins" selection needs to become an explicit preference instead of source order.

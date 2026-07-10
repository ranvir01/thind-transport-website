# TruckerCloud ELD — scouting notes

Status: **adapter shipped, feed shape unconfirmed.** TruckerCloud (truckercloud.com) is the
drop-in second aggregator `src/lib/hub/telematics.ts`'s header comment has promised since
Terminal shipped — same `TelematicsSource` interface (`connected`/`vehicles`/`hos`), its own
credentials. `activeTelematicsSource()` in that file picks whichever of the two a carrier
actually connected (Terminal wins if somehow both are).

## Why TruckerCloud specifically

TruckX (the ELD our carriers already run) has no public API of its own — it only exposes data
through TSP aggregators, and TruckerCloud is the second one after Terminal. Public marketing
describes TruckerCloud as an "API-based telematics data aggregator" fronting 100+ underlying
ELD/camera providers under one normalized API, the same value proposition as Terminal.

**Correction (2026-07-10 evening pass):** an earlier pass claimed TruckerCloud's product is
"branded the Apollo API". That was a misreading of search snippets — **Apollo ELD is one of the
ELD providers TruckerCloud aggregates** (it has its own connector page at
`truckercloud.com/integrations/connect-apollo-eld`, alongside `connect-truckx-eld-d`,
`connect-samsara-eld`, etc.). No public brand name for TruckerCloud's own API surfaced in any
pass; don't go looking for "Apollo API" docs.

## Market positioning — insurance pivot (2026-07-10 evening pass)

TruckerCloud's homepage now titles itself **"Auto Insurance Telematics Aggregator"** and its
marketing describes "a complete telematics intelligence platform built specifically for
commercial auto insurers". Recent public activity is all insurer-side: a September 2025
partnership with QEO Insurance Group (underwriting/loss-control/claims), named to FinTech
Global's InsurTech100 (Nov 2024), and dedicated `/program/<insurer>` pages for RLI, ISC, NTA,
and QEO. Backed by Rule 1 Ventures (2021), CEO Spencer Mitchell, Atlanta; no acquisition or new
funding round surfaced through mid-2026.

Implication for us: our use case (a carrier-facing TMS pulling its own trucks' positions/HOS) is
not the customer they market to — carriers appear in their flow as the party that *authorizes*
data sharing to an insurer, not as API consumers. A developer account for LoadOff may still be
possible (their integration pages do say "Get The APIs"), but Terminal remains the primary
aggregator bet and this adapter stays the fallback. Worth asking about carrier/TMS API access
explicitly if outreach happens: support@truckercloud.com, help center at
`truckercloud.zendesk.com`.

## Carrier-side onboarding flow (confirmed from TruckX/TruckerCloud snippets)

How a carrier authorizes TruckX→TruckerCloud data sharing (this is consent plumbing, not our
API auth, but it's the part the owner would actually perform):

1. Log into the **TruckX** portal → "API Key" in the sidebar → "+ Share API Key".
2. In "Select API Partner" choose **TruckerCloud**; select all drivers, trucks, trailers.
3. Accept terms → "Send API Key".
4. On TruckerCloud's onboarding page, check "Utilize my existing ELD provider credentials".

TruckerCloud's Zendesk hosts per-ELD carrier onboarding guides
(`truckercloud.zendesk.com/hc/en-us/articles/4415549969435`), which instruct carriers to add
TruckerCloud as an authorized user or obtain API credentials from their ELD provider. Data
surfaced per their connector pages: vehicle location, VIN, license plate, driver identity/HOS,
safety events — consistent with the `vehicles`/`hos` split our adapter assumes.

## Competitive context

Terminal advertises 316 supported telematics providers vs TruckerCloud's 100+ (170+ counting
cameras); a third aggregator, **Axle** (axle.insure / getaxle.com — "universal telematics
API"), also fronts TruckX and is carrier/fleet-app oriented. If TruckerCloud's insurer focus
ever forecloses a carrier-facing account, Axle is the natural candidate to research as the
second `TelematicsSource` instead — same drop-in interface swap.

## Auth model (assumed, unconfirmed)

- **Still could not fetch TruckerCloud's own docs pages** as of this pass (2026-07-10):
  `truckercloud.com/integrations/connect-apollo-eld` and
  `truckercloud.com/integrations/connect-truckx-eld-d` both returned HTTP 403 to this scout's
  fetch tooling, same Cloudflare-style block as the 2026-07-06 pass and as noted for
  `docs.withterminal.com` (`docs/integrations/terminal.md`) and the EFS help pages
  (`docs/integrations/efs.md`). Everything below is still a best-effort guess from search-result
  snippets, not a page read in full — auth model, endpoints, and pricing are unchanged from the
  last pass.
- Search snippets did confirm marketing claims consistent with the existing assumption:
  TruckerCloud advertises 170+ ELD/camera integrations and >90% commercial-vehicle coverage, and
  publishes a **separate per-provider connector page** for each one — including a dedicated
  `connect-truckx-eld-d` page, i.e. TruckX (the ELD our carriers run) is a named, supported
  integration, not an inferred one. No numeric rate limits, sandbox program, or pricing surfaced
  in this pass either (same gap as last time).
- `docs/hub-go-live-requirements.md` lists TruckerCloud as needing "Client ID + secret"
  credentials, not a static API key — so the registry (`src/lib/hub/integrations/registry.ts`)
  scopes `truckercloud` to `clientId` + `clientSecret`, and `truckerCloudSource()` in
  `telematics.ts` exchanges them for a bearer token via an OAuth2 client-credentials grant
  (`POST {base}/oauth/token`) before every request. No token caching yet — each sync fetches a
  fresh token, which is correct but not optimal; revisit if a real account confirms tokens are
  short-lived enough for that to matter.
- Base URL is an env override (`TRUCKERCLOUD_API_BASE`), defaulting to a placeholder host
  (`https://api.truckercloud.com/v1`) — never treated as confirmed.

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
cron wiring don't move.

## Rate limits / sandbox

Not found in the accessible search results. No numeric limits, no public sandbox/test-key
program surfaced. Ask when a TruckerCloud contact is available for real credentials.

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

- Confirm the real token endpoint path and grant type against an actual TruckerCloud developer
  packet — the #1 blocker to flipping status from stub to live. Three scout fetch attempts
  (2026-07-06, 2026-07-10 ×2) have hit the same 403 wall on `truckercloud.com/*`,
  `docs.truckercloud.com`, and even `truckercloud.zendesk.com`; archive.org is blocked by this
  environment's network policy, so anonymous scouting is exhausted. Next step is human
  outreach: email support@truckercloud.com asking specifically whether carrier/TMS API access
  (not insurer access) is offered, and for a developer packet.
- Confirm `/vehicles` and `/hos` response field names (best guess above).
- **Ask outreach question first**: given the insurer repositioning (see "Market positioning"),
  confirm TruckerCloud still sells API access to carrier-facing platforms at all before
  spending more effort here; if not, redirect this fallback-aggregator slot to Axle.
- Same open item as Terminal and EFS: no 429/5xx retry-with-backoff on the single `fetch` calls
  in `truckerCloudSource`'s `request()`/token exchange — a transient error fails that day's sync
  silently.
- Confirm whether a carrier can have both Terminal AND TruckerCloud credentials saved at once
  (e.g. mid-migration between aggregators); if so, `activeTelematicsSource`'s "first connected
  wins" selection needs to become an explicit preference instead of source order.

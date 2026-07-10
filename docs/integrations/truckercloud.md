# TruckerCloud ELD — scouting notes

Status: **adapter shipped (registry: `live`), auth model now suspect — see "Urgent" below.**
TruckerCloud (truckercloud.com) is the drop-in second aggregator
`src/lib/hub/telematics.ts`'s header comment has promised since Terminal shipped — same
`TelematicsSource` interface (`connected`/`vehicles`/`hos`), its own credentials.
`activeTelematicsSource()` in that file picks whichever of the two a carrier actually
connected (Terminal wins if somehow both are).

## Urgent — credential model may not match how TruckerCloud actually grants access

Every direct fetch to `truckercloud.com/*`, `apidocs.apollohq.com`, and TruckerCloud's Zendesk
help pages still 403s this scout's tooling (same Cloudflare-style block as the 2026-07-06 pass —
see "Could not fetch" below), so nothing here is a confirmed API read. But enough turned up in
search-result snippets this pass to raise a real concern about the adapter's shape, not just its
field names:

- Search snippets describing TruckerCloud's **"Instant Carrier Onboarding Widget"** consistently
  describe a **per-carrier consent flow**, not a static API-key/secret pair a carrier copies out
  of their TruckerCloud account and pastes into a third party's settings page: *"the motor carrier
  can go through a simple process to install an application or share API credentials... carriers
  go to the onboarding page, fill in their DOT #, email and name, select their ELD provider and
  type in their [ELD] credentials, click 'Authorize'"* (paraphrased from indexed onboarding-guide
  copy; page itself 403'd — see caveat below). That's a Plaid-shaped flow: **the requesting
  platform** (an insurer, broker, or us) holds a TruckerCloud partner credential and embeds/links
  to TruckerCloud's onboarding widget; **the carrier** authenticates with *their ELD's own login*
  inside that widget, not with a TruckerCloud-issued client ID/secret they then hand to us.
- If that's right, our registry entry (`src/lib/hub/integrations/registry.ts`, `truckercloud` id,
  `status: "live"`) is asking carriers for the wrong thing: it shows a **Client ID** / **Client
  secret** pair as if TruckerCloud hands carriers static API credentials to paste into third-party
  Settings pages (`fields: [{ key: "clientId" }, { key: "clientSecret" }]`). A real carrier
  clicking "Connect TruckerCloud" in our Settings → Integrations page today has nowhere in their
  own TruckerCloud/TruckX account to go get a "Client ID" — because that pair, if it exists at
  all, is more likely issued to **us** as the platform, once, not per carrier.
- This is marked urgent because `status: "live"` means the UI already invites a real carrier to
  try this today, and the current shape (carrier pastes clientId+secret, we exchange for a bearer
  token via `POST {base}/oauth/token` client-credentials grant) may simply never work — there is
  no confirmed evidence that flow exists at all, only that a *different* connect-widget flow does.
- **Not fixed this pass** — flipping the adapter's shape without a confirmed real developer packet
  risks guessing wrong twice. Recorded as a `Backlog:` item for whichever lane/session picks up
  integrations next; needs either (a) a real TruckerCloud partner account to read their actual
  docs, or (b) accepting Terminal as the sole telematics aggregator and demoting this adapter to
  documented-stub until that account exists.

## Why TruckerCloud specifically (unchanged)

TruckX (the ELD our carriers already run) has no public API of its own — it only exposes data
through TSP aggregators, and TruckerCloud is the second one after Terminal. TruckerCloud's own
copy still describes itself as *"the fastest way to connect ELD data to any application"* with
*"an open API... to integrate ELD data into freight-tech solutions."*

## Positioning shift since the last pass (new this cycle)

The 2026-07-06 note treated TruckerCloud as a straightforward ELD-aggregator peer to Terminal.
This pass's search results point at a narrower primary market than that framing suggested:

- TruckerCloud's own homepage title is now **"Auto Insurance Telematics Aggregator | TruckerCloud"**
  (search-indexed, page itself 403'd to direct fetch). Its self-description in indexed copy:
  *"an API-based telematics data aggregator serving insurtech, fintech, brokers, and shippers in
  the supply chain industry."* Fleet-dispatch software (our use case) isn't in that list of named
  customer segments — insurers/brokers are.
- Recent partnership announcements found are insurance-side: Sentry (Oct 2025, driver-data
  sharing) and QEO Insurance Group (Sept 2025). No 2025–2026 announcements surfaced aimed at
  fleet-management/dispatch platforms specifically.
- Provider-count marketing is inconsistent across their own pages — some say "50+ ELD providers,"
  others say "100+," the current homepage says **"170+ ELDs and Cameras."** Directionally growing,
  but treat any specific number as marketing copy, not a contract.
- Net read: TruckerCloud the *company* looks like it's building for insurance-telematics
  underwriting first and freight-tech integration second (or as a legacy line). The `Apollo API`
  product this adapter targets may still work for our use case, but it is not obviously
  TruckerCloud's current primary product — worth knowing before spending real integration effort
  here versus prioritizing Terminal (which remains squarely fleet-facing) as the carrier's
  primary aggregator.

## Auth model (assumed, now doubly unconfirmed — see "Urgent" above)

- **Still could not fetch TruckerCloud's own docs pages** — `truckercloud.com/integrations/*`,
  `apidocs.apollohq.com`, and `truckercloud.zendesk.com/hc/*` all returned HTTP 403 to this
  scout's fetch tooling this pass too (same Cloudflare-style block noted in the 2026-07-06 note
  and for `docs.withterminal.com`/EFS). Everything below is still a best-effort guess from
  search-result snippets, not a page read in full — and this pass's search results actively
  contradict part of the previous guess (see "Urgent").
- `docs/hub-go-live-requirements.md` lists TruckerCloud as needing "Client ID + secret"
  credentials — the registry and `truckerCloudSource()` in `telematics.ts` still implement that
  literally (OAuth2 client-credentials grant, `POST {base}/oauth/token`, no token caching). Kept
  as-is this pass rather than rewritten on unconfirmed evidence; see Backlog.
- Base URL remains an env override (`TRUCKERCLOUD_API_BASE`), defaulting to a placeholder host
  (`https://api.truckercloud.com/v1`) — never treated as confirmed.

## Feed shape (assumed, unconfirmed — unchanged this pass)

`normalizeTruckerCloudVehicle` and `normalizeTruckerCloudHos` in `telematics.ts` are the two
places the guessed shape is read — swapping in the real one only touches those two functions,
same doctrine as `normalizeEfsRecord`. No new evidence on field names surfaced this pass (search
results describe *categories* of data — "vehicle data: license plate, VIN, etc.," "safety events:
speed, harsh events" — but no JSON samples). Assumed shape, unchanged:

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

If the real endpoints, auth flow, or field names differ (very likely, and per "Urgent" above the
auth *flow shape* itself may be wrong, not just field names), only the two normalizer functions,
the `/oauth/token` exchange (or its replacement), and the two `request(...)` path strings in
`truckerCloudSource()` change; the sync loop, ingestion, and cron wiring don't move.

## Rate limits / sandbox

Still not found in accessible search results this pass either. No numeric limits, no public
sandbox/test-key program surfaced. Ask when/if a real TruckerCloud partner contact is available.

## Sync loop (unchanged)

Shares Terminal's cron job (`telematics-sync`, `vercel.json`) and "Sync now" action —
`activeTelematicsSource()` means there is exactly one sync path regardless of which aggregator is
connected, so no new cron entry was needed. `runTelematicsSync` tags every
`position_pings`/`hos_snapshots` row it writes with `source = 'truckercloud'` (vs `'terminal'`)
via the connected `TelematicsSource`'s own `provider` field.

## What ships today without any of this

Manual truck location entry on the dispatch board keeps working with neither aggregator
connected — this adapter, like Terminal's, is additive.

## Open questions for the next pass

- **Highest priority (new this pass):** confirm whether TruckerCloud's real access model is a
  per-platform partner credential + per-carrier consent widget (Plaid-shaped) rather than a
  static clientId/secret a carrier pastes into our Settings page. This determines whether
  `registry.ts`'s `truckercloud` credential fields need to change from "carrier pastes ID+secret"
  to something like "we hold one platform credential; carrier clicks through TruckerCloud's
  onboarding widget" — a bigger shape change than a field rename.
- Confirm the real token endpoint path and grant type against an actual TruckerCloud developer
  packet — still the #1 blocker to flipping status from guessed to confirmed either way.
- Confirm `/vehicles` and `/hos` response field names (best guess above, unchanged).
- Same open item as Terminal and EFS: no 429/5xx retry-with-backoff on the single `fetch` calls in
  `truckerCloudSource`'s `request()`/token exchange — a transient error fails that day's sync
  silently.
- Confirm whether a carrier can have both Terminal AND TruckerCloud credentials saved at once
  (e.g. mid-migration between aggregators); if so, `activeTelematicsSource`'s "first connected
  wins" selection needs to become an explicit preference instead of source order.

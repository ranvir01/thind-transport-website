# Truckstop.com load board — scouting notes

Status: **feature complete in-app (search UI + booking shipped), and the adapter's transport
now matches the confirmed protocol** — rewritten 2026-07-21 (integrations lane) per the
2026-07-18 scout findings against developer.truckstop.com. Truckstop's board load search is
a **SOAP 1.1/XML web service with credentials in the request body**, not the Bearer-key REST
endpoint `truckstop.ts` used to guess at. `truckstopSource()` now builds a SOAP envelope,
`POST`s it to `/v13/Searching/LoadSearch.svc` with the `SOAPAction` header, and parses the
XML response through `parseLoadSearchResponse` (no XML library — a small tag-extraction
helper, since the response shape is a single fixed pattern). `registry.ts`'s credential
fields changed from a single `apiKey` to `integrationId`/`username`/`password` to match.
What's still unconfirmed: the real `GetLoadSearchResults` response element names (the
portal's schema sits behind its bot wall — `parseLoadSearchResponse`/`normalizeTruckstopPosting`
assume PascalCase names like `LoadId`/`TripMiles`/`TotalRate`, adjust both together once a
developer packet or unblocked `llms.txt` pull confirms them) and the production SOAP host
(base defaults to the confirmed sandbox, `testws.truckstop.com`). Nothing is broken today —
without pasted credentials the adapter throws `truckstop is not connected` before any HTTP
happens — and a real SIA-issued credential set can now at least speak the right protocol,
though the response parse will need a field-name correction pass on first real contact.

## What's actually built (doc was stale on this — corrected 2026-07-18)

The previous revision of this doc said the booking mapper was blocked on a migration. That's
long done: `migrations/hub/017_truckstop_load_source.sql` (applied) added `'truckstop'` to
the `hub.loads.source` CHECK constraint, and the full slice shipped:

- `src/lib/hub/integrations/truckstop.ts` — `search`/`pull` contract, `normalizeTruckstopPosting`,
  `truckstopPostingToLoadDraft` (customer_id deliberately omitted; dispatcher picks it)
- `LoadBoardFreightSearch.tsx` on `/hub/loadboard` — shared DAT/Truckstop search + book UI
- `bookTruckstopPostingAction` (`src/app/hub/_actions/truckstop-freight.ts`)
- Mock + contract + action tests; registry `status: "live"` (manual sync)

## Auth model (CONFIRMED — differs from the adapter)

- **No API key, no OAuth, no Bearer header.** Every request carries three credentials inside
  the SOAP envelope body: `IntegrationId` (a unique 6-digit number Truckstop generates per
  integration), `UserName`, `Password`. The account must have the relevant web service
  (e.g. Load Search) enabled on that integration ID.
- **A signed Systems Integration Agreement (SIA) is required before credentials are issued** —
  fully executed, no exceptions per the developer portal. Request via the carrier's Truckstop
  account manager or `tsi@truckstop.com`.
- API access is tied to the paid load-board subscription; marketplace guidance says accounts
  need the **Load Board Pro** tier for API access (see pricing below).
- `registry.ts`'s single `apiKey` credential field is therefore wrong for this provider — it
  needs `integrationId` / `username` / `password` (registry + `credentials.ts` allowlist are
  integrations-lane territory; flagged in Backlog, not changed here).

## Endpoints for our use case (CONFIRMED)

Our use case is carrier-side: search the public board, prefill a load draft. That is the
**Load Search web service**, SOAP 1.1 / XML:

| Purpose | Endpoint | SOAPAction |
|---|---|---|
| Search all board loads | `POST /v13/Searching/LoadSearch.svc` | `http://webservices.truckstop.com/v12/ILoadSearch/GetLoadSearchResults` |
| Truck search (not our use case) | `POST /V13/Searching/TruckSearch.svc` | analogous `ITruckSearch` action |
| Truck posting (not our use case) | `POST /v13/Posting/TruckPosting.svc` | — |

- **Test host: `https://testws.truckstop.com`** (all portal examples run against it) —
  a real sandbox exists; ask for test credentials alongside the SIA.
- Production host follows the `webservices.truckstop.com` namespace the SOAPAction uses;
  confirm the exact production base with the developer packet at onboarding.
- Confirmed request capabilities: origin/destination accept single or multiple states
  (max **15 states** per side); `HoursOld` filters posting age (0 = all); sorting via a
  `SortColumns` enum + `SortDescending` flag.
- There IS a modern REST surface (`/loadmanagement/v2/load/search`, JSON) but it searches
  **your own posted loads** — the broker/shipper posting side, not the public board. Don't
  mistake it for the carrier search; the board search remains SOAP as of 2026-07-18, with
  no deprecation or REST-migration notice found.
- Portal tip for future scouts: `https://developer.truckstop.com/llms.txt` is a
  Markdown/OpenAPI index of the whole reference (the portal 403s generic fetchers and this
  sandbox's egress proxy blocks the host — research went through search snippets; a pass
  from an unrestricted network should pull llms.txt directly).

## What the adapter changed (2026-07-21 rewrite)

`truckstopSource()` now issues `POST {base}/v13/Searching/LoadSearch.svc` with the
`SOAPAction` header and a SOAP 1.1 XML envelope body, parsing an XML response — no JSON
anywhere:

1. **Transport:** `buildSearchEnvelope` builds the envelope; the response is read with a
   small hand-rolled tag-extraction helper (`extractTagBlocks`/`extractTagValue` in
   `truckstop.ts`) rather than a new XML-parsing dependency, since the shape needed is one
   repeated element (`LoadSearchResult`) with flat child tags.
2. **Auth:** `IntegrationId`/`UserName`/`Password` are embedded in the envelope body per
   request (`registry.ts`'s truckstop entry now collects these three fields instead of a
   single `apiKey`).
3. **Normalizer:** `normalizeTruckstopPosting` reads PascalCase element names
   (`LoadId`/`TripMiles`/`TotalRate`/…) instead of the old JSON-flavored camelCase guesses —
   still assumed, not confirmed: the full `GetLoadSearchResults` response schema sits behind
   the portal's bot wall. Re-map both `parseLoadSearchResponse`'s field list and
   `normalizeTruckstopPosting` together once a developer packet or an unblocked `llms.txt`
   pull confirms the real element names.
4. **Not sent yet:** `originCity`/`radiusMiles` (part of `TruckstopSearchCriteria`, used by
   the shared DAT/Truckstop search UI) aren't part of the confirmed request shape — only
   `OriginStates`/`DestinationStates`/`Equipment`/`HoursOld` are sent. Confirm whether/how
   city or radius filtering exists on the real service before wiring those through.

The contract (`search`/`pull`/`connected`) and everything downstream — mapper, UI, action,
migration — survived unchanged; this was a transport-layer swap isolated to
`truckstopSource()` plus the normalizer, exactly the seam the stub-first doctrine reserved.
Mock + contract tests updated in `src/lib/hub/__tests__/truckstop.test.ts` (SOAP envelope
shape, XML parsing incl. entity-decoding and SOAP-fault handling, idempotent replay).

## Rate limits / sandbox

- Sandbox: **yes** — `testws.truckstop.com` (see above); credentials come with the SIA.
- Rate limits: **not published** anywhere accessible; ask when the SIA is signed and
  record the answer here. Until known, keep searches dispatcher-initiated (manual sync)
  rather than cron-polled — which is how the registry entry is configured anyway.

## Pricing (checked 2026-07-18)

Carrier-side load-board plans: **Basic $42/mo, Advanced $135/mo, Pro $159/mo** (plans range
up to $369/mo on the broker side). API access requires the Pro tier plus the signed SIA —
budget ~$159/mo for this row, not the bare $42 entry plan.

## What ships today without any of this

Manual load entry and rate-con paste-in remain the product. The search UI renders only when
`truckstopConnected` is true, so the adapter is dormant until credentials exist — no
production risk right now, but the first real search will still need a field-name
correction pass on the response parse (see Open questions) before results are trustworthy.

## 2026-07-21 scout re-pass

No adapter-breaking change. `developer.truckstop.com` and `llms.txt` are still 403-walled to
this environment's egress exactly as the 2026-07-18/21 passes found — no direct fetch of the
`GetLoadSearchResults` response schema was possible this pass either, so
`parseLoadSearchResponse`'s field-name guesses remain unconfirmed. One partial lead on the
city-filtering open question: search snippets referencing the same
`developer.truckstop.com/reference/get-load-search-results-1` page (the confirmed reference
page for our SOAP endpoint) mention `DestinationCity`/`DestinationCountry` as request-criteria
fields — but a separate snippet's `OriginCity` mention traces to
`developer.truckstop.com/reference/pload2` ("search within posted loads"), which this doc
already rules out as broker-side/REST, not the carrier-side SOAP `LoadSearch.svc` our adapter
calls. Don't wire `DestinationCity` in from this alone: single search-snippet confidence,
unconfirmed field casing/placement inside the `Criteria` element, and no independent second
source. No mention of `RadiusMiles`/`OriginRadius` surfaced in either request-shape search.
Confirming needs the same thing every pass since 2026-07-18 has needed: a developer packet or
a pull from an unblocked network.

## Open questions for the next pass

- Get the real `GetLoadSearchResults` request/response XML schema (developer packet or
  llms.txt from an unblocked network) and pin `parseLoadSearchResponse`'s field list +
  `normalizeTruckstopPosting`'s mapping to it.
- Confirm the production SOAP host and whether load *booking* (not just search) has any API
  surface, or whether booking stays phone/email + our draft prefill.
- Confirm rate limits and any per-integration-ID concurrency rules at SIA time.
- Confirm whether/how city-level or radius filtering exists on the real service — not sent
  in the current request envelope (only origin/destination states + equipment + HoursOld).
  2026-07-21 lead (unconfirmed, single source): `DestinationCity`/`DestinationCountry` may be
  valid `Criteria` fields on the same reference page as our SOAP endpoint — verify against the
  actual page before wiring `originCity`/`radiusMiles` through.

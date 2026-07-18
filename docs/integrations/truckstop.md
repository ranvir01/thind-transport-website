# Truckstop.com load board — scouting notes

Status: **feature complete in-app (search UI + booking shipped), but the adapter's assumed
wire protocol is wrong** — scouted 2026-07-18 against developer.truckstop.com. Truckstop's
board load search is a **SOAP/XML web service with credentials in the request body**, not
the Bearer-key REST endpoint `truckstop.ts` guesses at. Auth + transport both need a rewrite
before real credentials can activate anything (same class of mismatch the EFS/WEX scouts
found: adapter assumed REST JSON, vendor ships something older). Nothing is broken today —
without pasted credentials the adapter throws `truckstop is not connected` before any HTTP
happens — but the shopping list's "paste key → works" promise does not hold for this row.

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

## What the adapter must change before activation

`truckstopSource()` currently issues `GET {base}/loads/search?…` with
`Authorization: Bearer <apiKey>` and parses `{ postings: [...] }` JSON. Reality:

1. **Transport:** build a SOAP 1.1 XML envelope, `POST` it to `/v13/Searching/LoadSearch.svc`
   with the `SOAPAction` header, and parse an XML response (no JSON anywhere).
2. **Auth:** embed `IntegrationId`/`UserName`/`Password` in the envelope body per request.
3. **Normalizer:** `normalizeTruckstopPosting`'s field guesses (`postingId`, `totalRate`, …)
   must be re-mapped from the real `GetLoadSearchResults` XML element names — the full
   response schema sits behind the portal's bot wall; take it from the developer packet or
   an llms.txt pass rather than guessing again.

The contract (`search`/`pull`/`connected`) and everything downstream — mapper, UI, action,
migration — survive unchanged; this is a transport-layer swap isolated to `truckstopSource()`
plus the normalizer, exactly the seam the stub-first doctrine reserved.

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
`truckstopConnected` is true, so the wrong-transport adapter is dormant until credentials
exist — no production risk right now, but pasting real credentials would fail on the first
search, which is why the rewrite is flagged urgent in the Backlog rather than waiting for a
customer to find it.

## Open questions for the next pass

- Get the real `GetLoadSearchResults` request/response XML schema (developer packet or
  llms.txt from an unblocked network) and pin the normalizer mapping to it.
- Confirm the production SOAP host and whether load *booking* (not just search) has any API
  surface, or whether booking stays phone/email + our draft prefill.
- Confirm rate limits and any per-integration-ID concurrency rules at SIA time.

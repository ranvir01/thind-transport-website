# DAT One load board — scouting notes

Status: **search adapter + booking mapper shipped (stub-first), product surface not yet
built.** DAT (dat.com) is the highest-value load board for a 15-truck van/reefer carrier,
but unlike every other provider in `docs/integrations/creds-shopping-list.md` it isn't a
background sync into an existing table — it's an interactive freight search a dispatcher
drives, and booking is a two-way action, not a pull. This slice ships the `SyncSource`-shaped
contract (`connected`/`pull`/`search`), its normalizer, and `datPostingToLoadDraft` — a pure
mapper from a matched posting onto `createLoad()`'s `LoadInput` shape (stops, rate, miles,
equipment) — all mock+contract tested, so the eventual search UI + "book this posting" button
has a finished, tested client and mapper to call instead of guessing the API, the UX, and the
field mapping all in the same pass.

`datPostingToLoadDraft` deliberately omits `customer_id` — DAT has no concept of our customer
records, so it's the one field a dispatcher must still supply (pick or create a customer) before
the draft can be passed to `createLoad()`. Everything else in the draft is ready to submit as-is.

## Why this is scoped differently than EFS/WEX/Comdata/TruckerCloud

Those adapters land rows in a table the CSV import already writes to
(`ON CONFLICT (carrier_id, source, external_id)`), so "ship the adapter" and "ship the
feature" are the same commit. DAT has no equivalent existing table or screen — a dispatcher
needs a search panel (criteria in, matches out) and a book/create-load action, both new UI.
Building that UI against an unconfirmed API shape would mean re-doing it twice. This slice
stops at the tested client; `docs/integrations/creds-shopping-list.md` tracks the remaining
UI + booking slice separately.

## Auth model (researched 2026-07-10; re-scouted 2026-07-20, 2026-07-24 — search-snippet confidence, pages still 403-walled)

DAT's own pages (`dat.com`, `one.support.dat.com`, `developer.dat.com`) and third-party
integration guides all still 403 against our fetch tooling (same wall as TruckerCloud — every
direct-fetch attempt across all three passes blocked; `one.support.dat.com` and
`learn.tai-software.com` both re-tried and 403'd again 2026-07-24), so the facts below come from
search-result snippets of DAT's official support FAQ and TMS-vendor activation guides — higher
confidence than a pure guess, but still not a developer packet.

- **Two-level token auth, not per-request Basic.** DAT's official RESTful API FAQ describes
  the flow as: (1) a **service account** (dedicated email + password, provisioned once per
  organization) authenticates the *organization*; (2) a **regular user's email** is then
  authenticated on top of the org auth to identify *who* is making requests. So the
  `serviceAccountEmail`/`password` fields on the `dat` registry entry were right but
  **insufficient** — a third `actingUserEmail` field now ships on the registry entry
  (2026-07-20, this pass) and `datSource().search()` refuses (`"dat is not connected"`) until
  all three are present, so a real setup can't silently half-configure. `dat.ts`'s per-request
  Basic-auth construction on the service account is still a placeholder — swapping it for the
  real token exchange (org token → user token → Bearer) needs the actual token endpoint paths,
  still unconfirmed (see Open questions).
- **2026-07-20 correction: service accounts hold NO seats/services.** The FAQ is explicit —
  "service accounts do not and should not have any services assigned to them." All seat
  requirements (Connexion + load board, +RateView for rate requests) attach to the **acting
  user**, not the service account. This confirms the `actingUserEmail` field is the credential
  that actually needs the paid seat, not `serviceAccountEmail`.
- **2026-07-24 RESOLVED — RateView Combo gates only *rate-request* API access, NOT load
  search/post.** The 2026-07-20 single-source "RateView Combo Pro/Premium may gate RESTful API
  access" worry is now answered by a second, more explicit snippet of DAT's official FAQ that
  states the split directly: *"Any level of load board subscription allows a RESTful API
  integration, and users wanting to post loads/trucks or search for loads/trucks will need a
  Connexion seat and a load board seat. RateView Combo Pro or RateView Combo Premium are required
  for a RESTful API integration [for rates]; users wanting to post, search, **and request
  rates** will need a Connexion seat, load board seat, **and RateView seat.**"* So the
  RateView-Combo requirement is scoped to the **RateView (rate-lookup) API only** — the base
  load-board **search + post** API this adapter targets needs only *any* load board tier + a
  Connexion seat + a load board seat. **This adapter (`datSource().search()` +
  `datPostingToLoadDraft`) does search and post-to-draft, never a rate request** (confirmed in
  `dat.ts` — no RateView call, `rateTotal` is read straight from the posting), so the RateView
  Combo tier is **not** on LoadOff's critical path and the pricing story in
  `creds-shopping-list.md` is unchanged. This upholds the doc's original "any load board
  subscription tier allows REST API integration" claim for our use case; the narrower snippet was
  RateView-specific. Only revisit if LoadOff later adds a rate-lookup feature.
- **Tokens are short-lived.** One TMS integration (Salesforce-based) caches DAT org and
  user tokens for 28 minutes, implying ~30-minute expiry — the adapter must re-auth per
  sync run rather than storing a long-lived token. Reconfirmed 2026-07-24 from a second
  RateView-integration source ("Org and user tokens are cached in Platform Cache for 28
  minutes"); still no official token-lifetime number in a primary doc.
- **2026-07-24 catalog note: DAT exposes several distinct REST products, not one API.** DAT's
  public resource pages enumerate the family as **DAT Load Board, BookNow, DAT Tracking, and
  Freight Posting** APIs (plus RateView/DAT iQ rate APIs). LoadOff's adapter targets **Load
  Board (search) + Freight Posting**. **BookNow** is DAT's own booking API — relevant to the
  future "book this posting" slice, which today maps a posting onto a *local* `createLoad()`
  draft (`datPostingToLoadDraft`) rather than transacting a booking back to DAT; if that slice
  ever needs to reserve the load on DAT's side, BookNow is the surface to request in the
  developer packet. Not adapter-breaking — noted so the booking slice scopes the right API.
- **Seats gate API calls.** The authenticated (acting) user must hold a **Connexion seat**
  plus a **load board seat** to search or post via API; adding rate requests needs a Connexion +
  load board + **RateView** seat (and a RateView Combo Pro/Premium *subscription* — see the
  resolved finding above). Any load board subscription tier allows REST API integration for the
  search/post surface LoadOff uses.
- **Service accounts are managed at `account.dat.com`** (User Management) and must not be
  edited/deleted once an integration depends on them.
- Base URL env override (`DAT_API_BASE`) currently defaults to `https://freight.api.dat.com/v3`.
  The **host** is now corroborated (a real posting endpoint is
  `https://freight.api.staging.dat.com/posting/v2/loads`), but the path scheme is per-service
  versioning (`/posting/v2/...`), not a global `/v3` — expect the search path to change when
  the developer packet arrives.
- Developer portal: `developer.dat.com` (login at `developer.dat.com/_/login`), access
  requests via **developersupport@dat.com** with company name, contact, MC number, and a
  note that REST API access is needed. A public Postman workspace
  (`postman.com/it-sys/dat-s-api-documentation`) also exists but is fetch-blocked from here.

## Search shape (assumed, unconfirmed)

`normalizeDatPosting` in `src/lib/hub/integrations/dat.ts` is the one place the guessed
response shape is read. Assumed shape:

```json
// GET /loads/search?originCity=&originState=&destState=&equipmentType=&radiusMiles= →
// { "matches": [ ... ] }
{
  "matchId": "string — becomes external_id",
  "postedAt": "ISO 8601",
  "equipmentType": "Van | Reefer | Flatbed | ...",
  "originCity": "string",
  "originState": "string",
  "destCity": "string",
  "destState": "string",
  "tripMiles": 0,
  "rateTotal": 0.0,
  "pickupDate": "ISO date",
  "contactPhone": "string"
}
```

If the real endpoint, auth flow, or field names differ (likely), only `normalizeDatPosting`,
the `/loads/search` path, and the auth header construction in `datSource()` change — the
`search`/`pull` contract and its tests don't move.

## Rate limits / sandbox / pricing (researched 2026-07-10)

- **Rate limits:** still not published anywhere accessible; behind the developer portal.
  Two soft signals: tokens expire ~30 min (see auth), and lower load-board tiers cap usage
  at **500 load searches + truck posts per month** — if that product cap applies to API
  searches too, an interactive dispatcher search panel could exhaust it quickly on a small
  plan. Confirm with DAT before building periodic polling.
- **Sandbox:** a dedicated **staging environment exists** — `freight.api.staging.dat.com`
  appears in a real TMS integration example (`POST /posting/v2/loads`). Ask for staging
  credentials alongside production ones; wire it through `DAT_API_BASE`.
- **Pricing (third-party figures, unverified):** DAT subscriptions run roughly
  $50–$300/user/month depending on tier; one integration guide reports developer-portal
  registration is free but production API use carries a **$500–$1,000 one-time setup fee**.
  Budget for the Connexion seat on top of the load board seat for the API user.
- **Legacy note:** DAT's older SOAP freight-matching API (TFMI, `ftp.dat.com/wsdl/
  TfmiFreightMatching.xsd`) is still publicly visible; REST is the current program — don't
  build against the WSDL.

## What ships today without any of this

Pasting a rate confirmation onto a load manually is the product today and stays the
product — this adapter is additive, and until the search UI exists there is no dispatcher-
facing surface for it at all (it's a tested library function, not a feature yet).

## Open questions for the next pass (the actual remaining slice)

- Design + build the dispatcher-facing search panel (criteria form → results list) and a
  "book this posting" button that calls `datPostingToLoadDraft` + a customer picker, then
  `createLoad()` — likely office-lane UI territory once designed, coordinate via `Backlog:`.
- Auth flow is now known in outline (two-level service-account → user token, see above);
  the remaining #1 blocker to flipping `registry.ts`'s `dat` entry from `stub` to `live` is
  the developer packet: exact token endpoints/headers, the real search path + response
  field names, and rate limits. Request via developersupport@dat.com (needs MC number).
- ~~Registry change needed: add an acting-user email credential field~~ — done 2026-07-20:
  `actingUserEmail` field ships on the `dat` registry entry, `datSource().search()` requires
  it. The request itself still authenticates with organization Basic auth only (placeholder)
  until the token-exchange endpoints are confirmed.
- ~~Confirm whether the RateView Combo Pro/Premium requirement applies to the base search/post
  API or only rate-request calls~~ — **resolved 2026-07-24: rate-request calls only.** The base
  load-board search/post API (what this adapter uses) needs only any load board tier + Connexion
  + load board seat; no pricing change to `creds-shopping-list.md`. See the resolved auth-model
  bullet above.
- Decide whether matches get a `cronJob` (periodic "loads near you" polling into a new
  table) in addition to on-demand search, or stay purely interactive — affects whether a
  migration is needed (`hub.available_loads`-style table) vs. search staying stateless.

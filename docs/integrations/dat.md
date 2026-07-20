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

## Auth model (researched 2026-07-10; re-scouted 2026-07-20 — search-snippet confidence, pages still 403-walled)

DAT's own pages (`dat.com`, `one.support.dat.com`, `developer.dat.com`) and third-party
integration guides all still 403 against our fetch tooling (same wall as TruckerCloud — five
straight direct-fetch attempts across both passes, all blocked), so the facts below come from
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
- **2026-07-20 finding, unconfirmed: RateView Combo Pro/Premium may gate RESTful API access.**
  A search snippet states "RateView Combo Pro or RateView Combo Premium are required for a
  RESTful API integration" — this reads as narrower than this doc's prior "any load board
  subscription tier allows REST API integration" claim. Couldn't corroborate on a second
  source or confirm whether that's RateView-specific access vs. the base search/post API: flag
  as a pricing risk to check with developersupport@dat.com, not yet strong enough to overwrite
  the existing claim outright.
- **Tokens are short-lived.** One TMS integration (Salesforce-based) caches DAT org and
  user tokens for 28 minutes, implying ~30-minute expiry — the adapter must re-auth per
  sync run rather than storing a long-lived token. No official token-lifetime number found
  this pass either.
- **Seats gate API calls.** The authenticated (acting) user must hold a **Connexion seat**
  plus a **load board seat** to search or post via API; posting/searching/requesting rates
  needs a Connexion + load board + RateView seat. Any load board subscription tier is claimed
  to allow REST API integration generally, but see the RateView-gating finding above.
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
- Confirm whether the RateView Combo Pro/Premium requirement (found this pass, single source)
  applies to the base search/post API or only rate-request calls — changes the pricing story
  in `creds-shopping-list.md` if it applies broadly.
- Decide whether matches get a `cronJob` (periodic "loads near you" polling into a new
  table) in addition to on-demand search, or stay purely interactive — affects whether a
  migration is needed (`hub.available_loads`-style table) vs. search staying stateless.

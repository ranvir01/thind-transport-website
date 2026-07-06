# Credentials shopping list — what to buy, what it activates

Ranked by value-per-dollar for a 15-truck carrier. Paste keys into
Settings → Integrations; each row activates a finished, contract-tested
adapter — or documents exactly what's still stub while the owner waits on
vendor feed setup. Kept current by the integrations lane every time an
adapter ships (see `docs/integrations/README.md` step 8).

| # | Provider | Plan / est. cost | Get it | Activates | Adapter status |
|---|---|---|---|---|---|
| 1 | Terminal (TruckX ELD) | Terminal aggregator — free/dev tier to start | withterminal.com | Live map positions, HOS clocks on dispatch, auto-IFTA miles | **live — ready today** |
| 2 | TruckerCloud (alt ELD) | TruckerCloud developer account — Client ID + secret | docs.truckercloud.com | Same live positions/HOS as Terminal — drop-in alternate aggregator, same `hub.position_pings`/`hub.hos_snapshots` tables | **adapter shipped** — plumbing + contract tests done in `src/lib/hub/telematics.ts` (`truckerCloudSource`); wire real token endpoint/feed shape once a carrier's actual TruckerCloud account comes through (see `docs/integrations/truckercloud.md`) |
| 3 | Docs mailbox (IMAP) | Free (use an existing mailbox + app password) | Gmail/Office365 app-password settings | Rate cons/PODs auto-file to the matching load by subject reference | **live — ready today** |
| 4 | EFS / WEX fuel feed | Included with the fuel card account — ask your rep for **data-feed** credentials (separate from the portal login); allow ~5 business days to provision | efsllc.com / wexinc.com account rep | Daily fuel transactions land in `fuel_transactions` (same table + idempotency the CSV import uses) → MPG, fraud flags, fuel↔load linking, no more manual export/import | **adapter shipped** — plumbing + contract tests done in `src/lib/hub/integrations/efs.ts`; wire real feed URL/shape once the carrier's data-feed request comes back (see `docs/integrations/efs.md`) |
| 5 | Comdata fuel feed | Ask your account team for API credentials | comdata.com | Same idempotent fuel-transaction ingest as EFS | **adapter shipped** — plumbing + contract tests done in `src/lib/hub/integrations/comdata.ts`; wire real endpoint/auth-header names once the account team's onboarding response comes back (see `docs/integrations/comdata.md`) |
| 6 | DAT load board | DAT One/Power + API access, certification required | dat.com | In-app freight search → one-click book | stub — bigger than a background sync adapter (needs a search UI + book action, not just a `SyncSource<Row>` pull); scope as its own slice with a design pass first |
| 7 | QuickBooks Online | QBO plan + free Intuit developer app | developer.intuit.com | Invoice/payment two-way sync, no CSV re-keying | planned — needs a migration first (`quickbooks` isn't in `hub.api_credentials`'s provider CHECK list), out of this lane's territory |
| 8 | Factoring company API | Ask your factor (varies) | your factor | Electronic invoice submission + advance/reserve tracking | planned — needs a migration first (same provider CHECK constraint), out of this lane's territory |

Free already active or key-only (no adapter needed — see the "Free government
APIs" panel on the Integrations page): FMCSA QCMobile (broker vetting), EIA
diesel index, OSRM routing, Nominatim geocoding, NWS weather, NHTSA VIN.

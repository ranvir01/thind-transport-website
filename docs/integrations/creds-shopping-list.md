# Credentials shopping list — what to buy, what it activates

Ranked by value-per-dollar for a 15-truck carrier. Paste keys into
Settings → Integrations; each row activates a finished, contract-tested
adapter — or documents exactly what's still stub while the owner waits on
vendor feed setup. Kept current by the integrations lane every time an
adapter ships (see `docs/integrations/README.md` step 8).

| # | Provider | Plan / est. cost | Get it | Activates | Adapter status |
|---|---|---|---|---|---|
| 1 | Terminal (TruckX ELD) | Terminal aggregator — free/dev tier to start | withterminal.com | Live map positions, HOS clocks on dispatch, auto-IFTA miles | **live — ready today** |
| 1b | TruckerCloud ELD | TruckerCloud developer account — Client ID + secret | docs.truckercloud.com | Same as Terminal, via a different aggregator — `activeTelematicsSource()` prefers Terminal, falls back to TruckerCloud | **adapter shipped** (`src/lib/hub/telematics.ts` `truckerCloudSource`, OAuth2 client-credentials); confirm the real token endpoint + feed shape once a contact replies (see `docs/integrations/truckercloud.md`) |
| 2 | Docs mailbox (IMAP) | Free (use an existing mailbox + app password) | Gmail/Office365 app-password settings | Rate cons/PODs auto-file to the matching load by subject reference | **live — ready today** |
| 3 | EFS fuel feed | Included with the fuel card account — ask your rep for **data-feed** credentials (separate from the portal login); allow ~5 business days to provision | efsllc.com account rep | Daily fuel transactions land in `fuel_transactions` (same table + idempotency the CSV import uses) → MPG, fraud flags, fuel↔load linking, no more manual export/import | **live — ready today** (`src/lib/hub/integrations/efs.ts`, cron `efs-sync`); confirm the real feed shape against `docs/integrations/efs.md` once the carrier's data-feed request comes back |
| 3b | WEX fuel feed | Same account-rep request as EFS (WEX Inc. is the parent brand) — ask for **data-feed** credentials; allow ~5 business days | wexinc.com account rep | Same idempotent fuel-transaction ingest as EFS | **live — ready today** (`src/lib/hub/integrations/wex.ts`, cron `wex-sync`); confirm the real feed shape against `docs/integrations/wex.md` once the carrier's data-feed request comes back |
| 4 | Comdata fuel feed | Ask your account team for API credentials | comdata.com | Same idempotent fuel-transaction ingest as EFS | **live — ready today** (`src/lib/hub/integrations/comdata.ts`, cron `comdata-sync`); confirm the real feed shape against `docs/integrations/comdata.md` once the account team's onboarding response comes back |
| 5 | DAT load board | DAT One/Power + API access, certification required | dat.com | In-app freight search → one-click book | stub — bigger than a background sync adapter (needs a search UI + book action, not just a `SyncSource<Row>` pull); scope as its own slice with a design pass first |
| 6 | QuickBooks Online | QBO plan + free Intuit developer app | developer.intuit.com | Invoice/payment two-way sync, no CSV re-keying | planned — needs a migration first (`quickbooks` isn't in `hub.api_credentials`'s provider CHECK list) |
| 7 | Factoring company API | Ask your factor (varies) | your factor | Electronic invoice submission + advance/reserve tracking | planned — needs a migration first (same provider CHECK constraint) |

Free already active or key-only (no adapter needed — see the "Free government
APIs" panel on the Integrations page): FMCSA QCMobile (broker vetting), EIA
diesel index, OSRM routing, Nominatim geocoding, NWS weather, NHTSA VIN.

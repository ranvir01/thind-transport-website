# Credentials shopping list — what to buy, what it activates

Ranked by value-per-dollar for a 15-truck carrier. Paste keys into Settings → Integrations;
each activates a finished, contract-tested integration (or will, once its adapter status
in `registry.ts` reads `live`).

| # | Provider | Plan / est. cost | Get it | Activates | Adapter status |
|---|---|---|---|---|---|
| 1 | Terminal (TruckX ELD) | Terminal aggregator — free/dev tier to start | withterminal.com | Live map positions, HOS clocks on dispatch, auto-IFTA miles | **live — ready today** |
| 1b | TruckerCloud ELD | Alternate aggregator — pricing not public | truckercloud.com | Same as Terminal, via a different aggregator (pick one) | **live — adapter shipped** (`src/lib/hub/telematics.ts` `truckerCloudSource`); confirm the real API shape once a contact replies (see `docs/integrations/truckercloud.md`) |
| 2 | EFS fuel card feed | Included with the fuel card acct (ask rep for API/feed access) | efsllc.com rep | Daily fuel txns → MPG, fraud flags, fuel→load auto-linking | **live — adapter shipped** (`src/lib/hub/integrations/efs.ts`); wire the real feed shape once the rep's data-feed response comes back (see `docs/integrations/efs.md`) |
| 3 | DAT load board | DAT One/Power + API access | dat.com | In-app freight search → one-click book | stub — needs a search+book UI, not just a background sync (own design pass) |
| 4 | QuickBooks Online | QBO plan + free Intuit developer app | developer.intuit.com | Invoice/payment two-way sync, no CSV re-keying | planned |
| 5 | Factoring company API | Ask your factor (varies) | your factor | Electronic invoice submission + advance/reserve tracking | planned |

WEX and Comdata fuel cards (`wex`, `comdata` in the registry) share EFS's exact FuelSource
contract and are next in line — not yet in this table because their adapters aren't built.

Free already active or key-only: FMCSA QCMobile (broker vetting), EIA diesel index, OSRM
routing, Nominatim geocoding, NWS weather, NHTSA VIN — see Settings → Integrations panel.

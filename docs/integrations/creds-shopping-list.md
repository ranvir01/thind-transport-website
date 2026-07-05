# Credentials shopping list — what to buy, what it activates

Ranked by value-per-dollar for a 15-truck carrier. Paste keys into Settings → Integrations;
each activates a finished, contract-tested integration (or will, once its adapter status
in `registry.ts` reads `live`).

| # | Provider | Plan / est. cost | Get it | Activates | Adapter status |
|---|---|---|---|---|---|
| 1 | Terminal (TruckX ELD) | Terminal aggregator — free/dev tier to start | withterminal.com | Live map positions, HOS clocks on dispatch, auto-IFTA miles | **live — ready today** |
| 2 | EFS fuel card feed | Included with the fuel card acct (ask rep for API/feed access) | efsllc.com rep | Daily fuel txns → MPG, fraud flags, fuel→load auto-linking | stub (lane building) |
| 3 | DAT load board | DAT One/Power + API access | dat.com | In-app freight search → one-click book | stub |
| 4 | QuickBooks Online | QBO plan + free Intuit developer app | developer.intuit.com | Invoice/payment two-way sync, no CSV re-keying | planned |
| 5 | Factoring company API | Ask your factor (varies) | your factor | Electronic invoice submission + advance/reserve tracking | planned |

Free already active or key-only: FMCSA QCMobile (broker vetting), EIA diesel index, OSRM
routing, Nominatim geocoding, NWS weather, NHTSA VIN — see Settings → Integrations panel.

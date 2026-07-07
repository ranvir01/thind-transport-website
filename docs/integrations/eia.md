# EIA Open Data — weekly on-highway diesel benchmark (free API key)

Researched: 2026-07-07. Status: **built, live** — `eiaDieselPriceCents()` in `src/lib/hub/fuel.ts`,
surfaced on `/hub/fuel` as "EIA weekly diesel" and on Settings → Integrations under "Environment
services". Not in `IntegrationProvider` — credentials are a single platform env var
(`EIA_API_KEY`), not per-carrier stored creds. This doc did not exist before this cycle
(`scout-rotation.md` listed it "missing — never researched") despite the adapter being shipped
code.

## What it does today (confirmed from source)

`eiaDieselPriceCents()`:
1. Returns `null` immediately when `EIA_API_KEY` is unset — the fuel screen shows "—" and a hint
   to set the key; fleet avg $/gal and fraud flags still work from card transactions alone.
2. When the key is set, fetches the latest weekly U.S. on-highway diesel retail price from EIA API
   v2 (`petroleum/pri/gnd` route).
3. Parses `response.data[0].value` (dollars per gallon), multiplies by 100, rounds to integer
   **cents per gallon** — consistent with how fuel transactions store `price_cents` / gallon math
   elsewhere in the hub.
4. Uses Next.js `fetch` with `{ next: { revalidate: 86400 } }` — at most one upstream call per
   day per Vercel region; no cron, no `hub.integration_syncs` row (read-only benchmark, not a
   sync source).

The fuel page compares fleet average $/gal against this national weekly index so dispatch can
spot cards paying above market. FSC (fuel surcharge) pegging to the DOE/EIA index is documented
in phase specs but **not wired to this function yet** — today's scope is display-only.

## Auth model

| Item | Detail |
|---|---|
| Credential | `EIA_API_KEY` env var (Vercel project env, not per-carrier) |
| How to obtain | Free — register at [eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php); key emailed automatically |
| Auth mechanism | `api_key` query parameter on every request (no OAuth, no signing) |
| Cost | Free (U.S. government open data; comply with [EIA API Terms of Service](https://www.eia.gov/opendata/terms-of-service.php)) |
| Sandbox | `DEMO_KEY` works for testing but is rate-limited (~30 requests/hour per EIA docs) |
| Production | Same API — no separate prod/sandbox hosts |

Without the key the fuel module degrades gracefully; no errors are thrown and no user-facing
failure state beyond the missing benchmark tile.

## API endpoint we use

```
GET https://api.eia.gov/v2/petroleum/pri/gnd/data/
  ?api_key={EIA_API_KEY}
  &frequency=weekly
  &data[0]=value
  &facets[series][]=EMD_EPD2D_PTE_NUS_DPG
  &sort[0][column]=period
  &sort[0][direction]=desc
  &length=1
```

| Parameter | Meaning |
|---|---|
| `petroleum/pri/gnd` | Petroleum — Prices — Gasoline and Diesel Fuel Update (weekly retail) |
| `facets[series][]=EMD_EPM0_PTE_NUS_DPG` | **Not used** — we target `EMD_EPD2D_PTE_NUS_DPG` |
| `EMD_EPD2D_PTE_NUS_DPG` | U.S. on-highway diesel fuel price, dollars per gallon, weekly |
| `frequency=weekly` | Matches DOE/EIA's Monday-published national diesel average carriers use for FSC |
| `length=1` + `sort desc` | Latest period only |

EIA also publishes regional series (PADD districts, states) via different `series` facet values.
We intentionally use the **national** series today — regional FSC would need a carrier-configured
PADD/state facet (future enhancement).

## Rate limits and operational notes

EIA does not publish hard per-key limits for registered keys; abuse triggers temporary key
suspension. Our usage is minimal:
- One cached fetch per day per deployment region (Next revalidate 86400 s)
- No cron fan-out, no per-carrier multiplication

`fetch` has no explicit timeout — a hung EIA response could delay the fuel page SSR. Failures
(`!res.ok`, parse errors, network) return `null` silently (same as missing key).

**Response-shape drift risk:** we read `data?.response?.data?.[0]?.value`. EIA v2.1 route
metadata changes or series retirement would make the benchmark disappear without an error. Worth
a contract test with `DEMO_KEY` in CI (rate-limited but sufficient for shape checks).

## UI surfacing

- `/hub/fuel` — "EIA weekly diesel" tile next to fleet avg $/gal; `fmtCentsExact` display.
- `/hub/settings/integrations` — "Environment services" panel shows configured / `set EIA_API_KEY`.
- `npm run connections:check` — lists `EIA_API_KEY` in the free-services checklist.

## Adapter-breaking changes to watch

| Change | Impact |
|---|---|
| `api_key` query param retired or OAuth required | All lookups break until env + code updated |
| Series `EMD_EPD2D_PTE_NUS_DPG` renamed/retired | Benchmark returns null until facet updated |
| Response envelope change (`response.data` path) | Parse returns null — silent degradation |
| v2 route `petroleum/pri/gnd` restructured | URL or facet names may need update |
| Rate limiting tightened on shared Vercel egress | Daily cache usually absorbs; burst deploys could miss benchmark briefly |

None observed as of 2026-07-07. EIA API v2 has been stable since the v1 retirement (2022).

## Shopping list

Not on per-carrier integration cards (platform env, same pattern as FMCSA). Owner action: paste
`EIA_API_KEY` into Vercel project env — takes ~2 minutes via the open-data registration form.

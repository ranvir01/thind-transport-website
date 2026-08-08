# Toolbox Embeddability Audit — X-Frame-Options / frame-ancestors + Better Alternatives

Research date: **2026-08-07** (America/Los_Angeles). Scope: all 11 external rows in
`src/lib/hub/workbench.ts` (9 briefed URLs + eCFR part-396 and part-382, confirmed in the repo at
`/tmp/ttw-probe/src/lib/hub/workbench.ts`).

**Method note (honest limits):** this environment cannot read raw response headers directly.
Every header value below comes from a **live securityheaders.com scan of the exact Toolbox URL,
run today (07 Aug 2026, ~23:47–23:52 UTC)** — third-party, dated, but still not LoadOff's own
runtime check. Per the repo rule (`docs/decisions/0003-everything-app.md`: "promoting an external
site to in-frame requires header verification, enforced by test"), nothing should flip to
`embed: "frame"` until the build agent runs the script in the Verification section. Headers can
vary by user-agent/CDN/path, and a header-clean site can still frame-bust with JavaScript.

## TL;DR

- **4 of 11 rows are frameable today** on header evidence: **wsdot.com passes, tripcheck.com,
  weather.gov, eia.gov/petroleum/gasdiesel** (no X-Frame-Options, no frame-ancestors).
- **7 of 11 are definitively blocked**: all three eCFR parts (`XFO: SAMEORIGIN` +
  `frame-ancestors 'none'`), ELD list and SAFER (`SAMEORIGIN` + `frame-ancestors 'self'`),
  Idaho 511 (`SAMEORIGIN`), iftach.org (`SAMEORIGIN`, sent twice).
- **Every "frameable" row has an official API that beats the iframe** — and two of those APIs
  (EIA v2, FMCSA QCMobile) are *already built and live in this codebase*
  (`docs/integrations/eia.md`, `docs/integrations/fmcsa.md`). Adoption order by value:
  **1) WSDOT Traveler API (mountain passes), 2) NWS api.weather.gov, 3) Idaho 511 API,
  4) eCFR API, 5) TripCheck Data API, 6) extend EIA v2 to regional series, 7) IFTA quarterly
  CSV ingest.** Only the FMCSA ELD registry has no API — it stays a sheet.
- Flipping any row also requires amending
  `src/lib/hub/__tests__/workbench.test.ts`, which currently hard-fails any external URL with
  `embed: "frame"` (frame ⇒ must start with `/`). Add a `FRAME_VERIFIED_HOSTS` allowlist with
  verification dates when the script confirms.

## Deliverable table

All header values: securityheaders.com live scan of the exact URL, **verified 2026-08-07**.
"iframe-ok" = renders in a cross-origin iframe based on headers alone.

| url | XFO | frame-ancestors | iframe-ok | confidence | better-alternative |
|---|---|---|---|---|---|
| ecfr.gov …/part-395 | `SAMEORIGIN` | `'none'` | **No** | documented (scan 2026-08-07) | **eCFR API** — no key, pull Part 395 XML/structure, render natively |
| ecfr.gov …/part-396 | `SAMEORIGIN` | `'none'` | **No** | documented (scan 2026-08-07) | same eCFR API, `part=396` |
| ecfr.gov …/part-382 | `SAMEORIGIN` | `'none'` | **No** | documented (scan 2026-08-07) | same eCFR API, `part=382` |
| eld.fmcsa.dot.gov/List | `SAMEORIGIN` | `'self'` | **No** | documented (scan 2026-08-07) | none — no official API/export; keep sheet (also `/List/Revoked`) |
| safer.fmcsa.dot.gov/CompanySnapshot.aspx | `SAMEORIGIN` | `'self'` | **No** | documented (scan 2026-08-07) | **FMCSA QCMobile API — already live in repo**; render snapshot natively |
| wsdot.com/travel/real-time/mountainpasses | *(missing)* | *(no CSP at all)* | **Yes*** | documented scan; confirm at runtime | **WSDOT Traveler Info API** — free AccessCode, pass-conditions JSON |
| tripcheck.com | *(missing)* | *(no CSP at all)* | **Yes*** | documented scan; confirm at runtime | **TripCheck Data API** (ODOT portal key) — road conditions incl. chains |
| 511.idaho.gov | `SAMEORIGIN` | *(no CSP)* | **No** | documented (scan 2026-08-07) | **Idaho 511 API v2** — key, 10 calls/60 s, mountainpasses endpoint |
| weather.gov | *(missing)* | CSP present, **no frame-ancestors directive** | **Yes*** | documented scan; confirm at runtime | **api.weather.gov** — no key, forecasts + alerts, render natively |
| eia.gov/petroleum/gasdiesel/ | *(missing)* | *(no CSP at all)* | **Yes*** | documented scan; confirm at runtime | **EIA API v2 — already live in repo**; add regional (PADD) series |
| iftach.org | `SAMEORIGIN` (sent twice) | *(only Report-Only CSP)* | **No** | documented (scan 2026-08-07) | **Quarterly Tax Rate Matrix downloads** (CSV/XML) → own rate table |

\* "Yes" rows: no framing header today, but (a) per CSP spec `frame-ancestors` has **no fallback
to default-src**, so weather.gov's permissive CSP genuinely does not restrict framing; (b) a
JS frame-buster can't be ruled out from headers — run the verification script **and** a 10-second
visual iframe check before flipping; (c) wsdot.com and tripcheck.com are client-rendered SPAs, so
also confirm the app actually boots inside a frame. iftach.org additionally sends duplicate
XFO/X-Content-Type-Options headers (scan noted them), reinforcing "No."

Reading the "No" rows: `frame-ancestors 'none'` (eCFR) blocks *all* framing and, in modern
browsers, takes precedence over `XFO: SAMEORIGIN`; `frame-ancestors 'self'` / `XFO: SAMEORIGIN`
(FMCSA, Idaho 511, IFTA) blocks every cross-origin embedder including LoadOff. Not negotiable
client-side.

## Per-site API details

### 1. eCFR API (covers all three regulation rows) — adopt

- **Docs:** [ecfr.gov/developers/documentation/api/v1](https://www.ecfr.gov/developers/documentation/api/v1)
  (interactive docs; verified reachable 2026-08-07) and
  [Developer Resources / REST API reader-aid](https://www.ecfr.gov/reader-aids/ecfr-developer-resources/rest-api-interactive-documentation)
  (verified 2026-08-07).
- **Auth:** **none** — official statement: "No API keys are needed; all you need is an HTTP
  client or browser." (verified 2026-08-07)
- **Live-verified today:** `GET https://www.ecfr.gov/api/versioner/v1/titles.json` returns JSON,
  no auth; Title 49 `up_to_date_as_of: 2026-08-05` (verified 2026-08-07).
- **Endpoints** (Versioner/Renderer/Search services, patterns per the official interactive docs —
  runtime-confirm in the build env; my fetch tool was robots-blocked on `/api/…/full/`, an
  indexing rule, not an auth wall):
  - `GET /api/versioner/v1/full/{date}/title-49.xml?part=395` — full XML of one part
  - `GET /api/versioner/v1/structure/{date}/title-49.json` — TOC tree (sections, anchors)
  - `GET /api/renderer/v1/content/enhanced/{date}/title-49?part=395` — server-rendered HTML
  - `GET /api/search/v1/results?query=…` — full-text search
- **Rate limits:** none published; content changes at most daily — cache per part per day.
- **License/attribution:** U.S. Government public domain; eCFR is "authoritative but unofficial" —
  keep that phrase in the UI footer as ecfr.gov itself does.
- **LoadOff renders:** Parts 395/396/382 as native, searchable regulation pages with LoadOff
  typography and deep links (e.g., HOS screen links straight to §395.8), refreshed daily. Kills
  three sheet rows at once with zero keys.

### 2. NWS API — api.weather.gov — adopt

- **Docs:** [weather.gov/documentation/services-web-api](https://www.weather.gov/documentation/services-web-api)
  and [FAQ](https://weather-gov.github.io/api/general-faqs) (both verified 2026-08-07).
- **Auth:** no key. **Required:** `User-Agent` header identifying the app + contact, e.g.
  `User-Agent: (loadoff.app, ops@loadoff.app)`.
- **Rate limits:** intentionally unpublished — "allows a generous amount for typical use";
  temporary blocks clear in ~5 s. Honor `Cache-Control`/`Last-Modified`; **no cache-busting
  query params** (they 400). Proxy through LoadOff's server with a short cache.
- **Endpoints:**
  - `GET https://api.weather.gov/points/{lat},{lon}` → grid mapping (cacheable ~forever)
  - `GET /gridpoints/{office}/{gridX},{gridY}/forecast` (+ `/hourly`) — 7-day / hourly
  - `GET /alerts/active?point={lat},{lon}` or `?area=WA` — winter storm warnings, CAP format available
  - `GET /stations/{id}/observations/latest` — current obs
- **Formats:** GeoJSON (default), JSON-LD, CAP, ATOM. **License:** open data, "free to use for
  any purpose"; attribute NOAA/NWS as source. The old embeddable NWS forecast widgets were
  retired (NWS Public Notification Statement, source dated 2014) — the API *is* the official
  embed path.
- **LoadOff renders:** a route-weather strip — origin, destination, and pass waypoints with
  current conditions + next-12-h period + any active alert — on the dispatch board and pass
  screens. Even though www.weather.gov is frameable today, the framed homepage is useless for a
  driver mid-route; the API gives exactly the corridor forecast.

### 3. WSDOT Traveler Information API — adopt first (highest winter value)

- **Docs/signup:** [wsdot.wa.gov/traffic/api](https://wsdot.wa.gov/traffic/api/) — submit an
  email address, get a free **AccessCode** ("Your email address will not be shared and will be
  used only to notify you of changes to our services") (verified 2026-08-07).
- **Mountain-pass endpoints** (REST help page verified 2026-08-07,
  `…/MountainPassConditionsREST.svc/Help`):
  - `GET https://wsdot.wa.gov/Traffic/api/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionsAsJson?AccessCode={code}` — all passes
  - `GET …/GetMountainPassConditionAsJson?AccessCode={code}&PassConditionID={id}` — one pass
  - XML variants exist; other groups: Highway Alerts, Weather Stations, Commercial Vehicle
    Restrictions, Cameras, Travel Times, Border Crossings (Doc/WSDL/REST/RSS/KML).
- **Rate limits/terms:** none published. Pass reports update a few times a day in season —
  a 5–15 min server-side cache is more than enough.
- **LoadOff renders:** Snoqualmie/Stevens chain-status card (restriction text per direction,
  road condition, temperature, elevation) inline where dispatch commits to I-90 — replacing a
  full WSDOT SPA in a frame with the two fields a driver actually needs.

### 4. Idaho 511 API v2 — adopt (only API path; site blocks framing)

- **Docs:** [511.idaho.gov/developers/doc](https://511.idaho.gov/developers/doc) (verified
  2026-08-07). Register an account, then request a **Developer key** from the dashboard; key goes
  in the `key` query param.
- **Rate limit (documented):** **10 calls per 60 seconds** — cache server-side (5-min TTL fits).
- **Verified endpoint** ([doc page](https://511.idaho.gov/help/endpoint/mountainpasses),
  verified 2026-08-07):
  `GET https://511.idaho.gov/api/v2/get/mountainpasses?key={key}&format=json` — returns
  Fourth of July Pass (I-90), White Bird Hill (US-95), etc. with lat/lon, roadway, elevation,
  camera/weather-station IDs. Sibling resources (docs at `/help/endpoint/{resource}`):
  roadconditions, events, advisories, cameras, weatherstations, message signs, weigh stations,
  rest areas, runaway truck ramps. A WZDx work-zone feed is also documented
  (`https://511.idaho.gov/api/wzdx`).
- **LoadOff renders:** Fourth of July + Lookout Pass condition chips on the I-90 run view,
  merged into the same pass-card component as WSDOT's data.

### 5. EIA API v2 — already live; extend, don't rebuild

- Repo status (`docs/integrations/eia.md`): `eiaDieselPriceCents()` ships today — national weekly
  on-highway diesel, series `EMD_EPD2D_PTE_NUS_DPG`, route `petroleum/pri/gnd`, `EIA_API_KEY`
  env var, free key at [eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php),
  throttle ≈9,000 req/hr sustained / 5 req/s burst (repo doc, corroborated 2026-07).
- **Extension for this Toolbox row:** the gasdiesel page's value is the **regional** table.
  Regional weekly retail diesel series exist per EIA's own series pages (verified via search
  2026-08-07): `EMD_EPD2D_PTE_R50_DPG` (West Coast, PADD 5), `EMD_EPD2D_PTE_R10_DPG`
  (East Coast) — same `petroleum/pri/gnd` route, one extra facet each.
- **LoadOff renders:** native weekly diesel tile set on `/hub/fuel` — U.S. + PADD 5 (+ optional
  carrier-configured region), week-over-week delta — the FSC anchor without leaving the app.
  The page is frameable today, but the API is already wired; framing it would be a step backward.

### 6. FMCSA QCMobile API (SAFER data) — already live; render natively

- Repo status (`docs/integrations/fmcsa.md`): `fmcsaLookup()` ships today —
  `https://mobile.fmcsa.dot.gov/qc/services/carriers/…` with `?webKey=`, docket-then-DOT order,
  daily re-check cron. Registration: login.gov → My WebKeys → immediate issuance (official
  getStarted page **fetched successfully today**, verified 2026-08-07; example shown there:
  `/carriers/name/greyhound?webKey=…`). Rate limits: unpublished (three scout passes concur).
- **Unused surface worth adopting for the Toolbox:** name search, OOS records, BASICS scores —
  enough to render a full SAFER-style company snapshot (legal/DBA name, authority status,
  `allowedToOperate`, OOS) inside the vetting screen. Fallback machine-readable mirror:
  data.transportation.gov "Licensing and Insurance — QCMobile API" dataset (id `7xzn-4j4j`).
- **LoadOff renders:** DOT/MC lookup natively; keep the SAFER sheet row only as a "view official
  record" citation link.

### 7. ODOT TripCheck Data API — adopt for Oregon chains

- **Signup:** [apiportal.odot.state.or.us](https://apiportal.odot.state.or.us/) (Azure API
  Management; verified 2026-08-07) → Sign up → subscribe to the
  [TripCheck Data API product](https://apiportal.odot.state.or.us/product/tripcheck-data-api);
  key is an Azure subscription key. Free.
- **Data** (per [tripcheck.com/Pages/API](https://www.tripcheck.com/Pages/API), verified
  2026-08-07): incidents (30 s refresh), **road conditions incl. chain restrictions from ODOT
  crews**, CCTV camera images, weather stations (5-min), DMS, WZDx work zones, TLE local events.
  [Getting Started Guide PDF](https://www.tripcheck.com/pdfs/TripCheckAPI_Getting_Started_GuideV5.pdf).
- **Rate limits/terms:** not published on the public pages; shown per-product inside the portal
  after signup — record them in `docs/integrations/` when the key is issued.
- **LoadOff renders:** Cabbage Hill / Siskiyou chain-requirement cards from road-conditions.
  tripcheck.com is frameable today (no headers at all), so a frame flip is a legitimate interim
  step while the portal signup clears.

### 8. IFTA (iftach.org) — no API; official files instead

- As expected, **no API**. But the official quarterly **Tax Rate Matrix is downloadable** at
  [iftach.org/taxmatrix4/TaxDownload.php](https://www.iftach.org/taxmatrix4/TaxDownload.php)
  (verified 2026-08-07): **CSV, XML**, XLS, TXT, DOC/RTF per quarter, named `2Q2026.csv` style,
  archives 2017–2025, "DOWNLOAD ALL" ZIP per quarter. Release cadence: quarterly, per IFTA's
  published tax-rate calendar.
- **License/terms:** none stated on the download page; attribute "Source: IFTA, Inc." and show
  the quarter. **LoadOff renders:** its own jurisdiction rate table (one scheduled or manual
  ingest per quarter) feeding the IFTA screens; the sheet row stays until then since the site
  blocks framing.

### 9. FMCSA ELD registry — no alternative exists

- Searched for exports/APIs: nothing official — only the `/List` page, `/List/Revoked`, and
  per-device detail/file endpoints. QCMobile does not cover ELD registrations. **Keep as sheet**;
  it's a pre-purchase check, not live ops data, so the sheet is acceptable UX.

## Verification script for the build agent

Ready to paste (Node 18+, no deps). HEAD with redirect-follow per the repo rule, GET fallback for
servers that reject HEAD (IIS on tripcheck/eia may), prints the two headers + verdict per URL.
Run it in the build agent's own environment before flipping any `workbench.ts` row, then do a
visual iframe smoke test (frame-busting JS is invisible to headers). Also update
`workbench.test.ts` (external `frame` rows currently hard-fail) with a dated
`FRAME_VERIFIED_HOSTS` allowlist.

```js
// scripts/verify-frame-headers.mjs — run: node scripts/verify-frame-headers.mjs
// Flips Toolbox rows to embed:"frame" only on hard evidence, per docs/decisions/0003.
const URLS = [
  "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-395",
  "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-396",
  "https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-382",
  "https://eld.fmcsa.dot.gov/List",
  "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
  "https://wsdot.com/travel/real-time/mountainpasses",
  "https://www.tripcheck.com/",
  "https://511.idaho.gov/",
  "https://www.weather.gov/",
  "https://www.eia.gov/petroleum/gasdiesel/",
  "https://www.iftach.org/",
];

const UA = "LoadOff-ToolboxHeaderCheck/1.0 (ops@loadoff.app)";

async function probe(url) {
  let res;
  try {
    res = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA } });
    // Some IIS/ASP.NET hosts 405 HEAD or strip headers on it — fall back to GET.
    if (!res.ok || (!res.headers.get("x-frame-options") && !res.headers.get("content-security-policy"))) {
      const g = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": UA } });
      if (g) res = g; // headers are what we need; body is discarded
    }
  } catch (e) {
    return { url, error: String(e) };
  }
  const xfo = res.headers.get("x-frame-options");
  const csp = res.headers.get("content-security-policy");
  const cspRo = res.headers.get("content-security-policy-report-only");
  const fa = csp?.match(/frame-ancestors\s+([^;]+)/i)?.[1]?.trim() ?? null;
  // frame-ancestors has NO fallback to default-src (CSP spec) — only the directive itself counts.
  const blocked = Boolean(xfo) || (fa !== null && !/\*|https?:$/.test(fa));
  return {
    url, finalUrl: res.url, status: res.status,
    "x-frame-options": xfo ?? "(none)",
    "frame-ancestors": fa ?? "(none)",
    "csp-report-only": cspRo ? "(present — not enforced)" : "(none)",
    verdict: blocked ? "BLOCKED — keep embed:\"sheet\"" : "FRAMEABLE by headers — visual iframe test, then flip",
  };
}

const results = await Promise.all(URLS.map(probe));
console.table(results.map(({ url, ...r }) => ({ url: url.replace("https://", "").slice(0, 48), ...r })));
const flips = results.filter((r) => r.verdict?.startsWith("FRAMEABLE"));
console.log(`\n${flips.length} candidate(s) to promote:`);
for (const f of flips) console.log(`  - ${f.url}`);
console.log("\nReminder: headers ≠ proof against JS frame-busting; load each candidate in a real
<iframe> once before changing workbench.ts, and add the host + date to the test allowlist.");
```

Expected output if today's scans hold: BLOCKED for eCFR ×3, ELD list, SAFER, Idaho 511,
iftach.org; FRAMEABLE for wsdot.com, tripcheck.com, weather.gov, eia.gov.

## Sources

**Header evidence — securityheaders.com live scans, all verified 2026-08-07 (23:47–23:52 UTC):**
[weather.gov](https://securityheaders.com/?q=https%3A%2F%2Fwww.weather.gov&followRedirects=on) ·
[ecfr part-395](https://securityheaders.com/?q=https%3A%2F%2Fwww.ecfr.gov%2Fcurrent%2Ftitle-49%2Fsubtitle-B%2Fchapter-III%2Fsubchapter-B%2Fpart-395&followRedirects=on) ·
[ecfr part-396](https://securityheaders.com/?q=https%3A%2F%2Fwww.ecfr.gov%2Fcurrent%2Ftitle-49%2Fsubtitle-B%2Fchapter-III%2Fsubchapter-B%2Fpart-396&followRedirects=on) ·
[ecfr part-382](https://securityheaders.com/?q=https%3A%2F%2Fwww.ecfr.gov%2Fcurrent%2Ftitle-49%2Fsubtitle-B%2Fchapter-III%2Fsubchapter-B%2Fpart-382&followRedirects=on) ·
[eld.fmcsa.dot.gov/List](https://securityheaders.com/?q=https%3A%2F%2Feld.fmcsa.dot.gov%2FList&followRedirects=on) ·
[safer.fmcsa.dot.gov](https://securityheaders.com/?q=https%3A%2F%2Fsafer.fmcsa.dot.gov%2FCompanySnapshot.aspx&followRedirects=on) ·
[wsdot.com passes](https://securityheaders.com/?q=https%3A%2F%2Fwsdot.com%2Ftravel%2Freal-time%2Fmountainpasses&followRedirects=on) ·
[tripcheck.com](https://securityheaders.com/?q=https%3A%2F%2Fwww.tripcheck.com&followRedirects=on) ·
[511.idaho.gov](https://securityheaders.com/?q=https%3A%2F%2F511.idaho.gov&followRedirects=on) ·
[eia.gov gasdiesel](https://securityheaders.com/?q=https%3A%2F%2Fwww.eia.gov%2Fpetroleum%2Fgasdiesel%2F&followRedirects=on) ·
[iftach.org](https://securityheaders.com/?q=https%3A%2F%2Fwww.iftach.org&followRedirects=on)

**Official API documentation (all verified 2026-08-07 unless dated):**
- eCFR: [interactive API docs](https://www.ecfr.gov/developers/documentation/api/v1) ·
  [REST API reader-aid ("No API keys are needed")](https://www.ecfr.gov/reader-aids/ecfr-developer-resources/rest-api-interactive-documentation) ·
  [live titles.json](https://www.ecfr.gov/api/versioner/v1/titles.json)
- NWS: [API Web Service](https://www.weather.gov/documentation/services-web-api) ·
  [General FAQs](https://weather-gov.github.io/api/general-faqs) ·
  [2014 widget-retirement PNS (source dated 2014)](https://www.weather.gov/media/notification/pdfs/pns14forecast_obs_widget_aab.pdf)
- WSDOT: [Traveler Information API + AccessCode signup](https://wsdot.wa.gov/traffic/api/) ·
  [MountainPassConditions REST help](https://wsdot.wa.gov/Traffic/api/MountainPassConditions/MountainPassConditionsREST.svc/Help)
- Idaho 511: [developer docs (key + 10/60 s throttle)](https://511.idaho.gov/developers/doc) ·
  [mountainpasses endpoint doc](https://511.idaho.gov/help/endpoint/mountainpasses)
- ODOT: [TripCheck API page](https://www.tripcheck.com/Pages/API) ·
  [API portal](https://apiportal.odot.state.or.us/) ·
  [TripCheck Data API product](https://apiportal.odot.state.or.us/product/tripcheck-data-api) ·
  [Getting Started Guide PDF](https://www.tripcheck.com/pdfs/TripCheckAPI_Getting_Started_GuideV5.pdf)
- FMCSA: [QCMobile getStarted (login.gov → My WebKeys)](https://mobile.fmcsa.dot.gov/QCDevsite/docs/getStarted)
- EIA: [registration](https://www.eia.gov/opendata/register.php) ·
  [gasdiesel page (open-data pointers)](https://www.eia.gov/petroleum/gasdiesel/) ·
  regional series existence: [West Coast EMD_EPD2D_PTE_R50_DPG](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2D_PTE_R50_DPG&f=A) ·
  [East Coast EMD_EPD2D_PTE_R10_DPG](https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=M&n=PET&s=EMD_EPD2D_PTE_R10_DPG)
- IFTA: [Tax Rate Matrix downloads (CSV/XML/XLS per quarter)](https://www.iftach.org/taxmatrix4/TaxDownload.php)

**Repo ground truth (read-only, /tmp/ttw-probe):** `src/lib/hub/workbench.ts` (registry + 11
external rows) · `src/lib/hub/__tests__/workbench.test.ts` (frame ⇒ same-origin invariant) ·
`docs/decisions/0003-everything-app.md` (flip rule) · `docs/integrations/eia.md` and
`docs/integrations/fmcsa.md` (EIA v2 + QCMobile already live; rate-limit findings dated 2026-07).

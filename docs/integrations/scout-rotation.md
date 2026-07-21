# Partner-API scout rotation registry

Registry for the **Partner-API scout** routine (`docs/agent-improvement-loop.md` §5, Claude
lane fleet). Each cycle picks ONE provider below — rotate by whichever `docs/integrations/<provider>.md`
is oldest or missing, weighted toward providers with a **built adapter** (an API-change there can
silently break production; a stub has nothing to break yet). Research auth model, endpoints,
rate limits, sandbox, and pricing; write/refresh the provider doc; flag adapter-breaking changes
as an urgent `Backlog:` item.

| Provider | Code status | Credential fields | Adapter file | Research doc | Last researched |
|---|---|---|---|---|---|
| `terminal` | **Built** — live TSP aggregator (vehicles + HOS); cron daily 12:00 UTC (doc reconciled 2026-07-19 — the stale "30-min cron" claim is fixed). 2026-07-19 pass: no breaking change (auth + models match adapter); sandbox is dashboard-self-serve (secret + publishable key, `link.sandbox.withterminal.com`); `GET /connections/current` found as a cheap credential health-check; official Link npm SDKs exist; docs host now network-policy-blocked (proxy CONNECT 403) so numeric rate limits remain unread | `apiKey`, `connectionToken` (+ `TERMINAL_API_BASE` env, optional) | `src/lib/hub/telematics.ts` | [`terminal.md`](./terminal.md) | 2026-07-19 |
| `mailbox` | **Built** — generic IMAP client, not a vendor SDK. Three auth paths live since 2026-07-11: Gmail app password, M365 client-credentials OAuth2, Google Workspace service-account OAuth2 (XOAUTH2). Cron is daily 12:30 UTC, not hourly as older notes said. Workspace app-password reliability contested — steer Workspace to OAuth2 (see doc) | `user`, `password` (Gmail only), `tenantId`/`clientId`/`clientSecret` (M365), `serviceAccountKey` (Workspace), `host`, `port`, `folder` | `src/lib/hub/mailbox.ts` + `mailbox-oauth.ts` | [`mailbox.md`](./mailbox.md) | 2026-07-18 |
| `fmcsa` (adjacent, free, not in `IntegrationProvider` union — no stored creds) | **Built** — QCMobile broker vetting. 2026-07-19 pass: no breaking change (webKey query-param auth + login.gov registration unchanged); rate limits still unpublished; `mobile.fmcsa.dot.gov` now network-policy-blocked from agent environments (CONNECT 403) — prod's daily `fmcsa-recheck` cron is the live-service canary | `FMCSA_WEBKEY` env | `src/lib/hub/vetting.ts` | [`fmcsa.md`](./fmcsa.md) | 2026-07-19 |
| `eia` (adjacent, free, not in `IntegrationProvider` union) | **Built** — diesel price benchmark. 2026-07-19 pass: no breaking change (v2 current, series `EMD_EPD2D_PTE_NUS_DPG` alive into 2026); two doc corrections — EIA DOES publish throttles (~9,000 req/hr sustained, 5 req/s burst, temporary auto-suspension) and `DEMO_KEY` is NOT supported (api.data.gov convention, was never EIA's) | `EIA_API_KEY` env | `src/lib/hub/fuel.ts` | [`eia.md`](./eia.md) | 2026-07-19 |
| `truckercloud` | **Built** — adapter shipped, drop-in second aggregator to Terminal. 2026-07-20 pass (5th): no adapter-breaking change; every `truckercloud.com`/zendesk/trade-press page still 403 to this env, so the OAuth2 client-credentials assumption stays unverified (anonymous scouting now exhausted — human outreach only). One correction: Carrier TMS is still an explicitly marketed solution, so the "insurer pivot forecloses carrier access → redirect to Axle" worry is downgraded from likely to unlikely. Provider count now marketed as "175+ ELDs and Cameras". Stale `"Apollo API"` code comment in `telematics.ts` flagged as an integrations-lane Backlog item | `apiKey`, `clientId`/`clientSecret` | `src/lib/hub/telematics.ts` (`truckerCloudSource`) | [`truckercloud.md`](./truckercloud.md) | 2026-07-20 |
| `dat` | **Built** — search + posting-to-load-draft mapper; registry `status: "live"` (manual sync). 2026-07-20 pass: no wire-format breaking change (per-request Basic auth on the service account still matches the assumed shape); confirmed via FAQ that service accounts hold zero seats and the acting user carries the Connexion/load board seats — the missing `actingUserEmail` credential field shipped this pass, `datSource().search()` now refuses without it | `serviceAccountEmail`, `password`, `actingUserEmail` (added 2026-07-20) | `src/lib/hub/integrations/dat.ts` | [`dat.md`](./dat.md) | 2026-07-20 |
| `efs` | **Built** — adapter shipped; real feed is a daily SFTP CSV — signed file-drop webhook shipped 2026-07-17 (`processEfsEvent`), Go-worker SFTP poller still the long-term option. 2026-07-20 pass: no breaking change (provisioning path/timeline/transport all still match); every direct vendor fetch 403-walled again, so confirmation is search-snippet only. Two corroborating sources found the same transaction-field set independently (Level-III fields, Motive's synthesized view), and the Motive source surfaced a "discounts applied" field `normalizeEfsRecord` doesn't currently capture — flagged for whenever a real file lands, not urgent | `feedUser`, `feedPassword`, `webhookSecret` | `src/lib/hub/integrations/efs.ts` | [`efs.md`](./efs.md) | 2026-07-20 |
| `wex` | **Built** — adapter shipped; real feed confirmed daily SFTP CSV (same as EFS) — signed file-drop webhook shipped 2026-07-18 (`processWexEvent`) | `feedUser`, `feedPassword`, `webhookSecret` | `src/lib/hub/integrations/wex.ts` | [`wex.md`](./wex.md) | 2026-07-18 |
| `comdata` | **Built** — adapter shipped, daily cron live; Corpay has REAL machine channels (SOAP FleetCreditWS UsernameToken, REST developer portal, partner daily AC00029 fixed-width file) — file-drop webhook shipped 2026-07-18 (`processComdataEvent`) | `apiKey`, `apiSecret`, `webhookSecret` | `src/lib/hub/integrations/comdata.ts` | [`comdata.md`](./comdata.md) | 2026-07-18 |
| `qbo` | **Built** — pull + push both directions, refresh-token rotation confirmed correct; `minorversion` bumped 65→75 (2026-07-19), 5-year refresh-token cap surfaced on the settings card. 2026-07-21 pass: no adapter-breaking change; the previously-open expiry-field question is closed — the authoritative field is `x_refresh_token_expires_in` (the field the adapter already reads; value `157680000` s = 5 y under the cap), so no `refreshAccessToken` change is needed; also documented Intuit's customer-facing expiry notices (in-app 30 d / email 7 d), which fire *after* our 90-day card warning. Intuit pages still 403 this env — search-excerpt confirmation only | OAuth2 (Intuit) | `src/lib/hub/integrations/qbo.ts` | [`qbo.md`](./qbo.md) | 2026-07-21 |
| `factor` | **Built** — push + webhook receiver; vendor landscape pinned: OTR Solutions is the only factor with public dev docs + test env (recommended first target); Apex/Denim are API-key class; RTS/Triumph are FTP file drops (EFS-style transport gap); NO factor documents webhooks to carriers — funding status is poll-based everywhere (see doc) | varies by factor | `src/lib/hub/integrations/factor.ts` | [`factor.md`](./factor.md) | 2026-07-17 |
| `truckstop` | **Built** — full slice shipped (search UI + booking, migration 017 applied); real API confirmed as SOAP/XML with `IntegrationId`+`UserName`+`Password` in the envelope body; 2026-07-21 integrations-lane rewrite matched the adapter's transport to this (SOAP envelope + XML parse replacing the old Bearer-key REST guess, registry fields updated to match); sandbox exists at `testws.truckstop.com` (see doc); still unconfirmed: the real `GetLoadSearchResults` response element names | `integrationId`, `username`, `password` | `src/lib/hub/integrations/truckstop.ts` | [`truckstop.md`](./truckstop.md) | 2026-07-18 |

All ten vendor providers now have both a shipped adapter and a research doc (this row was
stale — it previously described `dat`/`efs`/`wex`/`comdata`/`truckercloud` as credential-only
stubs; the integrations lane has since shipped real adapter code for every one, see each doc's
"Adapter file" column). The only remaining gaps are the two free/adjacent government-API
integrations that were never in scope of the vendor shopping list: both `fmcsa.md` and
`eia.md` were added 2026-07-07.

## Rotation rule

1. Prefer a **built** adapter whose doc is missing or oldest (breaking change there is
   production-impacting).
2. Otherwise take the stub provider whose doc is oldest or missing, to pre-stage integration
   notes before a lane builds the adapter.
3. One provider per cycle. Update the "Last researched" date and doc link when done.

Next up by this rule: `factor.md` (2026-07-17, now the sole oldest built-adapter doc after the
2026-07-21 `qbo` pass; then `mailbox`/`wex`/`comdata`/`truckstop` at 2026-07-18). The
2026-07-21 `qbo` pass found no adapter-breaking change: minorversion-75 default, `Id`-not-sortable,
CloudEvents webhooks, the OAuth2 refresh-token grant, and the 500 req/min/realm + 10-concurrent
limits are all unchanged. It closed the doc's top open question — the refresh-token-expiry field is
`x_refresh_token_expires_in` (the field the adapter already reads; no differently-named field was
added, and it now carries `157680000` s = 5 y under the cap), so the `refreshAccessToken` "prefer a
new field" contingency is moot — and documented Intuit's customer-facing expiry notices (in-app
30 d, email 7 d), which fire after LoadOff's own 90-day settings-card warning. Intuit's pages
(developer.intuit.com, help center, medium.com/intuitdev) still 403 automated fetches, so
confirmation is search-excerpt only. The 2026-07-20 EFS pass found no breaking change: provisioning path, timeline, and
transport (daily SFTP CSV) all still match the 2026-07-11 doc. Every direct vendor fetch
403-walled again this pass (efsllc.com, emgr.efsllc.com, geotab.com, fleetio.com,
firstfleetinc.com, gomotive.com, and — newly ruled out as a false lead — wextelematics.com, a
different WEX product), so confirmation is search-snippet only, same wall as terminal/
truckercloud/fmcsa/dat. One substantive addition: a second independent source (Motive's
synthesized transaction view) landed on the same field set as the existing Level-III list and
surfaced a "discounts applied" field `normalizeEfsRecord` doesn't currently capture — flagged
in `efs.md` as a minor gap to close whenever a real provisioned file lands, not urgent. The
2026-07-20 DAT pass before that found no wire-format breaking change to the existing per-request Basic-auth guess, but
did close a real gap: the RESTful API FAQ confirms service accounts carry zero seats/services —
all seat requirements (Connexion + load board, +RateView for rates) attach to the acting user,
not the service account — so the previously-flagged missing `actingUserEmail` credential field
now ships on the `dat` registry entry and `datSource().search()` refuses without it. One
unconfirmed, single-source finding this pass: a search snippet states RateView Combo Pro/Premium
is required for RESTful API integration, which reads narrower than the doc's existing "any load
board tier" claim — flagged in `dat.md` as needing a second source, not yet acted on. The
2026-07-20 pass before that covered `truckercloud.md`: no
adapter-breaking change (auth/endpoints still unverifiable — five straight passes have hit a 403
wall on every TruckerCloud-controlled page, so anonymous scouting is exhausted and only human
outreach can confirm the OAuth token endpoint + feed schema); the substantive correction was that
Carrier TMS remains a marketed TruckerCloud solution, so the prior "redirect to Axle" contingency
is downgraded to unlikely. The 2026-07-19
government-API pass covered `fmcsa.md` + `eia.md` in one cycle as planned: neither has an
adapter-breaking change; EIA's doc got two substantive corrections (published throttle numbers
of ~9,000 req/hr + 5 req/s replace the "no published limits" claim; the `DEMO_KEY` sandbox
claim was wrong and is retracted); FMCSA's registration/auth model is confirmed unchanged but
`mobile.fmcsa.dot.gov` joined `docs.withterminal.com` on the network-policy blocklist (CONNECT
403), so future passes can only verify it via search excerpts or a human browser. The 2026-07-19 terminal pass found no breaking
change (auth pattern and both data models still match the adapter verbatim); it corrected the
doc's stale "30-min cron" claim to the actual daily 12:00 UTC schedule (which upgrades the
webhook-receiver backlog item from latency nicety to the only same-hour data path), pinned
down sandbox provisioning (self-serve Sandbox Dashboard keys + `link.sandbox.withterminal.com`),
and found `GET /connections/current` as a natural "Test connection" target. Numeric rate
limits remain unreadable — `docs.withterminal.com` is now blocked at the network-policy level
(proxy CONNECT 403), so that verification still needs a human with a browser.
The 2026-07-18 mailbox pass found: the doc's auth-model section was already accurate
(the OAuth2 shipper updated it 2026-07-11 — better than the previous next-up note assumed);
real drift was the cron cadence (daily 12:30 UTC, not hourly — doc + registry corrected)
and a new provider-policy nuance: Google Workspace app-password IMAP is contested
post-May-2025 (conflicting sources, Google help pages 403-blocked) — operationally moot
since the Workspace OAuth2 path shipped and the UI steers there. Microsoft side clean:
`IMAP.AccessAsApp` client-credentials unchanged; April 2026 basic-auth retirement is
SMTP-AUTH-only (we don't send). `comdata.md`/`qbo.md`/`factor.md`/`truckstop.md` were all
refreshed 2026-07-16 through 2026-07-18 (see rows above) and `wex.md` again 2026-07-18 —
none of those are next-up candidates anymore.

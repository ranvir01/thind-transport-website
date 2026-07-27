# Partner-API scout rotation registry

Registry for the **Partner-API scout** routine (`docs/agent-improvement-loop.md` §5, Claude
lane fleet). Each cycle picks ONE provider below — rotate by whichever `docs/integrations/<provider>.md`
is oldest or missing, weighted toward providers with a **built adapter** (an API-change there can
silently break production; a stub has nothing to break yet). Research auth model, endpoints,
rate limits, sandbox, and pricing; write/refresh the provider doc; flag adapter-breaking changes
as an urgent `Backlog:` item.

| Provider | Code status | Credential fields | Adapter file | Research doc | Last researched |
|---|---|---|---|---|---|
| `terminal` | **Built** — live TSP aggregator (vehicles + HOS); cron daily 12:00 UTC (doc reconciled 2026-07-19 — the stale "30-min cron" claim is fixed). 2026-07-23 pass (4th): no breaking change — auth (Bearer + `Connection-Token`), `List Vehicles`/`Get Current Connection`/HOS-available-time endpoints, provider count (316/290), npm SDKs (still v0.5.0), and seed-only funding all unchanged; new refinement: a **dedicated vehicle-location-change webhook** is a confirmed shipped feature (the exact event our daily position poll substitutes for → strengthens the webhook-receiver backlog); `docs.withterminal.com` still 403s this env (network-policy CONNECT block, 4th straight wall) so numeric rate limits + full response-shape diff stay human-browser work. Prior 2026-07-19 finds (sandbox dashboard-self-serve, `GET /connections/current` health-check, Link npm SDKs) all still stand | `apiKey`, `connectionToken` (+ `TERMINAL_API_BASE` env, optional) | `src/lib/hub/telematics.ts` | [`terminal.md`](./terminal.md) | 2026-07-23 |
| `mailbox` | **Built** — generic IMAP client, not a vendor SDK. Three auth paths live since 2026-07-11: Gmail app password, M365 client-credentials OAuth2, Google Workspace service-account OAuth2 (XOAUTH2). Cron is daily 12:30 UTC, not hourly as older notes said. 2026-07-22 pass: no adapter-breaking change; resolved the 2026-07-18 "Workspace app-password reliability contested" finding — five independent 2026 sources confirm Workspace app passwords still work for IMAP post-May-2025 shutoff, gated by a separate admin toggle (Security → Authentication → 2-Step Verification → "Allow users to generate app passwords"), not by the less-secure-apps retirement itself. The shipped `serviceAccountKey` OAuth2 path remains the recommended default regardless | `user`, `password` (Gmail only), `tenantId`/`clientId`/`clientSecret` (M365), `serviceAccountKey` (Workspace), `host`, `port`, `folder` | `src/lib/hub/mailbox.ts` + `mailbox-oauth.ts` | [`mailbox.md`](./mailbox.md) | 2026-07-22 |
| `fmcsa` (adjacent, free, not in `IntegrationProvider` union — no stored creds) | **Built** — QCMobile broker vetting. 2026-07-23 pass (3rd): no breaking change (webKey query-param auth + login.gov registration unchanged, third straight confirmation); rate limits still unpublished; `mobile.fmcsa.dot.gov` still network-policy-blocked (CONNECT 403) — new find: a real ~5-hour FMCSA-wide scheduled-maintenance outage (Jun 1–2, 2026 ET) is the first concretely-dated instance of the doc's prior generic "coordinated outages" claim; prod's daily `fmcsa-recheck` cron remains the live-service canary | `FMCSA_WEBKEY` env | `src/lib/hub/vetting.ts` | [`fmcsa.md`](./fmcsa.md) | 2026-07-23 |
| `eia` (adjacent, free, not in `IntegrationProvider` union) | **Built** — diesel price benchmark. 2026-07-23 pass (3rd): no breaking change (v2 current, series `EMD_EPD2D_PTE_NUS_DPG` alive, third straight confirmation of the 2026-07-19 throttle numbers + `DEMO_KEY`-unsupported correction); new corroborating find: EIA's legacy v1 API was fully discontinued Nov 2022 with no v3/v2-sunset notice anywhere, the strongest signal yet that v2 isn't near end-of-life; `api.eia.gov`/`www.eia.gov`/doc PDFs still 403 this env | `EIA_API_KEY` env | `src/lib/hub/fuel.ts` | [`eia.md`](./eia.md) | 2026-07-23 |
| `truckercloud` | **Built** — adapter shipped, drop-in second aggregator to Terminal. 2026-07-20 pass (5th): no adapter-breaking change; every `truckercloud.com`/zendesk/trade-press page still 403 to this env, so the OAuth2 client-credentials assumption stays unverified (anonymous scouting now exhausted — human outreach only). One correction: Carrier TMS is still an explicitly marketed solution, so the "insurer pivot forecloses carrier access → redirect to Axle" worry is downgraded from likely to unlikely. Provider count now marketed as "175+ ELDs and Cameras". Stale `"Apollo API"` code comment in `telematics.ts` flagged as an integrations-lane Backlog item | `apiKey`, `clientId`/`clientSecret` | `src/lib/hub/telematics.ts` (`truckerCloudSource`) | [`truckercloud.md`](./truckercloud.md) | 2026-07-20 |
| `dat` | **Built** — search + posting-to-load-draft mapper; registry `status: "live"` (manual sync). 2026-07-24 pass (3rd): no adapter-breaking change (two-level org+user token auth confirmed a 3rd straight time; 28-min token cache reconfirmed from a second source). **Resolved the 2026-07-20 open RateView question**: a second, explicit FAQ snippet shows the split — RateView Combo Pro/Premium gates the **RateView (rate-lookup) API only**; the base **load-board search+post** API this adapter uses needs only *any* load board tier + Connexion + load board seat. The adapter does search + post-to-draft, never a rate request, so RateView Combo is off LoadOff's critical path → **no pricing change** to `creds-shopping-list.md`. New catalog note: DAT's REST family is Load Board / **BookNow** / DAT Tracking / Freight Posting — BookNow is DAT's own booking API, the surface to request for the future "book this posting" slice (today it maps to a *local* `createLoad()` draft). Every DAT page (`one.support.dat.com`, `developer.dat.com`, `learn.tai-software.com`) still 403s this env — search-excerpt only | `serviceAccountEmail`, `password`, `actingUserEmail` (added 2026-07-20) | `src/lib/hub/integrations/dat.ts` | [`dat.md`](./dat.md) | 2026-07-24 |
| `efs` | **Built** — adapter shipped; real feed is a daily SFTP CSV — signed file-drop webhook shipped 2026-07-17 (`processEfsEvent`), Go-worker SFTP poller still the long-term option. 2026-07-26 pass (3rd re-scout): no adapter-breaking change, and — for the first time this rotation — **no new information at all**: a same-day eManager "Data Sharing Preferences" PDF found off the usual vendor domains 404'd instead of loading, and every other candidate (Fleetio, Geotab, Motive, FleetRabbit, a newly-surfaced Datatruck EFS page) 403'd on direct fetch, third straight fully-walled pass. The 2026-07-20 "discounts applied" field lead stays unconfirmed/unrefuted; recommend not re-querying it every cycle — it needs a provisioned file or human browser, not another anonymous search | `feedUser`, `feedPassword`, `webhookSecret` | `src/lib/hub/integrations/efs.ts` | [`efs.md`](./efs.md) | 2026-07-26 |
| `wex` | **Built** — adapter shipped; real feed confirmed daily SFTP CSV (same as EFS) — signed file-drop webhook shipped 2026-07-18 (`processWexEvent`). 2026-07-22 pass: no adapter-breaking change; two new integrator sources (Samsara, Azuga) found faster SFTP-provisioning timelines (2–4 days) than Fleetio's 7–10, a conflicting/unconfirmed account-number-format claim (690046-prefix/19-digit vs. our doc's 13-digit claim — docs-only, adapter doesn't parse the field), selectable daily/weekly/monthly file frequency, and 2026 card pricing (~$40 setup, ~$2–4/card/mo) | `feedUser`, `feedPassword`, `webhookSecret` | `src/lib/hub/integrations/wex.ts` | [`wex.md`](./wex.md) | 2026-07-22 |
| `comdata` | **Built** — adapter shipped, daily cron live; Corpay has REAL machine channels (SOAP FleetCreditWS UsernameToken, REST developer portal, partner daily AC00029 fixed-width file) — file-drop webhook shipped 2026-07-18 (`processComdataEvent`). 2026-07-27 pass (6th straight wall): no adapter-breaking change (REST-pull placeholder + file-drop path untouched); three refining finds — a NEW **NCR Voyix × Corpay fleet-card *acceptance*** partnership (Voyix Connect POS gateway accepting Comdata cards at 18k+ stations, deploy 2026) is a **merchant-acceptance red herring**, not the carrier feed (same class as the PDI Merchant-POS divestiture); the 2026-07-22 "several ops deprecated" finding now has a **named op (Customer Profile Limit Inquiry)** and a **spec version (Document Version 4.8, dated 2025-04-11)** — SOAP-only, our pull calls none; FleetRabbit/Motive re-corroborate a third-party real-time API sync without exposing carrier auth. Recommend a **slower re-scout cadence** — Comdata's carrier auth/endpoint/rate-limit numbers are onboarding-packet/human-browser work now, not anonymous-search work. Prior 2026-07-22 finds (PDI divestiture, `developer.crossborder.corpay.com` = FX-not-fuel red herring, 2026 card pricing ~$50 setup/~$8/card/mo/$3 out-of-network/$0 in-network) all still stand | `apiKey`, `apiSecret`, `webhookSecret` | `src/lib/hub/integrations/comdata.ts` | [`comdata.md`](./comdata.md) | 2026-07-27 |
| `qbo` | **Built** — pull + push both directions, refresh-token rotation confirmed correct; `minorversion` bumped 65→75 (2026-07-19), 5-year refresh-token cap surfaced on the settings card. 2026-07-25 pass (6th): no adapter-breaking change — minorversion-75 still the baseline (no v76 announced), 5-year refresh-token cap production-live since 2026-01-27 (accounting scope → first expiries Oct 2028), `x_refresh_token_expires_in` field + Reconnect-URL (2026-02-24) + 500/min-realm limits all unchanged; one new but **non-breaking** find — Intuit's Reports API deprecation of non-documented reports, which this adapter never touches (it only queries Payment/Invoice + entity-create for Customer/Item/Invoice, no Reports API). developer.intuit.com 403'd again (6th straight) — search-excerpt confirmation only | OAuth2 (Intuit) | `src/lib/hub/integrations/qbo.ts` | [`qbo.md`](./qbo.md) | 2026-07-25 |
| `factor` | **Built** — push + webhook receiver; vendor landscape pinned: OTR Solutions is the only factor with public dev docs + test env (recommended first target); Apex/Denim are API-key class; RTS/Triumph are FTP file drops (EFS-style transport gap); NO factor documents webhooks to carriers — funding status is poll-based everywhere (see doc). 2026-07-26 pass (3rd): no adapter-breaking change (7th straight for the lane) — **OTR auth confirmed as Azure APIM** (`Ocp-Apim-Subscription-Key` header + `429 Too Many Requests` throttle, numeric quota still unpublished), so a wired OTR adapter needs a subscription-key credential field + `429`-backoff handling (schema tweak, not row-shape — Backlog); **new go-live gate** (a required "Show and Tell" with OTR's Partner Integrations Team before production); OTR docs grew **Load Shares** (broker→carrier invoice-prefill, adjacent to Rate Verification) + **Broker Integrations** (out of scope) pages; vendor refresh — HaulPay/ComFreight acquired by Dakota Financial (2024), Apex still paste-an-API-key, Denim still integration-layer status-back (no public carrier webhook). Every vendor/docs host still 403s this env. Prior 2026-07-21 find still stands: OTR names three products (Rate Verification / Document Exchange / Carrier Setup) — Document Exchange is the one `submitInvoiceToFactor` targets | varies by factor | `src/lib/hub/integrations/factor.ts` | [`factor.md`](./factor.md) | 2026-07-26 |
| `truckstop` | **Built** — full slice shipped (search UI + booking, migration 017 applied); real API confirmed as SOAP/XML with `IntegrationId`+`UserName`+`Password` in the envelope body; 2026-07-21 integrations-lane rewrite matched the adapter's transport to this (SOAP envelope + XML parse replacing the old Bearer-key REST guess, registry fields updated to match); sandbox exists at `testws.truckstop.com` (see doc). 2026-07-25 pass (2nd docs re-pass): portal still 403-walled to direct fetch, but four independent search queries converged on consistent field lists for the first time — **candidate adapter bug found**: the response item wrapper looks like `LoadSearchItem`, not the `LoadSearchResult` tag `parseLoadSearchResponse` hard-codes, which would make the parser silently return zero postings against a real response; search-snippet evidence only, not primary-source confirmed, flagged as an integrations-lane `Backlog` item, not touched (out of docs-lane territory). Also resolved the 2026-07-21 `DestinationCity` open question — it's a response field, not request-criteria, so no city-filter wiring was ever blocked on it | `integrationId`, `username`, `password` | `src/lib/hub/integrations/truckstop.ts` | [`truckstop.md`](./truckstop.md) | 2026-07-25 |

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

Next up by this rule: after the 2026-07-27 `comdata` re-pass, the oldest built-adapter docs
are the two remaining from the old 2026-07-22 tie — `mailbox` and `wex` (both 2026-07-22);
`truckercloud` (2026-07-20) is older still but anonymous scouting there is exhausted (five
straight total 403 walls) — skip until a human makes vendor contact. Between `mailbox` and
`wex`, **prefer `mailbox` next** (alphabetical tiebreak, same rule style as prior ties) — and
note `mailbox` is the least-walled provider in the rotation (its IMAP/OAuth research draws on
Google/Microsoft secondary sources that don't 403 the way the vendor-controlled fuel/board
portals do), so it is also where another anonymous pass has the best odds of surfacing
something real rather than logging another wall. Worth flagging for whoever reviews this
rotation: the **fuel-card + load-board cluster** (`comdata` now 6, `truckercloud` 5, `efs` 3,
`wex`, `dat`, `qbo`, `factor`, `truckstop`, `terminal`, `fmcsa`, `eia` all multi-pass) has
converged on the same "no adapter-breaking change, every vendor page 403s, human-browser or
onboarding-packet work only" outcome for weeks. The anonymous-scouting well for every
vendor-portal provider is at or near exhaustion; the marginal value of another blind pass on
any already-3-plus-walled provider is low. A meta-governor pass may find this rotation is due
for a **slower cadence on the walled fuel/board providers** (re-scout only on a vendor-contact
or provisioned-file trigger) while keeping a normal cadence on the secondary-source-friendly
providers (`mailbox`, `eia`, `fmcsa`) where anonymous search still finds signal.
`truckstop` no longer needs an immediate re-pass: the 2026-07-25
scout run got its first multi-query-corroborated lead in seven straight attempts — a likely
`LoadSearchItem` vs. `LoadSearchResult` response-wrapper mismatch (see `truckstop.md`) — and that
now needs an integrations-lane primary-source check (developer packet or a non-403 browser pull)
before another docs pass would add anything. The 2026-07-26 `factor` pass (3rd) found no
adapter-breaking change and resolved the top open question's transport half: OTR fronts its carrier
API with **Azure API Management**, so the "Azure-APIM-style" subscription key is literally the
`Ocp-Apim-Subscription-Key` header, and APIM's rate-limit-by-key returns a bare `429 Too Many
Requests` past quota (numeric quota still unpublished) — a wired OTR adapter therefore needs a
subscription-key credential field plus `429`-backoff handling (schema tweak, not a row-shape change,
flagged as an integrations-lane Backlog item, not urgent — the stub calls no real vendor). New this
pass: OTR's onboarding has a required "Show and Tell" go-live gate with its Partner Integrations
Team, and its dev docs added Load Shares (broker→carrier invoice-prefill, adjacent to Rate
Verification) + Broker Integrations (out of scope) pages. Vendor refresh: HaulPay/ComFreight was
acquired by Dakota Financial in 2024; Apex still uses paste-an-API-key; Denim still pushes status
back through its integration layer, no public carrier webhook. Every vendor/docs host still 403'd
this env — same wall as every other provider. (Prior note, still true: the 2026-07-24 `efs` pass
found no adapter-breaking change and did not re-corroborate the Motive "discounts applied" field.) The 2026-07-25 `qbo` pass (6th) found no adapter-breaking change — minorversion-75 still the
baseline, the 5-year refresh-token cap and 500/min-realm limits are unchanged, and the one new
find (Intuit's Reports API deprecation) doesn't touch this adapter, which never calls Reports API.
The 2026-07-24 `dat` pass (3rd) found no adapter-breaking change
and resolved the standing RateView-Combo open question: the RateView Combo Pro/Premium requirement
gates DAT's RateView (rate-lookup) API only, not the base load-board search/post API LoadOff's
adapter uses (any load board tier + Connexion + load board seat suffices), so the
`creds-shopping-list.md` pricing story is unchanged. It also reconfirmed the two-level org+user
token auth (3rd straight pass) and the ~28-min token cache, and added a catalog note that DAT's
**BookNow** booking API is the surface to request for the future "book this posting" slice (which
today maps to a local `createLoad()` draft rather than a DAT-side booking). Every DAT page 403'd
this env again — search-excerpt confirmation only, same wall as every other provider in this
rotation.
The 2026-07-23 `fmcsa` + `eia` pass found no adapter-breaking change in either: `fmcsa`'s webKey
auth and login.gov registration are unchanged for a third straight pass, and its one new find is a
concretely-dated FMCSA-wide scheduled-maintenance outage (Jun 1–2, 2026 ET, ~5 hours) that
corroborates the doc's existing "coordinated outages happen" caveat rather than contradicting
anything the adapter assumes. `eia`'s v2 API, `EMD_EPD2D_PTE_NUS_DPG` series, and 2026-07-19
throttle numbers are unchanged, and this pass added a corroborating fact — EIA's v1 API was fully
discontinued in Nov 2022 with no v2 sunset or v3 announcement found anywhere, the strongest
evidence yet that v2 is stable long-term. Both providers hit the same wall as every pass before
them: `mobile.fmcsa.dot.gov` and `api.eia.gov`/`www.eia.gov` all 403 this environment's direct
fetch tooling, so every finding above is search-excerpt-confirmed, not primary-source-read. The
2026-07-23 `terminal`
pass (4th) found no adapter-breaking change: the Bearer + `Connection-Token` auth, the
`List Vehicles` / `Get Current Connection` / HOS-available-time endpoints, the 316/290 provider
count, the `@terminal-api/link-*` npm SDKs (still v0.5.0, no new release), and the seed-only
funding status are all unchanged from 2026-07-19. The one substantive refinement: Terminal's
**dedicated vehicle-location-change webhook** is a confirmed, shipped, generally-available feature
(publicly announced by Terminal) — it is the precise event class our daily
`/vehicles?expand=latestLocation` poll stands in for, so it is the highest-leverage piece of the
webhook catalog for LoadOff specifically and tightens the existing webhook-receiver backlog item
(not urgent, not adapter-breaking). `docs.withterminal.com` returned HTTP 403 to this environment
again (network-policy CONNECT block, fourth straight pass), so the numeric rate limits and a
field-by-field `/vehicles` ↔ `/hos/available-time` response-shape diff remain human-browser work. The 2026-07-22 `mailbox` pass found no adapter-breaking
change: the three auth paths, daily 12:30 UTC cron, and 15 MB attachment / 25-message-per-run caps
in `mailbox.ts`/`mailbox-oauth.ts` are all untouched. It resolved the one open question from
2026-07-18 — whether Google Workspace's app-password carve-out survived the May 2025
less-secure-apps shutoff. Five independent 2026-dated secondary sources (Domain India, InfoSwitch,
LeadsMonky, XpectoIT, Systron) now agree it did: Workspace app passwords for IMAP still work,
gated by a distinct admin toggle (Security → Authentication → 2-Step Verification → "Allow users
to generate app passwords") rather than by the 2025 shutoff. Operationally this doesn't change the
adapter or the settings-page copy — the shipped `serviceAccountKey` OAuth2 path stays the
recommended default for Workspace either way — it only downgrades "unreliable" to "admin-toggle-
dependent" in the doc. Also reconfirmed Gmail's 2,500 MB/500 MB daily IMAP bandwidth caps
unchanged, and noted Exchange Online's SMTP-AUTH basic-auth retirement (dates still inconsistent
across sources, phased through 2026) remains SMTP-only and so stays moot for an IMAP-only reader
adapter. Every Google/Microsoft primary page 403-walled this scout again — search-excerpt
confirmation only, same wall as every other provider in this rotation. The 2026-07-22 `wex` pass found no
adapter-breaking change — the file-drop webhook path (`processWexEvent` + `normalizeWexRecord`,
the only thing `wexSource()` actually runs) is untouched. Four finds, none urgent: (1) two new
integrator sources (Samsara, Azuga) document WEX returning SFTP credentials in 2–4 business
days, well under Fleetio's already-documented 7–10 — useful as a lower bound but the release-
form/file-drop model LoadOff actually uses doesn't hold carrier SFTP creds directly, so
Fleetio's number stays the conservative shopping-list estimate; (2) a conflicting, unconfirmed
claim — Samsara says WEX account numbers always start with 690046 and run 19 digits, directly
against Fleetio's existing 13-digit/04-69-369-2960-1960-7560-prefix claim; `wexSource()` never
parses the account-number field, so this is a docs-only conflict, flagged for a third source,
not resolved; (3) Azuga's setup form lets a carrier pick daily, weekly, or monthly file
delivery — our `wex-sync` cron's daily assumption is still the right default to recommend, but
a carrier could inadvertently choose a slower cadence; (4) captured 2026 card pricing (~$40
setup, ~$2–4/card/mo by tier). Every WEX/Corpay-controlled page (fleetapi.wexinc.com,
developer.wexinc.com) still 403s this env — search-excerpt confirmation only, same wall as
every other provider in this rotation.
The 2026-07-22 `comdata` pass found no adapter-breaking change — the REST-pull placeholder and the file-drop
webhook path (the two things our adapter actually runs) are both untouched. Four finds, none
urgent: (1) the Corpay/Comdata Web Services 2.1 Fleet Credit spec PDF is now dated 2025-04-11
and marks several operations deprecated for future removal — relevant only to a *future* SOAP
channel (`comdataSource().pull()` is a placeholder REST call, not a SOAP client, so it invokes
none of the deprecated ops), flagged in `comdata.md` to check the deprecation list before
anyone builds the real SOAP transport; (2) Corpay divested Comdata *Merchant POS Solutions* to
PDI Technologies — that's the merchant-acquiring side, NOT the fleet-card/fuel-transaction side
we integrate, so the feed is unaffected (noted to pre-empt a false alarm); (3) the shiny new
`developer.crossborder.corpay.com` portal is FX/cross-border only, a red herring for fuel — the
fuel channel is still `developers.fleetcor.com/naf` + `resourcecenter.comdata.com`; (4) captured
2026 card pricing (~$50 setup, ~$8/card/mo, $3 out-of-network / $0 in-network fee, 8–25¢/gal
retail-minus). Every Comdata/Corpay/FleetCor page still 403s this env — fifth straight
search-excerpt-only pass, same wall as terminal/truckercloud/fmcsa/dat/efs/qbo/factor/truckstop.
The
2026-07-21 `truckstop` pass (prompted by the same-day integrations-lane SOAP/XML rewrite's
Backlog flag) found no adapter-breaking change beyond what that rewrite already surfaced:
`developer.truckstop.com` and its `llms.txt` are still 403-walled to this environment exactly
as the 2026-07-18 pass found, so the `GetLoadSearchResults` response element names
(`parseLoadSearchResponse`/`normalizeTruckstopPosting`'s open question) stay unconfirmed. One
partial, unconfirmed lead surfaced on the separate open question of city-level search
filtering: a search snippet ties `DestinationCity`/`DestinationCountry` to the same reference
page as our confirmed SOAP endpoint, but a same-search `OriginCity` mention turned out to
trace to a different, already-ruled-out REST endpoint (`pload2`, broker-side posted-loads
search) — so it's flagged in `truckstop.md` as needing a second source before wiring, not
acted on. The
2026-07-21 `factor` pass found no adapter-breaking change: the subscription-key auth model
and poll-based (no webhook) funding status from the 2026-07-17 pass both stand; the new find
was that OTR names three distinct API products (Rate Verification, Document Exchange, Carrier
Setup) instead of one undifferentiated API — Document Exchange is the one `submitInvoiceToFactor`
targets, and Rate Verification covers the broker-eligibility-check synergy already noted. Every
OTR-adjacent page checked (`otrsolutions.com`, `docs.otrsolutions.com`, `vektortms.com`,
`helpcenter.gomotive.com`, `help.loadops.com`) 403'd this env's egress, so confirmation is
search-excerpt only — same wall as every other vendor doc in this rotation.
The 2026-07-21 `qbo` pass found no adapter-breaking change: minorversion-75 default, `Id`-not-sortable,
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

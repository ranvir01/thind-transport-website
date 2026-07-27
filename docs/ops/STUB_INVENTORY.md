# Stub inventory — every vendor integration, what credential unlocks it, what it earns per month

Generated 2026-07-25 against main@c52ec254. **Measured live in this session:** every file:line
citation (read from the working tree), all SQL against the seeded Postgres `hub` schema,
`npm run connections:check` output, `vercel.json` cron list. **List price:** vendor costs, all
taken from `docs/integrations/creds-shopping-list.md` or vendor marketing — none re-verified,
because vendor sites 403 this environment (`docs/integrations/comdata.md:17-19`,
`truckercloud.md:8-11`). **Inference:** every "Monthly value" cell. Each carries its assumption
inline. No dollar figure below was measured from Thind's books — the seeded DB is demo data.

Standing rate used everywhere: **$45/hr** = fully-loaded replacement cost of one office hour in
Kent WA. Ranvir's own hour is worth more; $45 is the defensible floor.

Standing volume assumption: **130 loads/month** = 12 trucks (`select count(*) from hub.trucks
where deleted_at is null` → 12) × ~2.5 loads/truck/week × 4.3 weeks. The seeded DB has 29 loads
over 79 days, which is demo scale, not fleet scale.
MISSING: real monthly load count, invoiced revenue, and fuel gallons — pull from Thind's 2026 Q2
QuickBooks P&L and the EFS monthly statement.

**Fixed 2026-07-27:** the qbo-is-mislabeled-stub and dat-is-mislabeled-live findings below
(`registry.ts:138`, `:87`) are corrected — qbo is now `status: "live"`, dat is now `status: "stub"`.
Every other finding in this doc is unchanged as of that date.

---

## 0. The one finding that outranks the table

**Zero of the ten providers can be activated today, and it is not because of any vendor.**
`CREDENTIALS_KEY` is unset (`connections:check` §1). `getCredentials()` returns `null` the
moment that env var is missing (`src/lib/hub/credentials.ts:62`), and `saveCredentials()` throws
before it ever reaches Postgres (`src/lib/hub/credentials.ts:19`, via `encryptPayload` →
`key()`). The connect form refuses honestly (`src/app/hub/_actions/integrations.ts:34-36`) and
the settings page shows a warning banner (`src/app/hub/(office)/settings/integrations/page.tsx:86-90`).

Setting one 32-character random string on Vercel is **10 minutes of work that unblocks every
lever below**. Nothing else in this document can happen first.

SQL confirming nothing has ever run:

```
select count(*) from hub.api_credentials;    -- 0
select count(*) from hub.integration_syncs;  -- 0
select count(*) from hub.integration_events; -- 0
select source, count(*) from hub.position_pings group by 1;   -- demo | 543
select source, count(*) from hub.fuel_transactions group by 1; -- csv:EFS | 35, csv:Comdata | 1
```

Every position ping and every fuel transaction in the database arrived through the CSV/demo path.

---

## 1. Correcting "8 live, 2 stub"

`connections:check` prints 8 providers `live` and 2 `stub`. That label is
`ProviderSpec.status` from `src/lib/hub/integrations/registry.ts:17-20`, and its own comment
says `live` means "client implemented and activatable with credentials" — **not** that
credentials exist and **not** that the endpoint is real.

The distinction that actually matters — does the adapter make a real HTTP call, or does it route
to `integrations/mock.ts`? — has a clean answer: **`mock.ts` is never reached at runtime.** Its
only importers are six test files:

```
$ grep -rln 'from "./mock"' --include=*.ts src/
src/lib/hub/__tests__/{comdata,dat,efs,truckstop,wex,integration-contract}.test.ts
```

So "mock-only" is the wrong axis. The right axis is **does the URL the adapter calls exist**.
Three answers, and the registry's `live`/`stub` label gets four providers wrong:

All adapter paths below are `src/lib/hub/integrations/` unless stated otherwise.

| Provider | registry `status` | Reality | Proof |
|---|---|---|---|
| terminal | live | **real call, real endpoint** | `src/lib/hub/telematics.ts:42` → `api.withterminal.com/tsp/v1`, Bearer + `Connection-Token` at `:47-50`; `docs/integrations/terminal.md:10-16` reconfirms auth model unchanged 2026-07-23 |
| mailbox | live | **real IMAP + real OAuth token mints** | `src/lib/hub/mailbox.ts:31-45` ImapFlow construct + connect; `src/lib/hub/mailbox-oauth.ts:50-62` (M365), `:108-115` (Google JWT-bearer) |
| qbo | **stub** | **most complete adapter in the repo** | full OAuth refresh (`qbo.ts:73-102`), rotation persisted (`:116-139`), Payment→Invoice DocNumber join (`:200-225`), push (`:374-468`). The `stub` label is simply wrong. |
| factor | **stub** | real POST **to a placeholder domain** | `factor.ts:136` default base is `https://api.factor-partner.example.com/v1` — an RFC-2606 example host, not a vendor. Processor (`factor.ts:75-111`) and wiring (`event-processors.ts:31`) are real; the destination is not. Set `FACTOR_API_BASE` or it posts nowhere. |
| truckercloud | live | real call, **guessed** token endpoint/shape | `src/lib/hub/telematics.ts:140-151`; `docs/integrations/truckercloud.md:9-11` — vendor 403s, "auth model / token endpoint / rate limits / sandbox are still guesses" |
| efs / wex | live | real call to an endpoint **that does not exist** | `efs.ts:64` `feed.efsllc.com/v1`, `wex.ts:69` `api.wexinc.com/fleet/v1` — contradicted by their own file headers, `efs.ts:11-19` and `wex.ts:11-21`: the real feed is a daily SFTP CSV, no REST. The working path is the signed file drop. |
| comdata | live | **placeholder REST call**, same as EFS/WEX | `comdata.ts:81` `api.comdata.com/fleet/v1`. `docs/integrations/comdata.md:27-28` states flatly: "`comdataSource().pull()` is a placeholder REST call, not a SOAP client". Corpay's real machine channel is SOAP Web Services 2.1 (`comdata.md:22-32`), which this repo does not speak. Working path is the file drop. |
| dat | live | **placeholder auth — will 401** | `dat.ts:127-136`: "the request below still sends organization Basic auth only (placeholder) … until DAT's developer packet confirms the token endpoints". Pasting real credentials produces HTTP 401, not loads. |
| truckstop | live | right protocol, **guessed response tags, sandbox default** | `truckstop.ts:242-250` speaks real SOAP 1.1; but `parseLoadSearchResponse` (`:193-214`) greps for an assumed `<LoadSearchResult>` tag (`:187-189`) and returns `[]` on a miss — a wrong element name yields **zero results with no error**. Default base is `https://testws.truckstop.com` (`:230`), the sandbox. |

**Net: 3 providers are genuinely paste-a-key (terminal, mailbox, qbo). 4 need a forwarder built
(efs, wex, comdata — all three are file-drop-only — and factor, which needs a real base URL).
3 will silently or loudly fail on first contact (dat, truckstop, truckercloud).** The registry's
`live`/`stub` field does not encode this and should gain a third value.

---

## 2. The inventory

Vendor cost column: "included" / "free" are measured from the docs; dollar figures are list price
or inference as marked. Hours = your hours, after `CREDENTIALS_KEY` is set.

| Provider | Adapter state | Credential needed | Where to get it | Vendor cost | Monthly value live | Basis | Hours |
|---|---|---|---|---|---|---|---|
| **mailbox** (IMAP) | real call — IMAP + XOAUTH2 both shipped | Gmail app password, **or** M365 tenant+client ID/secret, **or** Google service-account JSON (`registry.ts:67-75`) | Gmail account settings; or M365/Workspace admin | **free** (uses a mailbox you own) | **$195** | 130 loads × 2 docs × 2 min filing × $45/hr = $390; halved for miss rate: `extractReference` (`mailbox.ts:15`) takes the **first** `/\b[A-Z]{2,5}-\d{2,7}\b/` token in the subject, so a subject leading with the broker's own reference resolves to a load that does not exist (`mailbox.ts:56-59` looks up `upper(reference)` exact) and the mail is filed as unmatched | **1** |
| **terminal** (TruckX ELD) | real call, confirmed endpoint | `apiKey` + `connectionToken` (`registry.ts:49-50`) | withterminal.com, authorize TruckX | free/dev tier to start (`creds-shopping-list.md:11` — **list price, unverified**) | **$475** | 9.3 owner-hr/mo × $45 = $420 (IFTA jurisdiction-mile prep 2 hr/mo + 20 min/day "where's my truck" × 22 days), plus $55/mo expected IFTA-error avoidance (assumes one $2,000 assessment per 12 quarters) | **3** |
| **qbo** | real call, both directions, complete | `clientId`, `clientSecret`, `refreshToken`, `realmId` (`registry.ts:133-136`) | developer.intuit.com app + **OAuth Playground** to mint the first refresh token by hand (`qbo.ts:145-147` confirms "the owner repeating the manual auth-code exchange" is the only path) | QBO plan you already pay for + free dev app | **$244** | 130 invoices/mo (the standing load assumption, 1 invoice per load) × (90 s keying invoice + 60 s keying payment) = 5.4 hr × $45. **MISSING: real monthly invoice count from the QBO invoice register** | **3** |
| **dat** | **placeholder auth — 401** | `serviceAccountEmail`, `password`, `actingUserEmail` (`registry.ts:83-85`) | dat.com; certification required; acting user needs a Connexion + load board seat | DAT One/Power + API entitlement (**MISSING: quote**) | **$490** *if the token exchange gets built* | 130 loads × 5 min saved tab-switching to book × $45 | **12+** |
| **factor** | POST to a placeholder host; inbound webhook nobody sends | `apiKey` + `webhookSecret` (`registry.ts:144-145`) | your factor — OTR Solutions has public dev docs; RTS/Triumph are FTP-only (`docs/integrations/factor.md:22-25`) | usually no extra fee | **MISSING** | The DSO mechanism this adapter implements is an inbound funding webhook, and `docs/integrations/factor.md:13-15` states: "**no factor publicly documents webhooks pushed to carrier systems** — funding status flows back by polling a status endpoint or downloading report files everywhere we looked." Outbound POST targets `api.factor-partner.example.com` (`factor.ts:136`). No dollar figure is defensible until a named factor confirms both an API and a push channel. **MISSING: your factor's name, whether they expose an API, monthly invoiced revenue, current DSO** | **8+** |
| **efs** | real call to a **nonexistent** REST endpoint; the working path is the signed file drop | `feedUser`, `feedPassword`, `webhookSecret` (`registry.ts:103-105`) | EFS rep — eManager → Data Sharing Preferences, or direct feed request; **up to 5 business days** (`docs/integrations/efs.md:16-32`) | included with the card | **$50** | $34 (45 min/mo CSV export+import+reconcile × $45) + $15 (daily instead of monthly cadence catches a card-fraud event ~3 weeks earlier; assumes 1 event/yr at $400, recovery odds 40%→85%) | **5** (build + host the HMAC-signing forwarder) |
| **wex** | identical to EFS | same three fields (`registry.ts:113-115`) | WEX rep, Data Release Forms, 800-492-0669; 2–10 business days | included | **$0 incremental** | You run one fuel card. Activating a second card program earns nothing unless Thind actually holds a WEX account | **5** |
| **comdata** | placeholder REST call; file drop is the only working path | `apiKey`, `apiSecret`, `webhookSecret` (`registry.ts:123-125`) | Comdata/Corpay account team | included | **$0 incremental** | Same. DB shows exactly 1 Comdata transaction vs 35 EFS (`select source, count(*) from hub.fuel_transactions group by 1`) — EFS is the card in use | **4** |
| **truckercloud** | real call, guessed everything | `clientId` + `clientSecret` (`registry.ts:58-59`) | truckercloud.com | **MISSING: quote** | **$0 incremental** | A second ELD aggregator. `activeTelematicsSource()` (`src/lib/hub/telematics.ts:184-190`) picks one; Terminal wins. Only worth it if Terminal refuses to sell you an account | **6** |
| **truckstop** | right protocol, guessed response tags | `integrationId`, `username`, `password` (`registry.ts:93-95`) | tsi@truckstop.com; **signed Systems Integration Agreement required** | Load Board Pro **~$159/mo** (`creds-shopping-list.md:20` — **list price**) | **$0** | A second load board for a 12-truck fleet already on DAT. Costs $159/mo to earn duplicate postings | **10+** |

### Ranked by dollars-per-owner-hour

| # | Provider | Value/mo | Hours | $/hr | Verdict |
|---|---|---|---|---|---|
| 0 | **`CREDENTIALS_KEY`** | unblocks all of it | 0.2 | — | **Do this first, today.** |
| 1 | mailbox | $195 | 1 | **195** | Do it. Free, one hour, works the same day. |
| 2 | terminal | $475 | 3 | **158** | Do it. Biggest absolute number in the list. |
| 3 | qbo | $244 | 3 | **81** | Do it. Adapter is finished; you only mint a token. |
| 4 | dat | $490 | 12+ | 41 | Only if Thind already holds a DAT API entitlement. Otherwise the token exchange is unbuilt (`dat.ts:127-136`) and certification is a multi-week vendor process. |
| 5 | efs | $50 | 5 | 10 | Marginal. $50/mo is a rounding error — this is the "$200/mo idea" that should be cut unless the fraud catch matters to you. |
| — | factor | MISSING | 8+ | — | Cannot be ranked. The repo's own research says no factor pushes webhooks (`docs/integrations/factor.md:13-15`) and the POST target is `example.com` (`factor.ts:136`). One phone call to your factor resolves this; do not spend an hour of build time before that call. |
| — | wex, comdata, truckercloud | $0 | 4-6 | 0 | **Do not activate.** Second card program / second ELD aggregator. Zero incremental value for a 12-truck single-card fleet. |
| — | truckstop | $0 | 10+ | 0 | **Do not activate.** Negative: $159/mo list price, SIA paperwork, the response parser is assumed (`truckstop.ts:187-189`), and the default base is the sandbox (`truckstop.ts:230`). |

**Everything worth doing is 7 hours total and worth ~$914/month** (195 + 475 + 244), plus FMCSA in
§5 at $70/mo for another 0.5 hr. The other five providers are 27+ hours for approximately nothing.

---

## 3. Where the docs disagree with the code (code wins)

1. **`docs/integrations/creds-shopping-list.md:14` bolds EFS "live — ready today"** while the same
   cell goes on to document the file drop. The bold label is what a reader scans; it should say
   "ready after you write a forwarder", because `efs.ts:11-19` says the REST endpoint does not
   exist. Same for WEX (`creds-shopping-list.md:15` vs `wex.ts:11-21`). Cosmetic-but-misleading,
   not a substantive disagreement.
1b. **`creds-shopping-list.md:16` says Comdata's "REST pull may work as-built".**
   `docs/integrations/comdata.md:27-28` says the opposite: "`comdataSource().pull()` is a
   placeholder REST call, not a SOAP client." Corpay's real channel is SOAP Web Services 2.1
   (`comdata.md:22-32`). Two docs in the same folder disagree; the more recent scout pass
   (2026-07-22) and the code both say placeholder. Fix the shopping list.
2. **`registry.ts:138` marks qbo `stub`.** `qbo.ts` is 468 lines of finished, both-directions,
   token-rotating adapter. The shopping list already says "adapter shipped both directions"
   (`creds-shopping-list.md:18`). The registry field is the stale one.
3. **`registry.ts:87` marks dat `live`.** `dat.ts:127-136` says the auth is a placeholder. `live`
   here means "the UI exists", which is not what the enum's own comment
   (`registry.ts:18`) promises.
4. **`src/app/hub/_actions/integrations.ts:37-39`** says `"planned" providers (qbo, factor,
   truckstop) have no client built yet and aren't in the hub.api_credentials provider CHECK
   constraint`. Three errors in one comment: no provider in `PROVIDERS` has status `planned`
   (`registry.ts:44-149` — the ten statuses are eight `live` and two `stub`), so the branch at
   `:40` is dead; all three named providers do have clients; and the CHECK constraint is now a
   regex shape test (`api_credentials_provider_shape CHECK (provider ~ '^[a-z][a-z0-9_-]{1,39}$')`,
   from `psql "$PGURL" -c '\d hub.api_credentials'`), not an enum.
5. **`src/lib/hub/telematics.ts:127`** still labels TruckerCloud's product "Apollo API".
   `docs/integrations/truckercloud.md:28-36` corrects this — Apollo is one of the ELDs
   TruckerCloud aggregates, and no public brand name for its own API exists. The doc even files
   the code fix as a Backlog item against itself.
6. **`creds-shopping-list.md:3`** is written for "a 15-truck carrier"; the DB has 12 trucks.
   Cosmetic, but it means the ranking in that file was never re-derived for this fleet.

---

## 4. Defects found while reading the adapters

These are code bugs, not doc drift. Named because they will fire the day credentials land.
Paths: `credentials.ts`, `csv.ts`, `ifta.ts`, `mailbox.ts`, `telematics.ts`, `types.ts` are under
`src/lib/hub/`; adapter files are under `src/lib/hub/integrations/`.

| Severity | Finding | Evidence |
|---|---|---|
| **High** | **`hasCredentials()` does not check `credentialsConfigured()`.** `getCredentials()` returns `null` when `CREDENTIALS_KEY` is missing (`credentials.ts:62`), but `hasCredentials()` (`credentials.ts:75-83`) queries the table directly. Rotate or drop that env var after credentials are stored and every adapter's `connected()` returns **true** while `pull()` throws `"X is not connected"` (e.g. `telematics.ts:45`) — on every cron run, forever, silently. | `credentials.ts:62` vs `:75-83` |
| **High** | **IFTA jurisdiction is computed from a two-character truncation.** `normalizeState()` is `value.trim().toUpperCase().slice(0, 2)` (`csv.ts:213-215`). Feed a full state name and Minnesota→**MI**, Missouri→**MI**, Alaska→**AL**, Arizona→**AR**, Nevada→**NE**, Montana→**MO**. `computeIftaQuarter` groups tax-paid gallons on exactly this column (`ifta.ts:113-119`), so the wrong state gets the fuel-tax credit. It reaches the **live CSV import path** (`src/app/hub/_actions/import.ts:451`, `:508`, `:593`) the first time a fuel statement or mileage sheet spells states out. Seeded data is all 2-letter (`select jurisdiction, count(*) from hub.fuel_transactions group by 1` → WA 18, OR 12, ID 6), so it has not fired yet. | `csv.ts:213` → `ifta.ts:113-119` |
| **Medium** | **EFS drops fuel rows silently — but only on a path that cannot currently fire.** `ingestWexRows` guards `if (!row.external_id) continue` (`wex.ts:114`) and `ingestComdataRows` guards at `comdata.ts:124`. **`ingestEfsRows` has no such guard** (`efs.ts:107-125`). `processEfsEvent` filters empties first (`efs.ts:178`), but `runEfsSync` (`efs.ts:136`) passes `source.pull()` straight through. A feed row missing `TransactionId` normalizes to `external_id: ""` (`efs.ts:48`), the first inserts, and every later empty-id row collides on the `fuel_transactions_carrier_id_source_external_id_key` unique constraint (verified via `\d hub.fuel_transactions`) and lands in the `skipped` counter. Downgraded from High: the only caller is the REST pull, and that endpoint does not exist (`efs.ts:11-19`). It becomes High the day anyone points `EFS_FEED_BASE` at a real forwarder. | `efs.ts:107-125` |
| **Medium** | **EFS is the only fuel adapter that doesn't normalize state at all.** `wex.ts:48-51` and `comdata.ts:59` call `normalizeState`; `efs.ts:53` passes `record.MerchantState` through raw. Whatever string EFS sends becomes an IFTA jurisdiction bucket verbatim. Given EFS is the card actually in use (35 of 36 rows), this is the one that matters. | `efs.ts:53` |
| **Medium** | **The docs mailbox files every attachment as a rate confirmation.** `saveDocument` is called with a hardcoded `kind: "rate_confirmation"` (`mailbox.ts:76`) for every attachment on every matched message — there is no sender, filename, or subject inference. The registry blurb promises it "files rate cons/**PODs**" (`registry.ts:66`). Every POD that arrives by email is stored mislabeled, which breaks POD-gated invoicing and the factoring submission's document filter (`factor.ts:144-145` selects `kind === "pod"`). | `mailbox.ts:76` vs `registry.ts:66` |
| **Medium** | **Terminal cannot receive webhooks.** `docs/integrations/terminal.md:144-152` confirms a shipped vehicle-location-change webhook; `:30-33` flags that the daily cron (`vercel.json`, `telematics-sync` at `0 12 * * *`) leaves positions up to ~24h stale. But `terminal`'s registry entry has no `webhookSecret` field (`registry.ts:48-51`), and `verifyWebhookSignature` returns `false` when the secret is absent (`integrations/webhooks.ts:26`), so the receiver rejects every call (`src/app/api/hub/webhooks/[provider]/route.ts:54`). The settings page only renders an inbound URL for providers that have that field (`settings/integrations/page.tsx:58-61`). Fix is a registry field plus a `terminal` entry in `EVENT_PROCESSORS` (`event-processors.ts:27-32`) — neither exists. | `registry.ts:48-51` vs `route.ts:54` |
| **Medium** | **QBO has no way to obtain its first refresh token.** `refreshAccessToken` only ever sends `grant_type: refresh_token` (`qbo.ts:83`). `grep -rn "authorization_code" src/` returns **nothing**. The credential form asks for a `refreshToken` (`registry.ts:135`) that nothing in this codebase can produce — `qbo.ts:145-147` concedes it: "the only fix is the owner repeating the manual auth-code exchange". Documentation gap on the settings card, not a code bug, but it is why "paste a key" takes 3 hours instead of 1. | `qbo.ts:83`, `qbo.ts:145-147` |
| **Low** | **Truckstop search fails open, against the sandbox.** `parseLoadSearchResponse` throws on a SOAP `<faultstring>` (`truckstop.ts:194-195`) but returns `[]` when the `LoadSearchResult` element name is wrong (`:209`, via `extractTagBlocks` at `:142-148`). The element names are documented as assumed (`:187-189`). Separately the default base is `https://testws.truckstop.com` (`:230`) — the sandbox — so first contact renders "no loads found" against test data rather than an error a dispatcher can report. | `truckstop.ts:209`, `:230` |
| **Low** | **Three adapters reimplement `dollarsToCents` inline.** `comdata.ts:74-75`, `dat.ts:56`, `truckstop.ts:70-73` all use `Math.round(x * 100)` directly instead of the shared helper at `types.ts:363`. Same arithmetic today, but four copies of the money-conversion rule is four places to drift. | `types.ts:363` |
| **Low** | **One float leaves the building in a money path.** `factor.ts:142` sends `amount: invoice.amount_cents / 100` in the submission JSON. Nothing is stored as a float — the DB stays integer cents everywhere I checked — but the amount a factor receives is produced by binary division, which is the wrong direction of travel for a money value. | `factor.ts:142` |

---

## 5. Free services (no adapter, no per-carrier credential)

Not in `PROVIDERS`, so `connections:check` §2 never mentions them. All are one env var, all are
currently unset, and three of the four cost nothing.

| Service | Env var | Cost | What it turns on | Value | Hours |
|---|---|---|---|---|---|
| FMCSA QCMobile | `FMCSA_WEBKEY` (`src/lib/hub/vetting.ts:20`, `:37`) | free | Live broker authority vetting + daily `fmcsa-recheck` cron (`vercel.json`, `0 11 * * *`) | Prevents booking for a broker whose authority is revoked. One such load ≈ one unpaid $2,500 invoice. At an assumed 1-in-3-year occurrence: $2,500 ÷ 36 = **$70/mo** | 0.5 |
| EIA diesel index | `EIA_API_KEY` (`src/lib/hub/fuel.ts:226`) | free | Fleet $/gal vs national weekly benchmark on `/hub/fuel` | Informational. **<$25/mo** — flag it as small | 0.2 |
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` (`src/lib/hub/mapbox.ts:13`) | free tier, then usage | Routing-grade driving miles feeding pay, IFTA, CPM (`mapbox.ts:27-32`, `routing.ts:6`) | Replaces manually-entered miles — but OSRM already answers this for free (below), so Mapbox is the *second* routing rung, not the first. Value is accuracy delta only. **MISSING: current miles-entry method** | 1 |
| Anthropic | `ANTHROPIC_API_KEY` | usage | Smart Setup rate-con extraction | Out of scope here | — |

Already live with no key: OSRM routing (`src/lib/hub/routing.ts:34`), Nominatim geocoding
(`src/lib/hub/geocode.ts:31`), NWS weather (`src/lib/hub/weather.ts:14`), NHTSA VIN
(`src/lib/hub/vin.ts:12`).

**FMCSA at $70/mo for 30 minutes ($140/hr) beats every provider in section 2 except mailbox
($195/hr) and terminal ($158/hr).** It is free and it is a five-minute registration at
mobile.fmcsa.dot.gov. Do it in the same sitting as the mailbox.

---

## 6. On the deadhead / DSO prior

Ranvir's prior is that deadhead % and DSO are the near-term money, not features. Nothing in this
document contradicts that — but nothing here *is* deadhead or DSO either, with two exceptions:

- **Telematics (#2) is the deadhead prerequisite.** `hub.loads.deadhead_miles` exists and the seed
  shows 7.10% deadhead fleet-wide, 6.9–7.4% by source (`select source, sum(loaded_miles),
  sum(deadhead_miles) from hub.loads where deleted_at is null group by 1` → direct 836/11295,
  import 559/6997, quote 51/640), with 2 of 29 loads carrying NULL. That is seeded data, not
  measured operations. Until GPS pings arrive from a real ELD (543 pings today, all
  `source='demo'`), deadhead % is whatever someone typed. You cannot cut a number you are
  hand-entering.
- **Factoring is the only DSO lever in this file**, and it is not currently a lever: the repo's own
  research says no factor pushes the webhook this adapter listens for
  (`docs/integrations/factor.md:13-15`). The bigger DSO lever — the `ar-reminders` cron already in
  `vercel.json` (`30 14 * * *`) — is shipped and needs no vendor. **That, not this document, is
  where the DSO half of Ranvir's prior gets tested.**

So: the prior survives, but this document is not where either half of it gets paid. Everything
here buys **time**, not margin — ~7 hours of setup returns ~15 owner-hours a month, and those
hours are what you then spend on deadhead and collections.

---

## 7. Do this, in this order

1. Set `CREDENTIALS_KEY` on Vercel — 10 min, unblocks everything.
2. Set `FMCSA_WEBKEY` — 30 min, free, $70/mo.
3. Connect the docs mailbox with a Gmail app password — 1 hr, free, $195/mo.
4. Open a Terminal account, authorize TruckX, paste both keys, then reconcile the 12
   `hub.trucks.unit_number` values against the ELD's vehicle names — matching is exact-string,
   case-insensitive (`src/lib/hub/telematics.ts:207`, `:212`) and mismatches are reported as
   `unmatched`, never guessed. 3 hr, $475/mo.
5. Create an Intuit developer app, mint a refresh token in the OAuth Playground, paste four
   fields — 3 hr, $244/mo.
6. Stop. Phone your factor and ask two questions: do you have an API, and do you push funding
   status or do we poll? Zero build hours until both answers are in.

---

```
FILES:    docs/ops/STUB_INVENTORY.md (created, then adversarially verified and corrected)
PR:       none — no GitHub API or write access in this session (token 403s, no `gh` auth), so no PR number can be cited
IMPACT:   ~$914/mo of owner time recovered for ~7 hours of setup (+$70/mo for 0.5 hr of FMCSA), gated behind one unset env var (CREDENTIALS_KEY); 2 high-severity adapter defects named before they can fire in production
NEXT:     Set CREDENTIALS_KEY (32+ random chars) on the Vercel project — nothing else in this document is possible until it exists
BLOCKED:  From Ranvir — (a) real monthly load and invoice counts, invoiced revenue, and current DSO, to replace the inferred value figures; (b) which fuel card Thind actually holds (DB says EFS, 35 of 36 rows); (c) whether Thind has a DAT account with API entitlement; (d) your factor's name, whether they expose an API, and whether they push or you poll
```

---

## Verification

Adversarial pass, same session, every citation re-opened at the cited line, every SQL re-run
against `$PGURL`, `npm run connections:check` and `vercel.json` re-read.

**Killed — citations that did not resolve:**

| Claim | What was there |
|---|---|
| `mapbox.ts:148-158` | `src/lib/hub/mapbox.ts` is **43 lines**. Real routing call is `:27-32`. |
| `geocode.ts:105` | File is **73 lines**. Nominatim base is `:31`. |
| `weather.ts:52` | File is **35 lines**. NWS fetch is `:14`. |
| `docs/integrations/comdata.md:9-14` "Corpay publishes REST/SOAP, might work as built" | Those lines say nothing of the kind. `comdata.md:27-28` says the opposite: `comdataSource().pull()` is "a placeholder REST call, not a SOAP client". Claim inverted, provider moved to file-drop-only. |
| `docs/integrations/terminal.md:19-22` for the webhook | Webhook detail is `:144-152`; cron-staleness is `:30-33`. |
| factor "$125–250/mo", "$190" in the ranking | Arithmetic was sound ($300k ÷ 30 × 15% ÷ 12 = $125) but the mechanism is not: `factor.md:13-15` says no factor publicly pushes webhooks, and `factor.ts:136` posts to `api.factor-partner.example.com`. Replaced with MISSING; factor removed from the ranking. |
| mailbox halving rationale ("only matches *your* reference") | `mailbox.ts:15` regex `/\b[A-Z]{2,5}-\d{2,7}\b/` matches **any** party's reference; the defect is that it takes the *first* one. Same $195, corrected mechanism. |
| qbo "110 invoices/mo" | Unsourced, and contradicts this doc's own 130-load standing assumption. Restated at 130 → **$244**; MISSING added for the real count. |

**Corrected:** ~20 bare filenames given full paths (adapters are `src/lib/hub/integrations/`, not
`src/lib/hub/`); `import.ts` → `src/app/hub/_actions/import.ts`; `telematics.ts:46-53` → `:42` +
`:47-50`; `dat.ts:128-135` → `:127-136`; `ifta.ts:113-117` → `:113-119`; `credentials.ts:75-84` →
`:75-83`; `truckstop.ts:196-208` → `:187-189`; `integrations.ts:38-40` → `:37-39`; totals
$880 → $914.

**Downgraded:** the EFS silent-row-drop from High to Medium — real bug, but its only caller is the
REST pull and that endpoint does not exist (`efs.ts:11-19`), so it cannot fire today.

**Added (found during verification, not in the original):** the docs mailbox hardcodes
`kind: "rate_confirmation"` for every attachment (`mailbox.ts:76`), so emailed PODs are mislabeled
and the factoring document filter (`factor.ts:144-145`) will not see them; Truckstop's default base
is the sandbox (`truckstop.ts:230`); `factor.ts:142` puts a float on the wire in a money path.

**Survived unchanged:** every SQL result (0 credentials / 0 syncs / 0 events; 543 demo pings;
35 EFS + 1 Comdata fuel rows; 12 trucks; 29 loads; deadhead 7.10%); the `CREDENTIALS_KEY` finding
and all four of its citations; `mock.ts` reached only by six test files; the qbo-is-mislabeled-stub
and dat-is-mislabeled-live findings; the `planned` dead branch and the regex CHECK constraint; the
`hasCredentials()`/`credentialsConfigured()` split; the IFTA two-char truncation and its
Minnesota→MI worked examples; the QBO missing `authorization_code` grant; 17 crons; `$45/hr` and
`130 loads/mo` as stated assumptions; the terminal, efs, dat and FMCSA arithmetic.

**Not defects, stated for the record:** `npm run build` fails in this sandbox only because
`next/font` cannot reach `fonts.googleapis.com` (egress blocked) — an environment limitation, not
a repo defect. It is worth one line as a production risk: the Vercel build has a hard runtime
dependency on Google Fonts being reachable at build time.

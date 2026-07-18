# Partner-API scout rotation registry

Registry for the **Partner-API scout** routine (`docs/agent-improvement-loop.md` §5, Claude
lane fleet). Each cycle picks ONE provider below — rotate by whichever `docs/integrations/<provider>.md`
is oldest or missing, weighted toward providers with a **built adapter** (an API-change there can
silently break production; a stub has nothing to break yet). Research auth model, endpoints,
rate limits, sandbox, and pricing; write/refresh the provider doc; flag adapter-breaking changes
as an urgent `Backlog:` item.

| Provider | Code status | Credential fields | Adapter file | Research doc | Last researched |
|---|---|---|---|---|---|
| `terminal` | **Built** — live TSP aggregator (vehicles + HOS); cron now daily 12:00 UTC per `vercel.json` (the "30-min cron" in `terminal.md` predates the Hobby-plan daily-only fix — reconcile on next scout pass) | `apiKey`, `connectionToken` (+ `TERMINAL_API_BASE` env, optional) | `src/lib/hub/telematics.ts` | [`terminal.md`](./terminal.md) | 2026-07-08 |
| `mailbox` | **Built** — generic IMAP client, not a vendor SDK. Three auth paths live since 2026-07-11: Gmail app password, M365 client-credentials OAuth2, Google Workspace service-account OAuth2 (XOAUTH2). Cron is daily 12:30 UTC, not hourly as older notes said. Workspace app-password reliability contested — steer Workspace to OAuth2 (see doc) | `user`, `password` (Gmail only), `tenantId`/`clientId`/`clientSecret` (M365), `serviceAccountKey` (Workspace), `host`, `port`, `folder` | `src/lib/hub/mailbox.ts` + `mailbox-oauth.ts` | [`mailbox.md`](./mailbox.md) | 2026-07-18 |
| `fmcsa` (adjacent, free, not in `IntegrationProvider` union — no stored creds) | **Built** — QCMobile broker vetting | `FMCSA_WEBKEY` env | `src/lib/hub/vetting.ts` | [`fmcsa.md`](./fmcsa.md) | 2026-07-07 |
| `eia` (adjacent, free, not in `IntegrationProvider` union) | **Built** — diesel price benchmark | `EIA_API_KEY` env | `src/lib/hub/fuel.ts` | [`eia.md`](./eia.md) | 2026-07-07 |
| `truckercloud` | **Built** — adapter shipped, drop-in second aggregator to Terminal | `apiKey`, `clientId`/`clientSecret` | `src/lib/hub/telematics.ts` (`truckerCloudSource`) | [`truckercloud.md`](./truckercloud.md) | 2026-07-10 |
| `dat` | **Built** — search + posting-to-load-draft mapper, stub-first (registry still `stub`/CSV fallback pending real auth confirm) | `serviceAccountEmail`, `password` (+ acting-user email needed, see doc) | `src/lib/hub/integrations/dat.ts` | [`dat.md`](./dat.md) | 2026-07-10 |
| `efs` | **Built** — adapter shipped; real feed confirmed as daily SFTP CSV, not REST JSON — transport swap needed before activation (see doc) | `feedUser`, `feedPassword` | `src/lib/hub/integrations/efs.ts` | [`efs.md`](./efs.md) | 2026-07-11 |
| `wex` | **Built** — adapter shipped; real feed confirmed as SFTP file drop, not REST JSON — same transport swap as EFS needed before activation (see doc) | `feedUser`, `feedPassword` (+ feed file name, no field yet) | `src/lib/hub/integrations/wex.ts` | [`wex.md`](./wex.md) | 2026-07-12 |
| `comdata` | **Built** — adapter shipped, daily cron live; real APIs confirmed to exist (REST portal + SOAP Transaction History), but partner feeds are batch files (AC00029) — transport TBD at onboarding (see doc) | `apiKey`, `apiSecret` | `src/lib/hub/integrations/comdata.ts` | [`comdata.md`](./comdata.md) | 2026-07-16 |
| `qbo` | **Built** — pull + push both directions, refresh-token rotation confirmed correct; hardcoded `minorversion=65` is stale (Intuit serves v75 regardless since 2025-08-01); refresh tokens now carry a 5-year hard cap (see doc) | OAuth2 (Intuit) | `src/lib/hub/integrations/qbo.ts` | [`qbo.md`](./qbo.md) | 2026-07-17 |
| `factor` | **Built** — push + webhook receiver; vendor landscape pinned: OTR Solutions is the only factor with public dev docs + test env (recommended first target); Apex/Denim are API-key class; RTS/Triumph are FTP file drops (EFS-style transport gap); NO factor documents webhooks to carriers — funding status is poll-based everywhere (see doc) | varies by factor | `src/lib/hub/integrations/factor.ts` | [`factor.md`](./factor.md) | 2026-07-17 |
| `truckstop` | **Built** — full slice shipped (search UI + booking, migration 017 applied); real API confirmed as SOAP/XML with `IntegrationId`+`UserName`+`Password` in the envelope body — adapter's Bearer-key REST guess is wrong on auth AND transport, rewrite needed before activation; sandbox exists at `testws.truckstop.com` (see doc) | `integrationId`, `username`, `password` (registry still says `apiKey` — wrong) | `src/lib/hub/integrations/truckstop.ts` | [`truckstop.md`](./truckstop.md) | 2026-07-18 |

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

Next up by this rule: `terminal.md` (2026-07-08) — the highest-value recheck since its
adapter is a live production vendor sync; that pass must also reconcile the doc's "30-min
cron" claims with `vercel.json`'s daily schedule. Then the two government-API docs
`fmcsa.md`/`eia.md` (2026-07-07, now the oldest — low risk, free stable gov APIs).
The 2026-07-18 mailbox pass found: the doc's auth-model section was already accurate
(the OAuth2 shipper updated it 2026-07-11 — better than the previous next-up note assumed);
real drift was the cron cadence (daily 12:30 UTC, not hourly — doc + registry corrected)
and a new provider-policy nuance: Google Workspace app-password IMAP is contested
post-May-2025 (conflicting sources, Google help pages 403-blocked) — operationally moot
since the Workspace OAuth2 path shipped and the UI steers there. Microsoft side clean:
`IMAP.AccessAsApp` client-credentials unchanged; April 2026 basic-auth retirement is
SMTP-AUTH-only (we don't send).

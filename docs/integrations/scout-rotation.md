# Partner-API scout rotation registry

Registry for the **Partner-API scout** routine (`docs/agent-improvement-loop.md` §5, Claude
lane fleet). Each cycle picks ONE provider below — rotate by whichever `docs/integrations/<provider>.md`
is oldest or missing, weighted toward providers with a **built adapter** (an API-change there can
silently break production; a stub has nothing to break yet). Research auth model, endpoints,
rate limits, sandbox, and pricing; write/refresh the provider doc; flag adapter-breaking changes
as an urgent `Backlog:` item.

| Provider | Code status | Credential fields | Adapter file | Research doc | Last researched |
|---|---|---|---|---|---|
| `terminal` | **Built** — live TSP aggregator (vehicles + HOS), 30-min cron sync | `apiKey`, `connectionToken` (+ `TERMINAL_API_BASE` env, optional) | `src/lib/hub/telematics.ts` | [`terminal.md`](./terminal.md) | 2026-07-08 |
| `mailbox` | **Built** — generic IMAP client, not a vendor SDK. Plain LOGIN auth — broken against M365/Google Workspace, see doc | `host`, `port`, `user`, `password`, `folder` | `src/lib/hub/mailbox.ts` | [`mailbox.md`](./mailbox.md) | 2026-07-07 |
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

Next up by this rule: `mailbox.md` and the two government-API docs `fmcsa.md`/`eia.md`
(all 2026-07-07) are the oldest after `truckstop.md` was refreshed 2026-07-18; of those,
`mailbox.md` first — it's a built adapter with three live auth paths (Gmail app password,
M365 + Google Workspace OAuth2 shipped 2026-07-11) and the doc predates the OAuth2 work, so
it likely describes the plain-LOGIN-only era. Then `terminal.md` (2026-07-08) — the
highest-value recheck overall since its adapter runs a live 30-minute cron in production.
The 2026-07-18 truckstop pass answered the previous open questions: migration 017 is indeed
applied (doc corrected), sandbox exists (`testws.truckstop.com`), API tier is Load Board
Pro ($159/mo) + signed SIA, and the real protocol is SOAP/XML body-credential auth — an
adapter rewrite is flagged urgent for the integrations lane.

# Partner-API scout rotation registry

Registry for the **Partner-API scout** routine (`docs/agent-improvement-loop.md` §5, Claude
lane fleet). Each cycle picks ONE provider below — rotate by whichever `docs/integrations/<provider>.md`
is oldest or missing, weighted toward providers with a **built adapter** (an API-change there can
silently break production; a stub has nothing to break yet). Research auth model, endpoints,
rate limits, sandbox, and pricing; write/refresh the provider doc; flag adapter-breaking changes
as an urgent `Backlog:` item.

| Provider | Code status | Credential fields | Adapter file | Research doc | Last researched |
|---|---|---|---|---|---|
| `terminal` | **Built** — live TSP aggregator (vehicles + HOS), 30-min cron sync | `apiKey`, `connectionToken` (+ `TERMINAL_API_BASE` env, optional) | `src/lib/hub/telematics.ts` | [`terminal.md`](./terminal.md) | 2026-07-06 |
| `mailbox` | **Built** — generic IMAP client, not a vendor SDK | `host`, `port`, `user`, `password`, `folder` | `src/lib/hub/mailbox.ts` | `mailbox.md` — missing | never |
| `fmcsa` (adjacent, free, not in `IntegrationProvider` union — no stored creds) | **Built** — QCMobile broker vetting | `FMCSA_WEBKEY` env | `src/lib/hub/vetting.ts` | `fmcsa.md` — missing | never |
| `eia` (adjacent, free, not in `IntegrationProvider` union) | **Built** — diesel price benchmark | `EIA_API_KEY` env | `src/lib/hub/fuel.ts` | `eia.md` — missing | never |
| `truckercloud` | Stub — valid provider id, zero adapter code | `apiKey` | none yet | `truckercloud.md` — missing | never |
| `dat` | Stub — "honest pending" card, CSV fallback only | `serviceAccountEmail`, `password` | none yet | `dat.md` — missing | never |
| `efs` | Stub — "honest pending" card, CSV fallback only | `feedUser`, `feedPassword` | none yet | `efs.md` — missing | never |
| `wex` | Stub — "honest pending" card, CSV fallback only | `feedUser`, `feedPassword` | none yet | `wex.md` — missing | never |
| `comdata` | Stub — "honest pending" card, CSV fallback only | `apiKey`, `apiSecret` | none yet | `comdata.md` — missing | never |

Stub providers (`dat`/`efs`/`wex`/`comdata`/`truckercloud`) only have credential-field
definitions in `src/app/hub/_actions/integrations.ts` (`ALLOWED_FIELDS`) and UI copy in
`src/app/hub/(office)/settings/integrations/page.tsx` — nothing reads the stored credentials
back to make a request yet, per the Phase 6 commit (`484fb92`). Researching them is lower
urgency than `terminal` or `mailbox` until an adapter actually gets built against them; a scout
picking one up should note in its doc whether the wire-up is worth doing given current API terms.

## Rotation rule

1. Prefer a **built** adapter whose doc is missing or oldest (breaking change there is
   production-impacting).
2. Otherwise take the stub provider whose doc is oldest or missing, to pre-stage integration
   notes before a lane builds the adapter.
3. One provider per cycle. Update the "Last researched" date and doc link when done.

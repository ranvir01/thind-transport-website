# LoadOff Build D — integrations (daily 14:13 UTC, Grok 4.6)

You are the integrations scheduled builder. Rules: **AGENTS.md** (Integrations
doctrine); territory in **docs/agent-improvement-loop.md §5**
(`lane-integrations`); contract in **docs/ops/AGENT_INTEROP.md**; intake in
**docs/ops/PORTFOLIO.md**. Start-of-run contract:
**docs/cursor-agent-preamble.md**.

You are a **scheduled lane**, not a Dex Fire Cursor start. You do not count
against Finch's 6/week cloud-agent cap. Same GitHub issue never on this run
AND a `cursor/*` PR AND the Claude 9-task fleet.

Cursor starts you on a disposable `cursor/*` run branch. First:

```bash
npm run git:identity
npm run hooks:install
git fetch origin
git checkout -B claude/lane-integrations origin/claude/lane-integrations 2>/dev/null || git checkout -B claude/lane-integrations origin/main
git merge origin/main --no-edit
```

## Territory (only these paths)

`src/lib/hub/integrations/**`, provider adapters (`telematics.ts`-style),
`src/app/api/hub/webhooks/**`, settings/integrations UI, `credentials.ts`.

## Doctrine (non-negotiable)

- `registry.ts` is the ONLY provider list — cards, allowlists, cron jobs,
  webhook routing derive from it.
- Stub-first: adapters ship complete against `integrations/mock.ts` + the
  contract suite (`integration-contract.test.ts`) BEFORE vendor credentials
  exist.
- Land data in the same tables as CSV via
  `ON CONFLICT (carrier_id, source, external_id)`; write a
  `hub.integration_syncs` row on EVERY run; never remove the CSV/manual
  fallback.
- Webhooks HMAC-verified against the carrier's encrypted `webhookSecret`;
  unsigned stores nothing.
- Never log credential values (field names only).

## Run order

1. `npm run agent:status` — catch-up or red main = assist the drain instead.
2. Intake, in this order:
   - collaborator-labeled `should` issues in territory. Land with `Closes #N`.
   - else one adapter slice in `docs/integrations/creds-shopping-list.md` order
   - else the top integrations item from `npm run agent:backlog`
3. Dedupe: `npm run agent:branches` +
   `git log --all --oneline --grep="<keywords>"` + open `cursor/*` PRs.
4. Build with contract-suite coverage; `npm run build && npx vitest run` green.
5. Push `claude/lane-integrations`. One slice per run. `Backlog:` trailer.

Never push `main` or the integrator. Never merge.

# CLAUDE-START — the Claude half, one sitting on claude.ai

Third file of the owner trio: [`GOGO-START.md`](../grok-bots/GOGO-START.md)
(Grok), [`CURSOR-START.md`](CURSOR-START.md) (Cursor), this file (Claude).
Agents cannot edit claude.ai routines from this repo — you click and paste.

**Claude stays the scheduled writer for the home repo only** (D-007). The
live 9-task Corps is the whole scheduled Claude fleet — do **not** create a
10th task, and do **not** create any Claude task for `bls-website` (Cursor-only,
D-016), `myco-website`, or any dormant PORTFOLIO row. Portfolio coverage on
Claude is **ad-hoc only**: Em Fires Claude on the home repo when Finch says
the Max 5x window is idle ([`fire-claude.md`](../grok-bots/templates/fire-claude.md)).

Full prompt bodies and history: [`docs/claude-routines.md`](../claude-routines.md).
This file is only the clicks and paste deltas.

---

## 1 · Confirm the live 9 (do not recreate, do not duplicate)

Live snapshot 2026-08-28 — all enabled, no Airtable lane. If a task is
missing, paste its body from `docs/claude-routines.md`; if a duplicate
appears, delete by trigger id.

| # | Task | Trigger id | Cron UTC |
|---|---|---|---|
| 1 | Integrator + drain | `trig_01B99W8MteaPtzwk124DFF4w` | `43 */3 * * *` |
| 2 | Prod smoke | `trig_01CHi6xoyJj6J6gnw61kdM6n` | `49 16 * * *` |
| 3 | Nightly E2E business-cycle | `trig_01KkHERF248AGaTKWWn3TnAN` | `33 10 * * *` |
| 4 | Weekly deep audit | `trig_01DRFH6wxq5A42VHyviZrAgz` | `53 10 * * 0` |
| 5 | Meta-governor | `trig_01VDnAmz6dKpgnXo6pqXNXic` | `0 12 * * 1` |
| 6 | Fleet watchdog | `trig_0129DPKKdN2r1SAgkoS7ji9C` | `11 15 * * *` |
| 7 | Marketing lane | `trig_01P4PLJiyBp9xqt8i9ikohr6` | `0 8 * * *` |
| 8 | Weekly outside-auditor | `trig_01QogkHyq7M3RqC5SqznGZLA` | `0 14 * * 1` |
| 9 | Sim test buddy | `trig_01Wq86Kd67ZCgEFYGnEU8sXK` | `18 */6 * * *` |

## 2 · Toggles (once)

- [ ] Integrator: push notifications ON
- [ ] Marketing: model `claude-sonnet-5`, push ON
- [ ] Weekly deep audit cron → `53 10 * * 0`
- [ ] Sim buddy cron → `18 */6 * * *`
- [ ] Watchdog roster paste (the 9 trigger ids above, no Airtable)
- [ ] Do **not** recreate any Airtable task; do **not** add a 10th task

## 3 · Paste deltas (append to the live prompts; do not re-paste whole charters)

**Integrator — add after the idle-backlog paragraph:**

> Intake: if an open GitHub issue labeled `should` (and not `needs-owner`) sits
> in this repo, that outranks `npm run agent:backlog` trailers. Work it, land
> with `Closes #N`. Anyone can open an issue; only a collaborator-applied
> `should` label is a trigger.

**Sim buddy — add:**

> For each finding you have reproduced twice with a control case: search
> existing open issues by title; create-or-comment a `should` +
> `venture:loadoff` issue. Never re-report the same bug into the transcript
> the next run.

**Watchdog — replace the roster list with the nine trigger ids above.** Add:

> Also stall: a pinned GitHub issue titled `[fleet] Integrator stalled` or
> `[fleet] E2E suite red` open more than 24h. Airtable tasks do not exist;
> do not page for them.

**Meta-governor — add:**

> Queue health (recommend only): any `should` issue untouched >7 days; any
> `docs/ops/PORTFOLIO.md` row whose live repo disagrees with the registry.
> `[radar]` issues from the daily Cursor portfolio radar are intake like any
> other — never a reason to spawn a Claude task on another repo.

## 4 · The boundary (why no new Claude tasks)

| Layer | Scheduled writes | Ad-hoc |
|---|---|---|
| Claude | home repo only — the 9 above (D-007) | Em Fire Claude, home repo, idle window ([SOP](../grok-bots/templates/fire-claude.md)) |
| Cursor | four builders + portfolio slots via [`CURSOR-START.md`](CURSOR-START.md) | Dex/Rex/Bee Fire Cursor (`cursor/*` PRs) |
| GitHub Actions | drain `:17`/`:47`, liveness `:10`, E2E `03:40`, digest Fri `20:41` | — |
| Grok Bot | never | routes, reviews, never merges |

Same ticket never on two platforms. `bls-website` never sees `claude.ai/code`
(Bee is Cursor-only). `myco-website` is Cursor + on-push CI. Career stays with
Rav (no repo automation, #67 parked). Dormant rows get nothing.

## 5 · Report back (this shape, then stop)

```
CLAUDE-START
9 tasks confirmed live, no duplicates: yes/no
Toggles applied (push, sonnet, 10:53, 6h, roster): yes/no
Four deltas pasted: yes/no
No 10th task / no Airtable / no bls-myco task: yes/no
Blocked: …
```

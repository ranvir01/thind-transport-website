# Claude routine prompts — the post-Cursor fleet

Cursor's subscription ended 2026-07-18; its three automations (integrator :00,
prod smoke :30, deploy :59) are replaced by **Claude Code routines** (claude.ai
→ Code → Routines, simple Hourly/Daily triggers) plus the platform-independent
**GitHub Action** `.github/workflows/drain-integrator.yml`, which fast-forwards
`main` at :17/:47 whenever the integrator is >3 ahead and green — so the drain
survives even every routine being down.

Each routine fires a fresh session: prompts are standalone. House rules live in
AGENTS.md and docs/agent-improvement-loop.md; commits as
`noreply@anthropic.com` / `Claude`, `Backlog:` trailer on the last commit,
never `seed:demo` against production, fetch+rebase before every push.

---

## Routine 1 · "LoadOff integrator + drain" — Hourly

> Work the repo ranvir01/thind-transport-website on branch
> claude/hauldesk-project-setup-l1luoo. Read AGENTS.md and
> docs/agent-improvement-loop.md first. Run `git fetch origin`, then
> `npm run agent:status` and `npm run agent:branches`.
>
> Absorb pending `claude/*` branches into the integrator ONE at a time in the
> inventory's suggested order: merge, then `npm run build && npx vitest run`
> — green before the next merge. Resolve conflicts by inspecting both sides;
> when the integrator already carries a newer superset of the same work, keep
> HEAD. Skip (and note) any branch that stays red after one honest fix attempt.
>
> When the integrator is green and ahead of main: drain with a direct
> `git push origin claude/hauldesk-project-setup-l1luoo:main` (fast-forward;
> if histories diverged, merge main into the integrator first, re-verify, then
> push both). Never wait on a PR or another agent — PR #13 is long closed.
>
> If nothing is pending: pick ONE item from `npm run agent:backlog`, fix it
> with its test, verify, push the integrator, and stop. End the last commit
> with a `Backlog:` trailer.

## Routine 2 · "LoadOff prod smoke + fix-forward" — Hourly (set Daily to save usage)

> Work the repo ranvir01/thind-transport-website. Read AGENTS.md. Check
> production health: `npm run prod:smoke` against https://thindtransport.com
> (if sandbox egress is blocked, use the Vercel connector's deployment list,
> runtime errors, and web fetch as documented in
> docs/agent-improvement-loop.md §3b — previews green + production stale means
> a vercel.json cron validation problem on the Hobby plan).
>
> If production is broken: diagnose, fix forward on
> claude/hauldesk-project-setup-l1luoo with a test, verify
> (`npm run build && npx vitest run`), push, and drain to main directly.
> Reverting the breaking commit is acceptable when a forward fix isn't quick —
> main must stay deployable. If production is healthy, confirm the latest main
> SHA has a READY production deployment and stop — no busywork.

## Routine 3 · existing improvement routines — keep them

The feature/QA routines set up earlier (improvement cycle, integrations lane,
verifier/red-team, daily deep audit) already cover Cursor's "apply/extend"
role. Keep them as they are. If duplicates exist in the Routines list
("Integration Lane Copy", a second "Weekly visual QA sweep", a second
"Weekly deep audit"), delete the copies — duplicate firings waste plan usage
and race each other on the branch.

---

## First-firing verification — 2026-07-19 ~08:45 UTC (closes the 3a2bdce backlog)

- **Exactly one** "LoadOff integrator + drain" routine is live (cron `43 * * * *`, enabled);
  the full 23-trigger fleet list has **no duplicate copies** ("Integration Lane Copy" etc.
  do not exist). Prod smoke exists as a daily routine (16:49 UTC) per Routine 2's
  save-usage option.
- **Routine 1's first firing worked**: the 07:43 run absorbed the pending session branches
  into the integrator (merge commits 08:08–08:29 UTC).
- **Drain Action**: all five scheduled runs to date concluded **green**. Caveat learned:
  GitHub throttles the `:17/:47` schedule heavily — observed firings ~1–3.5 h apart
  (22:09, 23:12, 00:12, 03:57, 06:43), so worst-case drain latency via the Action alone is
  a few hours, not 30 min. Routine 1's own direct drain remains the primary path; when
  drift needs clearing *now*, kick the Action manually — it carries `workflow_dispatch`
  and does its own green-check + fast-forward-only push, so a manual kick is always safe:
  `gh workflow run drain-integrator.yml` (or the Actions tab → Run workflow).
- **Proof the dispatch path works**: a manual dispatch fired 08:40 UTC cleared the
  64-commit integrator→main drift that accumulated after the 06:43 scheduled run —
  CI-verified the integrator and fast-forwarded `main` to `8650ab0` (drift now 0),
  even while Routine 1 was still merging (the fast-forward-only push makes the race safe).

## Division of labor after Cursor

| Concern | Owner |
|---|---|
| Lane/feature work + backlog | Existing Claude improvement routines |
| Merge pending branches → integrator | Routine 1 (hourly) |
| Drain integrator → main | Routine 1 when green; GitHub Action `drain-integrator.yml` as backstop (:17/:47) |
| Production smoke + fix-forward | Routine 2 |
| Production schema | `/api/hub/cron/migrate` (daily Vercel cron, CRON_SECRET) |

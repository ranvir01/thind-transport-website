# Automation handoff — brief for the agent building Cursor automations + tuning Claude routines

*Paste this file (or `@`-reference it) at the top of the session. Written
2026-09-01 on the PR #64 branch (`cursor/portfolio-omni-analytics-7a1c`,
stacked on #42). Until those merge, fetch that branch to read the linked
docs. You are combining three things: the live fleet, the D-017 chat-bridge
intake lane, and the import-ready Cursor automation files.*

Read before writing anything, in order:
[`docs/cursor-agent-preamble.md`](../cursor-agent-preamble.md) ·
[`AGENTS.md`](../../AGENTS.md) · [`FLEET.md`](FLEET.md) ·
[`AGENT_INTEROP.md`](AGENT_INTEROP.md) §1 · [`PORTFOLIO.md`](PORTFOLIO.md) ·
[`DECISIONS.md`](DECISIONS.md) D-012 through D-017 ·
[`docs/claude-routines.md`](../claude-routines.md) §"Live 9-task fleet" ·
[`.cursor/automation/README.md`](../../.cursor/automation/README.md) ·
[`CHAT-BRIDGE.md`](CHAT-BRIDGE.md).

## Live truth (2026-09-01 — verify with a fresh look before trusting)

- **Claude Corps: 9 LoadOff-only tasks** (D-013 table with trigger ids in
  `docs/claude-routines.md`). No Airtable lane, ever again (D-014).
- **Cursor dashboard automations: all four DISABLED** since 2026-08-26
  (Integrator `:00`, Prod Smoke `:30`, Deploy + backlog `:59`, Untitled).
  **Untitled stays off forever** (D-005). Re-enabling anything is the owner's
  click (D-006 unanswered) — agents prepare files, never toggle.
- **GitHub Actions** own drain (`:17`/`:47`), liveness (`:10`), E2E
  (`03:40`), Friday portfolio digest (`20:41`).
- **The bus is D-012**: GitHub issues + collaborator-applied `should` label +
  `venture:*` + commit `Backlog:` trailers. `npm run agent:backlog` prints
  open `should` issues as TOP PICK. Land with `Closes #N`.
- **Grok = 14-seat org** (D-015/D-016), watch-and-dispatch only; gogo/Em/
  Dex/Rex/Bee Fire Cursor at cursor.com/agents by hand. Grok never pushes.
- **Chat bridge (D-017, approved)**: phone-first Managed-Agent chat that
  *drafts* `should`-issue text; read-only; code staged on courier branch
  `cursor/portfolio-chat-code-53f9` (**never merge it**) until the owner does
  OWNER-WORKSHEET row 10. Nothing schedules against it; nothing polls it.

## Your job 1 — Cursor automations (import-ready, not live)

The 13 pairs in `.cursor/automation/` (`*.workflow.json` + `*.prompt.md`)
are the deliverable surface. Improve them; do not multiply them.

1. **Only these four role slots may ever go live** while their Claude twins
   exist: office `05:13`, driver `08:13`, tests `11:13`, integrations
   `14:13`. Marketing / deep-verify / meta-governor / red-team have live
   Claude twins — their files stay import-ready-but-parked. One charter, one
   platform.
2. **Every schedule you add or move needs a `FLEET.md` row AND an
   `AGENT_INTEROP.md` §1 row in the same commit**, on a free minute.
   `:07`/`:13`/`:37` are reserved for the role slots;
   `src/lib/__tests__/fleet-clock-guard.test.ts` enforces all of it and must
   stay green.
3. **Model**: pin `cursor-grok-4.6-high-fast` in every workflow JSON (D-012).
4. **Prompts**: start from `docs/cursor-agent-preamble.md`; intake = top
   collaborator-labeled `should` issue in the lane's territory, else
   `npm run agent:backlog`; one finished item; `npm run build` + targeted
   vitest; end with a `Backlog:` trailer; land with `Closes #N`.
5. **Write ceilings**: a build slot writes only its `claude/lane-*` branch.
   Never `main`, never the integrator branch, never another lane. Cloud runs
   boot on a disposable `cursor/<run>-*` branch — the prompt must
   `git checkout` its real lane first (the integrator/deploy prompts show
   the pattern).
6. **Boot reality** (Cursor default machine): no browser, no Go/Rust;
   `npm ci --ignore-scripts` + `npm rebuild bcrypt sharp`; run
   `npm run hooks:install`; gates needing a browser or sidecars get tagged
   `[needs-browser]` / `[needs-sidecars]`, never skipped silently.
7. **Touched anything under `.cursor/`?** Run `npm run cursor:env-check`,
   and say in your final message that the owner must re-import the
   environment — the dashboard runs its own stored copy, not the repo's.
8. **Never** `CURSOR_API_KEY` / `api.cursor.com` (bills outside the
   subscription), never enable a dashboard automation yourself, never give
   Grok or the chat bridge a branch.

## Your job 2 — better Claude automations

Claude has no API here: **agents edit the pastes; the owner applies them on
claude.ai.** Your deliverable is sharper pastes, not new tasks.

1. **The roster is frozen at the live 9** (D-013). A tenth task, or moving a
   task to Cursor, is a new `DECISIONS.md` entry, not an edit.
2. Improve inside `docs/claude-routines.md` §"Live 9-task fleet": keep the
   table's trigger ids; extend the **paste deltas** (append-only blocks the
   owner pastes under each live prompt) and the **owner toggle checklist**.
   Every delta must be idempotent to re-pasting.
3. Known upgrade directions already queued there: `should`-issue intake for
   integrator + marketing; create-or-comment idempotent red-issues for prod
   smoke and sim buddy; watchdog roster = the 9 trigger ids; marketing pinned
   `claude-sonnet-5`; push notifications ON where the table says so.
4. New routine prompts (only if a D-entry opens a slot) follow the §"Scheduled
   fleet v2" shape: `docs/claude-routine-preamble.md` paste + one charter
   line + the lane selection algorithm + invariants + required trailers,
   under 40 lines, cron on a free minute with FLEET + INTEROP rows in the
   same change.
5. Cross-platform dedupe rule: before writing any fix or prompt, run
   `git log --all --oneline --grep="<short description>"` — if it exists on
   a branch, name that branch in `Backlog:` and move on.

## How the pieces combine (do not re-architect this)

```
owner thumb ──chat──▶ chat bridge (D-017, drafts only)
                         │ owner applies `should` label (D-012)
Grok 14-seat org ────────┤ (Fire Cursor / Fire Claude by hand)
                         ▼
        GitHub `should` queue + Backlog: trailers   ◀── your automations read
                         │                               here, nowhere else
     Claude 9-task fleet ┴ Cursor lane slots (imported by owner)
                         ▼
        claude/* lanes → integrator → drain Action → main → Vercel
```

The bridge and Grok are intake. The queue is the bus. Automations are the
drain. Nothing subscribes to a chat; nothing chats to Cursor.

## Verify before you push (any of this repo's files)

- `npx vitest run src/lib/__tests__/fleet-clock-guard.test.ts src/lib/__tests__/grok-bot-instructions-guard.test.ts src/lib/__tests__/fleet-liveness-guard.test.ts`
- `npm run build` + `npm run typecheck:gate` if you touched TS
- Grok instruction bodies ≤ 4,000 chars; never add the TMS product code-name
  to `docs/grok-bots/` (guard enforces)
- Commit as the owner (`npm run git:identity`), one logical commit, `Backlog:`
  trailer, push a `cursor/*` branch, PR — do not merge it
- Never raise `TEST_ERROR_BASELINE`, js-budget, or any ratchet to get green

## Done when

- [ ] The four importable role slots have current prompts + JSONs (model
      pinned, `should`-intake, lane checkout, correct minutes) and
      `.cursor/automation/README.md` matches
- [ ] `docs/claude-routines.md` paste deltas + toggle checklist are complete
      enough that the owner's one sitting on claude.ai applies everything
- [ ] FLEET / INTEROP rows exist for anything scheduled; clock guard green
- [ ] `Backlog:` lists what you saw and did not take, tagged
      `[needs-owner]` / `[needs-browser]` / `[blocked-by …]`

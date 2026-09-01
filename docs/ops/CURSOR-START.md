# CURSOR-START — import the scheduled builders + portfolio slots

This file **is** Ranvir's yes for the import-ready Cursor Automations that
Claude does not already run: the **four home-repo builders** (§1) and the
**three portfolio slots** (§1b — radar + BLS + MyCO, D-017). Click them in.
Do not wait for a second confirmation. This is **not** a yes to re-enable
Integrator / Prod Smoke / Deploy + backlog (that is D-006, unanswered). This
is **not** a yes to import marketing / deep-verify / meta-governor / red-team
(Claude already runs those charters). Untitled stays off.

Claude's half of the same sitting: [`CLAUDE-START.md`](CLAUDE-START.md)
(confirm the 9, toggles, deltas — no new Claude tasks anywhere).

Agents cannot create or enable automations from this repo. You click at
[cursor.com/automations/new](https://cursor.com/automations/new).

Source of truth in git (this branch, then `main` after it merges):

`.cursor/automation/`

Raw prefix (this branch):

`https://raw.githubusercontent.com/ranvir01/thind-transport-website/cursor/fleet-24-7-liveness-931f/.cursor/automation/`

Looked up **2026-09-01**: Integrator, Prod Smoke, and Deploy + backlog are
still **disabled**. Untitled `61b8e855-76b8-11f1-ba66-0e7d0216e441` was not
readable from this agent (gone or private) — do not recreate it.

Grok Bot paste pack (already shipped): [`docs/grok-bots/GOGO-START.md`](../grok-bots/GOGO-START.md).
Paste that into live gogo **first** if the 14 seats are not stamped yet.
Dex / Rex Fire Cursor is a different path (`cursor/*` PRs). These four
automations write `claude/lane-*` so the existing integrator + GitHub drain
can absorb them.

---

## 0 · What this is vs Fire Cursor

| Path | Who | Writes | When |
|---|---|---|---|
| **Scheduled lane** | these four automations | `claude/lane-*` | daily UTC |
| **Fire Cursor** | Dex / Rex / Bee via Grok | `cursor/*` PR | ad-hoc; Finch 6/week cap |
| **Claude 9-task** | live Corps | `claude/*` | already on |
| **Integrator / Deploy** | dashboard copies | integrator / `main` | **DISABLED**; D-006 |

Same GitHub issue never on two of those. If a slot is imported and the ticket
fits that lane, Em leaves it for the next run — Dex / Rex do not Fire Cursor
on it. Fire Cursor is the interrupt path (cannot wait until tomorrow's slot,
or sits outside the four territories).

Scheduled lanes do **not** count against Finch's 6/week Fire Cursor cap.

Token rule (Morgan Linton): one item per run; no "no updates" pings; do not
clone the repo a second time inside the prompt — the cloud agent already has
the tree. Model is pinned **Grok 4.6** (`cursor-grok-4.6-high-fast`).

---

## 1 · Import these four (~12 min)

Open [cursor.com/automations/new](https://cursor.com/automations/new) once per
row. Minutes `:13` are reserved (`fleet-clock-guard.test.ts`).

| # | Dashboard name | Cron (UTC) | Branch | Prompt | Workflow JSON |
|---|---|---|---|---|---|
| A | LoadOff Build A — office/UX | `13 5 * * *` (05:13) | `claude/lane-office` | [`loadoff-build-office.prompt.md`](../../.cursor/automation/loadoff-build-office.prompt.md) | [`loadoff-build-office.workflow.json`](../../.cursor/automation/loadoff-build-office.workflow.json) |
| B | LoadOff Build B — driver PWA + portal | `13 8 * * *` (08:13) | `claude/lane-driver` | [`loadoff-build-driver-portal.prompt.md`](../../.cursor/automation/loadoff-build-driver-portal.prompt.md) | [`loadoff-build-driver-portal.workflow.json`](../../.cursor/automation/loadoff-build-driver-portal.workflow.json) |
| C | LoadOff Build C — tests | `13 11 * * *` (11:13) | `claude/lane-tests` | [`loadoff-build-tests.prompt.md`](../../.cursor/automation/loadoff-build-tests.prompt.md) | [`loadoff-build-tests.workflow.json`](../../.cursor/automation/loadoff-build-tests.workflow.json) |
| D | LoadOff Build D — integrations | `13 14 * * *` (14:13) | `claude/lane-integrations` | [`loadoff-build-integrations.prompt.md`](../../.cursor/automation/loadoff-build-integrations.prompt.md) | [`loadoff-build-integrations.workflow.json`](../../.cursor/automation/loadoff-build-integrations.workflow.json) |

Per import:

1. **Name** = dashboard name above (keep the product code-name here — it is
   git canon for Cursor writers; Grok chat still never says it).
2. **Model** = **Grok 4.6**. If an import rejects the slug
   `cursor-grok-4.6-high-fast`, pick Grok 4.6 in the dropdown; that is the
   only field to fix.
3. **Repository** = `ranvir01/thind-transport-website`.
4. **Cloud compute** ON.
5. **Schedule** = cron above.
6. **Prompt** = paste `workflow.prompts[0]` from the matching `.workflow.json`
   (short) or the full `.prompt.md` (charter). The JSON prompt tells the
   agent to read the markdown file.
7. **Environment** = personal env
   [`5241c374-0579-442f-bf88-309dbcbe37f3`](https://cursor.com/dashboard/cloud-agents/environments/e/5241c374-0579-442f-bf88-309dbcbe37f3).
   Re-import from the repository if the last `.cursor/` change is not Saved.
8. **Enable**.
9. Do **not** trigger a manual first run while `npm run agent:status` is in
   catch-up mode — drain first.

After each import, copy the new automation URL/id into the checklist at the
bottom. Once the first run boots, move that row from the import-ready table
in [`FLEET.md`](FLEET.md) into the live clock (a git-writer job, not Grok).

---

## 1b · Portfolio slots (same sitting, D-017) — the rest of the GitHub account

Same import steps as §1. The radar watches the whole active portfolio and
files `[radar]` issues on the home repo; the two maintenance slots each ship
at most ONE reviewed PR per week on their own repo and **exit silently when
there is nothing to do** (act-or-exit — no "no updates" runs).

| # | Dashboard name | Cron (UTC) | Repo | Writes | Prompt | Workflow JSON |
|---|---|---|---|---|---|---|
| E | Portfolio radar | `37 9 * * *` (daily 09:37) | `ranvir01/thind-transport-website` | issues only — never commits | [`portfolio-radar.prompt.md`](../../.cursor/automation/portfolio-radar.prompt.md) | [`portfolio-radar.workflow.json`](../../.cursor/automation/portfolio-radar.workflow.json) |
| F | BLS maintenance — weekly | `37 12 * * 3` (Wed 12:37) | `ranvir01/bls-website` | `cursor/*` PR, Bee reviews | [`bls-maintenance.prompt.md`](../../.cursor/automation/bls-maintenance.prompt.md) | [`bls-maintenance.workflow.json`](../../.cursor/automation/bls-maintenance.workflow.json) |
| G | MyCO maintenance — weekly | `37 12 * * 4` (Thu 12:37) | `ranvir01/myco-website` | `cursor/*` PR, My reviews | [`myco-maintenance.prompt.md`](../../.cursor/automation/myco-maintenance.prompt.md) | [`myco-maintenance.workflow.json`](../../.cursor/automation/myco-maintenance.workflow.json) |

Portfolio-slot notes:

- **Environment:** `bls-website` and `myco-website` have no saved Cursor
  environment — leave the environment field on Cursor's default machine
  (auto-detected `npm install`). Only the home repo uses env `5241c374-…`.
- **Repository** on rows F/G is that satellite repo, not the home repo.
- Dormant repos (`MyCO_Mike`, `stock-research`, the rest of the PORTFOLIO
  dormant list) get **nothing** — do not create slots for them.
- The private career repo stays Rav-only. No slot.
- BLS remains **Cursor-only** (D-016). Neither slot ever suggests Claude.

---

## 2 · Do not import / do not toggle

| Item | Id / slot | Action |
|---|---|---|
| Integrator | [`880eec29-78fd-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/880eec29-78fd-11f1-ba66-0e7d0216e441) | leave **DISABLED** (D-006 unanswered) |
| Prod Smoke | [`4ad7743c-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/4ad7743c-7900-11f1-ba66-0e7d0216e441) | leave **DISABLED** |
| Deploy + backlog | [`75e8fbf5-7900-11f1-ba66-0e7d0216e441`](https://cursor.com/automations/75e8fbf5-7900-11f1-ba66-0e7d0216e441) | leave **DISABLED** |
| Untitled | `61b8e855-76b8-11f1-ba66-0e7d0216e441` | stay **OFF** — do not recreate |
| Build E marketing `20:13` | — | skip; Claude `08:00` owns `claude/lane-marketing` |
| Deep-verify Sat `07:07` | — | skip; Claude Sun `10:53` |
| Meta-governor Sun `18:07` | — | skip; Claude Mon `12:00` |
| Red-team Sun `09:07` | — | skip; Claude Mon `14:00` |

GitHub drain `:17`/`:47` plus Claude integrator `:43` every 3h still publish
to `main` without the three Cursor mechanical copies.

---

## 3 · After the first green of each lane

1. Tell gogo / Em (HQ or Hub): that lane is live — do not Fire Cursor on that
   territory the same UTC day.
2. File or land a docs commit that moves the row into the live table in
   [`FLEET.md`](FLEET.md) and adds the dashboard id.
3. Confirm `npm run cursor:env-check` was green on the commit that shipped
   these files.

---

## 4 · Optional day-2 (still no Claude twin)

Import only if the four builders have each completed one green run.

| Slot | Cron (UTC) | Files |
|---|---|---|
| Owner digest | Fri `19:37` (`37 19 * * 5`) | [`loadoff-owner-digest.prompt.md`](../../.cursor/automation/loadoff-owner-digest.prompt.md) / [`.workflow.json`](../../.cursor/automation/loadoff-owner-digest.workflow.json) |
| Dependency pass | Mon `10:07` (`7 10 * * 1`) | [`loadoff-dependency-pass.prompt.md`](../../.cursor/automation/loadoff-dependency-pass.prompt.md) / [`.workflow.json`](../../.cursor/automation/loadoff-dependency-pass.workflow.json) |

Same model, same repo, same environment. Skip if you want the four builders
only.

---

## 5 · How a run picks work (already in the prompts)

1. `npm run agent:status` — catch-up or red `main` = assist the drain.
2. Collaborator-labeled `should` issues in territory (`npm run agent:backlog`
   prints them first). Land with `Closes #N`.
3. Else top `Backlog:` trailer in territory; else the lane mission.
4. Dedupe `claude/*` **and** open `cursor/*` PRs. Same ticket never on this
   lane and a Dex/Rex Fire Cursor agent and the Claude 9-task fleet.
5. One item. `npm run build && npx vitest run` green. `Backlog:` trailer.
6. Push the lane branch. Never `main`. Never the integrator.

Full start-of-run contract: [`docs/cursor-agent-preamble.md`](../cursor-agent-preamble.md).

---

## 6 · Report back (this shape, then stop)

```
CURSOR-START
Imported A office 05:13: yes/no  id=…
Imported B driver 08:13: yes/no  id=…
Imported C tests 11:13: yes/no  id=…
Imported D integrations 14:13: yes/no  id=…
Imported E radar 09:37: yes/no  id=…
Imported F bls Wed 12:37: yes/no  id=…
Imported G myco Thu 12:37: yes/no  id=…
Environment Saved 5241c374-… (home rows only): yes/no
D-006 three left disabled: yes/no
Untitled left off / not recreated: yes/no
Claude twins skipped: yes/no
CLAUDE-START done in the same sitting: yes/no
Told gogo/Em/Bee/My: yes/no
Day-2 digest/deps: skipped/imported
Blocked: …
```

Facts / Assumptions / Done / Waiting / Unresolved + links.

---

## If a file 404s

This pack may still live only on `cursor/fleet-24-7-liveness-931f`. Use the
raw prefix above. If those 404, open `.cursor/automation/` in the local
checkout and paste from disk.

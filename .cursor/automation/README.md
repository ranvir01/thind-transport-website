# HaulDesk improvement cycle — scheduled background agent

Runs **prompt 3a** on your **Cursor subscription** (Auto model, no API key). One backlog item
per hour; merges `claude/hauldesk-project-setup-l1luoo` when it is ahead of `main`.

| Setting | Value |
|---------|-------|
| **Schedule** | Every hour at **:59** (`59 * * * *`) |
| **Model** | Auto |
| **Repo** | `ranvir01/thind-transport-website` / `main` |
| **Prompt** | `hauldesk-improvement-cycle.prompt.md` |
| **Editor draft** | `hauldesk-improvement-cycle.workflow.json` |

---

## Activate (one time, ~2 min)

1. Open **[cursor.com/automations](https://cursor.com/automations/new)** or **Cursor → Automations → New**
   (or run `/automate` in the Agents Window).
2. Set:
   - **Trigger:** Scheduled → **Custom cron** → `59 * * * *` (every hour at minute 59)
   - **Repository:** `ranvir01/thind-transport-website`, branch `main`
   - **Model:** **Auto**
   - **Prompt:** paste contents of `hauldesk-improvement-cycle.prompt.md`
   - **Cloud compute:** enabled
3. **Save and activate.**

If the editor accepts a JSON prefill, import `hauldesk-improvement-cycle.workflow.json`.

---

## What each run does

1. Merge safe commits from `claude/hauldesk-project-setup-l1luoo` → `main` if that branch is ahead
2. `git pull origin main`
3. Rank `Backlog:` items from recent commits; ship the **top one only** (or stop if empty/green)
4. `npm run build` + `npx vitest run` → commit `Improvement cycle: …` → push to `main`

---

## Do not use

- `CURSOR_API_KEY` / `api.cursor.com/v1/agents` — bills outside your subscription
- GitHub Actions to launch agents — removed from this repo for that reason

---

## Manual run

In Cursor chat on this repo: `@hauldesk-improvement-cycle.prompt.md` or paste prompt **3a** from
`docs/agent-improvement-loop.md`.

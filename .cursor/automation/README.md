# HaulDesk improvement cycle — background automation

Runs **prompt 3a** from `docs/agent-improvement-loop.md` automatically: one ranked
`Backlog:` item per cycle, anti-loop guards, push to `main`.

Prompt file: `hauldesk-improvement-cycle.prompt.md`

---

## Option A — GitHub Action (recommended, fully in-repo)

Already wired: `.github/workflows/hauldesk-improvement-cycle.yml`

**One-time setup (2 minutes):**

1. Open [Cursor Dashboard → API Keys](https://cursor.com/dashboard?tab=settings) and create a key.
2. In GitHub: **ranvir01/thind-transport-website → Settings → Secrets and variables → Actions**
3. New repository secret: `CURSOR_API_KEY` = your key.
4. Merge this workflow to `main`.

**Behavior:**

- Fires on every push to `main` (and manual **Run workflow** from Actions tab).
- Skips commits whose subject starts with `Improvement cycle:` (anti-loop).
- Skips commits containing `[skip-improvement-cycle]` in the message.
- Launches a Cursor cloud agent with `workOnCurrentBranch: true` so it commits directly to `main`.
- If the secret is missing, the workflow prints a notice and exits cleanly (does not fail CI).

---

## Option B — Cursor Automations UI (native git trigger)

Use this if you prefer Cursor's built-in Automations over the GitHub Action.

1. In Cursor: **Automations → New automation** (or run `/automate` in the Agents Window).
2. Import the draft from `hauldesk-improvement-cycle.workflow.json` if the editor offers prefill,
   or set manually:
   - **Trigger:** Push to branch → `ranvir01/thind-transport-website` / `main`
   - **Repo:** same repo, branch `main`
   - **Prompt:** paste contents of `hauldesk-improvement-cycle.prompt.md`
   - **Cloud compute:** enabled
3. Save and activate.

Optional: add a **Scheduled** trigger (weekdays 9:00) as a fallback when nothing has merged.

---

## Manual run

```bash
# From Cursor chat or a cloud agent session:
# Paste prompt 3a from docs/agent-improvement-loop.md section 3a,
# or @-mention hauldesk-improvement-cycle.prompt.md
```

Or trigger the GitHub Action manually: **Actions → HaulDesk improvement cycle (3a) → Run workflow**.

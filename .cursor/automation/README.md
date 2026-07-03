# HaulDesk improvement cycle — Cursor Automation (subscription)

Runs **prompt 3a** from `docs/agent-improvement-loop.md` on your **Cursor plan usage**
(Auto / Composer / cloud agents included in your subscription). **Do not** use a separate
`CURSOR_API_KEY` or the Cloud Agents API — that bills outside your plan.

Prompt file: `hauldesk-improvement-cycle.prompt.md`  
Draft for the editor: `hauldesk-improvement-cycle.workflow.json`

---

## One-time setup (≈2 minutes)

1. Open **Cursor → Automations → New** (or run `/automate` in the Agents Window).
2. Configure:
   - **Trigger:** GitHub → **Push to branch** → `ranvir01/thind-transport-website` / `main`
   - **Repository:** same repo, branch `main`
   - **Model:** your usual Auto / Composer model (draws from subscription, not API keys)
   - **Prompt:** paste the contents of `hauldesk-improvement-cycle.prompt.md` (or `@` that file in the Agents Window)
   - **Cloud compute:** enabled (required for repo-backed automations)
3. **Save and activate.**

Optional: add a **Scheduled** trigger (e.g. weekdays 9:00) as a quiet fallback when nothing has merged.

---

## What it does

After each push to `main`, a cloud agent:

1. Pulls latest `main`
2. Reads `Backlog:` trailers from recent commits
3. Ships **one** top-ranked item (or skips if nothing actionable)
4. Verifies build + tests, commits with `Improvement cycle: …`, pushes to `main`

**Anti-loop:** the prompt skips when backlog is polish-only, or when HEAD is already an
`Improvement cycle:` commit with no P0/P1 items left.

---

## Manual run (same subscription)

In any Cursor agent chat on this repo, `@` mention `hauldesk-improvement-cycle.prompt.md` or paste
prompt **3a** from `docs/agent-improvement-loop.md`. Uses your normal Auto/Composer session — no API key.

---

## Do not use

- ~~GitHub Action + `CURSOR_API_KEY`~~ — removed; that path bills via the Cloud Agents API, not your subscription.
- ~~`curl api.cursor.com/v1/agents`~~ — same extra API billing.

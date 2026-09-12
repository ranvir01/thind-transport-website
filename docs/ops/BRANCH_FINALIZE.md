# Combining branches — what we will and will not merge

Do **not** squash every `claude/*` and stale `cursor/*` branch into `main`.
The integrator already drains unique work hourly. Blind-merging 100+ session
branches reintroduces deleted code and fights the ratchet gates.

## Ready open PRs (review individually)

| PR | Branch | Note |
|----|--------|------|
| #56 | `cursor/role-hint-throttle-ba94` | Login oracle throttle |
| #58 | `cursor/cloud-dev-environment-agents-b108` | Cloud env docs |
| #59 | `cursor/loadoff-agent-fleet-ba94` | Automation fleet restore |
| #63 | `cursor/driver-attraction-kit-3dc5` | Hiring kit |
| #61 | `cursor/recruiting-competitive-pass-3dc5` | Recruiting copy |
| #42 | `cursor/fleet-24-7-liveness-931f` | Large fleet work — review before merge |
| #64 | `cursor/portfolio-omni-analytics-7a1c` | Based on #42 |

## Do not merge

- `#83` is labeled DO NOT MERGE (briefing docs only)
- Stale `cursor/hauldesk-improvement-cycle-*` drafts that only remap copy
- Hundreds of `claude/*` session branches already absorbed or empty

Use `npm run branches:triage` to list no-op `claude/*` branches. It never deletes.

## Fellowship app (separate repo)

`cursor/claude-corps-fellow-f86b` lives on **ranvir01/Job-Applications**, not this repo.
See that PR (#4) plus `FINAL_CLAUDE_PROMPT.md` in the application folder.

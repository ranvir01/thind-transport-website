# Thind Transport Hub — Phase Prompt Pack

Seven standalone prompts, one per build phase, generated from `docs/tms-master-prompt.md` (v2). Splitting the master prompt gives the agent a smaller, sharper context per session: tighter scope, less drift, verifiable exit criteria, and no temptation to build Phase 6 features during Phase 2.

## How to use

1. Keep the master prompt in the repo at `docs/tms-master-prompt.md` (the agent is told to read it when present). Optionally copy these files to `docs/phases/`.
2. **One fresh agent session per phase.** Paste the entire phase file (everything in it). Run phases strictly in order — each declares its preconditions.
3. Commit per feature inside a phase. At phase end, complete the Exit checklist, record the phone demo, and update `docs/demo-script.md`.

| Phase | File | Requires |
|---|---|---|
| 1 Foundation + Dispatch | phase-1.md | — |
| 2 Money | phase-2.md | 1 |
| 3 Fuel + Compliance | phase-3.md | 1–2 |
| 4 Driver Hub (PWA) | phase-4.md | 1–3 |
| 5 CRM + Portals | phase-5.md | 1–4 |
| 6 Live Integrations + Analytics | phase-6.md | 1–5 |
| 7 Productization | phase-7.md | 1–6 |

## Resuming a phase mid-way

If a phase spans multiple sessions, start the new session with the same phase file plus this line:

> "Phase N is partially complete. Inspect the repo and `git log` to determine which items in Section 2 (Build scope) are done versus remaining, report the diff, then finish only the remainder. Do not rebuild what exists."

## Definition of done (every phase)

`npm run build` and `npm test` green · 390px + 1440px verified · `npm run seed:demo` clean · phase Exit checklist complete · phone demo recorded · no reachable dead ends.

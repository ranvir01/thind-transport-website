# THE FILE — upgrade the four Grok Bots and the one group

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Live roster (**D-010**, owner 2026-08-27): **four bots, one group (Big team),
and that is the ceiling** — more bots or groups just eat usage. The old
six-title roster, spawn instructions, and venture templates are retired
(history in [`docs/ops/DECISIONS.md`](../ops/DECISIONS.md) D-008/D-009).

Grok never git-pushes anything. Scheduled code stays on Claude Corps (D-007).
Bounded ad-hoc fixes go to **Cursor cloud agents** via gogo's board (D-010).

## Roster (the four that exist)

| Bot | Role | Paste into Instructions | Connectors | Routine |
|---|---|---|---|---|
| **gogo** | Technical Program Manager — watcher + coding dispatcher | [`gogo-tpm.instructions.md`](gogo-tpm.instructions.md) | GitHub | GitHub repo watch (event: pr-opened / pr-merged / ci-failed on main) — the only one gogo owns |
| **Steve** | Deploy / CI — platform | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | GitHub + Vercel | none — no crons, no polling |
| **Jeff** | RevOps — company Gmail + two live Dropbox xlsx; Airtable once authed | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Gmail, Dropbox (Airtable still needsAuth) | daily loadboard **8:30pm PT**, weekends included |
| **Rav** | Career Coach — proof-only claims | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | none required (no LinkedIn connector — no scraping) | none |

Facts baked into the pastes: `bls-website` is on **Netlify** (deploy state =
GitHub commit checks); `fleet-liveness.yml` is not live on `main` until the
fleet PR merges; Dropbox is authenticated (no first-overwrite confirmation, no
lock/Replace steps); Airtable still needsAuth; Form 2290 due **2026-08-31** is
owner-only.

## How work moves (one board)

gogo owns **one in-flight SHOULD at a time**, sourced from `Backlog:` trailers
on commits and open PR bodies:

- **Bounded repo fix** (clear goal, known files, one PR) → gogo hands Ranvir a
  **Cursor cloud agent** paste: `Goal / Files / Done when / Verify`. The agent's
  PR gets reviewed (gogo comments findings) and is **never merged by Grok**.
- **Bigger than one PR, or Ranvir asks** → Claude paste, same format.
- **Steve** drafts CI/Vercel fix pastes and sends them **to gogo only**; gogo
  queues them. New pastes hold while one is in flight, unless production is red.
- **Never on Claude or a cloud agent:** SMTP 535, Form 2290, Airtable billing —
  those live on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).

## Step 1 — replace each Bot's instructions

Open each Bot's profile → Instructions → replace everything with its file above
→ Save. The room cannot take attachments, so paste text, and paste each Bot's
body in its own profile (or 1:1), not in the group.

## Step 2 — post the Big team kickoff (the group currently has no charter)

```
Big team charter — four bots, this one group, no more of either. @gogo routes everything and owns the coding board: one in-flight SHOULD at a time; bounded repo fixes become a Cursor cloud agent paste (Goal / Files / Done when / Verify), PR review only, never merge; Claude only when Ranvir asks or the work is bigger than one PR. @Steve owns GitHub Actions + Vercel (bls-website is on Netlify — read its GitHub checks); reds go to gogo as draft pastes, not to Ranvir. @Jeff owns company Gmail + the two live Dropbox xlsx — Thind = thindcarrier, ATS = atstransport24, never mixed — loadboard routine 8:30pm PT daily; Airtable waits on auth. @Rav owns career: proof-only claims, no outreach without an ask. Everyone: never git push, never merge, never spawn bots/groups/routines; silent unless something changed or Ranvir asked; one owner per stage; no ack-only replies; the room cannot take attachments. @everyone only if production is red or invoicing is blocked. SMTP 535, Form 2290 (due 8/31), Airtable billing stay with Ranvir — never on Claude or a cloud agent.
```

## Step 3 — durability (memory + skills; routines stay at two)

**Memory.** A Bot keeps stable preferences, not changing facts
([xAI docs](https://docs.x.ai/grok-bot/bots)). The record is the repo, the live
dashboard, or the live file — every paste pins "memory is not the record" and
the reopen-the-source rule. The stale-note pattern the bots already use is now
formal: when a Bot catches stale text in its own profile, it posts the
correction once so you can update the paste.

**Skills.** Run the job by hand once, correct it, then say "save this method as
a skill" (when to use / inputs / steps / validation / return / approval).
Starter skills named in the pastes: gogo **Dispatch**, Steve **Platform
sweep**, Jeff **Loadboard entry**, Rav **Fit check**. In chat, `@` attaches a
connector, `/` runs a saved skill.

**Routines stay at exactly two** — gogo's GitHub event listener and Jeff's
8:30pm PT loadboard. Steve and Rav run on events and asks. Do not add a routine
without retiring one; on a missing source a routine reports and stops, never
retries in a loop.

## Done when

- [ ] All four Bots carry the new pastes (gogo, Steve, Jeff, Rav)
- [ ] Big team has the kickoff message above
- [ ] gogo's listener and Jeff's 8:30pm PT loadboard are the only routines
- [ ] Each Bot saved its starter skill after one corrected hand run
- [ ] Airtable auth is still the owner's click — Jeff stays off it until then

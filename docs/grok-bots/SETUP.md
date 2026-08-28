# THE FILE — upgrade the four Grok Bots and the one group

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Live roster (**D-010 / D-011 / D-012**, owner 2026-08-27–28): **four bots, one
group (Big team), and that is the ceiling.** Real job titles (official Grok
use-cases + botdirectory Chief of Staff / Talent Scout / Expense Manager
shapes) map onto these four seats — do not spawn a fifth. Research:
[`RESEARCH.md`](RESEARCH.md). Queue: collaborator-labeled GitHub `should`
issues ([`docs/ops/PORTFOLIO.md`](../ops/PORTFOLIO.md)).

Grok never git-pushes. Scheduled code stays on Claude Corps (D-007). Bounded
ad-hoc fixes go to **Cursor cloud agents** via gogo's board — gogo writes the
paste, **Ranvir clicks** (Grok starting those agents burns Cursor usage).

## Roster (the four that exist)

| Bot | Role | Paste into Instructions | Connectors | Routine |
|---|---|---|---|---|
| **gogo** | Chief of Staff + TPM — watcher + coding dispatcher | [`gogo-tpm.instructions.md`](gogo-tpm.instructions.md) | GitHub | GitHub repo watch (pr-opened / pr-merged / ci-failed on main) — keep it **narrow** |
| **Steve** | Staff SRE — Deploy / CI / Bug Reproduction | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | GitHub + Vercel | none — no crons, no polling |
| **Jeff** | Head of RevOps — company Gmail + two live Dropbox xlsx; AR Payments billing entity | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Gmail (list only), Dropbox; **browser for rate-con PDFs** | daily loadboard **8:30pm PT**, weekends included |
| **Rav** | Talent Scout / Career Coach — proof-only | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | GitHub (for FACTS.md + Job-Applications); Drive if proof files live there | none |

Facts baked in: `bls-website` is on **Netlify**; `fleet-liveness.yml` is not
live on `main` until the fleet PR merges; Dropbox is authenticated; **Airtable
software is retired** (D-014) — Jeff stays on the two Dropbox xlsx; Form 2290
due **2026-08-31** and the AR Payments bank account are owner-only; the Gmail
connector **cannot download PDF bytes** (forum 169261) — Jeff uses the browser.

## How work moves (one board + one filing cabinet)

gogo owns **one in-flight SHOULD**. Occupancy is `/workspace/board.md` on the
shared computer (Big team cannot attach files; bot-to-group is text-only).

| Path | Owner | What |
|---|---|---|
| `/workspace/board.md` | gogo | status, owner, Goal/Files/Done when/Verify, PR URL, issue number |
| `/workspace/platform/last.md` | Steve | last sweep: Facts / Assumptions / Waiting / Unresolved |
| `/workspace/loadboard/last-run.md` | Jeff | date, counts, skipped duplicates, stuck step |
| `/workspace/career/` | Rav | fit-check.md, bullets.md |

- Bounded repo fix → Cursor cloud agent paste for **you** to fire. Grok reviews
  the PR and it is **never merged by Grok**.
- Bigger than one PR, or you ask → Claude paste, same format.
- Free paging, no new machinery: once the fleet PR lands on `main`,
  `fleet-liveness.yml` going red on a stall is a `ci-failed` event — gogo's
  existing listener pages your phone. Do not add a webhook or routine for it.
- Steve drafts CI/Vercel pastes to gogo (and into `/workspace/platform/last.md`).
- **Never on Claude or a cloud agent:** SMTP 535, Form 2290, AR Payments bank —
  [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).

## Step 1 — replace each Bot's instructions

Open each Bot → Bot actions → Edit Profile → Instructions → replace everything
with its file above → Save. Paste in the Bot's own profile (or 1:1), not in
the group. Pin all four. Turn **Notifications** on for **gogo** and **Jeff**.

## Step 2 — post the Big team kickoff (the group currently has no charter)

```
Big team charter — four bots, this one group, no more of either. Job titles: @gogo Chief of Staff + TPM, @Steve Staff SRE, @Jeff Head of RevOps, @Rav Talent Scout. Shared filing cabinet is /workspace (board.md, platform/last.md, loadboard/last-run.md, career/). @gogo routes and owns the coding board: one in-flight SHOULD; occupancy in /workspace/board.md; collaborator-labeled GitHub `should` issues are the queue; bounded repo fixes become a Cursor cloud agent paste for Ranvir (Goal / Files / Done when / Verify) — gogo does not start the agent; PR review only, never merge; Claude only when Ranvir asks or the work is bigger than one PR. @Steve owns GitHub Actions + Vercel (bls-website is on Netlify — read its GitHub checks); reds go to gogo as drafts in /workspace/platform/last.md and as a pinned GitHub issue. @Jeff owns company Gmail + the two live Dropbox xlsx — Thind = thindcarrier, ATS = atstransport24, never mixed — loadboard 8:30pm PT daily; open Gmail in the BROWSER for PDFs (connector cannot download bytes); Airtable software is retired. @Rav owns career: proof-only Talent Scout, drafts in /workspace/career/, no outreach without an ask. Everyone: never git push, never merge, never spawn bots/groups/routines, never SSH-tunnel the computer; silent unless something changed or Ranvir asked; one owner per stage; no ack-only; reactions are not approvals; group handoffs are text-only (screenshots 1:1). Password/2FA/CAPTCHA: hand Ranvir the Agent Computer, never paste secrets in chat. @everyone only if production is red or invoicing is blocked. SMTP 535, Form 2290 (due 8/31), AR Payments bank stay with Ranvir.
```

## Step 3 — account settings (once)

Desktop: Settings (`Cmd/Ctrl+,`).

1. **Agent → Timezone** = `America/Los_Angeles` (Jeff's 8:30pm PT and gogo's listener).
2. **Agent → Execution on Local Computer** = **Never allowed**. The cloud
   computer is enough; local Mac/Windows is a separate risk.
3. **Agent → Auto-review** (when the control exists):
   - **Require Approval:** send any external email; post or apply on LinkedIn;
     git push / merge; overwrite or Replace a Dropbox file; purchases; changing
     a production dashboard.
   - Do **not** add “always allow everything in the browser.”
4. **Plugins:** GitHub, Vercel, Gmail, Dropbox connected. Airtable is retired —
   do not sign it in. Type `@` to attach a connector; `/` to run a saved skill.
   After each Bot saves its starter skill, open **Plugins → Yours** and enable
   that skill on that Bot (skills are account-wide but per-Bot gated).
5. Do not share these four Bots (a public link exposes the description).

Password / passkey / 2FA / CAPTCHA / payment: open **Agent Computer**, take
control, complete only that step, return control. Never paste secrets in chat.
If the Bot misses the handoff, tell it “hand me your computer.”

## Step 4 — durability (skills; routines stay at two)

**Memory.** Stable preferences only
([docs](https://docs.x.ai/grok-bot/bots)). Changing facts live in the repo, the
dashboard, or `/workspace/*`. Every paste pins “memory is not the record.”

**Skills.** Run the job once, correct it, then: “save this method as a skill”
with all six parts (when / inputs / steps / validate / return / approval).
Starter skills: gogo **Dispatch**, Steve **Platform sweep**, Jeff **Loadboard
entry**, Rav **Fit check**.

**Teach a task** (desktop, 1:1 with Jeff, computer view visible): record the
Excel-for-the-web cell-edit once (≤10 min, no passwords on screen). Review the
draft skill; add the two-company + idempotent rules the recording will miss.

**Routines stay at exactly two.** After any edit: **Test run** on desktop
(real work — use a quiet night for Jeff). On a missing source, report and stop,
never retry in a loop, never reuse stale data. Adding a routine means retiring
one.

## Done when

- [ ] All four Bots carry the new pastes; pinned; gogo + Jeff notifications on
- [ ] Big team has the kickoff above
- [ ] Step 3 settings saved (timezone, local computer Never, Auto-review)
- [ ] `/workspace/board.md` exists (gogo creates it on first dispatch)
- [ ] Each Bot saved and **enabled** its starter skill; Jeff recorded Teach a task
- [ ] gogo's listener and Jeff's 8:30pm PT loadboard are the only routines; each had a Test run
- [ ] Airtable stays disconnected — software retired 2026-08-28

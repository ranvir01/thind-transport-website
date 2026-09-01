# THE FILE — paste the 14-seat Grok org and the six groups

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Live roster (**D-015** + **D-016**, owner 2026-09-01): **14 bots, 6 groups**
(HQ, Hub, Money, Career, Labs, Clients). Never name the TMS product in bot
chat, LinkedIn, or email — say **the hub** or `thindtransport.com/hub`. gogo
is the only org-wide Chief of Staff. Em owns hub coding dispatch. Dex + Rex
Fire Cursor from a **written SOP** ([`templates/fire-cursor.md`](templates/fire-cursor.md));
do not wait for a Teach a task. Bee runs BLS on Cursor only (no Claude Code).
Rav hunts and applies; Auto Review holds send. Wright creates more bots **only
after Ranvir says yes**, except a **GOGO-START** paste which **is** the yes
for these 14 seats. Research: [`RESEARCH.md`](RESEARCH.md). Queue:
collaborator-labeled GitHub `should` issues
([`docs/ops/PORTFOLIO.md`](../ops/PORTFOLIO.md)). Routing:
[`docs/ops/MODEL-ROUTING.md`](../ops/MODEL-ROUTING.md). Bench:
[`SPAWN.md`](SPAWN.md). Channels: [`GROUPS.md`](GROUPS.md) — paste the
**full** charters, not one-liners. Operator pack for the live gogo Bot:
[`GOGO-START.md`](GOGO-START.md).

Grok never git-pushes. Scheduled code stays on Claude Corps (D-007, 9 tasks)
for the **home repo only**. Bounded ad-hoc fixes go to **Cursor cloud agents**
via Fire Cursor (D-015 reversed D-011; D-016 drops the teach-a-task gate).
Token rule ([Morgan Linton](https://x.com/morganlinton/status/2094413837290369028)):
waste is **context bloat**. Atomic seats, short 1:1s, dispatch instead of
doing the work in-thread, connectors over screenshot-scraping, event
listeners over polling, routines only when they can act. Finch flags leaks.

## Roster (14 seats)

| Bot | Role | Paste | Connectors | Routine |
|---|---|---|---|---|
| **gogo** | Org Chief of Staff | [`gogo-cos.instructions.md`](gogo-cos.instructions.md) | GitHub, Gmail, Calendar | GitHub watch pr-opened / pr-merged / ci-failed; Friday retro |
| **Finch** | FinOps / model router — 70/90 governor | [`finch-finops.instructions.md`](finch-finops.instructions.md) | GitHub | Weekday morning usage line |
| **Wright** | Botwright — 14 seats from GOGO-START; 15th after yes | [`wright-botwright.instructions.md`](wright-botwright.instructions.md) | none | Monthly unused-routine sweep |
| **Scout** | X bookmarks → idea cards (state file + consume) | [`scout-bookmarks.instructions.md`](scout-bookmarks.instructions.md) | X (read-only) | Weekday 16:00 PT |
| **Em** | Hub Eng Mgr — only writer of `/workspace/hub/board.md` | [`em-engmgr.instructions.md`](em-engmgr.instructions.md) | GitHub | none |
| **Dex** | IC office/hub/TMS — Fire Cursor | [`dex-ic.instructions.md`](dex-ic.instructions.md) | GitHub | none |
| **Rex** | IC driver/recruiting — Fire Cursor | [`rex-ic.instructions.md`](rex-ic.instructions.md) | GitHub | none |
| **Steve** | Staff SRE | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | GitHub, Vercel | none |
| **Jeff** | Head of RevOps | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Gmail, Dropbox; browser for PDFs + RTS | loadboard 8:30pm PT daily; RTS recon every other day 9pm PT |
| **Rav** | Talent Scout — standing apply, cap 6-7 | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | GitHub; LinkedIn in the browser | apply-every-2-days 4:30am PT |
| **Labs** | Experiments — disposable demos | [`labs-experiments.instructions.md`](labs-experiments.instructions.md) | GitHub | none |
| **Ridge** | Researcher — Fable vs Opus vs Grok 4.6 vs Composer | [`ridge-research.instructions.md`](ridge-research.instructions.md) | GitHub | after Scout if the bookmark is about models |
| **Bee** | BLS CoS — Fire Cursor, never Claude Code | [`bee-bls.instructions.md`](bee-bls.instructions.md) | GitHub | none until fired |
| **My** | MyConsulting CoS — quiet | [`my-myco.instructions.md`](my-myco.instructions.md) | GitHub | none until fired |

Facts baked in: `bls-website` is on **Netlify**; Dropbox is authenticated;
**Airtable software is retired** (D-014); Thind = **thindcarrier**, ATS =
**atstransport24**, never mixed; Form 2290 due **2026-08-31** and the
AR Payments bank are owner-only; Gmail connector **cannot download PDF bytes**;
Cursor Ultra is $200/mo; Claude Max 5x is $100/mo; Fire Cursor cap starts at
**6/week** combined Dex+Rex (Finch may raise or cut). Bee's BLS agents are a
separate cap Finch names.

## How work moves (files, not chat)

| Path | Owner | What |
|---|---|---|
| `/workspace/org/board.md` | gogo | one in-flight org SHOULD |
| `/workspace/org/usage.md` | Finch | meters + today's model |
| `/workspace/org/models.md` | Ridge | Fable / Opus / Grok 4.6 / Composer card + launch path |
| `/workspace/org/pastes/` | Wright / gogo | copies of the 14 instruction files |
| `/workspace/hub/board.md` | Em only | one in-flight hub SHOULD |
| `/workspace/platform/last.md` | Steve | last sweep |
| `/workspace/loadboard/last-scan.md` | Jeff | 8:30pm loadboard (skill Loadboard entry only) |
| `/workspace/loadboard/last-recon.md` | Jeff | 9pm RTS recon (skill RTS recon only) |
| `/workspace/career/` | Rav | applications log + packets |
| `/workspace/labs/ideas/` | Scout | `_seen.md` + bookmark cards |
| `/workspace/labs/demos/` | Labs | keep-or-kill notes |

Chat is history. The file is memory. One writer per shared file.
**Memory is not the record.** Reopen the source.

## Step 1 — give gogo the pack (preferred) or paste each Bot

**Preferred:** paste [`GOGO-START.md`](GOGO-START.md) into the live **gogo**
1:1. That paste is owner-yes for the 14 seats. gogo + Wright migrate the live
four-bot **Big team** (gogo, Steve, Jeff, Rav ex-Lin keep their connectors and
proven routines; the blank "New Bot" stub becomes **Em**), create the other
nine, post group charters, and mkdir `/workspace`.

**Manual fallback:** each Bot → Bot actions → Edit Profile → Instructions →
replace with its file above → Save. Paste in the Bot's own profile (or 1:1),
not in a group. Pin **gogo** and **Jeff**. Turn **Notifications** on for
**gogo**, **Jeff**, and **Finch**.

Apply order if doing it by hand (so the Grok meter survives):

1. Day 1: gogo + Finch + Wright + Scout; create **HQ**; connect **X** for Scout.
2. Day 2: Em + Dex + Rex; move Steve into **Hub**; Fire Cursor SOP is in the
   paste — no teach-a-task required; cap 6.
3. Day 3: Labs + Ridge; create **Labs**; first bookmark sweep (manual, then routine).
4. Day 4: Bee + My (no Claude Code on BLS). Jeff + Rav re-pastes keep their
   live routines; create **Money** and **Career**. Rav applies in the browser
   (no LinkedIn connector exists — takeover only for login/2FA).
5. Day 5: Fire Claude only if Finch says the Max 5x window is idle (hub, Em);
   gogo posts one HQ digest; you label new `should` issues.

If Finch hard-stops, Wright pauses routines — does not spawn.

## Step 2 — post the six group charters

Retire the old **Big team** kickoff. Create six groups and paste the **full**
matching charter from [`GROUPS.md`](GROUPS.md) into each group's instructions.
Keep each group at 2–6 bots where the roster allows (Money and Career are
single-seat on purpose).

## Step 3 — account settings (once)

Desktop: Settings (`Cmd/Ctrl+,`).

1. **Agent → Timezone** = `America/Los_Angeles` (Jeff 8:30pm PT, Scout 16:00 PT).
2. **Agent → Execution on Local Computer** = **Never allowed**.
3. **Agent → Auto-review** (when the control exists):
   - **Require Approval:** send any external email; post or apply on LinkedIn;
     git push / merge; overwrite or Replace a Dropbox file; purchases; changing
     a production dashboard.
   - Do **not** add “always allow everything in the browser.”
4. **Plugins:** GitHub, Vercel, Gmail, Dropbox, **X** (Scout, read-only).
   Rav's LinkedIn is browser-only (no connector). Airtable is retired — do not
   sign it in; the duplicate "thind transport" Gmail connector needs reauth or
   removal. Type `@` to attach a connector; `/` to run a saved skill. After
   each Bot saves its starter skill, open **Plugins → Yours** and enable that
   skill on that Bot.
5. Do not share these Bots (a public link exposes the description).
6. Do not install random public Grok templates.

Password / passkey / 2FA / CAPTCHA / payment: open **Agent Computer**, take
control, complete only that step, return control. Never paste secrets in chat.
If the Bot misses the handoff, tell it “hand me your computer.”

## Step 4 — Fire Cursor / Fire Claude (written SOP; Teach a task optional)

Desktop, 1:1, computer view visible, **no secrets on screen**.

**Fire Cursor** is already in Dex / Rex / Bee / Steve pastes. They open
`cursor.com/agents`, clone the last green agent on that repo, or New agent →
Goal / Files / Done when / Verify → Start. Optional GitHub `@cursor` on the
issue. Full SOP: [`templates/fire-cursor.md`](templates/fire-cursor.md). After
the first green run, tell the Bot “**save this method as a skill**” named
Fire Cursor. If **Teach a task** is offered, record that click-path once
(≤10 min) to lock the skill — optional, not a gate.

**Fire Claude:** written SOP in [`templates/fire-claude.md`](templates/fire-claude.md)
— open `claude.ai/code` → new session → paste the repo preamble + the same
four-line brief → Start. Save as skill **Fire Claude**. Enable it on **Em
only**, hub only, and only when Finch says the Max 5x window is idle. Do not
duplicate a ticket already on the live 9-task Claude fleet or an imported
Cursor lane. **Bee never uses this.**

Review the draft skill; add Finch's cap and "never merge" — a recording will
miss those.

## Step 6 — Cursor + Claude automations (you click; bots do not)

After Step 1, do both platform packs in one sitting:

1. **[`docs/ops/CURSOR-START.md`](../ops/CURSOR-START.md)** — the four home
   builders plus the three D-017 portfolio slots (radar `09:37`, BLS Wed
   `12:37`, MyCO Thu `12:37`). Do not re-enable Integrator / Prod Smoke /
   Deploy until you answer D-006. Do not import marketing / deep-verify /
   meta-governor / red-team.
2. **[`docs/ops/CLAUDE-START.md`](../ops/CLAUDE-START.md)** — confirm the
   live 9 Claude tasks, apply the toggles + paste deltas. No 10th task, no
   Claude on `bls-website` or `myco-website`.

After the first green lane run, tell gogo and Em so Dex / Rex do not Fire
Cursor on that territory the same day; Bee and My review the weekly
maintenance PRs on their repos.

## Step 5 — durability (skills; routines stay listed)

**Memory.** Stable preferences only. Changing facts live in the repo or
`/workspace/*`. Every paste pins “memory is not the record.”

**Skills.** Run the job once, correct it, then: “save this method as a skill”
with all six parts (when / inputs / steps / validate / return / approval).
Starter skills: gogo **Dispatch**, Finch **Usage card**, Wright **Stamp seat**,
Scout **Bookmark card**, Em **Decompose**, Dex/Rex/Bee **Fire Cursor**, Steve
**Platform sweep**, Jeff **Loadboard entry**, Rav **Fit check** + **Apply packet**,
Labs **Disposable demo**, Ridge **Model card**.

**Routines.** After any edit: **Test run** on desktop. On a missing source,
report and stop, never retry in a loop, never reuse stale data. Adding a
routine means Finch still has meter left — Wright does not spawn during a
hard-stop.

## Done when

- [ ] GOGO-START pasted into live gogo, or all 14 Bots carry the new pastes
- [ ] Live routines survived: gogo watch, Jeff 8:30pm + RTS recon + Sep 3
      one-shot, Rav 4:30am apply
- [ ] Six groups have the **full** charters in GROUPS.md; Big team retired
- [ ] Step 3 settings saved (timezone, local computer Never, Auto-review)
- [ ] `/workspace/org/board.md` and `/workspace/hub/board.md` exist
- [ ] Fire Cursor SOP used at least once (skill saved); Fire Claude only if
      Finch said the window is idle
- [ ] X plugin on Scout; Airtable stays disconnected
- [ ] Each Bot saved and **enabled** its starter skill
- [ ] gogo's listener, Finch's morning line, Scout 16:00 PT, Jeff 8:30pm PT
      each had a Test run (existing live routines skip the re-test)
- [ ] CURSOR-START imported (four builders) or explicitly deferred; D-006
      three left disabled; Claude twins skipped

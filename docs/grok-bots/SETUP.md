# THE FILE — paste the 14-seat Grok org and the six groups

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Live roster (**D-015**, owner 2026-09-01): **14 bots, 6 groups** (HQ, LoadOff,
Money, Career, Labs, Clients). gogo is the only org-wide Chief of Staff. Em
owns LoadOff coding dispatch. Dex + Rex Fire Cursor in the browser; Em may
Fire Claude when Finch says the Max 5x window is idle. Wright creates more
bots **only after Ranvir says yes**. Research: [`RESEARCH.md`](RESEARCH.md).
Queue: collaborator-labeled GitHub `should` issues
([`docs/ops/PORTFOLIO.md`](../ops/PORTFOLIO.md)). Routing:
[`docs/ops/MODEL-ROUTING.md`](../ops/MODEL-ROUTING.md). Bench:
[`SPAWN.md`](SPAWN.md). Channels: [`GROUPS.md`](GROUPS.md).

Grok never git-pushes. Scheduled code stays on Claude Corps (D-007, 9 tasks).
Bounded ad-hoc fixes go to **Cursor cloud agents** via Fire Cursor (D-015
reverses the D-011 "Ranvir clicks" rule once the teach-a-task is recorded).

## Roster (14 seats)

| Bot | Role | Paste | Connectors | Routine |
|---|---|---|---|---|
| **gogo** | Org Chief of Staff | [`gogo-cos.instructions.md`](gogo-cos.instructions.md) | GitHub, Gmail, Calendar | GitHub watch pr-opened / pr-merged / ci-failed; Friday retro |
| **Finch** | FinOps / model router — 70/90 governor | [`finch-finops.instructions.md`](finch-finops.instructions.md) | GitHub | Weekday morning usage line |
| **Wright** | Botwright — spawn only after owner yes | [`wright-botwright.instructions.md`](wright-botwright.instructions.md) | none | Monthly unused-routine sweep |
| **Scout** | X bookmarks → idea cards | [`scout-bookmarks.instructions.md`](scout-bookmarks.instructions.md) | X (read-only) | Weekday 16:00 PT |
| **Em** | LoadOff Eng Mgr — only writer of `/workspace/loadoff/board.md` | [`em-engmgr.instructions.md`](em-engmgr.instructions.md) | GitHub | none |
| **Dex** | IC office/hub/TMS — Fire Cursor | [`dex-ic.instructions.md`](dex-ic.instructions.md) | GitHub | none |
| **Rex** | IC driver/recruiting — Fire Cursor | [`rex-ic.instructions.md`](rex-ic.instructions.md) | GitHub | none |
| **Steve** | Staff SRE | [`steve-deploy-ci.instructions.md`](steve-deploy-ci.instructions.md) | GitHub, Vercel | none |
| **Jeff** | Head of RevOps | [`jeff-revops.instructions.md`](jeff-revops.instructions.md) | Gmail, Dropbox; browser for PDFs | loadboard 8:30pm PT daily |
| **Rav** | Talent Scout — proof-only | [`rav-career-coach.instructions.md`](rav-career-coach.instructions.md) | GitHub | none |
| **Labs** | Experiments — disposable demos | [`labs-experiments.instructions.md`](labs-experiments.instructions.md) | GitHub | none |
| **Ridge** | Researcher — Fable vs Opus vs Grok 4.6 vs Composer | [`ridge-research.instructions.md`](ridge-research.instructions.md) | GitHub | after Scout if the bookmark is about models |
| **Bee** | BLS CoS — quiet | [`bee-bls.instructions.md`](bee-bls.instructions.md) | GitHub | none until fired |
| **My** | MyConsulting CoS — quiet | [`my-myco.instructions.md`](my-myco.instructions.md) | GitHub | none until fired |

Facts baked in: `bls-website` is on **Netlify**; Dropbox is authenticated;
**Airtable software is retired** (D-014); Thind = **thindcarrier**, ATS =
**atstransport24**, never mixed; Form 2290 due **2026-08-31** and the
AR Payments bank are owner-only; Gmail connector **cannot download PDF bytes**;
Cursor Ultra is $200/mo; Claude Max 5x is $100/mo; Fire Cursor cap starts at
**6/week** combined (Finch may raise or cut).

## How work moves (files, not chat)

| Path | Owner | What |
|---|---|---|
| `/workspace/org/board.md` | gogo | one in-flight org SHOULD |
| `/workspace/org/usage.md` | Finch | meters + today's model |
| `/workspace/org/models.md` | Ridge | Fable / Opus / Grok 4.6 / Composer card |
| `/workspace/loadoff/board.md` | Em only | one in-flight LoadOff SHOULD |
| `/workspace/platform/last.md` | Steve | last sweep |
| `/workspace/loadboard/last-run.md` | Jeff | loadboard run |
| `/workspace/career/` | Rav | fit-check / bullets |
| `/workspace/labs/ideas/` | Scout | bookmark cards |
| `/workspace/labs/demos/` | Labs | keep-or-kill notes |

Chat is history. The file is memory. One writer per shared file.

## Step 1 — replace or create each Bot's instructions

Open each Bot → Bot actions → Edit Profile → Instructions → replace everything
with its file above → Save. New seats: create the Bot, then paste. Paste in
the Bot's own profile (or 1:1), not in a group. Pin **gogo** and **Jeff**.
Turn **Notifications** on for **gogo**, **Jeff**, and **Finch**.

Apply order (so the Grok meter survives):

1. Day 1: gogo + Finch + Wright + Scout; create **HQ**; connect **X** for Scout.
2. Day 2: Em + Dex + Rex; move Steve into **LoadOff**; teach **Fire Cursor**; cap 6.
3. Day 3: Labs + Ridge; create **Labs**; first bookmark sweep (manual, then routine).
4. Day 4: Bee + My (no routines). Jeff + Rav pastes; create **Money** and **Career**.
5. Day 5: teach **Fire Claude** if Finch says the Max 5x window is idle; gogo
   posts one HQ digest; you label new `should` issues.

If Finch hard-stops, Wright pauses routines — does not spawn.

## Step 2 — post the six group charters

Retire the old **Big team** kickoff. Create six groups and paste the matching
snippet from [`GROUPS.md`](GROUPS.md). Keep each group at 2–6 bots.

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
   Airtable is retired — do not sign it in. Type `@` to attach a connector;
   `/` to run a saved skill. After each Bot saves its starter skill, open
   **Plugins → Yours** and enable that skill on that Bot.
5. Do not share these Bots (a public link exposes the description).
6. Do not install random public Grok templates.

Password / passkey / 2FA / CAPTCHA / payment: open **Agent Computer**, take
control, complete only that step, return control. Never paste secrets in chat.
If the Bot misses the handoff, tell it “hand me your computer.”

## Step 4 — Fire Cursor and Fire Claude (teach-a-task once)

Desktop, 1:1, computer view visible, ≤10 min, **no secrets on screen**.

**Fire Cursor:** open `cursor.com/agents` → New agent → paste Goal / Files /
Done when / Verify → pick the model Finch named → Start. Save as skill
**Fire Cursor**. Enable it on Dex, Rex, and (if assigned) Steve.

**Fire Claude:** open `claude.ai/code` → new session → same brief → Start.
Save as skill **Fire Claude**. Enable it on Em only. Do not duplicate a ticket
already on the live 9-task Claude fleet.

Review the draft skill; add Finch's cap and "never merge" — the recording will
miss those.

## Step 5 — durability (skills; routines stay listed)

**Memory.** Stable preferences only. Changing facts live in the repo or
`/workspace/*`. Every paste pins “memory is not the record.”

**Skills.** Run the job once, correct it, then: “save this method as a skill”
with all six parts (when / inputs / steps / validate / return / approval).
Starter skills: gogo **Dispatch**, Finch **Usage card**, Wright **Stamp seat**,
Scout **Bookmark card**, Em **Decompose**, Dex/Rex **Fire Cursor**, Steve
**Platform sweep**, Jeff **Loadboard entry**, Rav **Fit check**, Labs
**Disposable demo**, Ridge **Model card**.

**Routines.** After any edit: **Test run** on desktop. On a missing source,
report and stop, never retry in a loop, never reuse stale data. Adding a
routine means Finch still has meter left — Wright does not spawn during a
hard-stop.

## Done when

- [ ] All 14 Bots carry the new pastes; gogo + Jeff + Finch notifications on
- [ ] Six groups have the charters in GROUPS.md; Big team retired
- [ ] Step 3 settings saved (timezone, local computer Never, Auto-review)
- [ ] `/workspace/org/board.md` and `/workspace/loadoff/board.md` exist
- [ ] Fire Cursor taught; Fire Claude taught only if Finch said the window is idle
- [ ] X plugin on Scout; Airtable stays disconnected
- [ ] Each Bot saved and **enabled** its starter skill
- [ ] gogo's listener, Finch's morning line, Scout 16:00 PT, Jeff 8:30pm PT
      each had a Test run

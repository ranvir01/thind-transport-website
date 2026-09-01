# GOGO-START — paste this entire file into live gogo (1:1)

This paste **is** Ranvir's yes for the 14 named seats. Execute it. Do not wait
for a second confirmation. You are the live gogo (TPM of the four-bot **Big
team**); this promotes you to org Chief of Staff and migrates the fleet.
Do not start Cursor or Claude cloud agents yourself — you did in the four-bot
era; that moves to the ICs. Never `git push`. Never merge. Never name the TMS
product — say **the hub** or `thindtransport.com/hub`. Never name which AI
tool wrote any code.

Report back with the checklist at the bottom.

Source of truth in git (this branch, then `main` after PR #42 merges):

`https://github.com/ranvir01/thind-transport-website/tree/cursor/fleet-24-7-liveness-931f/docs/grok-bots`

Raw prefix:

`https://raw.githubusercontent.com/ranvir01/thind-transport-website/cursor/fleet-24-7-liveness-931f/docs/grok-bots/`

---

## 0 · What changed (D-016)

1. **No product code-name.** Group is **Hub**, board is `/workspace/hub/board.md`.
   GitHub labels stay in SPAWN.md for routing — never speak them on LinkedIn or email.
2. **Rav's standing apply loop stays** (owner 2026-08-31: any job in the bar,
   cap 6-7, 36h skip, 4:30am PT alarm) and is now in the paste itself. Auto
   Review still holds outbound email, posts beyond the application form, and spend.
3. **Bee is Cursor-only.** `ranvir01/bls-website` via `cursor.com/agents`. Never
   `claude.ai/code` for BLS. Hub may still Fire Claude when Finch says Max is idle.
4. **Fire Cursor is written, not taught.** ICs clone the last green agent or New
   agent. Optional GitHub `@cursor`. Teach a task is optional after first green.
5. **Scout consumes bookmarks** like the x.ai GTM media rundown: state file
   `_seen.md`, read the post and the link, skip duplicates, copy-paste Labs prompt,
   silent one-liner if nothing new.
6. **Groups get full charters** from GROUPS.md — not one-liners.
7. **Jeff's Airtable click lane is retired** (D-014, owner 2026-08-28). The two
   live Dropbox xlsx are the system of record. The four deployed Airtable
   automations are owner-only leftovers — do not run, propose, or reauth them.
8. **Token discipline** ([Morgan Linton 2026-08-31](https://x.com/morganlinton/status/2094413837290369028)):
   waste is context bloat, not the model. Atomic seats (why 14, not 4 mega-bots).
   Write the spec in the profile — do not interview. Keep 1:1 chats short;
   dispatch big work (Fire Cursor / cloud agent already has the code — never
   clone or grep here). Connectors over screenshot-scraping. Event listeners
   over polling; one repo, not all. Routines daily-max, only when they can act;
   "no updates" still costs tokens — stay silent. Second time you teach a step
   = skill. Finch flags any of the above as a Grok-meter leak.

Research applied: x.ai/bot/guides (PM, GTM, mobile studio, design), Cursor cloud
agent docs (browser + `@cursor` + API), GTM "weekly media rundown" state-file loop,
PM Recruiter seat, PM ICs spinning Cloud Agents, Experiments keep-or-kill, plus
the live-fleet brief (2026-08-31 20:03 PT). Rejected: SSH-tunnel, OpenBot runtime,
Instantly/HeyReach swarm, Notion board, always-allow-the-browser, hourly
attention, a 15th seat without a new yes.

---

## 1 · Migrate the live four, reuse the stub, create nine

Wright executes; you coordinate. **Replace instructions** on the four live
Bots (Bot actions → Edit Profile → Instructions → replace everything → Save).
Their connectors and computer logins survive; their live routines survive a
paste replace — keep the ones marked Keep.

| Live Bot | Id | Becomes | Paste | Keep |
|---|---|---|---|---|
| gogo | `6ad092aa-4a7d-48c8-8c4e-67ac0a3bec0e` | org CoS (HQ) | gogo-cos | Keep routine `github-repo-watch` exactly as is. Stop launching cloud agents yourself. |
| Steve | `54a2dd93-de06-4d88-8da9-d15979b3bd58` | Staff SRE (Hub) | steve-deploy-ci | No routines, unchanged. Vercel ids are now in the paste. |
| Jeff | `9105c474-c273-456f-966a-48fa07d93727` | Head of RevOps (Money) | jeff-revops | Keep all three live routines: `daily-loadboard-scan` 8:30pm PT; `rts-payment-recon` 9pm PT wake / every-other-day recon; `bank-rec-follow-up` one-shot Sep 3 then self-delete. Drop the Airtable section — D-014. |
| Rav (ex-Lin) | `185a267a-406b-4949-96fd-4d62e53dba3d` | Talent Scout (Career) | rav-career-coach | Keep routine `apply-every-2-days` (4:30am PT, cap 6-7, 36h skip). Rav's live LinkedIn profile stays source of truth over old gogo memory. |
| New Bot stub | `58b99189-5f72-4bb4-a01b-5597ae29f529` | **Em** (Hub Eng Mgr) | em-engmgr | Blank profile — rename it to Em and paste. The old "do not use it" note was part of the four-bot freeze that D-015 reversed. If rename is impossible, create Em fresh and delete the stub. |

Then create nine: **Finch, Wright, Scout, Dex, Rex, Labs, Ridge, Bee, My**
(connector table in §3). Retire **Big team** (`5d3c383b-4950-4214-947f-90e58a82007b`)
only AFTER the six new groups exist and everyone is seated.

---

## 2 · Copy pastes onto the Agent Computer

```
mkdir -p /workspace/org/pastes /workspace/org/spawn /workspace/hub /workspace/platform /workspace/loadboard /workspace/career/applications /workspace/labs/ideas /workspace/labs/demos /workspace/clients/bls /workspace/clients/myco
```

Fetch each of these into `/workspace/org/pastes/` (GitHub connector or browser;
reopen the source — memory is not the record):

- gogo-cos.instructions.md
- finch-finops.instructions.md
- wright-botwright.instructions.md
- scout-bookmarks.instructions.md
- em-engmgr.instructions.md
- dex-ic.instructions.md
- rex-ic.instructions.md
- steve-deploy-ci.instructions.md
- jeff-revops.instructions.md
- rav-career-coach.instructions.md
- labs-experiments.instructions.md
- ridge-research.instructions.md
- bee-bls.instructions.md
- my-myco.instructions.md

Also copy `GROUPS.md`, `SETUP.md`, `templates/fire-cursor.md` to
`/workspace/org/` so you can paste group charters without guessing.

Seed empty boards if missing:

- `/workspace/org/board.md` — "idle"
- `/workspace/hub/board.md` — "idle" (Em is the ONLY later writer)
- `/workspace/org/usage.md` — "Finch: fill on first morning line"
- `/workspace/org/models.md` — "Ridge: default bounded PR = Composer/Auto or cursor-grok-4.6-high-fast; launch = clone last green at cursor.com/agents"
- `/workspace/labs/ideas/_seen.md` — "# tweet-id | date | skip|card|ridge | reason"
- `/workspace/career/applications.md` — "# date | company | url | status | proof"

Do **not** invent FACTS.md numbers. Rav reopens `docs/portfolio/FACTS.md` via GitHub.

---

## 3 · Stamp the fourteen (Wright)

Tell Wright: "GOGO-START is the yes. For the four live Bots and the renamed
stub, replace instructions with the matching `/workspace/org/pastes/` file.
Create the other nine. Do not install public templates."

| Bot | File | Connectors to attach | Pin / notify |
|---|---|---|---|
| gogo | gogo-cos.instructions.md | GitHub, Gmail, Calendar (already connected) | pin + notifications |
| Finch | finch-finops.instructions.md | GitHub | notifications |
| Wright | wright-botwright.instructions.md | none | |
| Scout | scout-bookmarks.instructions.md | X read-only | |
| Em (ex-stub) | em-engmgr.instructions.md | GitHub | |
| Dex | dex-ic.instructions.md | GitHub | |
| Rex | rex-ic.instructions.md | GitHub | |
| Steve | steve-deploy-ci.instructions.md | GitHub, Vercel (already connected) | |
| Jeff | jeff-revops.instructions.md | Gmail thindcarrier + atstransport24, Dropbox (already connected) | pin + notifications |
| Rav | rav-career-coach.instructions.md | GitHub; LinkedIn stays browser-based | |
| Labs | labs-experiments.instructions.md | GitHub | |
| Ridge | ridge-research.instructions.md | GitHub | |
| Bee | bee-bls.instructions.md | GitHub (bls-website) | |
| My | my-myco.instructions.md | GitHub (myco-website) | |

If a Bot already exists, **replace instructions** — do not duplicate the seat.

---

## 4 · Create six groups with FULL charters

Create six groups; paste the matching fenced block from GROUPS.md into
**group instructions** (the whole block, not the table row). Add the members.

| Group | Members |
|---|---|
| HQ | gogo, Finch, Wright, Scout |
| Hub | Em, Dex, Rex, Steve |
| Money | Jeff |
| Career | Rav |
| Labs | Labs, Ridge |
| Clients | Bee, My |

Keep Money and Career at one bot. Do not add week-2 Max/Ash/Pete. Retire
**Big team** after everyone is seated.

---

## 5 · Remind Ranvir of settings you cannot click

You cannot change account settings. Ping Ranvir once with this list (SETUP Step 3):

1. Timezone `America/Los_Angeles`
2. Local computer **Never allowed**
3. Auto-review **Require Approval** on: external email, LinkedIn posts/messages
   beyond the application form, git push/merge, Dropbox Replace, purchases,
   production dashboards. Rav's capped Easy Apply batch runs under the standing
   approval of 2026-08-31 — do not add a per-application gate.
4. Plugins: GitHub, Vercel, Gmail, Dropbox, X (Scout). Connector cleanup: the
   duplicate "thind transport" Gmail connector needs reauth or removal; Paper
   CLI shows an error; do NOT reauth Airtable (retired).
5. Enable each Bot's starter skill under Plugins → Yours after the first save.
6. The open-PR merge queue is his (#42 ships these pastes; then #63, #55, #62,
   #61, #59, #58, #57, drafts #64/#60 as he likes).

Password / 2FA / CAPTCHA: hand Ranvir the Agent Computer. Never paste secrets.
Never SSH-tunnel the computer.

---

## 6 · Fire Cursor — tell the ICs, do not demo it yourself

You never start a cloud agent (four-bot-era launches like
`bc-f3a1a042-738d-419c-b84f-c5456f4c8b54` are history). Tell Dex, Rex, Bee
(and Steve if assigned): the SOP is already in your paste and in
`/workspace/org/templates/fire-cursor.md` (or `docs/grok-bots/templates/fire-cursor.md`).
Clone the last green agent on that repo at `cursor.com/agents`, or New agent →
Goal / Files / Done when / Verify. Optional GitHub `@cursor`. Never merge.
Bee: never `claude.ai/code`.

Em may Fire Claude on the **home repo only** when Finch says the Max 5x window
is idle and the ticket is not on the live 9-task fleet.

---

## 7 · Routines (keep the live four; Test-run only what is new)

Already live — keep, do not recreate: gogo `github-repo-watch`; Jeff
`daily-loadboard-scan` + `rts-payment-recon` + `bank-rec-follow-up` (one-shot
Sep 3, self-deletes); Rav `apply-every-2-days`.

New — enable, then **Test run** on desktop:

- Finch: weekday morning usage line
- Scout: weekday 16:00 PT bookmark sweep
- Wright: monthly unused-routine sweep

No hourly attention. If Finch hard-stops (90%), pause routines — do not spawn.

---

## 8 · Report back (this shape, then go silent)

```
GOGO-START
Migrated: gogo/Steve/Jeff/Rav repasted, stub → Em, nine created: yes/no
Live routines kept (gogo 1, Jeff 3, Rav 1): yes/no
Groups posted with full charters: HQ Hub Money Career Labs Clients — yes/no
Big team retired: yes/no
Workspace trees + boards: yes/no
Settings + connector cleanup pinged to Ranvir: yes/no
New routines Test-run (Finch, Scout, Wright): …
Blocked: …
```

Facts / Assumptions / Done / Waiting approval / Unresolved + links.
Frybox, roofing, Tabletop Village, Gadget Fix stay out.

---

## If a file 404s

PR #42 may not be merged yet. Use the `cursor/fleet-24-7-liveness-931f` raw
URLs above. If those 404, ask Ranvir to paste the instruction files from
`docs/grok-bots/*.instructions.md` into this chat and you will write them to
`/workspace/org/pastes/` yourself.

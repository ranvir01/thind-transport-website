# THE FILE — create the other Bots, open group chats, cover every project

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Do not hunt `SPAWN.md` / `GROUPS.md` / `README.md` first. Those are pieces.
This page is the whole job: retitle every Bot with a real job title, create
specialists for LoadOff, BLS, and other `ranvir01` projects, open the group
chats, and stand up the Claude implementation board.

Repo: `github.com/ranvir01/thind-transport-website` (on `main`, or the open fleet PR if this file is not on `main` yet).

You already have a Bot titled Watcher. **Rename it to Technical Program Manager**,
then paste the new instructions. That TPM is ordered to **create the rest**.
Grok never git-pushes. **Claude still writes code** (D-007). D-008: Grok may
spawn project-titled specialists; **Engineering Communications Lead** publishes
what Claude did, is doing, and should do next.

Connectors to start: **Google, GitHub, Dropbox, LinkedIn, Vercel**.

If the Grok app refuses a 5th or 6th named Bot, stop after the priority list
in Step 2 and put leftover product work on TPM + Engineering Communications Lead
until a slot frees.

---

## Standing roster (real job titles)

| Title (exact Bot name) | Job | Paste into Instructions |
|---|---|---|
| **Technical Program Manager** (rename Watcher) | Routes the portfolio. Spawns specialists. Default = LoadOff. | [`watcher.instructions.md`](watcher.instructions.md) |
| **Staff Platform Engineer** | SRE / DevOps: GitHub Actions + Vercel across `ranvir01` | [`vercel-github.instructions.md`](vercel-github.instructions.md) |
| **Revenue Operations Analyst** | AR Payments click paths + Dropbox Excel | [`airtable-coach.instructions.md`](airtable-coach.instructions.md) |
| **Staff Product Engineer (LoadOff)** | Home product: hub, apply funnel, production UX | [`loadoff-engineer.instructions.md`](loadoff-engineer.instructions.md) |
| **Software Engineer (BLS)** | `bls-website` product | [`bls-engineer.instructions.md`](bls-engineer.instructions.md) |
| **Engineering Communications Lead** | Claude liaison. Board: HAPPENED / IN FLIGHT / SHOULD | [`eng-comms.instructions.md`](eng-comms.instructions.md) |

On-demand (TPM creates when a repo or idea is active; **not** added to Staff):

| Title | Job | Paste |
|---|---|---|
| **Software Engineer ({repo})** | Any other `github.com/ranvir01/{repo}` | [`project-engineer.instructions.md`](project-engineer.instructions.md) — replace `REPO` |
| **Venture Analyst ({idea})** | A named business idea with no repo yet | [`venture-analyst.instructions.md`](venture-analyst.instructions.md) — replace `IDEA` |

Old nicknames (Watcher, Deploy / CI, Airtable coach) are retired. Use the titles above in the Grok app.

---

## Group chats (2–6 Bots)

| Group | Members | Covers |
|---|---|---|
| **LoadOff engineering** | TPM + Staff Product Engineer (LoadOff) + Staff Platform Engineer + Engineering Communications Lead | Home repo product + platform + Claude board |
| **BLS engineering** | TPM + Software Engineer (BLS) + Staff Platform Engineer | `bls-website` |
| **Back office** | TPM + Revenue Operations Analyst | Airtable + Dropbox Excel |
| **Claude stand-up** | TPM + Engineering Communications Lead | All implementation: happened / in flight / should |
| **Staff** | the six standing titles only | Cross-project. Do not add `{repo}` SEs here (cap 6) |
| **Engineering — {repo}** | TPM + Software Engineer ({repo}) | One extra project |
| **Venture — {idea}** | TPM + Venture Analyst ({idea}) | One business idea, pre-repo |

---

## Projects this team handles

| Project | Where | Standing owner | Claude |
|---|---|---|---|
| **Thind Transport / LoadOff** (default) | `github.com/ranvir01/thind-transport-website`, `thindtransport.com/hub` | Staff Product Engineer (LoadOff) | Corps writes this git |
| **BLS** | `github.com/ranvir01/bls-website` | Software Engineer (BLS) | paste-ready SHOULD prompt |
| **Other `ranvir01` GitHub** | `github.com/ranvir01/*` | TPM spawns Software Engineer ({repo}) | same |
| **AR Payments** | Airtable `app0RJwxcpO3RS3X7` | Revenue Operations Analyst | only if code/SMTP/cron |
| **Dropbox Excel** | ATS + Thind Master | Revenue Operations Analyst | same |
| **Career search** | LinkedIn: WA hybrid/remote AI-integration roles | TPM — weekly **Career scan** routine (Step 5). Watch and report; never apply, message, or post unless asked | n/a |
| **New business ideas** | anything Ranvir names with no repo yet | TPM spawns Venture Analyst ({idea}) | via SHOULD item once it needs code |

**Out of charter:** Frybox, roofing, Tabletop Village — do not spawn SEs for those.

A later `ranvir01` repo with recent commits is in charter: TPM creates **Software Engineer ({repo})** and group **Engineering — {repo}**. A named business idea with no repo gets **Venture Analyst ({idea})** and group **Venture — {idea}**.

---

## Step 1 — retitle the Watcher and paste TPM instructions

In the Grok Bot app: open the existing Watcher → rename to **Technical Program Manager** → Instructions → replace everything with [`watcher.instructions.md`](watcher.instructions.md) → Save.

That paste orders the TPM to spawn the rest, including project SEs, and to @Engineering Communications Lead on all Claude work.

---

## Step 2 — create the other Bots (or send this to the TPM)

Priority if slots run out: **Engineering Communications Lead first**, then Staff Platform Engineer, Revenue Operations Analyst, Staff Product Engineer (LoadOff), Software Engineer (BLS), then `{repo}` SEs.

Either create them yourself, **or** send the TPM this block (same as [`SPAWN.md`](SPAWN.md)):

```
Rename yourself to Technical Program Manager if you have not. Create these sibling Grok Bots with the exact titles. Paste each instructions file from github.com/ranvir01/thind-transport-website docs/grok-bots/. Claude still writes git. You never git push.

1. Staff Platform Engineer — vercel-github.instructions.md — connectors GitHub, Vercel.
2. Revenue Operations Analyst — airtable-coach.instructions.md
3. Staff Product Engineer (LoadOff) — loadoff-engineer.instructions.md
4. Software Engineer (BLS) — bls-engineer.instructions.md
5. Engineering Communications Lead — eng-comms.instructions.md — Claude liaison; do not skip.

Then look at github.com/ranvir01 for other repos with recent activity. Skip thind-transport-website, bls-website, Frybox, roofing, Tabletop Village. For each remaining repo, create Software Engineer (REPO) from project-engineer.instructions.md (replace REPO). When Ranvir names a business idea with no repo, create Venture Analyst (IDEA) from venture-analyst.instructions.md (replace IDEA).

If the product refuses another named Bot, stop and list who is missing. Confirm titles, connectors, and stop.
```

---

## Step 3 — open the group chats

Grok groups hold 2–6 Bots. They @mention and hand off so you are not the router.

**Desktop:** sidebar **New** → **New chat** → select the Bots for that group → open → rename.  
**iPhone:** **+** → **New Group Chat** → select the Bots → rename.

Create these (names matter):

1. **LoadOff engineering** — TPM + Staff Product Engineer (LoadOff) + Staff Platform Engineer + Engineering Communications Lead
2. **BLS engineering** — TPM + Software Engineer (BLS) + Staff Platform Engineer
3. **Back office** — TPM + Revenue Operations Analyst
4. **Claude stand-up** — TPM + Engineering Communications Lead
5. **Staff** — all six standing titles
6. **Engineering — {repo}** — one per extra project SE the TPM created
7. **Venture — {idea}** — one per Venture Analyst the TPM created

---

## Step 4 — first message in each group (paste once)

### LoadOff engineering

```
@Technical Program Manager route. @Staff Product Engineer (LoadOff) own github.com/ranvir01/thind-transport-website and LoadOff at thindtransport.com/hub. @Staff Platform Engineer own GitHub Actions and Vercel. @Engineering Communications Lead own the Claude board: HAPPENED / IN FLIGHT / SHOULD, plus paste-ready Claude prompts. Never git push. @everyone only if production is red. Connectors first: Google, GitHub, Dropbox, LinkedIn, Vercel.
```

### BLS engineering

```
@Software Engineer (BLS) own github.com/ranvir01/bls-website. @Staff Platform Engineer own Actions and Vercel for that project. @Technical Program Manager route. Code/tests/features: @Engineering Communications Lead with a SHOULD prompt (goal + files + done when). Never git push.
```

### Back office

```
@Technical Program Manager own Dropbox Excel Master (ATS + Thind) and routing. @Revenue Operations Analyst own Airtable app0RJwxcpO3RS3X7 click paths (≤6 steps, computer not phone). Never tick Highlight. Never rearrange views. Never Omni prompts. If a fix needs code, @Engineering Communications Lead. @everyone only if invoice counters or the 1,000-record cap are broken.
```

### Claude stand-up

```
This thread is the implementation board. @Engineering Communications Lead: post HAPPENED (what Claude/Cursor/drain already landed, with PR or sha), IN FLIGHT (open claude/* and cursor/* , red Actions, failed Vercel), and SHOULD (one paste-ready Claude prompt: Goal / Files / Done when). @Technical Program Manager routes. Cover LoadOff first, then BLS, then other ranvir01 repos. OWNER-WORKSHEET items (Form 2290, SMTP, Airtable billing) stay human — do not put those on Claude. Never git push. Never nag. Silence when nothing changed.
```

### Staff

```
Staff is the six standing roles: Technical Program Manager, Staff Platform Engineer, Revenue Operations Analyst, Staff Product Engineer (LoadOff), Software Engineer (BLS), Engineering Communications Lead. Do not add Software Engineer ({repo}) here — those get their own Engineering — {repo} group (6-Bot cap). Default: Thind Transport / LoadOff. Also: bls-website, other ranvir01 repos, Dropbox Excel, LinkedIn career (no posting unless asked). Claude writes git. Engineering Communications Lead publishes every implementation that happened, is in flight, or should happen. One owner per stage. Never git push. Come back only for Form 2290, SMTP, Airtable billing, Cursor Untitled.
```

---

## Step 5 — make each Bot durable (skills, routines, memory)

This is how the same six Bots get more useful without adding more Bots
(xAI docs: [bots](https://docs.x.ai/grok-bot/bots), [computer](https://docs.x.ai/grok-bot/computer-and-apps), [FAQ](https://docs.x.ai/grok-bot/faq)).

**One computer.** Every Bot on the account shares one persistent cloud computer —
files, browser sessions, and command-line logins. Sign in once (GitHub, Vercel,
Airtable, Google, Dropbox, LinkedIn) and the whole roster can use it. Do not
treat separate Bots as a security boundary. Prefer a connector over browser
clicking; in chat, `@` attaches a connector to the task and `/` runs a saved
skill. Durable shared notes live in `/workspace/` on that computer (the venture
pages use `/workspace/ventures/`).

**Memory.** A Bot retains stable preferences and role context — not changing
facts. The repo is the record: before any consequential answer, Bots reopen
`docs/ops/FLEET.md`, `docs/ops/OWNER-WORKSHEET.md`, and the live dashboard, and
say so. Correct a stale assumption the moment you see one. Durable boundaries
("never git push", "never spend money") belong in the Bot **description**;
task detail stays in chat messages.

**Skills.** Run a job by hand once, correct it until the output is right, then
reply "save this method as a skill" naming all six parts: when to use it,
required inputs and access, the sequence, how to validate, what to return, what
requires approval. Starter skills (one corrected run first — never save untested):

| Bot | Skill to save |
|---|---|
| Engineering Communications Lead | **Claude stand-up board** — read `ranvir01` commits/PRs + Vercel since the last board; return HAPPENED / IN FLIGHT / SHOULD with one paste-ready Claude prompt |
| Staff Platform Engineer | **Portfolio platform sweep** — home repo Actions + Vercel, then BLS, then other `ranvir01`; return reds only, each with a URL |
| Revenue Operations Analyst | **Airtable click path** — one job, ≤6 numbered steps, computer not phone. When **Teach a task** is offered, record the ≤10-min browser demo and save the draft skill it produces |
| Staff Product Engineer (LoadOff) | **Hub bug file** — failing URL + expected vs actual + suspected files, ready for the SHOULD board |
| Technical Program Manager | **Career scan** — LinkedIn WA hybrid/remote AI-integration roles; return top 5 links + one-line fit each; never apply or message |

**Routines.** Set the time zone first (Settings → General → Agent →
`America/Los_Angeles`). Run the skill once by hand, then "make this a routine"
with all five details: schedule + time zone, input source, what to return, the
approval boundary, and — on a missing source — **report and stop** (never retry
in a loop). Grok quota is scarcer than Claude's (D-007), so exactly four
standing routines; adding one means retiring one:

| Routine | Bot | Schedule (PT) | Returns |
|---|---|---|---|
| Claude stand-up board | Engineering Communications Lead | daily 07:30 | board update, or silence when nothing changed |
| Portfolio platform sweep | Staff Platform Engineer | daily 07:00 | reds only; silence when green |
| Dropbox backup reminder | Revenue Operations Analyst | Fri 09:00 | one reminder that the LOADS-BACKUP CSV is due |
| Career scan | Technical Program Manager | Mon 09:00 | top 5 role links + fit; no applications |

Every skill and routine keeps writes, spends, sends, and posts behind your
approval — a routine inherits its Bot's blocked actions.

---

## Done when

- [ ] Existing Watcher renamed to **Technical Program Manager**; instructions = `watcher.instructions.md`
- [ ] Bots exist with the five other standing titles (Platform, RevOps, LoadOff PE, BLS SE, Eng Comms)
- [ ] Engineering Communications Lead has posted (or is ready to post) HAPPENED / IN FLIGHT / SHOULD in **Claude stand-up**
- [ ] TPM created **Software Engineer ({repo})** for other active `ranvir01` repos (or listed none)
- [ ] Groups exist and got the first messages above
- [ ] Connectors signed in: Google, GitHub, Dropbox, LinkedIn, Vercel
- [ ] Time zone set to `America/Los_Angeles`; the four Step-5 routines created after one corrected hand run each
- [ ] Each Bot saved its starter skill; RevOps recorded the first **Teach a task** click path (when the feature is offered)

After this, you do not need to come back to a Cursor agent for Grok setup. Code work still lands in Claude (or a Cursor session). Dated human items stay on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).

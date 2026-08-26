# THE FILE — create the other Bots, open group chats, cover every project

**This is that file.** Path: `docs/grok-bots/SETUP.md`

Do not hunt `SPAWN.md` / `GROUPS.md` / `README.md` first. Those are pieces.
This page is the whole job: create the other Bots, open the three group chats,
and tell the team which projects they own (Thind Transport / LoadOff plus
the rest of the portfolio).

Repo: `github.com/ranvir01/thind-transport-website` (on `main`, or the open fleet PR if this file is not on `main` yet).

You already have a Watcher. This walkthrough creates the other two Bots, opens
the three group chats, and lists every project that team handles. Code still
goes to **Claude** (D-007 — more usage there). Grok never git-pushes. Roster
stays **three named Bots**, not a swarm.

Connectors to start: **Google, GitHub, Dropbox, LinkedIn, Vercel**.

---

## What you end up with

| Named Bot | Job | Paste into that Bot's Instructions |
|---|---|---|
| **Watcher** (exists) | Routes the portfolio. Default = Thind Transport / LoadOff. Other `ranvir01` GitHub, LinkedIn. Hands code to Claude. | [`watcher.instructions.md`](watcher.instructions.md) |
| **Deploy / CI** (create) | GitHub Actions + Vercel across `ranvir01` repos | [`vercel-github.instructions.md`](vercel-github.instructions.md) |
| **Airtable coach** (create) | AR Payments click paths + Dropbox Excel | [`airtable-coach.instructions.md`](airtable-coach.instructions.md) |

| Group chat (2–6 Bots) | Members | Covers |
|---|---|---|
| **LoadOff ops** | Watcher + Deploy / CI | Home repo, other GitHub, Vercel |
| **Back office** | Watcher + Airtable coach | Airtable + Dropbox Excel |
| **Big team** | all three | Anything that crosses watch + deploy + money |

---

## Projects this team handles (everything in charter)

| Project | Where | Which group | What Grok does |
|---|---|---|---|
| **Thind Transport / LoadOff** (default) | `github.com/ranvir01/thind-transport-website`, `thindtransport.com/hub` | LoadOff ops, Big team | Watch CI, Vercel, CRON, SMTP, Form 2290. Code → Claude paste. |
| **Other `ranvir01` GitHub** | `github.com/ranvir01/*` including `bls-website` | LoadOff ops, Big team | File findings. Never write anyone's `main`. Code → Claude paste. |
| **AR Payments** | Airtable `app0RJwxcpO3RS3X7` | Back office, Big team | Click paths ≤6 steps. Never tick Highlight. |
| **Dropbox Excel** | ATS + Thind Master | Back office, Big team | Watch; hand clicks to Airtable coach. |
| **LinkedIn career** | WA hybrid/remote AI-integration roles | Watcher (any group) | Watch. Do not post unless asked. |

**Out of charter (do not watch):** Frybox, roofing, Tabletop Village.

A later project under `ranvir01` is already in scope — file it in LoadOff ops
or Big team. Do not create a fourth named Bot for it.

---

## Step 1 — update the Watcher (one paste)

Open the Watcher → Instructions → replace everything with the full text of
[`watcher.instructions.md`](watcher.instructions.md) → Save.

That file already includes group-chat rules, other projects, and HAND TO CLAUDE.

---

## Step 2 — create the other two Bots

Either do it yourself in the Grok Bot app, **or** send the Watcher this whole
block (same as [`SPAWN.md`](SPAWN.md)):

```
Create two sibling Grok Bots. Do not invent extra named ones. Cap: three named Bots including you. Extra code/prompt work goes to Claude (D-007).

1. Name: Deploy / CI. Instructions: paste the full text of docs/grok-bots/vercel-github.instructions.md from github.com/ranvir01/thind-transport-website. Connectors: GitHub, Vercel first.

2. Name: Airtable coach. Instructions: paste the full text of docs/grok-bots/airtable-coach.instructions.md from the same repo.

Then confirm the three names, list which connectors are signed in, and stop. Do not create a fourth Bot. Do not git push.
```

If you create them yourself: New Bot → name → paste the matching `*.instructions.md` → connect GitHub+Vercel on Deploy / CI.

---

## Step 3 — open the three group chats

Grok groups hold 2–6 Bots. They @mention and hand off so you are not the router.

**Desktop:** sidebar **New** → **New chat** → select the Bots for that group → open → rename.  
**iPhone:** **+** → **New Group Chat** → select the Bots → rename.

Create exactly these three (names matter):

1. **LoadOff ops** — select Watcher + Deploy / CI
2. **Back office** — select Watcher + Airtable coach
3. **Big team** — select Watcher + Deploy / CI + Airtable coach

Do not add a fourth Bot to Big team.

---

## Step 4 — first message in each group (paste once)

### LoadOff ops

```
@Watcher own the portfolio default: github.com/ranvir01/thind-transport-website, LoadOff at thindtransport.com/hub, other ranvir01 repos after that. @Deploy/CI own GitHub Actions and Vercel. Hand off in this thread; one owner per stage. Never git push, never merge, never rewire Cursor/Claude. @everyone only if production is red. Connectors first: Google, GitHub, Dropbox, LinkedIn, Vercel. Code/tests/features: Watcher posts a short paste-ready Claude prompt and stops.
```

### Back office

```
@Watcher own Dropbox Excel Master (ATS + Thind) and routing. @Airtable coach own Airtable app0RJwxcpO3RS3X7 click paths (≤6 steps, computer not phone). Never tick Highlight. Never rearrange views. Never Omni prompts. Hand off in this thread; one owner per stage. @everyone only if invoice counters or the 1,000-record cap are broken.
```

### Big team

```
This is the big team — all three standing Bots. Do not add a fourth Bot (D-007: extra prompt/code work goes to Claude). @Watcher routes. @Deploy/CI takes GitHub/Vercel. @Airtable coach takes AR Payments clicks. Default: Thind Transport / LoadOff. Also: other ranvir01 repos (bls-website), Dropbox Excel, LinkedIn career (no posting unless asked). Code/tests/features: Watcher posts a short paste-ready Claude prompt and stops. One owner per stage. Never git push. @everyone sparingly. Come back only for Form 2290, SMTP, Airtable billing, Cursor Untitled.
```

---

## Done when

- [ ] Watcher Instructions = `watcher.instructions.md`
- [ ] Bots named **Deploy / CI** and **Airtable coach** exist
- [ ] Three groups exist and got the first messages above
- [ ] Connectors signed in: Google, GitHub, Dropbox, LinkedIn, Vercel
- [ ] No fourth named Bot

After this, you do not need to come back to a Cursor agent for Grok setup. Code work still lands in Claude (or a Cursor session). Dated human items stay on [`docs/ops/OWNER-WORKSHEET.md`](../ops/OWNER-WORKSHEET.md).

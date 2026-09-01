# Grok Bot research — what we took, what we rejected

Dated **2026-08-28** (four-bot freeze), **2026-09-01** (D-015 14-seat org), and
**2026-09-01 evening** (D-016: Hub rename, Rav apply, Bee Cursor-only, written
Fire Cursor, full group charters, GOGO-START).

The 08-28 took/reject list still applies for product limits (one computer,
≤4000, never SSH-tunnel, Gmail PDF bytes). D-015 reversed the roster ceiling
and the “Ranvir clicks” rule. D-016 reverses the product code-name in bot
chat, the Rav never-outreach rule, the BLS Claude-Code path, and the
teach-a-task-as-gate rule.

## Sources read

| Source | What it actually is |
|---|---|
| [docs.x.ai/grok-bot/overview](https://docs.x.ai/grok-bot/overview) and the rest of the official book (bots, computer, skills/routines, chat, files, approvals, settings, mobile, FAQ, use-cases, get-started) | Canonical product. Last-updated dates on the pages: 11–22 Aug 2026. |
| [Avi / Daily Dose masterclass](https://www.dailydoseofds.com/p/grok-bot-masterclass/) (the [x.com/av1dlive](https://x.com/av1dlive/status/2092923553557746047) post is Avi pointing at this) | Same product, office-analogy: one computer, many desks, one set of keys. |
| [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot) | Community index. Official docs, field cases, forum failure modes. |
| [usegrokbot.com](https://usegrokbot.com/) | Workflow library. One popular post is an SSH-tunnel jailbreak of the cloud VM. |
| [botdirectory.ai](https://botdirectory.ai/) | Prompt directory. CoS, Talent Scout, extra multi-bot teams. |
| [x.ai/bot/guides](https://x.ai/bot/guides) | How I run multiple teams; PM; GTM; mobile studio; designing Grok Bot. |
| [Cursor cloud agents](https://cursor.com/docs/cloud-agent) + [API](https://cursor.com/docs/cloud-agent/api/endpoints) | Browser / GitHub `@cursor` / Slack / Linear / POST `/v1/agents`. |
| [x.ai GTM weekly media rundown](https://x.ai/bot/guides/grok-bot-for-gtm) | State file of already-covered items; consume the content; silent one-liner. |
| Incremental bookmark digest (OpenClaw x-bookmarks skill pattern) | ID-level seen list; pair every keep with an agent action. Pattern only — not a second runtime. |

## Took (now in SETUP.md + the fourteen pastes)

From **official docs** (highest weight):

- Description = durable rules; chat = this task. Safety boundaries live in the paste.
- One shared computer; **Bots are not a security boundary**. Sign in once.
- Prefer a **connector**; browser is the fallback. `@` connector, `/` skill.
- Durable files in **`/workspace`** with project folders. Group handoffs are
  **text-only** — put artifacts on disk, images in 1:1, not in Big team.
- **Memory is not the record.** Reopen the source. Five-part result when it
  matters: Facts / Assumptions / Done / Waiting approval / Unresolved + links.
- Skill (6 parts) → **Test run** → routine. Event triggers stay **narrow**
  (gogo's pr-opened / pr-merged / ci-failed — not “every GitHub notification”).
- **Teach a task** ≤10 min, no secrets on screen; the recording is a draft.
  D-016: it is optional after first green, not a gate. The written SOP is the teach.
- **Takeover** for password / 2FA / CAPTCHA / payment. Never paste secrets in
  chat. Secure secret card when the product offers it.
- **Auto Review:** Require Approval on send / post / git push / overwrite /
  purchase / LinkedIn apply. Local computer: **Never allowed**.
- Pin gogo + Jeff; notifications on gogo + Jeff + Finch. iPhone can
  approve and take over; routine Test run stays desktop.
- Official use-cases: Chief of Staff + coordinator → gogo; Product Performance /
  Bug Reproduction → Steve; Expense Manager analog → Jeff; Talent Scout → Rav
  (now with the PM-guide Recruiter loop: hunt AND apply).
- Do not share these Bots (public link exposes the description).

From **masterclass**: office analogy, connector-over-browser, takeover, `/workspace`
as the filing cabinet, skill then routine, never treat desks as locks.

From **awesome-grok-bot** (field + forum, the useful ones):

- Orchestrator + named specialists, one owner per stage (Farzad / n2parko).
- Scout vs ship, review before any PR — gogo dispatches, ICs Fire Cursor, Grok
  never merges, Steve never implements unless assigned.
- Human confirm before money moves (Gergely / Stripe field case).
- **Gmail connector lists attachment metadata only — it cannot download PDF
  bytes** ([forum 169261](https://forum.cursor.com/t/grok-bot-gmail-connector-can-list-attachments-but-cannot-download-their-bytes/169261)).
  Jeff must open Gmail in the **browser** to read rate-con PDFs.
- Usage can spill into paid On-Demand with no warning — Finch 70/90; do not
  add bots or routines during a hard-stop.
- Full transcript is sent every turn (no compact) — keep pastes and group
  messages short; group charters are still full, not one-liners, because a
  missing charter is how ICs wait to be taught.
- Login tasks must **hand the computer**, not guess passwords.

From **botdirectory.ai**: Talent Scout / CoS / ops-invoice shapes. Copied the
job pattern, not the extra seats.

## Rejected (do not paste, do not spawn)

- **A 15th Bot or extra group** from botdirectory, rosterroom, botteams, or
  “Chief of Staff” as a second org-wide seat. Usage. D-015 is the named
  ceiling; D-016 does not raise it.
- **usegrokbot.com SSH / bore / cloudflared tunnel** of the Agent Computer.
  Out of charter; if a Bot proposes it, stop.
- Broad listeners (“every new email”, “every GitHub notification”).
- Public share links for these Bots (internal URLs, company Gmail, Dropbox).
- **Grok calling `api.cursor.com` without a secret card.** Browser first;
  GitHub `@cursor` second; API only if Finch/Ranvir already placed a key.
  (08-28 rejected “Grok starts Cursor at all”; D-015 reversed that for ICs.)
- Local-computer execution, always-allow-the-browser Auto Review, installing
  random marketplace skills that send or spend.
- Teaching the Bot to Replace Dropbox files or tick Airtable Highlight.
- **Instantly / HeyReach / Clay GTM swarms** ([bcharleson/grokbot-for-gtm](https://github.com/bcharleson/grokbot-for-gtm)).
  Too much outbound infra. Rav applies in the browser with Auto Review.
- **Naming the TMS product** (or which model wrote the code) in bot chat,
  LinkedIn, or email. Software is still under development.
- OpenBot or Notion as a second orchestrator. OpenBot remains a **pattern**
  (handoff-as-file) only.

## Took 2026-09-01 (D-015 — 14-seat org)

Owner asked to go all-out with Grok Bot on Cursor Ultra ($200) + Claude Max 5x
($100). Sources: the nine X posts plus official `x.ai/bot/guides`.

| Source | Took | Rejected |
|---|---|---|
| [XFreeze → x.ai/bot/guides](https://x.ai/bot/guides) | One channel + roster per project; 6-part anatomy (job, connections, computer, routines, skills, handoffs) | Notion as the board |
| [Mobile studio](https://x.ai/bot/guides/grok-bot-for-mobile-app-development) | Written 6-part job IS the teach; overnight handoffs; one owner per finding; Teach a task for click-paths APIs cannot do | Buying media without Ranvir |
| [sairahul1](https://x.com/sairahul1/status/2089995692874068433) | Role = a job; Ultra unlocks Grok Bot; up to 50 | Treating 50 as a day-1 target |
| [0xcodez / lingxi](https://x.com/lingxi/status/2094493172516966781) + [design guide](https://x.ai/bot/guides/designing-grok-bot-with-grok-bot) | Labs experiments seat; make it tangible before the roadmap | Shipping every experiment; productizing Career OS here (#67) |
| [0xcarnagee](https://x.com/0xcarnagee/status/2093861750416265686) | 15–25 bots, CoS routes — we ship 14 | 25 always-on routines day one |
| [mattyp Templates](https://x.com/mattyp/status/2094046731143164207) | Author our own templates | Random public templates |
| [saboo / OpenBot](https://github.com/CopilotKit/openbot) | Handoff-as-file, recording | OpenBot as a second runtime |
| [PM guide](https://x.ai/bot/guides/grok-bot-for-pms) | CoS + EM (does not code) + ICs who spin Cloud Agents; Recruiter hunts AND manages the loop; Friday offload retro | Five hub ICs day one |
| [GTM guide](https://x.ai/bot/guides/grok-bot-for-gtm) | gogo proposes bots; anti-slop; clean unused routines; prospecting overnight with a morning review list; media rundown state file | Company LinkedIn/X posting; Instantly swarm |
| [Morgan Linton token thread](https://x.com/morganlinton/status/2094413837290369028) | Waste is context bloat not the model; atomic seats; write the spec in the profile (don't interview); keep 1:1 short and dispatch big work; cloud agents already have the code (never clone/grep on Grok); connectors over screenshot-scraping; event listeners over polling, one repo not all; routines daily-max and only when they can act; "no updates" still costs tokens; second teach = skill | Mega-bots; hourly polling; screenshot-walking a site for data; Grok implementing a PR in-thread |
| Live-fleet brief (owner paste, 2026-08-31 20:03 PT) | Jeff's proven RTS recon (every-other-day, columns L–P, real RTS fee), Chrome/deep-link discipline, Paid-Status-formula rule; Rav's standing-approval loop (any job in the bar, cap 6-7, 36h skip, 4:30am PT) and locked resume/LinkedIn rules; Steve's Vercel ids; blank "New Bot" stub reused as Em; the five live routines survive the migration | Jeff's Airtable click lane (D-014 retired it); Big team as the only channel; gogo launching cloud agents herself; a per-application Auto Review gate on the capped apply batch |

Also took: Finch 70/90 governor so Ultra/Max/Grok meters are used hard and not
blown; Fire Cursor / Fire Claude (reverses D-011 click rule); Wright
spawn-after-yes (14 seats via GOGO-START); Scout bookmark → Labs demo factory;
Ridge model cards.

## Took 2026-09-01 evening (D-016 — applied onto every paste)

| Source | Applied where |
|---|---|
| GTM **weekly media rundown** (state file, consume content, silent if nothing new) | Scout `_seen.md` + “read the post AND the link” + one-line end |
| Bookmark digest (ID-level seen, action on every keep) | Scout card includes a copy-paste Labs prompt (Goal / Files / Done when / Verify) |
| PM **Recruiter** + GTM **prospecting overnight** + live standing approval (owner 2026-08-31) | Rav keeps the live loop: `apply-every-2-days` 4:30am PT, cap 6-7, 36h skip, forced-lie skip bar, locked resume/LinkedIn — now written into the paste so a re-paste cannot lose it |
| PM **eng ICs spin Cloud Agents** + Cursor docs (browser, `@cursor`, API) | `templates/fire-cursor.md` + Dex/Rex/Bee/Steve pastes. Browser default. API only with a secret card. No wait for Teach a task |
| Mobile studio **written job = teach**; handoffs without routing through the owner | Group **full** charters; GOGO-START executes the 14 without a second yes |
| Design **Experiments** | Labs keep-or-kill unchanged; Scout must send a runnable prompt, not a recap |
| Owner: software still under development | Strip the TMS product code-name from every bot body; group **Hub**; `/workspace/hub/board.md` |
| Owner: BLS fully Cursor | Bee never opens `claude.ai/code` |
| Owner: give the start pack to live gogo | `GOGO-START.md` is owner-yes for the 14; it migrates the live four (ids in the pack), reuses the blank stub as Em, and keeps the five live routines |

## Finalize 2026-09-01 — split vs not (token audit of the live + planned roster)

Morgan's "more bots, smaller units" applies **until** a second bot would share
a write lock or split an end-to-end outcome.

| Seat | Split further? | Why |
|---|---|---|
| gogo | No | Event listener on one repo is already cheap. Dispatch, don't implement. |
| Finch / Wright / Scout / Ridge / Labs | No | Already atomic. |
| Em / Dex / Rex / Steve | No | EM vs IC vs SRE already split; Dex/Rex already split by lane. |
| Bee / My | No | Already one site each. |
| **Jeff** | **No — skills, not a seat** | Scan and recon share the two live xlsx. Two writers on one sheet is worse than context bloat. Isolate via skills "Loadboard entry" / "RTS recon" and `last-scan.md` / `last-recon.md`. Rek stays week-2 bench only. |
| **Rav** | **No** | Hunt + tailor + apply is one end-to-end outcome (xAI: one bot per outcome). Apply run loads Fit check + Apply packet only — does not rewrite LinkedIn. |
| 15th seat as a token fix | **No** | Finch: a 15th seat is not a token fix. Owner yes still required. |

Still rejected: SSH-tunnel jailbreak, always-allow-the-browser, Dropbox
Replace, Airtable, Notion hub, LangGraph/CrewAI, extra Grok on-demand without
saying so, hourly attention until week 2, Instantly/HeyReach, a 15th seat
without a new yes, splitting Jeff or Rav to save tokens.

## What this does not change

Claude Corps still writes scheduled git (9 tasks) on the **home repo**. Cursor
cloud agents still land PRs that Grok never merges. The four scheduled Cursor
builders (office / driver / tests / integrations) stay owner-import via
`docs/ops/CURSOR-START.md` — they write `claude/lane-*` and are not Fire Cursor.
Human-only: SMTP, Form 2290,
AR Payments bank, plan purchases, Grok pastes (unless GOGO-START is doing the
in-app stamp), Cursor dashboard imports, `should` labels, merges, yes to each bot
**beyond** the 14.
GitHub `venture:*` labels in this repo are routing tokens, not words for chat.

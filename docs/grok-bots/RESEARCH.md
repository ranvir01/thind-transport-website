# Grok Bot research — what we took, what we rejected

Dated **2026-08-28** (four-bot freeze) and **2026-09-01** (D-015 14-seat org).
The 08-28 took/reject list still applies for product limits (one computer,
≤4000, never SSH-tunnel, Gmail PDF bytes). D-015 reverses the roster ceiling
and the “Ranvir clicks” rule.

## Sources read

| Source | What it actually is |
|---|---|
| [docs.x.ai/grok-bot/overview](https://docs.x.ai/grok-bot/overview) and the rest of the official book (bots, computer, skills/routines, chat, files, approvals, settings, mobile, FAQ, use-cases, get-started) | Canonical product. Last-updated dates on the pages: 11–22 Aug 2026. |
| [Avi / Daily Dose masterclass](https://www.dailydoseofds.com/p/grok-bot-masterclass/) (the [x.com/av1dlive](https://x.com/av1dlive/status/2092923553557746047) post is Avi pointing at this) | Same product, office-analogy: one computer, many desks, one set of keys. |
| [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot) | Community index (165 entries). Official docs, field cases, forum failure modes. |
| [usegrokbot.com](https://usegrokbot.com/) (`/e` 404s — the library lives at the root) | Workflow library. One popular post is an SSH-tunnel jailbreak of the cloud VM. |
| [botdirectory.ai](https://botdirectory.ai/) | Prompt directory. Popular listings: Chief of Staff, Talent Scout, Email Purger, extra multi-bot teams. |

## Took (now in SETUP.md + the four pastes)

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
- **Takeover** for password / 2FA / CAPTCHA / payment. Never paste secrets in
  chat. Secure secret card when the product offers it.
- **Auto Review:** Require Approval on send / post / git push / overwrite /
  purchase. Local computer: **Never allowed**.
- Pin the four; notifications on gogo + Jeff (needs-attention). iPhone can
  approve and take over; Teach a task and routine Test run stay desktop.
- Official use-cases mapped onto the four we already have, not new seats:
  Chief of Staff + coordinator → gogo; Product Performance / Bug Reproduction
  → Steve; Expense Manager analog → Jeff; Talent Scout → Rav.
- Do not share these Bots (public link exposes the description).

From **masterclass**: office analogy, connector-over-browser, takeover, `/workspace`
as the filing cabinet, skill then routine, never treat desks as locks.

From **awesome-grok-bot** (field + forum, the useful ones):

- Orchestrator + named specialists, one owner per stage (Farzad / n2parko) —
  already the four-bot shape.
- Scout vs ship, review before any PR (Grok Ship / HAEGONG profiles) — gogo
  dispatches, Ranvir fires the Cursor agent, Grok never merges, Steve never
  implements.
- Human confirm before money moves (Gergely / Stripe field case).
- **Gmail connector lists attachment metadata only — it cannot download PDF
  bytes** ([forum 169261](https://forum.cursor.com/t/grok-bot-gmail-connector-can-list-attachments-but-cannot-download-their-bytes/169261)).
  Jeff must open Gmail in the **browser** to read rate-con PDFs.
- Usage can spill into paid On-Demand with no warning — keep silent-unless-changed;
  do not add bots or routines.
- Full transcript is sent every turn (no compact) — keep pastes and group
  messages short.
- Login tasks must **hand the computer**, not guess passwords.

From **botdirectory.ai**: Talent Scout / CoS / ops-invoice shapes. Copied the
job pattern, not the extra seats.

## Rejected (do not paste, do not spawn)

- **Any extra Bot or group** from botdirectory, rosterroom, botteams, or
  “Chief of Staff” as a fifth seat. Usage. D-010 is the ceiling.
- **usegrokbot.com SSH / bore / cloudflared tunnel** of the Agent Computer.
  That is a jailbreak of a shared VM that holds Gmail, Dropbox, and GitHub.
  Out of charter; if a Bot proposes it, stop.
- Broad listeners (“every new email”, “every GitHub notification”).
- Public share links for these four (internal URLs, company Gmail, Dropbox).
- Letting Grok Bot **start** Cursor cloud agents itself (those burn Cursor
  usage — [forum 169160](https://forum.cursor.com/t/query-about-grok-bot-cursor-agent-usage-and-model-selection/169160)).
  gogo writes the paste; Ranvir clicks.
- Local-computer execution, always-allow-the-browser Auto Review, installing
  random marketplace skills that send or spend.
- Teaching the Bot to Replace Dropbox files, tick Airtable Highlight, or apply
  to jobs.

## Took 2026-09-01 (D-015 — 14-seat org)

Owner asked to go all-out with Grok Bot on Cursor Ultra ($200) + Claude Max 5x
($100). Sources: the nine X posts plus official `x.ai/bot/guides`.

| Source | Took | Rejected |
|---|---|---|
| [XFreeze → x.ai/bot/guides](https://x.ai/bot/guides) | One channel + roster per project; 6-part anatomy (job, connections, computer, routines, skills, handoffs) | Notion as the board |
| [Mobile studio](https://x.ai/bot/guides/grok-bot-for-mobile-app-development) | Teach-a-task click-paths; overnight handoffs; one owner per finding | Buying media without Ranvir |
| [sairahul1](https://x.com/sairahul1/status/2089995692874068433) | Role = a job; Ultra unlocks Grok Bot; up to 50 | Treating 50 as a day-1 target |
| [0xcodez / lingxi](https://x.com/lingxi/status/2094493172516966781) + [design guide](https://x.ai/bot/guides/designing-grok-bot-with-grok-bot) | Labs experiments seat | Shipping every experiment; productizing Career OS here (#67) |
| [0xcarnagee](https://x.com/0xcarnagee/status/2093861750416265686) | 15–25 bots, CoS routes — we ship 14 | 25 always-on routines day one |
| [mattyp Templates](https://x.com/mattyp/status/2094046731143164207) | Author our own templates | Random public templates |
| [saboo / OpenBot](https://github.com/CopilotKit/openbot) | Handoff-as-file, recording | OpenBot as a second runtime |
| [PM guide](https://x.ai/bot/guides/grok-bot-for-pms) | CoS + EM (does not code) + ICs who Fire Cursor; Friday offload retro | Five LoadOff ICs day one |
| [GTM guide](https://x.ai/bot/guides/grok-bot-for-gtm) | gogo proposes bots; anti-slop; clean unused routines | LinkedIn/X posting; GTM swarm |

Also took: Finch 70/90 governor so Ultra/Max/Grok meters are used hard and not
blown; Fire Cursor / Fire Claude teach-a-task (reverses D-011 click rule);
Wright spawn-after-yes; Scout bookmark → Labs demo factory; Ridge model cards.

Still rejected: SSH-tunnel jailbreak, always-allow-the-browser, Dropbox
Replace, Airtable, Notion hub, LangGraph/CrewAI, extra Grok on-demand without
saying so, hourly attention until week 2.

## What this does not change

Claude Corps still writes scheduled git (9 tasks). Cursor cloud agents still
land PRs that Grok never merges. Human-only: SMTP, Form 2290, AR Payments bank,
plan purchases, Grok pastes, `should` labels, merges, yes to each new bot.

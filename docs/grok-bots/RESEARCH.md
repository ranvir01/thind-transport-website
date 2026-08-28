# Grok Bot research — what we took, what we rejected

Dated **2026-08-28**. Applied to the **live four** (gogo, Steve, Jeff, Rav — one
Big team group). No extra bots. Sources the owner named, plus the official docs
those pages point at.

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

## What this does not change

Four bots. One group. Two routines (gogo's GitHub listener, Jeff's 8:30pm PT
loadboard). Claude Corps still writes scheduled git. Cursor cloud agents still
take bounded PRs. Human-only: SMTP, Form 2290, Airtable billing.

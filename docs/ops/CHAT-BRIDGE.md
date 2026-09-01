# Chat bridge — can a Managed Agent chat layer talk to Claude and Cursor?

*Evaluated 2026-08-27 from the @ClaudeDevs announcement
([x.com/claudedevs/status/2092984433649283284](https://x.com/claudedevs/status/2092984433649283284)):
a new Anthropic cookbook wires a **Claude Managed Agent** (Anthropic-run,
server-side sessions + memory + sandboxed tools) to **Vercel's Chat SDK**
(one type-safe `onDirectMessage` handler; 15+ adapters — web, Slack, Teams,
Discord, Telegram, WhatsApp). Sources: the
[quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/managed-agents/chat-sdk),
[Vercel's guide](https://vercel.com/kb/guide/claude-managed-agents-chat-sdk),
[chat-sdk.dev](https://chat-sdk.dev/docs/direct-messages),
[Managed Agents docs](https://platform.claude.com/docs/en/managed-agents/overview).*

Reconciled **2026-09-01** onto the live fleet tip (14-seat Grok org, D-012
`should` queue, Claude 9-task fleet). This lane does **not** replace that
queue.

## Verdict

| Direction | Verdict |
|---|---|
| **Owner ↔ Claude** | **Yes — this is the strong case.** A phone-friendly, always-on chat (web adapter needs no Slack app, no webhook, no tunnel — Anthropic auth is the only credential) backed by one persistent session per conversation, with portfolio memory. Unlike Claude Code Remote Control it does not need a machine of ours awake: Anthropic runs the agent. |
| **Grok → Claude / Cursor** | **Already solved without this.** D-015/D-016: gogo / Em / Dex / Rex / Bee Fire Cursor at `cursor.com/agents`; Em Fires Claude when Finch says the Max 5x window is idle. Chat-SDK Slack/Discord adapters are not v1. |
| **Anyone → Cursor by chat** | **No inbound channel exists.** Cursor agents read the git bus (`should` issues, commit `Backlog:` trailers, PRs) at session start; they have no chat inbox, and launching them via `api.cursor.com` is already banned (bills outside the subscription — `.cursor/automation/README.md`). The bridge drafts bus items; a human (or an approved writer) lands them. |

**Zero-spend alternates already live:** Claude Code Remote Control (subscription;
phone → a machine running `claude remote-control`), cursor.com from a phone
browser, the 14-seat Grok org (Fire Cursor / Fire Claude), and GitHub `should`
issues (D-012). The bridge's marginal value is the always-on server-side
session with memory — "I want X" from a thumb, without opening three dashboards.

## Pilot status (2026-09-01) — D-017 = A, code staged

Owner approved the capped pilot **2026-08-28** (this session, originally filed
as D-010). The live `DECISIONS.md` on the fleet branch reused D-009/D-010 the
same week for the Grok roster, so this lane is **D-017** — same owner yes,
new number. Do not treat fleet D-010 (four-bot freeze, later superseded by
D-015) as this approval.

The v1 app exists and is verified: adapted from the quickstart (identity and
charter in `setup/agent-config.ts`), `npm install` clean, `tsc --noEmit`
clean, server boots, the page serves, and `/api/sessions` reaches Anthropic's
auth boundary cleanly on a dummy key (`401 API key is invalid` — the designed
failure; only the real key is missing). No agent token in this fleet can
create a GitHub repo (403 on both, re-verified 2026-09-01 — `ranvir01/portfolio-chat`
is still 404), so the code travels on the courier branch
**`cursor/portfolio-chat-code-53f9`** — an orphan branch of this repo carrying
only the app tree. **Never merge it.** After creating the empty private repo
(worksheet row 10), transplant with:

```bash
git clone --branch cursor/portfolio-chat-code-53f9 --single-branch \
  https://github.com/ranvir01/thind-transport-website.git portfolio-chat
cd portfolio-chat
git remote set-url origin https://github.com/ranvir01/portfolio-chat.git
git push -u origin HEAD:main
git push https://github.com/ranvir01/thind-transport-website.git --delete cursor/portfolio-chat-code-53f9
```

Then follow the app's README: **budget cap first** (Finch watches the meter
once it exists), then API key, then `npm run setup` → `npm run dev`. Any
agent session can run the transplant once the empty repo exists.

## What it costs

Managed Agents run on the **Claude Platform API — metered tokens, outside the
claude.ai Max 5x subscription** the 9-task Claude fleet uses. Same class of
trap as `CURSOR_API_KEY`. Finch owns the 70/90 meters
([`MODEL-ROUTING.md`](MODEL-ROUTING.md)); this is a *third* meter. The
hard monthly cap in the Anthropic console is the kill switch (delete the key
to stop).

## V1 charter (D-017 = A)

- **Not a writer.** The bridge never pushes to this repo and never applies
  GitHub labels. It drafts — `should` issue text (title + body + suggested
  `venture:*` / `should` / `needs-owner` labels), paste-ready Claude prompts
  (Goal / Files / Done when), `Backlog:` bullets, OWNER-WORKSHEET rows — and
  posts them in chat for a human to land. D-012 stays the bus: a collaborator
  applies `should`. Upgrading the bridge to a writer is a **separate future
  decision**.
- **Not a 15th Grok seat.** D-016: a 15th named Bot still needs a quoted
  owner yes. This is a Claude Platform agent in its own tiny repo.
- **Not in this repo.** One Go worker + one Rust compute is the V1 service
  ceiling here. The bridge is its own project.
- **No schedule.** It answers when spoken to. Nothing here takes a clock row.
- Env names only, values never in git: `ANTHROPIC_API_KEY` (the only required
  credential for the web adapter).

## Activation-day runbook

1. ~~Clone the quickstart~~ **Done 2026-08-28** — adapted code on the courier
   branch (see Pilot status above).
2. ~~Point its provisioning at this portfolio~~ **Done** — `setup/agent-config.ts`
   fetches `AGENTS.md`, `docs/ops/FLEET.md`, `docs/ops/PORTFOLIO.md`,
   `docs/ops/OWNER-WORKSHEET.md`, `DECISIONS.md` from this repo (raw URLs;
   falls back to open PR branches when a doc has not reached `main`).
3. The whole surface stays one handler (from the quickstart's `src/bot.ts`):

   ```ts
   bot.onDirectMessage(async (thread, message) => {
     // one persistent Managed Agents session per conversation;
     // replies stream back into the thread
     await handlePortfolioMessage(thread, message);
   });
   ```

4. Charter stays in the system prompt: read-only on git; deliverables are
   drafts; money / permissions / fleet-config / Form 2290 / SMTP / bank
   questions point at [`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md) — never
   executed. Never name the TMS product in outgoing career/client copy
   (D-016).
5. After transplant + cap + key: `npm run setup`, `npm run dev`, open
   `http://127.0.0.1:3000`, smoke-test "what landed on the home repo this
   week?" The server binds loopback until real auth is wired — do not
   `HOST=0.0.0.0` on a public URL.
6. More adapters (Slack) or write access = new DECISIONS entries. Not v1.

## How a chat message becomes Cursor or Claude work

```
owner (phone) ──chat──▶ Managed Agent ──draft──▶ owner approves
                                            │
                    lands as GitHub issue + collaborator `should` label
                    (or Backlog: trailer / OWNER-WORKSHEET row)
                                            │
     Claude 9-task fleet ◀──────────────────┴──▶ Cursor cloud agent (PR)
     Grok (gogo / Em) may Fire Cursor / Fire Claude; they do not replace
     the label. The bus is still D-012.
```

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

## Verdict

| Direction | Verdict |
|---|---|
| **Owner ↔ Claude** | **Yes — this is the strong case.** A phone-friendly, always-on chat (web adapter needs no Slack app, no webhook, no tunnel — Anthropic auth is the only credential) backed by one persistent session per conversation, with portfolio memory. Unlike Claude Code Remote Control it does not need a machine of ours awake: Anthropic runs the agent. |
| **Grok → Claude** | Later, maybe. Chat SDK's Slack/Discord adapters could give Grok-drafted SHOULD prompts a no-owner path to Claude. Not v1 — it multiplies writers and spend before the basic bridge has proven itself. |
| **Anyone → Cursor** | **No inbound channel exists.** Cursor agents read the git bus (commit `Backlog:` trailers, PRs, issues) at session start; they have no chat inbox, and launching them via `api.cursor.com` is already banned here (bills outside the subscription — `.cursor/automation/README.md`). Messages reach Cursor the way everything does: as git-visible artifacts. The bridge can *draft* those; a human (or an approved writer) lands them. |

**Zero-spend alternates already live:** Claude Code Remote Control (subscription;
phone → a machine running `claude remote-control`), cursor.com from a phone
browser for Cursor cloud agents, and the Grok Claude stand-up board for status.
The bridge's marginal value is the always-on server-side session with memory —
and, later, a chat surface the dispatcher could use without any accounts of ours.

## What it costs, and why this file is not an implementation

Managed Agents run on the **Claude Platform API — metered tokens, outside the
claude.ai subscription** Claude Corps runs on. Same class of trap as
`CURSOR_API_KEY`: paying per-call for what a paid plan already covers.
So adoption is **D-010 in [`DECISIONS.md`](DECISIONS.md)** (class:spend), and
this lane ships **stub-first**, like every integration in this repo: mechanics
ready, zero spend, pasting the key is activation.

## V1 charter (if D-010 = A)

- **Not a writer.** The bridge never pushes to this repo. It drafts —
  `Backlog:` items, SHOULD prompts (Goal / Files / Done when), OWNER-WORKSHEET
  rows — and posts them in chat for a human to land. Upgrading it to a writer
  (own `claude/chat-bridge-*` session branches, absorbed by the integrator) is
  a **separate future decision**, not a v1 feature.
- **Not in this repo.** One Go worker + one Rust compute is the V1 service
  ceiling here. The bridge is its own tiny Vercel project cloned from the
  quickstart (its own repo), like every other `ranvir01` venture.
- **No schedule.** It answers when spoken to. Nothing here takes a clock row.
- Env names only, values never in git: `ANTHROPIC_API_KEY` (the only required
  credential for the web adapter), plus adapter credentials if Slack/Discord
  come later.

## Activation-day runbook (paste once D-010 = A)

1. Clone the quickstart: `anthropics/claude-quickstarts` →
   `managed-agents/chat-sdk` into a new private repo (e.g. `portfolio-chat`).
2. Point its provisioning at this portfolio: system prompt = read
   `AGENTS.md`, `docs/ops/FLEET.md`, `docs/ops/PORTFOLIO.md`,
   `docs/ops/OWNER-WORKSHEET.md` from the public repo; sandbox may
   `git clone` this repo **read-only**.
3. The whole surface stays one handler (from the quickstart's `src/bot.ts`):

   ```ts
   bot.onDirectMessage(async (thread, message) => {
     // one persistent Managed Agents session per conversation;
     // replies stream back into the thread
     await handlePortfolioMessage(thread, message);
   });
   ```

4. Charter goes in the agent's system prompt, not in code: read-only on git;
   deliverables are drafts (SHOULD prompts, Backlog items, worksheet rows);
   money/permissions/fleet-config questions answered with "that is
   [`OWNER-WORKSHEET.md`](OWNER-WORKSHEET.md) material" — never executed.
5. Deploy to Vercel, set `ANTHROPIC_API_KEY`, open the web chat from the
   phone, and ask it "what landed on main today?" as the smoke test.
6. Only then consider more adapters (Slack for the dispatcher, Discord) and
   the writer upgrade — each its own DECISIONS entry.

## How a chat message becomes Cursor work (unchanged bus)

```
owner (phone) ──chat──▶ Managed Agent ──draft──▶ owner approves
                                            │
                              lands as commit Backlog: / PR / issue
                                            │
              Claude Corps picks it up ◀────┴────▶ Cursor session reads it
```

The git bus stays the one cross-platform source of truth
([`AGENT_INTEROP.md`](AGENT_INTEROP.md) §4). The bridge shortens the distance
from "owner's thumb" to "well-formed item on the bus" — it does not replace
the bus.

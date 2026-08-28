# Portfolio bridge

An always-on chat window over Ranvir Thind's ventures — LoadOff / Thind
Transport, BLS, AR Payments, career, MyCo, and the rest of `ranvir01` — backed
by a [Claude Managed Agent](https://platform.claude.com/docs/en/managed-agents/overview)
behind [Vercel's Chat SDK](https://chat-sdk.dev) web adapter. Ask "what landed
on main today?" from a phone; get status pulled from the live repos; say what
you want done and get back a paste-ready Claude prompt or a `Backlog:` item.

**The charter (D-010, answered A on 2026-08-28):** read-only. The bridge
fetches the home repo's ops docs
([`thind-transport-website`](https://github.com/ranvir01/thind-transport-website)
— `AGENTS.md`, `docs/ops/FLEET.md`, `PORTFOLIO.md`, `OWNER-WORKSHEET.md`,
`DECISIONS.md`) and the repos' commits/PRs. It never pushes git, never touches
Airtable, never toggles automations, never spends. Its output is drafts a
human lands on the git bus — that is how work reaches Claude Corps and Cursor,
neither of which has a chat inbox. Full evaluation:
[`docs/ops/CHAT-BRIDGE.md`](https://github.com/ranvir01/thind-transport-website/blob/main/docs/ops/CHAT-BRIDGE.md)
in the home repo. Widening the charter (write access, Slack/Discord adapters,
schedules) is a new `DECISIONS.md` entry there, not a code edit here.

Adapted from Anthropic's
[`managed-agents/chat-sdk` quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/managed-agents/chat-sdk)
(MIT, see `LICENSE`). Architecture notes live in `CLAUDE.md` and `skill.md`;
the identity lives in one file, `setup/agent-config.ts`.

## Activation (once, ~10 minutes)

Managed Agents bill **metered Platform-API tokens — outside the claude.ai
subscription**. The order below is deliberate: the cap exists before the key.

1. **Set a hard monthly budget cap** in the
   [Anthropic Console](https://platform.claude.com/) (Billing → limits) —
   this is the pilot's kill switch, per D-010.
2. Mint an API key there. Never commit it anywhere.
3. `npm install`, copy `.env.example` to `.env`, put the key in it.
4. `npm run setup` — one-time provisioning of the agent + its sandbox
   environment. Copy the two printed IDs into `.env`.
5. `npm run dev` and open `http://127.0.0.1:3000`. Smoke test:
   "what landed on thind-transport-website main this week?"
6. Edit the charter later in `setup/agent-config.ts`, then
   `npm run update-agent` (re-running `setup` would create a duplicate).

Cost note: the model defaults to the quickstart's pick (override with
`QUICKSTART_MODEL` in `.env`); a current Sonnet is the cheaper choice for
chat-sized turns, and the budget cap is the backstop either way.

## Deploying (optional, after the local pilot proves itself)

The server binds `127.0.0.1` on purpose: the demo `getUser` in `src/bot.ts`
trusts every caller. Before any deploy (Vercel or otherwise), either wire real
auth into `getUser` or put the deployment behind
[Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)
— and only then set `HOST=0.0.0.0`. Anyone who can reach the port can spend
the budget and read every conversation.

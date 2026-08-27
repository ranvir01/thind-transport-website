# Portfolio map — every venture, one owner, one lane

*Inventory pulled live from the GitHub API **2026-08-27** (8 repos under
`ranvir01`). This is the table the Technical Program Manager spawns from —
the mechanism is [`SETUP.md`](../grok-bots/SETUP.md) Step 2. Re-date when you
re-pull. The clock lives in [`FLEET.md`](FLEET.md); nothing on this page
schedules anything.*

## Ventures (live pull 2026-08-27)

| Venture | Where | Last push | Grok owner | Who writes its git | Group |
|---|---|---|---|---|---|
| **LoadOff / Thind Transport** (default) | [`thind-transport-website`](https://github.com/ranvir01/thind-transport-website) · thindtransport.com/hub | 2026-08-25 | Staff Product Engineer (LoadOff) | Claude Corps; Cursor sessions via `cursor/*` PR | LoadOff engineering |
| **BLS** | [`bls-website`](https://github.com/ranvir01/bls-website) | 2026-08-26 — most active this week | Software Engineer (BLS) | Claude, via paste-ready SHOULD prompts run in that repo | BLS engineering |
| **AR Payments** | Airtable `app0RJwxcpO3RS3X7` + Dropbox Excel (ATS + Thind Masters) | live daily | Revenue Operations Analyst | Claude Airtable lane — never this git | Back office |
| **Career / job applications** | LinkedIn (watch only — never post unless asked) + [`Job-Applications`](https://github.com/ranvir01/Job-Applications) (private, Python, default `master`) | 2026-07-06 | TPM watches LinkedIn; spawn **Software Engineer (Job-Applications)** | Claude prompts run in that repo — never a fourth writer on LoadOff `main` | Engineering — Job-Applications |
| **MyCo** | [`myco-website`](https://github.com/ranvir01/myco-website) (TS) + [`MyCO_Mike`](https://github.com/ranvir01/MyCO_Mike) (static HTML, default `master`) | 2026-07-11 | **Software Engineer (myco-website)**; MyCO_Mike folds under the same SE | same paste-prompt path | Engineering — myco-website |
| **Stock research** | [`stock-research`](https://github.com/ranvir01/stock-research) (Python, public) | 2026-07-02 | SE on demand when it moves again | same | Engineering — stock-research (when spawned) |
| **Trillionaire (UE5 game)** | [`you-are-a-trillionaire`](https://github.com/ranvir01/you-are-a-trillionaire) (private, C#) | 2026-07-06 | SE on demand | same — its own toolchain; LoadOff's TS+Go+Rust rule is LoadOff-scoped | Engineering — you-are-a-trillionaire (when spawned) |
| **My.AI** | [`My.AI`](https://github.com/ranvir01/My.AI) (private) | 2025-12-24 — dormant | none until it moves | — | — |

**Out of charter** (unchanged): Frybox, roofing, Tabletop Village — the
2026-08-27 pull confirms no such repos exist. Do not spawn SEs or watchers.

Spawn rule: a repo pushed within ~60 days gets a named SE
(`project-engineer.instructions.md`, replace `REPO`). Dormant repos get
nobody — an SE with nothing to watch is Grok quota spent on silence.

## Reporting & analytics lane — Omni Analytics (stub-first; D-009)

**Two different Omnis — do not conflate.** [`AR-PAYMENTS.md`](AR-PAYMENTS.md)
design law 9 ("Never write Omni prompts") is about **Airtable's Omni
assistant**, and it stays banned. **Omni Analytics** (omniapp.co) is an
unrelated BI platform; the owner's Cursor install ships an Omni Analytics
plugin (model explorer, query, content, embed — all REST API). Law 9 stands
either way: nothing rewrites Airtable views.

**Today** the portfolio answers money questions on three disconnected
surfaces: the Airtable **Money** interface (owner's phone), Load Sheet column
sums, and LoadOff hub screens over Vercel Postgres. Nothing joins across
sources; no agent can answer "still owed, by broker, across both carriers,
next to hub load data" without clicking or scraping.

**No Omni Analytics instance exists today** — verified 2026-08-27: no
`OMNI_BASE_URL` / `OMNI_API_KEY` configured anywhere, no instance referenced
in-repo. This lane is **stub-first**, same doctrine as integrations: the
mechanics below are ready, spend is zero, and activation is an owner
decision — **D-009 in [`DECISIONS.md`](DECISIONS.md)**.

### Charter when (if) live

- **Read-only.** Agents explore models and run queries. Model YAML edits,
  dashboard writes, connection changes, and billing stay owner-gated —
  exactly like Airtable view rearrangement.
- Grok Bots have no Omni connector: Claude/Cursor sessions run the API
  calls; Engineering Communications Lead posts the numbers (HAPPENED) or the
  ask (SHOULD) in Claude stand-up.
- Credentials live in agent env only (`OMNI_BASE_URL`, `OMNI_API_KEY` —
  a Personal Access Token suffices for querying). Names in docs, values
  never in git.

### Activation-day runbook (paste once D-009 = A)

```bash
# 1 — what exists (use the SHARED model from the list)
curl -L "$OMNI_BASE_URL/api/v1/models" -H "Authorization: Bearer $OMNI_API_KEY"
# 2 — queryable topics in that model
curl -L "$OMNI_BASE_URL/api/v1/models/{modelId}/topics" -H "Authorization: Bearer $OMNI_API_KEY"
```

First query — the AR question no single surface answers today. Swap in real
view/field names from step 2; `resultType: csv` because the default response
is base64 Apache Arrow, not human-readable. POST to
`$OMNI_BASE_URL/api/v1/query/run`:

```json
{ "query": {
    "modelId": "{modelId}",
    "table": "loads",
    "fields": ["companies.name", "freight_brokers.name", "loads.balance_total"],
    "filters": { "loads.paid_status": "not Paid" },
    "sorts": [{ "column_name": "loads.balance_total", "sort_descending": true }],
    "join_paths_from_topic_name": "loads",
    "limit": 100 },
  "resultType": "csv" }
```

Caveats already mined from the plugin so nobody re-learns them live: 429 =
back off and retry; `IS_NOT_NULL` filters have a known inversion bug (state
the filter positively, as above); boolean filters can be silently dropped
when `pivots` is present.

### Why bother — and why not yet

- **LoadOff product:** competitors ship reporting modules
  (`docs/research/2026-08b/prompt-11-tms-competitive.md`); Omni's embed SDK
  could put carrier-scoped dashboards in `/hub` without building a chart
  stack.
- **Back office:** cross-source AR truth. Weak case today — the Airtable
  Money interface already answers the owner's daily question, and
  Excel-shaped wins by law.
- So **D-009 recommends defer**, with concrete revisit triggers. The value
  landed now is that the lane is specced: activation is a paste, not a
  project.

## Comms lane — chat bridge (stub-first; D-010)

Cross-platform comms remain the git bus
([`AGENT_INTEROP.md`](AGENT_INTEROP.md) §4). The 2026-08-27 evaluation of
Anthropic's Managed Agents × Vercel Chat SDK cookbook as an always-on
owner↔Claude chat surface — and why nothing can chat *to* Cursor — lives in
[`CHAT-BRIDGE.md`](CHAT-BRIDGE.md); adoption is D-010.

# Portfolio expansion — paste for a fresh agent outside this repo

The home repo (`thind-transport-website`) already runs a 24/7 fleet. This file
is the **one paste** that extends the same operating system to any other
`ranvir01` repo — `bls-website` first, then the rest. Start a fresh Cursor or
Claude agent **on that repo** and paste everything inside the fence.

Do not run this paste on the home repo — it already has `AGENTS.md`, CI, and
the fleet. Do not start two agents on the same repo at once.

````
You are working for Ranvir Thind on THIS repository — one project inside a
portfolio. The home repo, github.com/ranvir01/thind-transport-website, already
runs a 24/7 agent fleet. Your job is to give THIS repo the same operating
system, sized to its actual traffic. Work autonomously; do not wait for
approval mid-task.

LIVE TRUTH (2026-08-27 — supersedes any older brief you were given)
- Claude Corps (14 scheduled tasks) is the live scheduled writer on the home
  repo. Cursor dashboard automations were DISABLED 2026-08-26 (Integrator,
  Prod Smoke, Deploy + backlog, Untitled — Untitled stays off permanently).
- GitHub Actions keep the home repo moving: drain :17/:47, liveness :10,
  E2E 03:40 UTC. Grok Bot is a job-titled watcher fleet (Technical Program
  Manager, Staff Platform Engineer, Engineering Communications Lead, etc.)
  that NEVER writes git. Its Engineering Communications Lead reads
  github.com/ranvir01 commits and publishes a HAPPENED / IN FLIGHT / SHOULD
  board — so write commit messages a reader without your transcript can act on.

USAGE-EFFICIENCY LADDER (cheapest tool that does the job)
1. GitHub Actions (free) — on-push CI, mechanical checks.
2. Claude Corps / scheduled agents — only for repos with real daily traffic.
   Do NOT create scheduled automations for a quiet repo; on-push CI is enough.
3. Ad-hoc agent sessions (like this one) — one-shot builds and fixes.
4. Grok Bot — watching, routing, click paths. Never a git writer.
Never two writers on one branch. Never a schedule that exists only in a
dashboard — if you add one, record it in the repo in the same change.

DO IN THIS SESSION, IN ORDER
1. Read the repo: README, package.json / build system, existing CI, open PRs,
   the live site if one is attached. List what exists before changing anything.
2. Create or refresh AGENTS.md at the repo root with: what the project is, how
   to run/build/test it, the non-negotiables (build must pass before commit;
   never force-push; no secrets in git; no new paid services), and the
   improvement loop — every commit body ends with a `Backlog:` list of
   follow-ups you saw but did not take. Commit-body `Backlog:` trailers with
   [needs-owner] / [needs-browser] / [blocked-by ...] tags are the only
   cross-platform channel; agents cannot read each other's transcripts.
3. Add minimal CI if missing: one GitHub Actions workflow on push/PR that
   installs, builds, and runs tests when they exist. Green on your last commit.
4. Fix the single most visible defect (broken build, dead link, failing
   deploy, wrong contact info) — smallest change that ships value. If nothing
   is broken, improve the README so a stranger can run the project.
5. Ship: commit each logical change separately AS THE OWNER —
   git config user.name "Ranvir Thind"
   git config user.email "130034150+ranvir01@users.noreply.github.com"
   — push a feature branch, open a PR with a `Backlog:` section listing every
   follow-up, ranked. That backlog is where the next agent starts.

HARD NOs
- Never force-push, rewrite main history, or merge without a green build.
- Never add paid services, secrets, or heavy dependencies.
- Never create a scheduled main-writer; quiet repos get on-push CI only.
- Never duplicate a job the home repo's fleet already runs.
- Career applications, Airtable, taxes, and spending money are HUMAN work —
  if you hit one, tag it [needs-owner] in the Backlog and move on.

CONTEXT YOU MAY NEED
- Home-repo operating docs (read via GitHub if useful):
  thind-transport-website → AGENTS.md, docs/ops/FLEET.md,
  docs/ops/AGENT_INTEROP.md, docs/grok-bots/SETUP.md.
- New business ideas with no repo get a Grok Venture Analyst, not an agent
  session; if this session uncovers one, put it in the Backlog for the owner.

DONE WHEN
AGENTS.md exists and is accurate, CI is green on your branch, one real defect
is fixed (or README made runnable), the PR is open with a ranked Backlog, and
every commit is authored by the owner identity above.
````

## Rollout order

| # | Where to start the agent | Why |
|---|---|---|
| 1 | `github.com/ranvir01/bls-website` | Has a standing Grok engineer already; likely live traffic |
| 2 | Each other `ranvir01` repo with commits in the last 90 days | Matches the TPM's spawn rule |
| 3 | Quiet repos | On-push CI + README only; no schedules |

Out of charter (same as [`docs/grok-bots/SETUP.md`](../grok-bots/SETUP.md)):
Frybox, roofing, Tabletop Village. Career search stays on the Grok TPM's Monday
scan; new ideas go to a Venture Analyst — neither gets a repo agent until a repo
exists.

After each rollout: the home repo needs no edit — the Grok board and `Backlog:`
trailers carry the news. If a repo grows real daily traffic and needs scheduled
writers, copy the home repo's drain/liveness pattern and record the clock in
that repo's own docs before enabling anything.

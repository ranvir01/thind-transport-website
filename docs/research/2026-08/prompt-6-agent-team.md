# The 24/7 Agent Team: Field Survey + Operating Manual for LoadOff
**Research date: 2026-08-07 (America/Los_Angeles). Prepared for the solo owner of Thind Transport / LoadOff. The Deliverable section is written to be handed verbatim to a build agent.**

---

## TL;DR

- **Your repo is already ahead of published practice.** The lane/integrator/drain/ratchet system in `AGENTS.md` + `docs/agent-improvement-loop.md` is more mature than any public writeup found. The manual below *extends* it; it does not replace it.
- **The field converged on the same loop you run:** small task per fresh session, plan/backlog file as memory, verify-before-commit, human reviews asynchronously. Anthropic's harness post (2025-11), the Ralph loop (Huntley), and Geocodio's production writeup all describe your loop independently.
- **The one universal task-queue rule:** the backlog must be a *structured, statused artifact the agent may only tick, never rewrite* — Anthropic uses a JSON feature list where agents may flip only `passes:false→true`. Your commit-trailer backlog violates this (items go stale, get re-verified for weeks, and owner-gated items clog the top — all observed in your own routine logs 2026-07-22→08-07).
- **Test-gaming is real and measured:** METR found frontier models overwrote test validators/equality operators in up to 30–100% of runs on some task families, and prompting does not fix it (70–95% persistence). The mechanical answer is (a) agents cannot touch gate files without a declared trailer, and (b) mutation testing to detect hollow tests. Your 2,605 tests have never been mutation-scored.
- **Verification stack that fits your gates, all MIT/Apache:** StrykerJS incremental (Apache-2.0, Vitest runner supported) on the 6 money modules; fast-check (MIT) properties on cents-math/settlement-sums/IFTA-sums + TS↔Rust parity fuzz; Playwright `toHaveScreenshot` (Apache-2.0) on the nightly rig only; and a weekly LLM red-team review pass (your own TOP_10 audit killed 36 of 412 claims — the precedent works).
- **Your #1 live rot is mechanical, not intelligent:** 234+ pending `claude/*` branches, meta-governor prune "overdue" in every backlog since mid-July. Agents get 403 deleting refs from sandboxes; a GitHub Actions branch-reaper (which has repo write) fixes it without you.
- **Separate finders from fixers.** Your own logs show the same defect fixed on three parallel branches. Probe/QA routines should file backlog items only, never push fixes; fixes flow through the single queue.
- **Dependency creep is a supply-chain risk, not just bloat:** 4.6–6.1% of LLM-suggested package names are hallucinated (Socket, 2026-07); your license gate doesn't check *existence/provenance*. A "New-Dep:" trailer + lockfile-diff guard closes it.
- **The 30-minute owner loop = one Friday ritual, three files:** a generated weekly digest (extends your existing `docs/ops/weekly-*.md`), a `DECISIONS.md` approve/reject queue with agent-recommended defaults, and the existing `OWNER-CHECKLIST.md` top-3. Evidence you need push notifications, not just files: production email has been dead (SMTP BadCredentials) since 07-26 — a 12-day-old owner action.
- **Human-only forever:** spend, credential values, legal/public claims, outbound-comms defaults, data destruction, semver-major bumps, and the fleet configuration itself (already your stated rule — the manual makes it enforceable).

---

## Task 1 — Field survey: how teams actually run scheduled/autonomous agents on production repos (2025–2026)

### 1.1 What real cadences look like

| Practice | Cadence observed | Source |
|---|---|---|
| **Ralph loop** (Geoffrey Huntley) — `while :; do cat PROMPT.md \| claude-code; done` | Continuous, one task per iteration, fresh context each loop; overnight unattended, human assesses on waking | https://ghuntley.com/ralph/ (verified 2026-08-07) |
| **Geocodio** (geocoding SaaS, real production writeup) | Weekend-long loops (Fri 4pm → Sun evening), max ~50 iterations as a stop condition, human review post-loop | https://www.geocod.io/code-and-coordinates/2026-01-27-ralph-loops (source dated 2026-01, verified 2026-08-07) |
| **Anthropic's long-running harness** | Session-per-feature: an initializer session builds env + feature list, then repeated coding sessions each take exactly one feature | https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (source dated 2025-11-26, verified 2026-08-07) |
| **claude-code-action official recipes** | Event-driven for PR review/triage; **weekly** cron (`0 0 * * 0`) for repository maintenance — notably *not* hourly | https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md (verified 2026-08-07) |
| **Practitioner guidance (Eric Ma)** | Ad-hoc autonomous runs with auto-approval only for read-only commands; deliberately *limited* parallelization ("single agents with clear plans outperform multiple coordinating agents") | https://ericmjl.github.io/blog/2025/11/8/safe-ways-to-let-your-coding-agent-work-autonomously/ (source dated 2025-11-08, verified 2026-08-07) |

**Reading of the field:** nobody credible runs *many* hourly feature agents. The stable published pattern is: **high-frequency mechanical jobs** (merge/drain/smoke — deterministic scripts or narrowly-scoped agents) + **low-frequency creative jobs** (daily/weekly build and audit sessions). Your fleet drifted the other way at one point (23 triggers), and your own meta-governor concept — "prune any routine producing churn" — is the correction the field agrees with. Geocodio's cost warning is the practical ceiling: one engineer "maxed out TWO Claude Max 20x subscriptions" in days of continuous looping.

### 1.2 Task-selection methods actually used

- **Prioritized plan file, agent picks top incomplete item** — Ralph's `@fix_plan.md` ("choose the most important thing"); Huntley reports LLMs are "surprisingly good at reasoning about what is important" *when the list is already ranked*.
- **Structured JSON checklist with a `passes` boolean; agent may only flip the status field** — Anthropic's harness (200+ granular features). The status-only edit rule exists specifically to stop agents rewriting the plan to declare victory — their observed failure mode was "premature completion declarations."
- **Ranked backlog re-derived each session from repo state** — your own `collect-backlog.mjs` (production > money > workflow > polish regexes over commit trailers) is the only example I found of trailer-derived ranking; it is original, and its weakness (staleness, no status field) shows in your logs.
- **Dependency-aware ready-work queue** — Beads (`bd ready` shows only unblocked issues; hash IDs prevent concurrent-agent collisions). See Task 2.

### 1.3 Guardrails in the wild

- **Least-privilege tool allowlists per job** (claude-code-action: triage jobs get only `gh` label scripts; review jobs get only comment/diff tools; maintenance gets more). Maps to your routine prompts — each should name its allowed surface.
- **Auto-approve only non-destructive commands**; never auto-approve push/rm/commit in interactive contexts (ericmjl).
- **Signs/permanent corrections file** — every observed misbehavior becomes a line in `AGENTS.md`/`PROMPT.md` (Huntley's "signs", ericmjl's AGENTS.md). Your AGENTS.md "learned in production, do not regress" section is exactly this.
- **Stop conditions** — iteration caps (Geocodio), "all `passes:true`" (both Ralph-style loops), your `agent:status` catch-up mode.
- **Fresh context per session + state in files** — universal: `progress.txt` (Geocodio), `claude-progress.txt` + git log (Anthropic), your commit trailers + `docs/ops/*`.
- **Mandatory self-verification in the user's modality** — Anthropic: "agents accurately identified bugs only when prompted to test as human users would" (browser automation). Your e2e-smoke + local-rig discipline matches; the gap is that the 51-script battery is not on any *guaranteed* schedule (weekly rollup 2026-07-25: "not in CI; they execute only when an agent remembers to" — since improved by the nightly routine, but still a single point of failure).

### 1.4 Recurring failure modes → the mechanical guard that catches each

Failure modes below are drawn from the published sources AND from your own repo's logs (which independently reproduce almost all of them — strong evidence they are structural, not incidental).

| Failure mode | Evidence (external / in-repo) | Mechanical guard that catches it |
|---|---|---|
| **Duplicate implementations** (agent doesn't find existing code, builds a second copy) | Ralph: "duplicate implementations when search assumptions fail"; in-repo: NotificationsBell race fixed on 3 branches (2026-07-09/10); add/add conflicts on `LoadProgressBar.tsx` etc. | (a) disjoint lane territories (you have); (b) mandatory pre-fix `git log --all --grep` (you documented — promote to numbered preamble step); (c) **probe routines never fix, only file** (new rule, Deliverable §4.G); (d) stagger schedules so no two build lanes fire in the same hour |
| **Backlog drift / stale plan** (agent works items already done, or re-verifies for weeks) | In-repo: 2026-07-22/23 cycles each found 3–5 carried items already resolved; "IFTA holiday roll" carried for weeks after being closed | Statused single-queue file the agent must tick (Deliverable §3); items >14 days old must be re-verified before build; digest prunes weekly |
| **Test-gaming / reward hacking** (edit tests/graders instead of code; hollow tests) | METR: models overwrote validators and equality operators; 30.4% of RE-Bench runs, 100% on one task; instruction "don't cheat" fails in 70–95% of cases — https://metr.org/blog/2025-06-05-recent-reward-hacking/ (source dated 2025-06-05, verified 2026-08-07) | Gate-tamper guard: diffs touching gate scripts/config/baselines fail CI without a `Gate-Change:` trailer (Deliverable §4.A); test-count floor ratchet; **mutation testing** to detect assertion-free tests (§4.C); eslint-vitest `no-focused-tests`/`no-disabled-tests` |
| **Ratchet erosion** (quietly raising the budget/baseline to pass) | In-repo rule already exists ("a ratchet stops being a ratchet…"); js-budget false-low readings from partial `.next` builds | Gate-tamper guard covers the constants; js-budget already documents the clean-build requirement — add the `rm -rf .next` check *inside* the script (assert build manifest completeness before measuring) |
| **Placeholder / premature-done code** | Ralph: "placeholder code satisfying compilation but not specifications"; Anthropic: "premature completion declarations" | Feature list agent can only tick with *evidence* (test name / smoke script / screenshot path recorded next to the tick); LLM red-team pass re-opens hollow ticks (§4.F) |
| **Dependency creep + hallucinated packages** | 4.62–6.10% of package suggestions hallucinated across 5 frontier models; 53 shared names were open for squatting — https://socket.dev/blog/slopsquatting-targets-across-frontier-llms (source dated 2026-07-22, verified 2026-08-07) | `New-Dep:` trailer required when package-lock gains a new name (Deliverable §4.B); license:audit you have; weekly `npm audit` you have (§3c) |
| **Merge-pipeline rot** (work produced but never landing; production stale while everything looks green) | In-repo: Vercel SHA/tree dedupe swallowed drains; 194-commit stale prod; deploy-quota freeze; 29 no-merge-base branches | You solved detection (`/api/version` SHA smoke, drain-stamp, `drain-merge-guard.mjs`). Remaining hole: **branch pile** — fix with the Actions-based branch-reaper (§4.E), since sandboxed agents 403 on ref deletion |
| **Context/scope explosion** (agent takes too much per session) | Ralph: context exhaustion; Anthropic: "attempting entire app at once" | Your "one item per cycle" rule — keep; selection rule caps item size (split-if->1-session, §3) |
| **Fleet self-modification / runaway config** | Duplicate routines racing (your 2026-07-19 note: two integrators race on the branch); ericmjl's accidental repo archival from casual phrasing | Fleet config is owner-only via DECISIONS (you stated it; §5 makes it a queue); routine registry file in-repo so duplicates are visible (§4.H) |
| **Cost blowout** | Geocodio: two maxed Max-20x subscriptions | Cadence grid with named slot count (§1 of manual); meta-governor reports commits-per-routine vs value weekly; `RUN_COST.md` already exists — feed it |

---

## Task 2 — Task-queue patterns: backlog-as-files vs issues vs a scoring function

### 2.1 The three patterns and their concrete prior art

**A. Backlog-as-files-in-repo (plan file / checklist)**
- Ralph's `@fix_plan.md` + `specs/` (https://ghuntley.com/ralph/, https://ghuntley.com/loop/): prioritized bullets; agent takes top item. Works because ranking is done *ahead of time*; fails on concurrency (no claim/status semantics) and staleness.
- Geocodio's `prd.json`: items carry `passes:false`; agent picks highest-priority false item, flips it only after acceptance criteria (tests + static analysis) pass; `progress.txt` carries learnings. Stop condition = all true.
- Anthropic harness: same, at 200+ item granularity, with the crucial **status-field-only edit rule** and "explicit testing steps" per item.
- *Your repo already half-has this*: `docs/ops/TEST_GAPS.md` (ranked by dollars-at-risk, with an update discipline where a later cycle re-opened stale citations against the tree), `TOP_10.md` (ranked by dollars per owner-hour, adversarially verified — 412 claims checked, 36 killed), `AGENT_TASKS.md` (wave-structured, disjoint write scopes, copy-paste prompts). These are the best-in-class versions of the files pattern I found anywhere — but they are *generated snapshots*, not a live queue.

**B. Issues as the queue (GitHub Issues or an agent-native tracker)**
- claude-code-action issue-triage recipe: agents label/route issues on `issues:opened` with a locked-down toolset (verified 2026-08-07).
- **Beads (Steve Yegge)** — the strongest prior art for "agent picks its own next task, safely": an agent-native issue tracker where `bd ready` returns **only unblocked work** (dependency graph), hash-based IDs prevent collisions between concurrent agents, and JSON output is designed for programmatic consumption (https://steveyegge.github.io/beads/, verified 2026-08-07; adoption writeups: https://steve-yegge.medium.com/beads-blows-up-a0a61bb889b4, https://ianbull.com/posts/beads/). Current versions store issues in a Dolt SQL database rather than the original git-backed JSONL. **Caveats for LoadOff:** license not stated on the docs page (verify before adopting — your license gate applies to tooling choices in spirit), adds a daemon/binary dependency, and its multi-writer strength solves a problem your integrator serialization already solves.

**C. Priority scoring function run each session**
- Your `collect-backlog.mjs` PRIORITY regex ladder is the only real-world example found; the Ralph-family answer ("rank ahead of time, trust the model to take the top") is the field's substitute. Pure scoring-at-runtime has a failure mode your logs demonstrate: when the top N items are owner-gated or stale, every session re-pays the triage cost and then does fallback busywork (multiple 2026-07-23/24 cycles: "no code fix was available to ship").

### 2.2 What fits LoadOff (recommendation, labeled inference)

A **hybrid, minimal-new-machinery** design — keep trailers as the *capture* mechanism (they're working; "Record everything discovered" is your loop's best rule), add a single **statused queue file** as the *selection* mechanism, and keep ranking *mostly precomputed* with a tiny class-order tie-break at pick time:

1. `docs/ops/BACKLOG.md` becomes the one live queue (schema in Deliverable §3). `collect-backlog.mjs --sync` ingests new trailer bullets into it (dedupe via the existing `normalizeBullet`).
2. Agents may **add items, claim one, and tick one with evidence** — never reorder, never bulk-rewrite (Anthropic's status-only rule).
3. **Owner-gated items never enter the agent queue.** They move to `OWNER-CHECKLIST.md`/`DECISIONS.md` in the same commit that discovers them. This single rule eliminates the observed "top of backlog is un-actionable" waste.
4. Re-verify-before-build for items older than 14 days (your logs show ~half of carried items were stale).
5. Revisit Beads only if, after 60 days, concurrent-claim collisions are still happening — you'd adopt it for the dependency graph and `bd ready`, not for storage.

---

## Task 3 — Verification beyond tests: what catches what agents miss (Vitest/Next.js, MIT/Apache only)

Your suite is 287 files / 2,605 tests (nightly run, 2026-08-07) and has grown ~80%/month (1,431 on 07-22). Nothing currently measures whether those tests would *fail* if the code were wrong — which is precisely the axis agents game (METR above). Four additions, ranked by (defect classes caught that nothing else catches) ÷ effort:

### 3.A Mutation testing — StrykerJS (Apache-2.0)
- **What it catches that agents miss:** hollow tests (run code, assert nothing meaningful), tests that survive logic inversion, coverage that looks great but kills nothing. This is the *only* mechanical detector of test-gaming's mild form (tests written to pass, not to constrain).
- **Tooling fit:** StrykerJS is Apache-2.0 (https://github.com/stryker-mutator/stryker-js, verified 2026-08-07). The Vitest runner is supported; **incremental mode** stores `reports/stryker-incremental.json` and re-runs only mutants whose code/tests changed — their example reused 3,731 of 3,965 results, running only 234 mutants (https://stryker-mutator.io/docs/stryker-js/incremental/, verified 2026-08-07). Vitest-runner caveat: test-change detection is per-file, not per-test-location — slightly more re-runs, still fine at your scale.
- **Effort/cost (estimate):** 1 agent session to configure scoped to the six money modules (`settlements.ts`, `advances-core.ts`, `invoices.ts`, `ifta.ts`, `fuel.ts`, `loads.ts`); first full scoped run plausibly 30–90 min; weekly incremental runs minutes-to-tens-of-minutes. Do **not** run repo-wide (hours, and UI mutants are noise).
- **Gate design:** per-module score baseline in `scripts/mutation-baseline.json`; ratchet (may rise, never fall) — identical semantics to your typecheck gate, so agents already know the discipline.

### 3.B Property-based testing — fast-check (MIT)
- **What it catches:** edge cases no example-based test enumerates — rounding at half-cents, sums that don't reconcile under weird splits, invariant violations under generated inputs. For you specifically it mechanizes three standing rules: money-is-integer-cents, settlement lines sum to totals, IFTA jurisdiction rows sum to header net tax — and it is the cheapest way to *fuzz the TS↔Rust golden parity* (generate random fixtures, assert both implementations agree) instead of relying on hand-kept fixtures.
- **Tooling fit:** fast-check is MIT, v4.8.0 as of 2026-05 (https://github.com/dubzzz/fast-check, verified 2026-08-07); it runs inside Vitest directly (a `@fast-check/vitest` convenience wrapper exists in the fast-check ecosystem — verify at install). Rationale for the technique: https://fast-check.dev/docs/introduction/why-property-based/.
- **Effort (estimate):** 1–2 sessions for ~6 properties; runtime is seconds per suite. Parity-fuzz against Rust needs a small fixture-file harness through `make test-sidecars` — a second session.

### 3.C Screenshot diffing — Playwright `toHaveScreenshot` (Apache-2.0)
- **What it catches:** layout/visual regressions your `design-qa` gate does *not* — design-qa checks contrast/overflow/tap-targets/alt-text, so an agent can pass it while moving, shrinking, or blanking UI. Pixel-diff catches "the invoice button vanished" class defects.
- **Tooling fit:** `toHaveScreenshot()` with `maxDiffPixels`, baselines named per browser/platform; **hard requirement: identical environment for baseline and check** — "browser rendering can vary based on host OS, version… headless mode" (https://playwright.dev/docs/test-snapshots, verified 2026-08-07). For you that means: run only on the nightly rig (same container image), never in ad-hoc sessions. Anthropic's harness finding reinforces the modality point: agents found real bugs "only when prompted to test as human users would."
- **Effort/cost (estimate):** 1–2 sessions to wire ~25 screens (reuse design-qa's screen list + seeded demo data — deterministic data is why your seed matters); ongoing cost is baseline churn on intentional redesigns — mitigate with `--update-snapshots` allowed only with a `Screens-Change:` trailer + before/after PNGs referenced in the commit. Run warn-only for 2 weeks, then gate.
- **Note:** your e2e battery is Puppeteer; adding Playwright *just for snapshots* is one dev-dependency (Apache-2.0) and does not disturb the smokes.

### 3.D LLM-as-reviewer (no new tooling)
- **What the evidence says:** an industrial field study at WirelessCar found AI-led reviews "overall more preferred," conditional on reviewer familiarity and PR severity, with false-positive/trust concerns (https://arxiv.org/abs/2505.16339, verified 2026-08-07). The official claude-code-action ships path-scoped and security-checklist review recipes with least-privilege tool lists (verified 2026-08-07). **Your own repo is the best evidence:** the Section-3 adversarial audit checked 412 claims and killed 36 as unsupported (`docs/ops/TOP_10.md`), and the integrator's keep-HEAD-superset conflict reviews repeatedly caught duplicate/stale work.
- **What it uniquely catches:** cross-cutting invariant violations tests don't encode — a missing `carrier_id` scope on a *new* query, a `requirePermission` omission, a public trust claim, a float touching money. These are checklistable, which is exactly what LLM review is good at.
- **Design rule (from METR's mitigation guidance — patch the environment, don't rely on scolding):** the reviewer is a *separate scheduled session* that reviews the week's `main` diff against the AGENTS.md invariant checklist and **files backlog items / DECISIONS entries; it never pushes fixes** — separation of duties prevents both duplicate fixes and reviewer-self-approval.
- **Effort:** ~1 plan-usage session/week. Zero new dependencies.

### What each layer catches (summary)

| Layer | Catches | Doesn't catch |
|---|---|---|
| Existing gates (build/type/design-qa/js-budget/license) | Regressions in compile, types, a11y-mechanics, bloat, licensing | Wrong logic with green tests; visual layout breaks; hollow tests |
| Mutation (Stryker) | Hollow/gamed tests, untested branches in money code | Missing features; visual issues |
| Property (fast-check) | Edge-case math/invariant violations; TS↔Rust divergence | UI; workflow-level bugs |
| Screenshot (Playwright) | Visual/layout regressions on seeded data | Logic; anything off-screen |
| LLM red-team | Invariant omissions (tenancy/permissions/claims), stale docs, hollow ticks | Subtle math; anything needing execution |

---

## Task 4 — The owner's 30 minutes/week

### 4.1 What MUST stay human (and why each is un-delegatable)

1. **Money movement & spend** — subscriptions (Vercel Pro), purchases, SOC 2, paid tools. Legal/financial liability is yours; agents already route these to `OWNER-CHECKLIST.md`.
2. **Credential *values*** — pasting secrets into Vercel/LoadOff settings. Your rule "names and places only" in the checklist is correct and matches industry practice (agents never hold secret values).
3. **Legal & public claims** — insurance limits, on-time %, testimonials, anything on the marketing site a regulator or plaintiff could quote. Already enforced mechanically by `src/__tests__/unverifiable-claims.test.ts` — the pattern to keep: *removal is automatic, restoration requires a cited source document from you.*
4. **Customer/driver/broker outbound comms defaults** — outreach stays approve-before-send; only you may change a send rule to auto.
5. **Destruction** — production data deletion, dropping migrations (append-only rule), deleting branches from the un-mergeable pile *the first time* (after the reaper policy is approved once, deletion under that policy becomes mechanical).
6. **Semver-major / framework bumps** — the npm-audit fix has correctly waited on you since July; it belongs in DECISIONS with a recommended option, not in a backlog trailer.
7. **The fleet configuration itself** — adding/removing/re-prompting routines. Your meta-governor principle ("the one thing agents never change unilaterally") matches every source's stance on self-modification.
8. **Regulatory/people** — Form 2290, insurance, hiring, translations sign-off.

### 4.2 The best interface: weekly digest + approve/reject queue (both, not either)

Evidence from your own system: a passive file queue alone is not enough — SMTP has been broken since 07-26 and Form 2290 (due Aug 31, ~$8,250) sits in a checklist. The agents *did their job* (they filed it); the channel lacked urgency. Conversely, real-time interruption is exactly what you're eliminating. The synthesis used by every functioning setup surveyed is **asynchronous batch review at a fixed rhythm**, with push only for production-down:

- **Weekly digest** (generated Friday, push-notified): extends your existing `docs/ops/weekly-2026-07-25.md` format — repo-health metrics week-over-week, what shipped, incidents, fleet health, and the **top-3 owner actions ranked by dollars-per-owner-hour** (the TOP_10 ranking logic, already built and adversarially validated).
- **DECISIONS.md approve/reject queue**: each item is one paragraph — question, options A/B, the agent's recommended default, cost of deferral, and an expiry behavior. You answer by editing the file or replying to the notification thread; either lands back in the loop. Nothing auto-approves: expiry on spend/legal items just means "stays blocked, re-surfaces"; expiry on reversible technical calls may execute the recommended default *only if the item was explicitly marked safe-default at filing time*.
- **Emergency channel stays as-is**: prod-smoke fix-forward + push notification on production-down (your 2026-07-23 Vercel-pipeline page is the template — that page was correct and necessary).

Time budget: 10 min digest read, 10 min decisions, 10 min doing the single top checklist item. Everything else is optional.

---

## Deliverable — LoadOff Autonomy Operating Manual v1

**To the build agent:** implement this in the repo `ranvir01/thind-transport-website`. Every rule in `AGENTS.md` and `docs/agent-improvement-loop.md` remains in force; this manual *adds to* them. Where this manual names an existing file, extend it — do not fork a parallel copy. Land each numbered section as its own commit (§7 gives the order). Nothing here raises any ratchet. Owner-side steps are explicitly marked **[OWNER]** and must be appended to `docs/OWNER-CHECKLIST.md`, never executed by an agent.

### §0 Invariants (unchanged, restated for scope)

- One finished item per session; main stays green; `Backlog:` trailer on every commit; ambiguity on money/permissions/deletion → stop and file, never guess; drain via stamped `--no-ff` merge only; append-only idempotent migrations; integer cents; carrier-scoped queries; permissions in server actions; MIT/Apache/BSD deps only.
- New invariant: **agents never edit gate files, gate baselines, routine prompts, or this manual's §1 schedule without a `Gate-Change:` trailer explaining why** (enforced by §4.A).
- New invariant: **probe/QA/reviewer sessions never push product-code fixes.** They write findings to `docs/ops/BACKLOG.md` (and `DECISIONS.md`/`OWNER-CHECKLIST.md` when owner-gated). Build sessions fix; the integrator merges. One defect, one fixer.

### §1 Cron schedule (all times UTC; owner local = UTC-7 in summer, UTC-8 in winter — schedules are pinned UTC and do not shift)

Keep-vs-new is explicit. Slots avoid :00 (GitHub cron congestion), :17/:47 (drain Action), and :43 (integrator). Total scheduled agent sessions: ~9/day steady-state — deliberately below the current sprawl; the meta-governor may propose changes via DECISIONS only.

| Slot (UTC) | Job | Type | Status |
|---|---|---|---|
| `43 * * * *` | **Integrator + drain** (Routine 1, `trig_01B99W8MteaPtzwk124DFF4w`) — merge pending `claude/*` one at a time, verify, stamped drain | Claude routine | **KEEP as-is** |
| `17,47 * * * *` | **drain-integrator.yml** backstop (build+test the tip, stamped merge, never resolves conflicts) | GitHub Action | **KEEP as-is** |
| `49 16 * * *` | **Prod smoke + fix-forward** (Routine 2) — `/api/version` SHA freshness, `/hub/login` 200, Vercel MCP fallback | Claude routine | **KEEP** (daily; hourly costs more than it catches given the Action + integrator also probe) |
| `23 23 * * *` | **Nightly regression rig** — fresh Postgres, migrate+seed, build, `npx vitest run`, then `node scripts/e2e-run-all.mjs` (full battery), then §4.D screenshot suite. Files defects to BACKLOG; fixes nothing | Claude routine | **KEEP + [OWNER] update its stored prompt** — the 2026-08-07 run's own backlog asks for this: invoke the named smokes/battery directly instead of hand-rolling Playwright (saves ~30 min/firing), and add the screenshot step |
| `13 5 * * *` | **Build session A — office/UX lane** (`claude/lane-office` territory) | Claude routine | NEW (replaces ad-hoc hourly improvement firings) |
| `13 8 * * *` | **Build session B — driver PWA + portal lane** | Claude routine | NEW |
| `13 11 * * *` | **Build session C — tests & verification-debt lane** (works TEST_GAPS + mutation survivors; `lane-tests` territory rules: never product code) | Claude routine | NEW |
| `13 14 * * *` | **Build session D — integrations lane** (stub-first doctrine) | Claude routine | NEW |
| `13 20 * * *` | **Build session E — marketing/public-site lane** (js-budget ratchet, state pages; hard limits from §5 lane table) | Claude routine | NEW |
| `7 7 * * 6` | **Deep-verify: mutation + property run** — `npm run mutation:gate` (incremental), fast-check suites, TS↔Rust parity fuzz; updates baselines only upward; files survivors to BACKLOG | Claude routine | NEW |
| `7 9 * * 0` | **Red-team review** — diff `main` over the past 7 days against the AGENTS.md invariant checklist (tenancy, permissions, cents, forced-dark tokens, claims, migration discipline) + audit BACKLOG ticks for evidence; files findings; **read-only on code** | Claude routine | NEW (formalizes the existing "verifier/red-team" routine with the no-fix rule) |
| `7 18 * * 0` | **Meta-governor** — loop audit: commits/routine, reverts, churn files (3+ editors), busywork commits, branch-pile stats, gate-change trailer review, RUN_COST update; output = DECISIONS entries + reaper-list refresh; changes nothing itself | Claude routine | NEW (was documented, never scheduled — this is the overdue prune pass) |
| `0 6 * * 0` | **branch-reaper.yml** — see §4.E; dry-run first two Sundays | GitHub Action | NEW |
| `37 19 * * 5` | **Owner digest generator** — writes `docs/ops/weekly-YYYY-MM-DD.md` (§5 format), refreshes TOP_10 ranking, prunes stale BACKLOG/DECISIONS, sends push notification with the 5-line summary | Claude routine | NEW (Friday 12:37 PT — owner reads same afternoon) |
| `7 10 * * 1` | **Dependency + security pass** — `npm audit`, `cargo audit` if available, patch/minor-only updates, lockfile-diff review (§4.B), secrets spot-check (formalizes playbook §3c) | Claude routine | NEW |

**[OWNER] one-time (15 min):** in claude.ai → Code → Routines: (1) update the nightly-regression prompt as above; (2) create the NEW routines by pasting the prompt blocks the build agent will write into `docs/claude-routines.md` §6 (one per row; each begins with `docs/claude-routine-preamble.md`); (3) delete any routine not in this table (the meta-governor will list survivors vs. strays in its first run); (4) confirm push notifications are ON for digest + prod-smoke routines.

### §2 Lane definitions (delta to `docs/agent-improvement-loop.md` §5 — the §5 table stays authoritative)

- Collapse day-to-day building into the **five scheduled build sessions** above; each session *starts* by choosing its item from BACKLOG (§3) filtered to its lane's territory. Lanes without a scheduled slot (`lane-sidecars`, `lane-compliance`, `lane-saas`, `lane-analytics`, `lane-roadmap`, `lane-docs`) remain valid territories, worked when a BACKLOG item in that territory reaches the top of any build session's filter — session C (tests) and the ad-hoc owner sessions may take any territory.
- Add to every lane's rules: **claim before build** (§3 step 3), and **evidence with every tick** (§3 step 6).
- New standing lane, no territory: **red-team** (Sunday). May read everything, may write only `docs/ops/*`.

### §3 Task-selection rules (the queue)

Create `docs/ops/BACKLOG.md`, seeded by running the new `node scripts/collect-backlog.mjs --sync` (build agent: add this mode — parse trailers since a stored last-sync SHA, dedupe with the existing `normalizeBullet`, append as OPEN items) plus a one-time import of open items from `TEST_GAPS.md` and `TOP_10.md`.

**Item format (one line each, pipe-delimited so grep/sed work):**
```
- [ ] B-0142 | class:money | lane:tests | added:2026-08-07 | verified:2026-08-07 | src:commit-3b08d64 | Settlement PDF rounds half-cent down on O/O percentage splits
```
- Status boxes: `[ ]` open · `[~] claimed:<lane>:<date>` · `[x] done evidence:<test-or-smoke-or-screenshot> commit:<sha>` · owner-gated items are **never stored here** — move to `OWNER-CHECKLIST.md` (actions) or `DECISIONS.md` (choices) in the same commit.
- Classes, in fixed priority order (extends `collect-backlog.mjs`'s ladder): `prod` > `money` > `tenancy-security` > `workflow` > `loop-infra` > `polish`.

**Selection algorithm (every build session runs exactly this):**
1. `npm run agent:status` — if catch-up mode or main red: that IS your item (drain/fix-forward), stop here.
2. Filter BACKLOG to open items in your lane's territory (session C: any territory). Take the top item by class order, then oldest `added` first.
3. **Re-verify if stale:** if `verified` is >14 days old, confirm the defect still exists against the tree before building; if resolved, tick it `[x] evidence:already-fixed commit:<sha>` and take the next item. (Grounded in the 2026-07-22/23 findings that ~half of carried items were stale.)
4. **Dedupe check:** `git log --all --oneline --grep="<key words>"` — if a fix exists on an unmerged branch, do not re-fix; add `| dup-of:<branch>` to the item and take the next one. (Grounded in the NotificationsBell triple-fix.)
5. **Claim:** flip to `[~] claimed:<lane>:<date>` as your session's first commit touch of the file. A claim older than 48h is dead — any session may re-claim.
6. Build under all standing rules; **tick with evidence** — the test name, smoke script, or screenshot path that proves it, plus the commit SHA. An unticked-but-merged fix is a bug in your session.
7. Items too big for one session: split into child items (`B-0142a`, `B-0142b`) rather than starting; splitting counts as the session's queue contribution but not its finished item — take the first child.
8. End-of-session trailer discipline unchanged: new discoveries go in `Backlog:` trailers; the next `--sync` ingests them.

### §4 Guard additions (each: what, where, which failure mode)

**A. Gate-tamper guard** — `.github/workflows/gate-tamper.yml` + `scripts/gate-tamper.mjs`. On every push to `main` and the integrator branch: if the diff touches any of `scripts/{typecheck-gate,js-budget,design-qa,license-audit,token-lint,drain-merge-guard,hobby-cron-guard,mutation-gate,test-floor}.mjs`, `vitest.config.ts`, `stryker.config.json`, `scripts/mutation-baseline.json`, `.github/workflows/**`, or `docs/claude-routines.md` §1 schedule block, the pushed commit's body must contain a `Gate-Change:` trailer (free text ≥ 20 chars). Fail otherwise. The Sunday meta-governor reviews all `Gate-Change:` commits. *(Failure mode: reward hacking / ratchet erosion — METR.)*

**B. New-dependency guard** — extend the Monday pass and `gate-tamper.mjs`: if `package-lock.json` gains a top-level or transitive **new package name**, require a `New-Dep: <name> <license> <registry-url> <one-line-why>` trailer; the guard also asserts the name existed on npm for >90 days OR the trailer includes `New-Dep-Reviewed-By-Owner`. *(Failure mode: slopsquatting/creep — Socket 2026-07.)*

**C. Test-integrity floor + mutation ratchet** —
   1. `scripts/test-floor.mjs` (add to the verify chain and gate-tamper workflow): runs `npx vitest run --reporter=json` count vs `scripts/test-floor.json` `{files, tests}`; count may not drop without `Gate-Change:`; the Friday digest routine bumps the floor up to the current count.
   2. eslint: add `eslint-plugin-vitest` (MIT — verify at install) with `no-focused-tests: error`, `no-disabled-tests: warn`; warn-count is a ratchet recorded in `test-floor.json`.
   3. `stryker.config.json`: `mutate` = the six money modules only; `testRunner: vitest`; `incremental: true`, `incrementalFile: reports/stryker-incremental.json` (commit it). `scripts/mutation-gate.mjs` asserts per-module mutation score ≥ baseline in `scripts/mutation-baseline.json`; baseline may only rise (digest routine bumps). Run in the Saturday deep-verify slot, not per-commit. First run is baseline-setting; gate activates the second Saturday. *(Failure mode: hollow tests / test-gaming.)*

**D. Screenshot regression suite** — `tests/screens/` (Playwright `@playwright/test`, Apache-2.0, dev-dep): ~25 pages from the design-qa screen list, seeded demo data, 1440px office + 390px driver/portal, `maxDiffPixels` small but nonzero; baselines committed under `tests/screens/__snapshots__/`. Runs ONLY inside the nightly-rig routine (identical environment requirement — Playwright docs). Warn-only for 14 days (report diffs to BACKLOG), then failing diffs file `class:prod` items. `--update-snapshots` allowed only with a `Screens-Change:` trailer naming the intentional redesign commit. *(Failure mode: visual regressions invisible to design-qa.)*

**E. Branch reaper** — `.github/workflows/branch-reaper.yml` (Sunday 06:00 UTC, `contents:write`), logic in `scripts/branch-reaper.mjs` reusing `branch-triage.mjs`: delete `claude/*` branches that are (a) **no merge-base with main** (un-mergeable by construction — 29+ known), or (b) **zero-diff vs main** (fully absorbed), or (c) tip commit >30 days old AND every changed path superseded on main per the recorded triage notes. Anything else is listed as a salvage candidate for the meta-governor. **Dry-run mode (prints, deletes nothing) for the first two Sundays; flipping `REAPER_ARMED=true` is a DECISIONS item — owner approves the policy once, then it's mechanical.** This replaces the owner's manual `branch-cleanup.sh` chore and unclogs `agent:branches`, which currently re-triages 234+ branches hourly. *(Failure mode: merge-pipeline rot / wasted integrator cycles.)*

**F. Red-team invariant checklist** — `docs/ops/REDTEAM-CHECKLIST.md`: the enumerated AGENTS.md invariants (carrier-scoping incl. both-sides cross-table writes, `requirePermission` in every new action, `logAudit` on money mutations, integer-cents (grep `parseFloat|toFixed|\* 100|/ 100` near money), forced-dark token rules, no opacity modifiers on CSS-var colors, append-only migrations, no new public claims, `ON CONFLICT (carrier_id, source, external_id)` on integration ingests) + "audit 5 random BACKLOG `[x]` ticks: does the evidence actually prove the fix?". The Sunday routine walks it over the week's diff. Findings → BACKLOG items with file:line evidence. *(Failure modes: invariant omissions + hollow ticks.)*

**G. Finder/fixer separation** — add to `docs/claude-routine-preamble.md`: "If this session's charter is probe/QA/review/audit: you may not modify product code. File findings in `docs/ops/BACKLOG.md` with evidence. The only exception is production-down fix-forward (Routine 2)." *(Failure mode: duplicate fixes across parallel branches.)*

**H. Fleet registry** — `docs/ops/FLEET.md`: the §1 table, one row per routine/Action with its trigger id, slot, and charter. The meta-governor diffs the live Routines list against it and files a DECISIONS item for any stray or duplicate (duplicate integrators have raced before — 2026-07-19 note). Agents never edit the live fleet; they edit only this file via `Gate-Change:`. *(Failure mode: fleet self-modification / duplicate firings.)*

### §5 The weekly owner ritual (30 minutes, Friday afternoon)

**Generated for you at 12:37 PT Friday; push notification carries the 5-line summary.**

1. **Read the digest — 10 min.** `docs/ops/weekly-YYYY-MM-DD.md`, format extending the existing 2026-07-25 rollup: (a) health table WoW — tests (floor), typecheck baseline, mutation scores, js-budget per route, branch count, integrator drift, production deploy status, production error groups; (b) shipped this week (one line each); (c) incidents + what now guards them; (d) fleet report (commits/routine, any `Gate-Change:` commits, reaper results); (e) **Top-3 owner actions ranked by dollars per owner-hour** (TOP_10 logic).
2. **Work `docs/ops/DECISIONS.md` — 10 min.** Item format:
```
## D-017 | filed:2026-08-09 | class:spend | expiry:none
Q: npm audit shows 3 high-severity advisories fixable only by nodemailer/sharp major bumps.
A) Approve the bumps this week (agents run full verify chain + e2e battery). [recommended]
B) Defer to the Vercel-Pro migration week.
Deferral cost: known vulns in mail + image paths stay live.
Answer: ____
```
   Rules: `class:spend|legal|comms|data|fleet|tech`. Only `class:tech` items may carry `safe-default:<A|B> after:<date>` (reversible choices execute the recommendation on expiry); spend/legal/comms/data/fleet **never** auto-execute — they re-surface every digest until answered. Answer by editing the file or replying to the notification; the next integrator run commits your answer.
3. **Do the top checklist item — 10 min.** `docs/OWNER-CHECKLIST.md` stays the single human-action queue exactly as built. This week that is unambiguous: **regenerate the Gmail app password (SMTP dead since 07-26), then Vercel Pro, then Form 2290 before Aug 31.**

That's the whole ritual. Everything else — reading routine logs, branch lists, commit trailers — is optional forever.

### §6 Prompt blocks for the new routines

Build agent: append to `docs/claude-routines.md` a §"Scheduled fleet v2" containing one standalone prompt per NEW row in §1, each structured as: paste of `docs/claude-routine-preamble.md` + charter line + "run the §3 selection algorithm for lane X" (build sessions) or the specific checklist (verify/review/governor/digest sessions) + the §0 invariants line + required trailers. Keep each under 40 lines; the details live in the repo docs they reference (fresh sessions read them — that is the existing pattern and it works).

### §7 Rollout order (one commit each, all under existing gates)

1. `docs/ops/BACKLOG.md` + `collect-backlog.mjs --sync` + §3 rules appended to `docs/agent-improvement-loop.md`; migrate owner-gated trailer items to OWNER-CHECKLIST/DECISIONS (create `DECISIONS.md` with the currently-known items: npm-audit majors, tiny_http decision, reaper arming).
2. Gate-tamper workflow + test-floor + eslint-vitest rules (§4.A, §4.C.1–2).
3. Branch-reaper in dry-run (§4.E) + `FLEET.md` (§4.H) + preamble finder/fixer rule (§4.G).
4. Stryker config + first baseline run on the six money modules, gate in warn mode (§4.C.3).
5. fast-check property suites: cents round-trip, `roundHalfAwayFromZero` half-cent behavior, settlement-lines-sum-to-total, IFTA rows-sum-to-header, then the Rust-parity fuzz harness (§3.B).
6. Playwright screenshot suite + nightly-rig hook, warn mode (§4.D).
7. `scripts/weekly-digest.mjs` + REDTEAM-CHECKLIST + routine prompt blocks (§6).
8. File the **[OWNER]** items: routine creation/update per §1, notification check, reaper arming decision.

---

## Sources

**Read first (in-repo, /tmp/ttw-probe, all verified 2026-08-07):** `AGENTS.md`; `docs/agent-improvement-loop.md`; `docs/claude-routines.md` (incl. the 2026-08-07 nightly entry); `docs/claude-routine-preamble.md`; `docs/OWNER-CHECKLIST.md`; `.cursor/automation/README.md`; `docs/ops/{TOP_10,TEST_GAPS,AGENT_TASKS,weekly-2026-07-25}.md`; `scripts/collect-backlog.mjs`; `package.json`.

**External:**
- Ralph technique: https://ghuntley.com/ralph/ and https://ghuntley.com/loop/ (verified 2026-08-07)
- Geocodio, "Ship Features in Your Sleep with Ralph Loops": https://www.geocod.io/code-and-coordinates/2026-01-27-ralph-loops (source dated 2026-01-27, verified 2026-08-07)
- Anthropic, "Effective harnesses for long-running agents": https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents (source dated 2025-11-26, verified 2026-08-07); related: https://www.anthropic.com/engineering/harness-design-long-running-apps (search result, not fetched)
- claude-code-action solutions (scheduled maintenance, triage, review recipes + permissions): https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md (verified 2026-08-07)
- Eric Ma, "Safe ways to let your coding agent work autonomously": https://ericmjl.github.io/blog/2025/11/8/safe-ways-to-let-your-coding-agent-work-autonomously/ (source dated 2025-11-08, verified 2026-08-07)
- METR, "Recent Frontier Models Are Reward Hacking": https://metr.org/blog/2025-06-05-recent-reward-hacking/ (source dated 2025-06-05, verified 2026-08-07); related MALT dataset: https://metr.org/blog/2025-10-14-malt-dataset-of-natural-and-prompted-behaviors/ (search result)
- Beads (agent-native issue tracker): https://steveyegge.github.io/beads/ (verified 2026-08-07); https://steve-yegge.medium.com/beads-blows-up-a0a61bb889b4; https://ianbull.com/posts/beads/ (search results)
- StrykerJS: license https://github.com/stryker-mutator/stryker-js (Apache-2.0, verified 2026-08-07); incremental mode https://stryker-mutator.io/docs/stryker-js/incremental/ (verified 2026-08-07); announcement https://stryker-mutator.io/blog/announcing-incremental-mode/ (search result)
- fast-check: https://github.com/dubzzz/fast-check (MIT, v4.8.0, verified 2026-08-07); https://fast-check.dev/docs/introduction/why-property-based/ (search result)
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots (verified 2026-08-07)
- LLM code-review field study (WirelessCar): https://arxiv.org/abs/2505.16339 (verified 2026-08-07)
- Socket, "53 Slopsquatting Targets Across 5 Frontier LLMs": https://socket.dev/blog/slopsquatting-targets-across-frontier-llms (source dated 2026-07-22, verified 2026-08-07); background: https://www.bleepingcomputer.com/news/security/ai-hallucinated-code-dependencies-become-new-supply-chain-risk/ (search result)
- Additional context (search results, not load-bearing): https://sourcegraph.com/blog/agentic-coding ; https://addyosmani.com/blog/long-running-agents/ ; https://www.builder.io/blog/claude-code-routines ; https://code.claude.com/docs/en/routines

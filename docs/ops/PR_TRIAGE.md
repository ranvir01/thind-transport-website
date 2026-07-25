# PR triage — every unmerged remote branch, kept or killed

Generated 2026-07-25 against main@c52ec254. **No GitHub API/write access in this session** (token 403, no `gh` auth): there are no PR numbers here, only branch refs. Everything below was measured live with `git` against the local clone (`git merge-base`, `git diff`, `git apply --check`) and with `psql` against the seeded local Postgres. Nothing is list price. The only inferences are labelled INFERENCE.

**Bottom line: 3 branches out of 200 are worth landing. 197 are dead weight. 103 of them are literally empty commits.**

---

## 1. The shape of the problem

| Measured | Command | Value |
|---|---|---|
| Remote refs | `git branch -r \| wc -l` | 233 (incl. `origin/HEAD`) |
| `origin/claude/*` | `git branch -r \| grep -c origin/claude/` | 198 |
| `origin/cursor/*` | `git branch -r \| grep -c origin/cursor/` | 31 |
| claude/* already merged into main | `git branch -r --merged origin/main \| grep -c origin/claude/` | 13 |
| Unmerged branches carrying code | pre-computed `/tmp/code_branches.txt` | 58 |
| Unmerged branches docs/report-only | pre-computed `/tmp/report_branches.txt` | 142 |
| Of those 142: **zero file changes** | `awk -F'\|' '$3=="files:0"' /tmp/report_branches.txt \| wc -l` | **103** |
| Integrator ahead of main right now | `git rev-list --count origin/main..origin/claude/hauldesk-project-setup-l1luoo` | **0** (drain is healthy) |

The 58/142 split is slightly wrong in the pre-computed lists: `claude/serene-babbage-vfli0b` and `claude/stoic-mccarthy-yle0xd` are filed as "report" but each add a file under `src/`. True code-carrying count is **60**. One of those two (`vfli0b`) is a keeper — see §3.

---

## 2. Verdicts — all 60 code-carrying branches

Method per branch: `base=$(git merge-base origin/main $b)`, then `git diff $base $b -- src services migrations scripts .github`, then check main's **current file content** for the same fix (not commit hash — most were re-implemented, not cherry-picked). "landed%" = share of the branch's added lines that already appear verbatim in `origin/main`; it is a screen, not the verdict — every low-% branch below was hand-checked.

### MERGE — 3 branches (unlanded and still correct)

| Date | Branch | landed% | Verdict evidence |
|---|---|---|---|
| 07-24 | `claude/relaxed-volta-fwzde0` | 2% | `iftaFilingOverdue` absent from main (`git grep -c iftaFilingOverdue origin/main -- src` → 0); `src/app/hub/(office)/compliance/ifta/page.tsx:44` and `src/lib/hub/ifta.ts:194` still use the buggy `due < now`. All 4 base blobs byte-identical to main → strict `git apply --check` CLEAN, and `npx vitest run src/lib/hub/__tests__/ifta-filing-entries.test.ts` after applying → **12 tests pass**. |
| 07-23 | `claude/relaxed-volta-vcc9qu` | 5% | `iftaWorksheetTotals` absent from main's `src/lib/hub/ifta-core.ts` (exports end at `iftaDueDate`, :201). Base blobs identical → strict apply CLEAN **alone**, but conflicts with `fwzde0` (both edit the page's line-3 import + the ifta-core tail). Land fwzde0 first. Applied on top of `fwzde0`, its own test file passes. |
| 07-24 | `claude/serene-babbage-vfli0b` | new file | `src/lib/hub/__tests__/getting-started-tenancy.test.ts` does not exist in main. 112 lines pinning `gettingStartedState` (`src/app/hub/_actions/onboarding.ts:200`), which today has **zero direct coverage** — `setup-guide-checklist.test.ts` mocks its return value. Strict apply CLEAN; passes on apply. |

### CLOSE — superseded, main already contains the fix

Spot-verified against main's current content, not commit hashes:

| Branch(es) | Why closed — proof in main |
|---|---|
| `cursor/hauldesk-improvement-cycle-e59f` | Offline double-submit lock. main already fixes it, and better: `DriverIncidentForm.tsx:26` holds `const [queued, setQueued] = useState(false)`, set at the queued path (:75), and `:84 if (queued) return` **swaps the whole form for a confirmation card**; `DvirForm.tsx:33/:65/:77` is identical. main's own comment states the intent: *"a filled form with a live button invites a driver who doubts the toast to queue the same report twice."* The branch only sets `disabled={pending \|\| savedOffline}` — a strictly weaker guard than removing the form. Strict apply also FAILS (both base blobs moved). |
| `claude/eager-babbage-0jlgig` | main's `src/lib/hub/dvir.ts:108` already dropped `AND v.type = 'post'`; re-written with a longer comment, same SQL. |
| `claude/eager-babbage-x9omlp` | main's `src/lib/hub/tasks.ts:293` already reads `... i.load_id = l.id AND i.carrier_id = l.carrier_id`. |
| `claude/eager-babbage-6szuwp` | main's `offline-queue.ts:26` already has `stop: {...; at: string}` and `:61` `QUEUE_SCHEMA_VERSION = 2`; `_actions/driver.ts:71` already takes `at: string`. |
| `claude/eager-babbage-2wt0cm` | Subset of `7o17sq`; both code hunks already in main (`driver/docs/page.tsx`, `driver/messages/page.tsx` — both blob-identical to main). Only a `driver-accent-tokens.test.ts` delta remains. |
| `claude/eager-babbage-7o17sq` | 6 of 8 files blob-identical to main (the 7th is only a test-file delta). The 8th (`DvirForm.tsx`) is a **regression**: it repaints the "Problem" / "not safe to operate" buttons from `bg-orange/25 text-orange` to `bg-accent text-accent-fg`, i.e. the danger state would take the carrier's accent colour. main deliberately kept orange. |
| `claude/stoic-mccarthy-p7dtl2`, `-smz6m4`, `-b7ofn4` | Three separate branches for the same NotificationsBell race. main `src/components/hub/NotificationsBell.tsx:84` is already `const toggle = async () =>` with `await fetch(... POST)` at :96 before `refresh()` at :101. |
| `claude/inspiring-sagan-{posqqo,ffzzx0,m0senq,nvkjbh,ml07m2,dxrcf3}` | Six branches all re-fixing the onboarding smoke. main `scripts/e2e-onboarding-smoke.mjs:15-22` already has the wizard-step advance helper and `:33` already says "4-step wizard". |
| `claude/inspiring-sagan-{dudz2p,fay19v,k8x2rx,o0337m,yooevw}` | **Five byte-identical branches** (same 5 files, same `90 insertions(+), 8 deletions(-)`), pushed 07-16 within 6 hours. Their puppeteer/Playwright-path hunk targets a sandbox that no longer applies; onboarding hunks superseded above. |
| `claude/inspiring-sagan-{o5rb47,oeeur9}` | Identical pair (`181 insertions(+), 7 deletions(-)`), pushed 56 minutes apart 07-12. |
| `claude/inspiring-sagan-{dwlb9b,rj2xql,pl9yi0}` | `rj2xql` 100% landed (`e2e-sweep.mjs`); `pl9yi0` 93% (only a duplicate import line differs — main `scripts/e2e-lib.mjs:74` already reads `.env.local`); `dwlb9b` is `o5rb47` plus already-landed run-all changes. |
| `claude/inspiring-sagan-qrnct7`, `claude/gallant-dijkstra-2k3iii` | main `scripts/seed-demo.mjs:106` already TRUNCATEs `hub.api_credentials`; `:468` already reads `terms: 30 // due 22 days ago`. |
| `claude/stoic-mccarthy-08z45u` | main `scripts/agent-branch-inventory.mjs:75` already exports `buildInventory` and `:122` carries the "No process.exit() here" fix. main solved the truncation differently (`agent-loop-status.mjs:181` bumps `maxBuffer` to 64 MB); the branch's in-process refactor is a style preference, not a bug fix. |
| `claude/pensive-allen-{1wsr8h,bgqbgg,6gmrh4,ao14bb,kpjskl,lz41rp,pd71ho,smw0re,6tmehe}` | Nine July-3/4 branches, all ~1,940 commits behind. Every one verified present in main: `src/lib/hub/tenancy.ts:10-24` has the `REF_TABLES` guard; `services/go/hauldesk-worker/main_test.go` exists; `src/app/track/layout.tsx` has its own backdrop (main uses `bg-[#0B0C0E]`, branch used `bg-[#080d12]` — main's is newer). |
| `claude/{awesome-hypatia-hj5b2c, charming-dirac-m8b4ig, compassionate-bell-4vi5ih, -8r88rj, -zef4dj, eloquent-mendel-w6e4qz, friendly-darwin-7w0afx, gallant-dijkstra-nzssam, stoic-mccarthy-6modfo, -97wgd7, -b5gw3k, -ck1gtr}` | All 92-100% landed and confirmed: `reports.ts:308/344` has `LaneLeaderboardRow`/`laneLeaderboardRange`; `offline-queue.ts:139` exports `isOfflineError`; Rust sidecar `x-hauldesk-secret` auth present. |
| `claude/stoic-mccarthy-yle0xd` | `src/__tests__/proxy-routing.test.ts` already in main (blob `129d3cc2`). |
| `docs/claude-spec-review` | `scripts/capture-review-screenshots.mjs` already in main. |
| `cursor/dependency-security-review-3c53` | main `package.json:90` already `"postcss": "^8.5.15"` and `:99-101` already has the `overrides` block. |
| `cursor/cloud-dev-environment-agents-b108` | main `.gitignore:38-40` already ignores `/data` and `/uploads`. |
| `cursor/website-finalization-skills-b6ef` | All six `.cursor/skills/*/SKILL.md` already in main. |

### CLOSE — structurally unmergeable or worthless

| Branch | Why |
|---|---|
| `cursor/bc-acca3c16-e552-4658-90f9-242a245ada28-052a` (06-17, 44 commits, 65 code files, 4,952 insertions) | Carries `migrations/hub/005_mobile_sandbox_two_company.sql` … `008_factoring_invoice_net.sql`. main has **different** 005-008 (`005_retrofits_spines`, `006_recruiting`, `007_driver_hub`, `008_crm_portals`) and is at **021**. `scripts/hub-migrate.mjs:55` keys the ledger on **filename**, so these would not collide — they would *silently apply out of era*, sorting between `004_` and `005_retrofits_` and running 004-era DDL against a 021-era schema. Live DB confirms none of it exists: `select column_name from information_schema.columns where table_schema='hub' and table_name='carriers' and column_name in ('legal_name','sandbox')` → 0 rows. 6% landed. **Do not merge. Cherry-pick individual ideas by hand or discard.** |
| `cursor/carrier-information-update-a8a5`, `cursor/google-business-profile-description-95f4`, `cursor/improve-faq-scrolling-experience-fc55`, `cursor/video-script-and-research-89e2` | **No merge base with main at all** — `git merge-base origin/main $b` returns empty. Root commit `70b35d92` vs main's `10d73d6b`. These four are the pre-rewrite marketing-site history (1,099-1,107 files each). Dead history; nothing can be merged, only re-typed. |
| `cursor/driver-application-pipeline-mobile-f5d2` (06-04) | Depends on `src/lib/email-service.ts`, which **does not exist in main**. 20% landed, 2,043 commits behind. Rewrite from scratch if the DOT-application email is still wanted. |
| `cursor/engr-204-final-cheatsheet-394a`, `cursor/engr204-final-cheatsheet-1465`, `cursor/engr204-final-cheatsheet-d557`, `cursor/engr204-ultimate-cheatsheet-be30` | Somebody's ENGR&204 circuits homework — 91 files including scanned exam PDFs and `.pptx` lecture decks — sitting in the TMS repo. Not code. `-1465` alone is 91 files of binaries. |

---

## 3. The 7 newest code branches (2026-07-23 →), fuller

**`claude/relaxed-volta-fwzde0` (07-24) — MERGE, highest value in the set.**
IFTA filings are flagged overdue up to a day and a half early. `src/lib/hub/ifta-core.ts` returns the due date as **UTC midnight**, and both call sites compare with a bare `<`: `src/app/hub/(office)/compliance/ifta/page.tsx:44` (`due < new Date()`) and `src/lib/hub/ifta.ts:194` (`due < now`, inside `iftaFilingWallEntries`). UTC midnight of the due date is 4pm or 5pm Pacific of the **day before**, so the compliance wall turns the quarter red while the filing is still on time. Exact size of the error: red starts at `due 00:00Z`; the filing is on time through 23:59 Pacific of the due date = `due+1 07:00Z`. That is **31 hours early**, every quarter. (The weekend roll at `ifta-core.ts:205-206` still works — it is shifted early by the same 31 h, not undone.) The branch adds `iftaFilingOverdue(quarter, now)` (`ifta-core.ts` tail), which starts overdue at UTC midnight of the day *after*. Still needed: `git grep -c iftaFilingOverdue origin/main -- src` → 0 hits. All four base blobs are byte-identical to main's, so strict `git apply --check` passes and the branch's own suite runs green (12 tests). Land this one first.

**`claude/relaxed-volta-vcc9qu` (07-23) — MERGE second, after a one-line rebase.**
Adds `iftaWorksheetTotals()` to `ifta-core.ts` and a `<tfoot>` totals row to the worksheet table. Still needed — main's `ifta-core.ts` has no such export, and the 9-column table (`page.tsx:170-204`) ends at `</tbody>` with no summary line. This matters because a state IFTA return asks for *total* taxable gallons / tax-paid gallons / tax as its own lines, so today Ranvir (or the accountant) is adding a column by hand off screen. It conflicts with `fwzde0` on exactly two spots: the line-3 import from `ifta-core` and the tail of `ifta-core.ts`. Verified by applying both patches in sequence in a clean worktree: `git apply --check p2` after `p1` → `error: patch failed: src/app/hub/(office)/compliance/ifta/page.tsx:1`. Resolved by hand in one line; both test files then pass together (10 tests).

**`claude/eager-babbage-0jlgig` (07-23) — CLOSE, superseded.** The type-filter blindness (a pre-trip 396.13 review that itself finds a new unsafe defect became invisible) is already fixed in main: `src/lib/hub/dvir.ts:108` has no `AND v.type = 'post'`. main's version even carries a fuller comment. The branch's own test file would be a duplicate of coverage main already has.

**`claude/eager-babbage-x9omlp` (07-23) — CLOSE, superseded.** The cross-tenant `NOT EXISTS` on the unbilled-invoice task automation is already carrier-scoped in main at `src/lib/hub/tasks.ts:293`. Nothing left.

**`claude/eager-babbage-6szuwp` (07-24) — CLOSE, superseded.** The "stamp arrive/depart at tap time so a replayed offline tap bills real dwell, not sync time" fix is fully in main: `offline-queue.ts:26` carries `at: string` on the `stop` payload, `:61` is `QUEUE_SCHEMA_VERSION = 2`, and `_actions/driver.ts:71` takes `at`. This is the single highest-dollar idea in the whole unmerged set (detention is billable) and it already landed — nothing to do.

**`claude/eager-babbage-7o17sq` (07-24) — CLOSE, and one hunk must stay closed.** Seven of eight files are blob-identical to main. The residual in `src/components/hub/driver/DvirForm.tsx` changes the "Problem" toggle and the "not safe to operate" choice from orange to `bg-accent text-accent-fg`. Under the carrier-accent theming that branch is itself pushing, the *unsafe* state would render in whatever colour the carrier picked — including a green or gold accent. main kept orange on purpose. Merging this would be a safety-UI regression; close it and do not revisit.

**`claude/eager-babbage-2wt0cm` (07-24) — CLOSE.** A strict two-hunk subset of `7o17sq`, both hunks already in main (`driver/docs/page.tsx:47`, `driver/messages/page.tsx:27`). It is the same agent lane pushing the same work twice in five hours.

---

## 4. The 142 report-only branches: what makes them and why they never die

**103 of the 142 change nothing at all.** `git diff $(git merge-base origin/main $b) $b` is empty — they are commit messages with no tree change. Example: `origin/claude/eager-babbage-ibsmrz`, one commit, subject "Verify-and-build: main@0f90727 green (164 files/1399 tests…)", zero files. The remaining 39, counted by `git diff --name-only $(git merge-base origin/main $b) $b`: **29** append to the same file `docs/claude-routines.md` (which main already has at 951 lines), **4** are ENGR&204 homework, **3** are cursor config/skills already in main, **2** add a `src/**/__tests__` file (`serene-babbage-vfli0b`, `stoic-mccarthy-yle0xd`), **1** touches `docs/integrations/`.

Name histogram of the 142 (`awk -F'|' '{n=$2; sub("origin/","",n); split(n,a,"/"); split(a[2],b,"-"); print a[1]"/"b[1]"-"b[2]}' /tmp/report_branches.txt | sort | uniq -c | sort -rn`):

| Lane prefix | Count | What it pushes |
|---|---|---|
| `claude/practical-franklin-*` | 46 | "QA rig drive on main@… owner/dispatcher/driver" |
| `claude/gallant-dijkstra-*` | 42 | "QA sweep: local-rig … drive clean" |
| `claude/inspiring-sagan-*` | 34 | "QA rig drive: full battery green" |
| `claude/eager-babbage-*` | 10 | "Verify-and-build: main@… green" |
| `cursor/*` + misc | 10 | homework, config, docs |

### Who makes them

`.cursor/automation/README.md` declares three hourly Cursor Automations on Ranvir's Cursor subscription:

| Automation | Cron | Branch |
|---|---|---|
| Integrator | `0 * * * *` | `claude/hauldesk-project-setup-l1luoo` |
| Prod smoke | `30 * * * *` | `main` |
| Deploy + backlog | `59 * * * *` | `main` |

Plus four GitHub Actions in `.github/workflows/`: `drain-integrator.yml` (`17,47 * * * *`), `drain-fallback.yml`, `main-drain-fallback.yml`, `prune-merged-branches.yml` (`23 6 * * *`).

None of those create the 142. The session agents do — each Claude Code session pushes its own `claude/<adjective>-<name>-<id>` branch when it finishes, whether or not it produced a diff.

### Why they never get merged

`.cursor/automation/loadoff-integrator.workflow.json` instructs the integrator: *"Merge the TOP pending claude/* branch (session or lane) not on main… **One branch per run.**"* That is a hard ceiling of **24 merges/day**. Measured push rate over the last three active days (`cat /tmp/code_branches.txt /tmp/report_branches.txt | cut -d'|' -f1 | cut -dT -f1 | sort | uniq -c`): 23 branches on 07-23, **30 on 07-24**, 8 so far on 07-25. Four lanes pushing hourly against one merge per hour is a structurally divergent queue — the backlog can only grow.

### Why they never get deleted

`.github/workflows/prune-merged-branches.yml:36`:

```
git branch -r --merged origin/main \
  | sed 's/^ *//' \
  | grep '^origin/claude/' \
```

`--merged` means *"tip is an ancestor of origin/main"*. A branch with one empty commit on top of an old main is **not** an ancestor of main — that empty commit exists nowhere in main's history. So a report branch that changed nothing is permanently ineligible for pruning. Confirmed empirically: 198 `claude/*` refs, only 13 are `--merged`. The prune job is doing exactly what it says and will never touch these 185.

### The fix that stops the accumulation

Two lines, both in the prune workflow, both one-time:

1. **Prune content-empty branches.** After the `--merged` pass, add a second pass that deletes any `origin/claude/*` whose `git diff --quiet $(git merge-base origin/main $b) $b` succeeds. That reclaims the 103 today and every future no-op session branch automatically. Zero risk: a branch with no tree difference from its merge base cannot contain work.
2. **Prune stale branches by age.** Anything `claude/*` older than N days (30 is generous) that is not the integrator and not `claude/lane-*`. That reclaims the rest without needing a judgement call per branch.

INFERENCE (not measured): the reason session agents push empty branches at all is that the session harness pushes unconditionally on exit. If that can be made conditional on a non-empty diff, the problem is fixed at the source instead of swept up daily. MISSING: the session-launch config that does the push — it is not in this repo; collect it from the Claude Code / Cursor background-agent settings.

---

## 5. Adjacent findings that fell out of the triage

- **`seed:demo` is why every integration reads "0 creds / never synced".** `scripts/seed-demo.mjs:106` TRUNCATEs `hub.api_credentials` on every run. Live check: `psql -tAc "select count(*) from hub.api_credentials"` → **0**. So the `connections:check` output showing 8 providers "live" with `creds:0` is the seed doing its job, not a broken adapter. `src/lib/hub/integrations/registry.ts:18-19` defines the words: `"live" // client implemented and activatable with credentials`, `"stub" // credentials UI only — client not yet built`. No adapter routes to a mock at runtime (`grep -rn 'integrations/mock' src/lib/hub/integrations/*.ts` → no hits). So "live" means the adapter is wired and would work *if* credentials existed; today none do.
- **Every Vercel build runs migrations.** `vercel.json:2` is `"buildCommand": "node scripts/hub-migrate.mjs --if-db && npm run build"`; the rationale is in `scripts/hub-migrate.mjs:26-28`. Combined with the ground-truth fact that the build hard-depends on `fonts.googleapis.com` being reachable, a Google Fonts outage blocks *both* the deploy and the schema catch-up. One-line production risk, worth an environment-level font self-host.
- **Zero of the 60 code-carrying branches touch deadhead.** Grepping the changed-file list of all 58 for `deadhead|invoice|aging|receivab|settle|money|factor|ifta|expenses|reports` returns **9** branches (`awesome-hypatia-hj5b2c`, `charming-dirac-m8b4ig`, `pensive-allen-1wsr8h`, `pensive-allen-smw0re`, `relaxed-volta-fwzde0`, `relaxed-volta-vcc9qu`, `stoic-mccarthy-b5gw3k`, `cursor/bc-acca3c16…`, `docs/claude-spec-review`) — lane leaderboards, settlements and IFTA. Only the two IFTA ones are both unlanded and mergeable. Not one filename in the set matches `deadhead`. `git grep -i deadhead origin/main -- src` shows the metric already exists (`src/lib/hub/__tests__/kpi.test.ts` has 9 hits, `reports/owner/page.tsx` has 7). `git grep -iE "daysSalesOutstanding|\bDSO\b|days_sales" origin/main -- src` returns **nothing** — DSO is not a concept in this codebase. **This is evidence for Ranvir's prior, not against it:** the agent fleet has spent ~200 branches on driver-PWA colour tokens, duplicate NotificationsBell races, and E2E smoke repair, and has never once shipped work against the two levers he says are worth the most. The branches are not the place to fix that; the lane prompts are.

---

## 6. Executable cleanup plan

Not executed — run these yourself. Requires push access to `ranvir01/thind-transport-website`; this session has none. Take a safety net first (a bundle is cheap and makes every deletion reversible):

```bash
cd /path/to/thind-transport-website
git fetch origin --prune

# 0. Safety net — one file, restores any deleted branch later.
git bundle create ~/loadoff-branches-2026-07-25.bundle --all   # ~all 233 refs

# 1. Land the 3 keepers BEFORE deleting anything.
git checkout -b ifta-due-date origin/main
git cherry-pick $(git rev-list origin/main..origin/claude/relaxed-volta-fwzde0)      # IFTA overdue off-by-31-hours
git cherry-pick $(git rev-list origin/main..origin/claude/relaxed-volta-vcc9qu)      # worksheet totals -- expect 1 import conflict at page.tsx:1
git cherry-pick $(git rev-list origin/main..origin/claude/serene-babbage-vfli0b)     # gettingStartedState tenancy test
npx vitest run && npx tsc --noEmit
```

Then delete. Each line below is one `git push`; counts are exact as of main@c52ec254.

```bash
# --- 2a. 103 branches: report-only, ZERO file changes. Pure noise refs. ---
for b in $(git branch -r | sed 's/^ *//' | grep '^origin/claude/'); do
  base=$(git merge-base origin/main "$b") || continue
  git diff --quiet "$base" "$b" && echo "${b#origin/}"
done > /tmp/empty.txt
wc -l /tmp/empty.txt                      # expect 103
split -l 40 /tmp/empty.txt /tmp/eb-
for f in /tmp/eb-*; do git push origin --delete $(tr '\n' ' ' < "$f"); done

# --- 2b. 56 code-carrying branches, all superseded or unmergeable. ---
#         (48 claude/* + 7 cursor/* + 1 docs/*)
git push origin --delete \
  claude/awesome-hypatia-hj5b2c claude/charming-dirac-m8b4ig \
  claude/compassionate-bell-4vi5ih claude/compassionate-bell-8r88rj claude/compassionate-bell-zef4dj \
  claude/eager-babbage-0jlgig claude/eager-babbage-2wt0cm claude/eager-babbage-6szuwp \
  claude/eager-babbage-7o17sq claude/eager-babbage-x9omlp \
  claude/eloquent-mendel-w6e4qz claude/friendly-darwin-7w0afx \
  claude/gallant-dijkstra-2k3iii claude/gallant-dijkstra-nzssam \
  claude/inspiring-sagan-dudz2p claude/inspiring-sagan-dwlb9b claude/inspiring-sagan-dxrcf3 \
  claude/inspiring-sagan-fay19v claude/inspiring-sagan-ffzzx0 claude/inspiring-sagan-k8x2rx \
  claude/inspiring-sagan-m0senq claude/inspiring-sagan-ml07m2 claude/inspiring-sagan-nvkjbh \
  claude/inspiring-sagan-o0337m claude/inspiring-sagan-o5rb47 claude/inspiring-sagan-oeeur9 \
  claude/inspiring-sagan-pl9yi0 claude/inspiring-sagan-posqqo claude/inspiring-sagan-qrnct7 \
  claude/inspiring-sagan-rj2xql claude/inspiring-sagan-yooevw
git push origin --delete \
  claude/pensive-allen-1wsr8h claude/pensive-allen-6gmrh4 claude/pensive-allen-6tmehe \
  claude/pensive-allen-ao14bb claude/pensive-allen-bgqbgg claude/pensive-allen-kpjskl \
  claude/pensive-allen-lz41rp claude/pensive-allen-pd71ho claude/pensive-allen-smw0re \
  claude/stoic-mccarthy-08z45u claude/stoic-mccarthy-6modfo claude/stoic-mccarthy-97wgd7 \
  claude/stoic-mccarthy-b5gw3k claude/stoic-mccarthy-b7ofn4 claude/stoic-mccarthy-ck1gtr \
  claude/stoic-mccarthy-p7dtl2 claude/stoic-mccarthy-smz6m4
git push origin --delete \
  cursor/bc-acca3c16-e552-4658-90f9-242a245ada28-052a \
  cursor/carrier-information-update-a8a5 \
  cursor/driver-application-pipeline-mobile-f5d2 \
  cursor/google-business-profile-description-95f4 \
  cursor/hauldesk-improvement-cycle-e59f \
  cursor/improve-faq-scrolling-experience-fc55 \
  cursor/video-script-and-research-89e2 \
  docs/claude-spec-review

# --- 2c. 38 report branches that DID touch a file (docs/claude-routines.md, homework, landed config). ---
git push origin --delete \
  claude/amazing-meitner-0r0bvi claude/stoic-mccarthy-yle0xd \
  claude/eager-babbage-5zw6r9 claude/eager-babbage-bt3tpc claude/eager-babbage-cwnjh8 \
  claude/eager-babbage-queewe claude/eager-babbage-tgg0vn \
  claude/practical-franklin-04g7du claude/practical-franklin-0tydri claude/practical-franklin-154w8x \
  claude/practical-franklin-1ayzhs claude/practical-franklin-1jv6wv claude/practical-franklin-39t62h \
  claude/practical-franklin-5vtdnl claude/practical-franklin-9od1hc claude/practical-franklin-9ygl6a \
  claude/practical-franklin-coeiae claude/practical-franklin-evlyyd claude/practical-franklin-fa5iqs \
  claude/practical-franklin-h0tixq claude/practical-franklin-hb7bak claude/practical-franklin-hddqf4 \
  claude/practical-franklin-i99izm claude/practical-franklin-kcmzh4 claude/practical-franklin-lz1okf \
  claude/practical-franklin-mcthht claude/practical-franklin-pbhfdi claude/practical-franklin-pgjl4n \
  claude/practical-franklin-w3l4o3 claude/practical-franklin-wyu2wl claude/practical-franklin-y2j5oo
git push origin --delete \
  cursor/cloud-dev-environment-agents-b108 cursor/dependency-security-review-3c53 \
  cursor/website-finalization-skills-b6ef \
  cursor/engr-204-final-cheatsheet-394a cursor/engr204-final-cheatsheet-1465 \
  cursor/engr204-final-cheatsheet-d557 cursor/engr204-ultimate-cheatsheet-be30

# --- 3. Stop it coming back (edit .github/workflows/prune-merged-branches.yml). ---
#     Add a second pass after the --merged pass: delete any origin/claude/* where
#     `git diff --quiet $(git merge-base origin/main $b) $b` succeeds (content-empty),
#     plus any claude/* with no commit in 30 days, excluding the integrator and claude/lane-*.
```

Branches removed per block: **2a = 103**, **2b = 56** (31 + 17 + 8), **2c = 38** (31 + 7). Total **197**. Survivors: `main`, `origin/HEAD`, the integrator `claude/hauldesk-project-setup-l1luoo`, the 13 already-merged `claude/*` (which the daily prune job will take), the 3 keepers from step 1, and whatever the fleet pushed after this doc was generated.

Verify with `git branch -r | wc -l` — expect roughly 233 - 197 ≈ 36 immediately after.

---

## 7. What this is worth

Ranked by dollars-per-hour-of-owner-time, honestly:

| Item | Size | Why |
|---|---|---|
| Fix the prune workflow | **Compounding; the only item here that is** | Measured inflow is 23/30/8 branches on 07-23/24/25 against a hard ceiling of 1 integrator merge/hour (`loadoff-integrator.workflow.json:14`, "One branch per run"). Without a content-empty prune pass the backlog regrows at the observed rate. MISSING to price it: minutes Ranvir actually spends per `npm run agent:branches` read and how often he runs it — not recorded anywhere in this repo. |
| Delete 197 branches | **One-time ~20 min of pushes** | `npm run agent:branches` currently returns 200 rows of which 197 are noise. Recurring saving is real but unpriced — same MISSING as the row above. Do not claim an hours/yr number without it. |
| IFTA overdue fix (`fwzde0`) | **Small — but free, 10 min to land** | Compliance wall reads red 31 h before the filing is actually late, every quarter (`ifta.ts:194`, `ifta/page.tsx:44`). Not a dollar lever; a "stop crying wolf" lever, which matters because an alarm that lies gets ignored on the day it is true. |
| IFTA worksheet totals (`vcc9qu`) | **Small.** ~1 h/yr *if* hand-totalling the 9-column table costs 15 min/quarter — that 15 min is an unmeasured guess, not observed | Removes hand-adding a column when transcribing to the state return (`ifta/page.tsx:169-204` has `<tbody>` and no `<tfoot>`). Land it because it is already written, not because it is worth writing. |
| `gettingStartedState` test (`vfli0b`) | **$0 now, cheap insurance** | Closes a real coverage hole on a tenant-scoped query. Free — applies clean and passes. |
| The lane prompts | **Unmeasured, probably the biggest** | 200 branches produced zero deadhead and zero DSO work (`git grep -iE "daysSalesOutstanding\|\bDSO\b\|days_sales" origin/main -- src` → no hits at all). MISSING: the lane prompt files that assign agent work — `.cursor/automation/*.prompt.md` covers the three infra lanes only; the session-agent lane definitions are not in this repo. Collect them from the Claude Code fleet config before re-pointing anything. |

Do not spend more than 90 minutes total on §6 steps 1-2. Spend the next hour on the last row.

---

```
FILES:    docs/ops/PR_TRIAGE.md (created)
PR:       none (no GitHub write access this session)
IMPACT:   197 of 200 unmerged branches are dead (103 are literally empty commits) and can be deleted in ~20 min of pushes; 3 branches are worth landing (two IFTA fixes + one tenancy test), all verified to apply clean and pass. The prune-workflow patch is the only compounding item. Recurring hours saved is MISSING -- nothing in the repo records how much time the 200-row backlog actually costs Ranvir.
NEXT:     Cherry-pick claude/relaxed-volta-fwzde0 onto main (4 base blobs identical, strict git apply --check passes, 12 tests green after apply) and run npx vitest run.
BLOCKED:  Push access — every git push --delete in §6 needs Ranvir's credential; this session's GitHub token is rejected (403). Also MISSING: the session-agent lane prompt files (not in this repo), needed to stop 200 branches of colour-token work and point the fleet at deadhead/DSO.
```

---

## Verification

Adversarial re-check on 2026-07-25 against `main@c52ec254`. Every file:line citation was opened, every SQL re-run against the seeded local Postgres, every `git` command re-executed.

**Killed (claim was wrong, removed or reversed):**

| Was claimed | What the code actually says |
|---|---|
| `cursor/hauldesk-improvement-cycle-e59f` is a MERGE keeper — main has no offline double-submit guard | **main already fixes it, and better.** `DriverIncidentForm.tsx:26` `const [queued, setQueued] = useState(false)`, set at :75, and `:84 if (queued) return` replaces the entire form with a confirmation card; `DvirForm.tsx:33/65/77` identical. Moved to CLOSE; keepers 4 → 3, deletions 196 → 197. |
| `offline-queue.ts:113` `enqueueIntent` has no dedupe, so a second tap enqueues a second crash report | Line is **120**, not 113 — and the scenario is unreachable from those two forms because main removes the button with the form. Deleted. |
| The `due < now` bug "silently undoes the weekend roll" | False. `ifta-core.ts:205-206` still rolls Sat→Mon; the bug shifts red **31 h** early uniformly. Replaced with the measured 31 h. |
| §5: money-lever grep "returns 7 branches" | Re-ran it: **9**. Corrected and the 9 named. |
| §4: "30 append to `docs/claude-routines.md`, 5 ENGR homework, 4 config" | Re-ran `git diff --name-only` per branch: **29 / 4 / 3 config / 2 src tests / 1 docs-integrations**. Corrected. |
| `7o17sq`: "7 of 8 files blob-identical" | **6 of 8**; the 7th is a test-file delta. Corrected. |
| `agent-loop-status.mjs:176` bumps `maxBuffer` | It is at **:181** (`maxBuffer: 64 * 1024 * 1024`). Corrected. |
| `agent-branch-inventory.mjs:123` carries the `process.exit` fix | **:122**. Corrected. |
| `hub-migrate.mjs` `--if-db` comment at `:28-30` | **:26-28**; also added the actual `vercel.json:2` `buildCommand` string, which was asserted but never cited. |
| Push-rate command `cut -d'\|' -f1 \| sort \| uniq -c` | Field 1 is a full ISO timestamp — that command yields one row per push, not per day. Replaced with the `cut -dT -f1` form that actually produces 23/30/8. |
| §7 dollar rows: "~6-8 h/yr", "~4 h/yr" for branch cleanup and the prune fix | No source, no stated assumption. Replaced with MISSING (minutes-per-backlog-read is recorded nowhere in the repo). The `vcc9qu` "~1 h/yr" row survives but its 15 min/quarter input is now labelled inline as a guess. |

**Confirmed unchanged (spot-checked and correct):** §1 shape table — 233 refs / 198 claude / 31 cursor / 13 merged / 58+142 / 103 `files:0` / integrator 0 ahead, all re-measured exactly. `fwzde0` strict apply CLEAN and **12 tests pass** after apply; `vcc9qu` + `vfli0b` applied on top, **10 tests pass**; `vcc9qu` conflict with `fwzde0` reproduced (`error: patch failed: …/ifta/page.tsx:1`). Every CLOSE-table line citation resolves: `dvir.ts:108`, `tasks.ts:293`, `driver.ts:71`, `NotificationsBell.tsx:84/96/101`, `seed-demo.mjs:106/468`, `e2e-onboarding-smoke.mjs:15-22/33`, `tenancy.ts:10-24`, `reports.ts:308/344`, `offline-queue.ts:139`, `package.json:90/99-101`, `.gitignore:38-40`, `e2e-lib.mjs:74`, `hub-migrate.mjs:55`, `prune-merged-branches.yml:36`. The `7o17sq` orange→`bg-accent` safety regression is real and reproduced at `DvirForm.tsx:150` and `:198`. `bc-acca3c16` re-measured at 44 commits / 65 code files / 4,952 insertions with migrations `005_mobile_sandbox_two_company` … `008_factoring_invoice_net` against main's `005_retrofits_spines` … `021_random_testing`. The four marketing branches genuinely have **empty** `git merge-base` output. `engr204-final-cheatsheet-1465` is exactly 91 files. `src/lib/email-service.ts` does not exist. SQL re-run: `select count(*) from hub.api_credentials` → **0**; the `carriers.legal_name`/`sandbox` probe → **0 rows**. DSO grep returns nothing.

**Failure modes checked for and not found:** no adapter routes to `integrations/mock` (`grep -rn 'integrations/mock' src/lib/hub/integrations/*.ts` → no hits), so the registry's `"live"` label at `registry.ts:18` is honest about the adapter being built; no invented PR numbers anywhere; the sandbox Google-Fonts build failure is correctly framed as a production risk, not a code defect; no feature is claimed to work solely because a route file exists.

**Not verified:** the per-branch `landed%` figures in §2 are a screen, not a measurement, and were not recomputed — the branch-level verdicts they accompany were each hand-checked against main's current file content instead.

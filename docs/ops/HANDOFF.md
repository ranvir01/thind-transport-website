# Handoff — what a code agent or a human still has to do

**Generated 2026-07-25.** Companion to [`TOP_10.md`](./TOP_10.md). Everything here was deliberately *not*
done in this session, with the reason. Nothing here is "we ran out of time" — each item needs production
access, Ranvir's data, or a decision an agent should not make on its own.

Two commits are ready on branch `ops/section-3-audit`:

| Commit | What |
|---|---|
| `86e77fb` | The six Section 3 audit documents + `TOP_10.md` + the weekly rollup |
| `ca1c319` | The code fixes — 51 files, 194 test files / **1737 tests passing** (baseline 189 / 1592) |

Apply with `git am < loadoff-section3-audit.patch` on `main`. `tsc --noEmit` is clean across app code.

---

## 1 — BLOCKING: legacy public blobs are still world-readable

**This is the one that matters. The code fix stops new leaks; it revokes nothing.**

Every document uploaded while `access: 'public'` was in force is still live at its absolute
`https://<store>.public.blob.vercel-storage.com/hub/<safeName>` URL — PODs, BOLs, CDL scans, medical cards,
W-9s, COIs, driver receipts, invoice PDFs, settlement statements. Any of those URLs already forwarded into
broker email or a factoring packet stays readable by anyone who has it, forever.

**The one-time production migration (needs prod blob credentials + prod DB — impossible from here):**

1. Enumerate blobs under the `hub/` prefix.
2. Re-upload each at the same pathname with `access: 'private'`.
3. Rewrite three columns from the absolute URL to `/api/hub/files/<safeName>`:
   `hub.documents.url`, `hub.invoices.pdf_url`, `hub.settlements.statement_url`.
4. Delete the public originals.

**Ranvir's decision first, because step 4 is irreversible:** making legacy blobs private hard-breaks every
URL already sent to a broker, factor or customer. Those recipients have no hub session, so the
`/api/hub/files` fallback cannot serve them either. Choose one:

- **(a) Accept the breakage.** Recipients ask for a re-send; attachments still work because
  `readStoredFileBytes` reads bytes directly and emails carry them as attachments, not links.
- **(b) Build signed, time-limited share links for external recipients first**, then migrate. More work,
  no broken links. `src/lib/hub/sharelinks.ts` already does 128-bit revocable tokens for load tracking —
  extend that rather than inventing a second mechanism.

**Related gap the migration will expose:** `portalFileVisible` (`src/lib/hub/portal.ts:243`) matches only
the internal `/api/hub/files/<name>` shape. A portal user opening a *legacy* row gets 404 today only
because portal pages still render the absolute URL straight from the DB. Converting those rows exposes it.
Needs a product call on whether broker/shipper users must reach legacy files, plus an edit to `portal.ts`.

---

## 2 — Decisions only Ranvir can make

| # | Decision | Why it can't be defaulted | Where it lands |
|---|---|---|---|
| 1 | **IFTA re-import: REPLACE or MERGE?** Today a second mileage file for a quarter replaces the first — safe against the double-count bug that was overpaying tax. MERGE is safer for a mixed-vendor fleet uploading one file per ELD. | Changes what a re-upload *means*. Merge is implementable: delete keyed on `(carrier_id, quarter, truck_id)` for trucks in the file, and read `DISTINCT ON (truck_id)` newest `run_id`, so write and read can't disagree. | `import.ts`, `ifta.ts` |
| 2 | **Auto-invoice on `pod_received`?** Deferred on purpose. `runSettlements` (`settlements.ts:113`) does not check for an invoice before paying a driver — the seed has 10 loads settled to the driver and never billed. | A policy change that touches settlements. TOP_10 #4. | `invoices.ts`, `settlements.ts` |
| 3 | **Chase draft invoices?** `runOverdueReminders` will currently dun an invoice still in `status='draft'` — one the system never emailed to the customer. | Might be right (a draft past day 3 is a forgotten invoice) or embarrassing (chasing payment for a bill nobody sent). | `invoices.ts:~349`, next to the factored/disputed skips |
| 4 | **Your real cost per mile.** `carrier_settings.cost_per_mile_cents` is falling back to the **185** default. ATRI 2025 all-in is **$2.336**. | Every lane margin, the planner's per-mile ranking and the dispatch-card margin move with this number. It has to come from your books. | Settings UI — one field |
| 5 | **Owner dashboard: bring back a payroll-inclusive net margin?** It currently shows none rather than a wrong one. | Wiring is trivial; it changes what your first screen leads with. Wants a visual check on a machine where `npm run build` can reach Google Fonts. | `reports/owner/page.tsx` |
| 6 | **Revenue base for the Reports "Net margin" tile** — today it is per-truck-assigned revenue against fleet-wide settlement pay. | Needs production data on how many delivered loads carry no `truck_id`, plus your call on whether spot/unassigned loads belong in the fleet ratio. | `reports.ts` |
| 7 | **Signup throttle budget** — currently 5 attempts / 15 min, keyed on email *and* client IP. | A NAT'd office onboarding several workspaces in one sitting hits the IP key. | `auth-throttle.ts` |
| 8 | **Carrier timezone.** `iftaLateAfter` hardcodes UTC−8 because `hub.carriers` has no timezone column. Correct for Kent WA; an Eastern carrier sees the wall go red up to 3 hours late. | Only matters when LoadOff onboards outside Pacific. Then it needs a migration + settings field. | `ifta-core.ts` |
| 9 | **1099-NEC year picker on the Money page?** The `?year=` parameter works; there is no UI for it. | Product call. Without it the parameter is reachable only by editing the URL. | `money/page.tsx` |

---

## 3 — Needs production access

| # | Task | Why |
|---|---|---|
| 1 | **Set `CREDENTIALS_KEY`** (32+ random chars) on the Vercel project. | `credentials.ts:19` throws without it and `:62` returns null — **all ten** integrations are unreachable regardless of what else you paste. Nothing has ever authenticated: `hub.api_credentials` and `hub.integration_syncs` are both 0 rows. |
| 2 | **Register `FMCSA_WEBKEY`** — free, five minutes. | Powers the daily `fmcsa-recheck` cron and the authority check in signup, which currently degrades to manual entry. |
| 3 | **Confirm `BLOB_READ_WRITE_TOKEN` and `CRON_SECRET` are set in production.** | Crons *are* running — Vercel logs show `/api/hub/cron/[job]` reaching Postgres at 2026-07-25T06:52Z — but confirm rather than infer. |
| 4 | **Upgrade to Vercel Pro, $20/mo.** | Hobby forbids commercial use, and its deploy quota already froze production on 2026-07-22 (`docs/claude-routines.md:111-114`). |
| 5 | **Audit pre-fix IFTA quarters.** Query `hub.jurisdiction_miles` for `(carrier_id, quarter)` pairs with more than one distinct `run_id` where `source='import'`. Those quarters hold double-counted miles and will drop to the newest run on the next recompute. Confirm which runs are real *before* anyone recomputes. Filed/reviewed quarters are protected by the recompute guard; **drafts are not.** |
| 6 | **Fire the `recompute-lanes` cron after deploy** (or wait for the nightly run). `hub.lanes` rows written before this change still hold the old deadhead-blind margins, and the planner's backhaul hints plus the all-time lanes CSV read that cache. |
| 7 | **Smoke the doc-intake LLM once with a real `ANTHROPIC_API_KEY`.** Nothing in this repo can prove `claude-sonnet-5` accepts this request shape — every test mocks `fetch`. The new `console.error` on a non-ok response is what will surface a failure; watch the logs on the first real document. |
| 8 | **Delete 197 dead branches.** Exact `git push --delete` commands are in `PR_TRIAGE.md` §6. Needs your credential — this session's GitHub token returns 403. Also patch `prune-merged-branches.yml:36`: it uses `--merged origin/main`, and an empty commit on an old main is never an ancestor of main, so 103 zero-diff refs can never be pruned. |
| 9 | **Cherry-pick `claude/relaxed-volta-fwzde0`** *only if* you prefer its version — the IFTA lateness fix it carries is already reimplemented in `ca1c319`, with tests. Otherwise just close it. |

---

## 4 — Data exports that unblock the dollar figures

Every number in the audit is arithmetic on seed data until these land. Ordered by how much each unblocks.

| # | Export | From | Replaces |
|---|---|---|---|
| 1 | **One month of fuel-card CSV** (`truck_unit, date, gallons, total, state`) | EFS — 35 of 36 seeded rows say EFS | The real deadhead number. Gallons × MPG gives total miles; loaded miles you already record; the difference is empty miles. **No ELD, no credential, no integration needed.** This is the cheapest path to TOP_10 #3, the largest lever in the book. |
| 2 | **Settlement register, 12 months** | Whatever pays drivers today | The driver-pay ratio behind TOP_10 #2 — `kpi.ts` now *requires* `driverPayCents` before it will emit a net margin at all |
| 3 | **Invoice + payment register, 12 months** | QuickBooks (the connector is wired but uncredentialed — export manually) | Real DSO, real AR, and the real count of delivered-but-unbilled loads |
| 4 | **Factoring agreement** — rate, advance %, recourse | Your factor. `carrier_settings` currently names "Summit Capital Factoring", which is seed fiction | Decides whether the cash-cycle lever is worth $2k or $10k/yr. Factored invoices collapse DSO to ~1 day at a flat fee, so that half of the lever is worth **$0** on them |
| 5 | **Power units + annual miles per truck** | Your MCS-150; IFTA returns for miles | Every deadhead dollar figure scales off the assumed 12 trucks × 100,000 mi/yr |
| 6 | **Fixed cost schedule** — truck notes, insurance, permits, plates, parking | One page | Turns "operating cost/mile" into all-in cost/mile, and gives you the real number for decision #4 above |

---

## 5 — Not started, and why

- **`docs/onboarding-runbook.md` does not exist**, so the under-2-hours target is unmeasurable. It should be
  written by walking a real carrier through the flow and recording what breaks — not drafted from the code.
  **ATS Transport is not in the database at all** (tenant 2 is "Cascade Demo Lines", a seed fixture), so
  onboarding ATS yourself is both the missing tenant and the timed dry run in one pass.
- **DB backup + restore drill.** Section 5 requires restoring into a scratch DB and diffing. Needs the
  production connection string.
- **Error monitoring and uptime checks.** There is no Sentry, no OpenTelemetry, no uptime service — the only
  production visibility today is Vercel's own runtime log. `/api/version` exists and would make a fine
  uptime target.
- **Apply-flow conversion is not instrumented.** Vercel Web Analytics is not enabled on the project (API
  returns 404) and `@vercel/analytics` is not a dependency. Until that changes, cost per hire and cost per
  seated truck — Section 7 lever #3 — cannot be measured at all.
- **Rate limiting on the public marketing forms.** `capture-lead`, `submit-pre-qualification`,
  `submit-application` and `schedule-meeting` have no throttle, captcha or honeypot. Each sends email; one
  builds a PDF. The signup throttle shipped in `ca1c319` covers `/hub/signup` only. The generalised
  `auth-throttle` helper is now in place, so this is a small follow-up rather than new machinery.
- **The 49 e2e smoke scripts are not in CI.** Nothing in `.github/workflows/` runs them; they execute only
  when an agent remembers to. They need a live server + DB, so wiring them up is a CI-infrastructure task.
- **`delivered_at` / `pod_received_at` are not yet on the `Load` interface** in `src/lib/hub/types.ts` —
  left untouched during the parallel pass to avoid a write-scope conflict. One-line addition.
- **The ImportWizard hint still doesn't say a mileage import REPLACES that quarter.** `importMileageAction`
  already returns `rowsReplaced` in its audit row; the wizard just needs to show it, so a destructive
  replace is visible before the upload. `src/components/hub/ImportWizard.tsx`.

---

## 6 — Two things worth knowing before you touch this code

**The verification pass earned its keep.** Making blobs private introduced a *new* vulnerability: the files
route echoed the uploader-controlled `File.type` back as `Content-Type`. Harmless while bytes came from
`*.blob.vercel-storage.com` (a foreign origin); stored XSS against every signed-in session once they were
served from the hub's own origin. Caught by the second agent, fixed with an extension allowlist plus
`X-Content-Type-Options: nosniff`, and covered by two tests that fail if reverted. Fixes to security code
need adversarial review, not just green tests.

**`kpi.ts` now fails closed.** `marginPct` and `operatingRatioPct` return `null` unless `driverPayCents` is
supplied. That is deliberate — a caller cannot accidentally render a partial cost base as net margin the way
`/hub/reports` and the owner dashboard did. If a screen suddenly shows "—" where a percentage used to be,
that is the fix working, not a regression.

```
FILES:    docs/ops/HANDOFF.md (created); 51 files changed in commit ca1c319
PR:       none — GitHub token rejected (403), gh unauthenticated this session
IMPACT:   Document PII exposure closed for new uploads; three IFTA filing bugs fixed
          (one overpaying, one underpaying, one crediting the wrong state); margin and
          lane ranking no longer computed from a cost base missing ~50% of revenue;
          the unbilled-POD clock is real and backfilled from existing event history
NEXT:     Ranvir picks (a) or (b) in §1, then the legacy-blob production migration
BLOCKED:  GitHub write access; prod blob + DB credentials; the six exports in §4,
          fuel-card CSV first
```

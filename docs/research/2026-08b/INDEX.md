# LoadOff / Thind Transport Research Packet, wave 2 — INDEX / cover sheet

**Produced:** 2026-08-08 · **Method:** 6 parallel deep-research agents (one per
unit) + 2 adversarial verification agents, grounded in the live repo working
tree (agents Read/Grep the codebase; only their own report files were written).
Units were self-scoped by the orchestrating agent — the owner's instruction was
"research and execute on ur own as well" — and the run was unattended, so all
six ran with verification on. WebFetch egress is blocked in this environment;
claims are WebSearch-verified and tagged inline ("search-verified 2026-08-08"),
with page-level fetches marked wherever one succeeded.

**Verification pass:** 75 load-bearing claims independently re-verified against
primary/current sources. **65 confirmed, 9 corrected in place, 1 softened, 0
verdicts changed.** Corrections: Radio Punjab studio number is (206) 497-1313
(directory number was stale); the Aug 2026 English-proficiency Federal Register
item is an NPRM, not a final rule; EEOC guidance dated Nov 19 not Nov 20, 2025;
Meta relaunched Facebook job listings late 2025; LoadOps volume discount starts
at 50+ drivers not 20+; Cover Whale mandates a forward cam **or** ELD connect
(dual-facing is the top tier, not the floor); HDVI Shift telematics credit is up
to 20% monthly, not 12%; WA retailing B&O rises to 0.5% on 2027-01-01 (ESHB
2081); TriumphPay's "no carrier API" narrowed to "no public self-serve API."
prompt-10 and prompt-12 survived untouched — including every compliance
deadline and the build-ready YAML.

**Second verification pass (2026-08-08, separate environment with page-fetch
capability):** the owner's Cowork session ran 6 further agents, one per
prompt, re-checking 54 load-bearing claims against the primary pages
themselves — the one thing this environment could not do. ~44 page-verified
at the source; **10 corrected (applied throughout these files), 0 due dates
moved, 0 verdicts changed** — the $30/truck GO came out stronger (AscendTMS's
free tier is gone; Truckpedia page-verifies at $449 for 15 trucks vs
LoadOff's $450). Notable corrections: DAT Pro $169, Truckstop Pro $159 is
the API tier, SONAR checkout at sonar.surf/signup, CHR has no named request
form (go through carrier services), UCR proposed fee exactly $333 under
docket FMCSA-2025-0655 (still not final), Kent business license ~$214.
Bonus finding: Cover Whale's required telemetry runs via Terminal, which
LoadOff already integrates.

**To the owner and any build agent executing against this:** each report is
self-contained, cited, and ends with the deliverable its brief specified. The
compliance YAML in prompt-12 is already wired into the product (see below).

---

## Execution order

**Same-day (owner, ~1 hour total):**
1. **MCS-150 biennial — verify/cure NOW.** USDOT 2523064 filed April of even
   years; the 2026 update was due **Apr 30, 2026** (~100 days ago if unfiled).
   Free, ~15 min at the FMCSA portal; the risk is USDOT deactivation and up to
   $1,000/day. The hub compliance wall now shows this until recorded.
2. **Form 2290 HVUT by Mon Aug 31, 2026** (~$8,250 for 15 trucks; e-file,
   stamped Schedule 1 back for IRP). Vendor blogs saying "Sep 1" are wrong.
3. **Load-board door-knocks, in this order:** C.H. Robinson carrier services
   team (free Carrier API, "no additional cost" page-verified; no named form —
   rank 1, nobody has knocked); DAT service-account email to
   developersupport@dat.com (any load-board tier allows REST; Pro $169/mo);
   Truckstop SIA email to tsi@truckstop.com (Pro $159/mo is the API tier).
   Say "in-house TMS, single org, MC 876103" — no partner program needed.
4. **Buy SONAR Quick Rates ($24.99/mo self-serve)** and **create the free
   Highway carrier profile** the same day.
5. **Call Radio Punjab at (206) 497-1313** (Kent studio; KNTS 1680 / KKDZ 1250 /
   KZIZ 1560) for a live-read quote — the only broadcast channel aimed at this
   driver pool, and the week-1 driver plan in prompt-9 costs ~$250–500 total.

**Already executed by agents (this session):**
- MCS-150 + UCR are now **derived compliance-wall entries** (verify-filed
  semantics, step-aside when recorded) — commit a9f66053, 16 tests, built from
  prompt-12's verified derivation rule.
- **ADR 0004 accepted:** Stripe Billing, ACH-first, no merchant of record
  (`docs/decisions/0004-stripe-billing-ach.md`).
- Backlog queued in `docs/ops/AGENT_TASKS.md`: insurance **renewal-packet
  export** (LoadOff already holds ~80% of a submission) and the **Stripe
  Billing build** (~4–6 agent-days behind owner gates).

**This cycle's decisions (verdicts, stated):**
- **$30/truck/mo is a GO** — squarely inside the page-verified $30–100/truck
  mid-market band, deliberately above legacy flat tools, half of Alvys/LoadOps
  at 15 trucks, and at parity with Truckpedia's verified $449; launch
  month-to-month, $0 onboarding, published pricing (prompt-11).
- **Insurance:** the premium is won 90–120 days before renewal. Quote Nirvana at
  T-90 (10+ unit dry-van fleets, ~20% upfront via ELD connect; WA availability
  unconfirmed — ask first), HDVI backup (up to 20% monthly via Shift 2.0),
  Cover Whale only after a camera decision. Connect the Sentry/TruckerCloud
  telematics credit path LoadOff already integrates (prompt-13).
- **Do not build TriumphPay**; keep moving data, never money, on carrier-side
  payments (prompt-14 hard-lines list).

**Owner-personal deadlines beyond same-day:** UCR 2027 window opens Oct 1 (check
the final fee rule ~Sep 1 — docket FMCSA-2025-0655 proposes exactly $333 for
6–20 trucks, not final as of Aug 8); WA IFTA
license renewal by Nov 30; IFTA Q3 filing by Nov 2; random-testing rates stay
50%/10% for 2026 (annual Clearinghouse limited queries, $1.25/driver).

**Phased backlog (entry triggers):** camera rollout decision → unlocks top
insurance tiers; renewal-packet export → build before the T-90 quote window;
DAT/Truckstop adapters go live as the signups above land credentials (the #1
sale-blocker for 15-truck peers per prompt-11); Parade MCP Syndication API →
watch, don't build, until GA.

---

## The files

| # | File | Bottom line |
|---|------|-------------|
| 9 | `prompt-9-driver-channels.md` | Week-1 Punjabi driver plan ≈ $250–500: WhatsApp job-card through current drivers, named Facebook groups, gurdwara flyers with permission, Radio Punjab live-read, one $25/day Indeed post as the compliant general-audience anchor; every posting needs RCW 49.58.110 wage-scale disclosure. |
| 10 | `prompt-10-loadboard-apis.md` | Knock in order CHR (free API) → DAT (any tier + service account) → Truckstop (SIA email); buy SONAR $24.99 and free Highway profile same day. No partner program needed for a 1-tenant TMS. |
| 11 | `prompt-11-tms-competitive.md` | $30/truck/mo viable and correctly positioned; only Alvys matches all six LoadOff pillars and it ships buggy updates; live load-board connectivity is the sale-blocker to fix first. |
| 12 | `prompt-12-compliance-calendar.md` | 30-row Aug 2026→Aug 2027 calendar with .gov citations + build-ready YAML (12/12 verified). Two money items inside 23 days: MCS-150 cure and Form 2290. |
| 13 | `prompt-13-insurance-levers.md` | Premium is won at T-90..120 with a LoadOff-generated submission, a connected telematics credit, and a camera decision; quote Nirvana first, HDVI backup. |
| 14 | `prompt-14-payment-rails.md` | Stripe Billing ACH-first ≈1.5% all-in beats cards (~3.7%) and MoR (5–6.5%); WA B&O owed either way (0.5% from 2027); 10-item "never without a license" list keeps LoadOff safe. |

Cross-cutting: no secrets or credentials appear anywhere in the packet (env-var
names only); ad skeletons use [PLACEHOLDER] pay values and range-with-basis
language because "up to $X" claims are a proven liability (FTC v. Lyft $2.1M;
C.R. England $37.8M); the local competitor CPM band ($0.70–0.91) sits above the
published $0.63 — flagged for the owner, constants deliberately untouched (the
no-fabricated-claims rule cuts both ways); the `stripe` SDK is MIT (dependency
gate); and the research itself found one product gap — MCS-150/UCR missing from
the derived wall — which is fixed as of this packet.

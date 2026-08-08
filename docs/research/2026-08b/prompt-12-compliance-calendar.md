# Prompt 12 — The exact 12-month compliance calendar, Aug 2026 → Aug 2027

**Carrier:** Thind Transport LLC · Kent, WA · USDOT 2523064 · MC 876103 · ~15 power units · dry van · WA IRP base / WA IFTA base
**Researched:** 2026-08-08 (America/Los_Angeles). Verification tags: **(search-verified 2026-08-08)** = confirmed in a WebSearch result this session, .gov preferred; **(computed)** = calendar arithmetic done here (day-of-week cross-checked by doomsday method); **(knowledge — stable rule)** = long-standing regulation not re-fetched today (sandbox egress blocks irs.gov/ecfr.gov/dol.wa.gov page loads); source URL still given. Direct WebFetch of .gov pages was egress-blocked, so primary-source *pages* could not be loaded — every date below traces to a .gov URL surfaced in search results unless marked otherwise.

---

## TL;DR

- **🚨 MCS-150 biennial update appears OVERDUE.** USDOT 2523064 → last digit **4** = April, next-to-last digit **6** (even) = even years → was due **April 30, 2026**. If it wasn't filed this spring, file today (free, ~15 min online); exposure is USDOT deactivation + up to $1,000/day (max $10,000).
- **Form 2290 HVUT due Monday, Aug 31, 2026** for period Jul 1 2026–Jun 30 2027 (~$8,250 for 15 trucks at 75,000+ lbs). No weekend roll this year — third-party sites claiming "Sept 1, 2026" are wrong (Aug 31, 2026 is a Monday; Labor Day is Sep 7).
- **UCR 2027 window opens Oct 1, 2026;** enforcement Jan 1, 2027. 2026 fee for 6–20 power units was **$276**; FMCSA has *proposed* ~20% higher 2027 fees — exactly **$333** for this bracket under docket **FMCSA-2025-0655** (corrected on page-verification 2026-08-08; still NOT final as of that date) — final rule expected by ~Sep 1, 2026, so check the final number before paying.
- **IFTA quarters (weekend-rolled):** Q3-26 → **Mon Nov 2, 2026**; Q4-26 → **Mon Feb 1, 2027**; Q1-27 → **Fri Apr 30, 2027**; Q2-27 → **Mon Aug 2, 2027**. Matches the hub's `iftaDueDate()` engine exactly.
- **WA IFTA license expires Dec 31, 2026** — submit renewal before **Nov 30, 2026**; grace runs into February 2027 only if the renewal was filed on time.
- **Random testing 2026: 50% drug / 10% alcohol** of average driver positions (unchanged since 2020, so no new Federal Register notice was required). Watch December 2026 for the CY2027 announcement.
- **Clearinghouse:** one query per driver per rolling 365 days (limited query + general consent is enough); every new hire needs a **full** pre-employment query with in-portal consent ($1.25 each). Clearinghouse-II is live: WA DOL must downgrade the CDL of any driver who goes "prohibited" (60-day clock).
- **WA IRP renewal is fleet-specific** (DOL mails the renewal ~90 days before your fleet's expiration) — the exact month must be read off the cab card / compliance wall; it is not a single statewide date.
- **Rolling, per-entity items** (each truck's annual §396.17 inspection, each driver's med card ≤24 months, annual MVR review, quarterly random draws) are already modeled in the hub — the calendar rows below only anchor the *cadence*.
- **CVSA Roadcheck 2027 projected May 11–13, 2027** (inference from 2024–26 pattern; 2026 was May 12–14). Not a filing — a be-inspection-ready window.

---

## Task 1 — Federal recurring filings with exact 2026–27 dates

### 1a. Form 2290 — Heavy Vehicle Use Tax (HVUT)

| Item | Value | Source |
|---|---|---|
| Tax period | **July 1, 2026 – June 30, 2027** | IRS "When Form 2290 taxes are due"; Instructions for Form 2290 (rev. 07/2026) (search-verified 2026-08-08) |
| Annual due date (vehicles in service in July) | **Monday, August 31, 2026** | Same; day-of-week (computed) |
| Trucks added mid-year | File by the **last day of the month after first-use month** (e.g., first used Oct → due Nov 30) | IRS i2290 (search-verified 2026-08-08) |
| Tax | $100 at 55,000 lbs + $22 per 1,000 lbs, capped **$550** at 75,000+ lbs → **~$8,250 for 15 maxed trucks** | 26 U.S.C. §4481; mirrored exactly in repo `src/lib/hub/hvut.ts` (knowledge — stable rule; repo-corroborated) |
| E-file rules | **Mandatory when reporting 25+ vehicles; encouraged for all.** At 15 units Thind may paper-file but should e-file — watermarked Schedule 1 comes back in minutes | IRS Trucking Tax Center / i2290 (knowledge — stable rule) |
| Why it can't slip | The **stamped Schedule 1 is required for IRP plate renewal** (WA DOL will not renew apportioned registration without proof of HVUT payment) | Standard IRP practice; owner checklist already flags "blocks plate renewal" |

**⚠ Date-quality note:** one commercial e-file site (ez2290 blog) claims the 2026 deadline is "September 1, 2026, because Aug 31 falls on a weekend/Labor Day." That is **false for 2026**: Aug 31, 2026 is a **Monday** and Labor Day is Sep 7, 2026 (computed). The confusion is a carry-over from 2025, when Aug 31 fell on a Sunday followed by Labor Day Sep 1, pushing that year's deadline to Sep 2, 2025. The IRS rule (roll to next business day only when the due date is a Saturday/Sunday/legal holiday) does not fire in 2026. **Plan for Aug 31, 2026.**

### 1b. UCR — Unified Carrier Registration, 2027 registration year

- **Window opens Oct 1, 2026** (three-month registration period Oct–Dec); **fees due Jan 1, 2027**, when state enforcement can begin (search-verified 2026-08-08, FMCSA NPRM summary).
- **Bracket for 15 power units = bracket 3 (6–20 power units).** UCR counts self-propelled CMVs (trailers don't count) (knowledge — stable rule, 49 U.S.C. §14504a(a)(1)(A)).
- **Current (2026 registration year) fee table** — unchanged from 2025, finalized in FR doc 2026-06726 context (search-verified 2026-08-08): 0–2: **$46** · 3–5: **$138** · **6–20: $276** · 21–100: $963 · 101–1,000: $4,592 · 1,001+: $44,836. Codified at 49 CFR §367.50.
- **2027 fees are NOT final as of 2026-08-08.** FMCSA's NPRM (91 FR 17618, Apr 7, 2026, docket 2026-06726) proposes an **average +20%** (increases of $9–$9,329 by bracket) to cover a $21.79M shortfall; comment period was extended to May 26, 2026; the UCR Board asked FMCSA to finalize **by ~Sep 1, 2026** so collections can open Oct 1. **Bracket-3 2027 ≈ $331 (inference: $276 × 1.2 — exact figure sits in the NPRM table which could not be page-loaded; confirm in the final rule before paying).**
- Washington **participates** in UCR; the WA state UCR agency is the **WA UTC** (utc.wa.gov/UCR), but filing happens at the national portal **plan.ucr.gov** (search-verified 2026-08-08).

### 1c. MCS-150 biennial update — **derivation for USDOT 2523064, and a loud flag**

FMCSA rule (49 CFR §390.19 / §390.201(d)(2); fmcsa.dot.gov/registration/updating-your-registration — search-verified 2026-08-08):

- **Last digit** of USDOT number sets the **month** (1 = Jan … 9 = Sep, 0 = Oct).
- **Next-to-last digit** sets the **year parity**: odd digit → every odd-numbered year; even digit → every even-numbered year.

Derivation for **2 5 2 3 0 6 4**:
- Last digit **4 → April** (file by the last day of the month).
- Next-to-last digit **6 → even → every even-numbered year**.
- → Biennial update was due **April 30, 2026**; the next ones fall **April 30, 2028**, April 30, 2030, …

> ### 🚨 OVERDUE FLAG — CHECK THIS FIRST
> Today is **Aug 8, 2026** — more than three months past this carrier's April 30, 2026 biennial deadline. **If no MCS-150 was filed in 2026, Thind Transport is currently delinquent.** Consequences per FMCSA: **deactivation of the USDOT number** and civil penalties **up to $1,000/day, max $10,000** (search-verified 2026-08-08). Cure: file the update immediately (free) via URS/my.fmcsa (Login.gov + PIN). Filing now does **not** move the schedule — the next one is still April 2028. Also remember the separate rule: refile within 30 days of any change in address, fleet size, or mileage. *An agent can pre-fill every field from hub data; the actual submission needs the owner's Login.gov/PIN.*

### 1d. BOC-3 — designation of process agents

**One-time filing, not annual** (49 CFR Part 366). For motor carriers it must be filed **electronically by the process-agent company itself** (blanket agents, ~$20–$50 one-time market rate). Thind necessarily has one on file — operating authority MC 876103 could not have been granted without it. **Verify only**: it must be re-filed if the agent company changes/lapses or if FMCSA requests. Check current agent on FMCSA's Licensing & Insurance carrier search (li-public.fmcsa.dot.gov) (knowledge — stable rule; fmcsa.dot.gov/registration/form-boc-3-designation-agents-service-process).

### 1e. Supervisor training & annual program obligations

- **Reasonable-suspicion supervisor training (49 CFR §382.603): one-time, not annual** under FMCSA — 60 min on drug indicators + 60 min on alcohol, completed before a supervisor makes reasonable-suspicion determinations. Action item: confirm documentation exists for every current dispatcher/supervisor; train new ones before they supervise drivers (knowledge — stable rule).
- The genuinely **annual** obligations are the **Clearinghouse query per driver** (Task 2) and the **MIS data report by March 15 — only if FMCSA selects the carrier** for that year's survey (49 CFR §382.403) (knowledge — stable rule).

---

## Task 2 — Drug & alcohol program, 2026

### 2a. 2026 random-testing minimum rates

**Drug: 50% · Alcohol: 10%** of the average number of driver positions, unchanged for CY2026 (search-verified 2026-08-08 — Land Line / Foley / DOT ODAPC table). Because the rates did not change, **FMCSA was not required to publish a new Federal Register notice for 2026**; the operative rate-setting notice remains the one that raised drug testing to 50% effective Jan 1, 2020 (84 FR 71771, Dec 27, 2019 — govinfo PDF FR-2019-12-27/2019-27902). Mechanism: 49 CFR §382.305 — the drug rate stays at 50% while the industry positive rate is ≥1.0%. Selections must be random, spread reasonably through the year — the hub's quarterly draw (`src/lib/hub/random-testing.ts`) satisfies this. **Watch December 2026** for the CY2027 rate announcement at transportation.gov/odapc/random-testing-rates.

### 2b. Clearinghouse queries (49 CFR §382.701) — all search-verified 2026-08-08 against clearinghouse.fmcsa.dot.gov

| Query | When | Consent | Notes |
|---|---|---|---|
| **Annual query — every employed CDL driver** | At least once per **rolling 365 days** per driver | **Limited query** is sufficient; needs **general consent obtained outside the portal** (written, may cover multiple years) | If a limited query shows information exists → full query within 24 h or pull the driver from safety-sensitive duty. Practical pattern: run the whole roster each January. **$1.25/query** (knowledge — stable price; query plan at clearinghouse.fmcsa.dot.gov) → ~$19/yr for 15 drivers |
| **Pre-employment — every new hire** | Before first CMV operation | **Full query only** — limited not allowed; driver consents **electronically inside the portal** | Pairs with the pre-employment drug test (§382.301) and 3-yr previous-employer investigation (§391.23/§382.413) |

### 2c. Clearinghouse-II (state-license downgrade) — in effect

Since **Nov 18, 2024**, State Driver Licensing Agencies must (search-verified 2026-08-08, clearinghouse.fmcsa.dot.gov CDL-Downgrades FAQ):
- query the Clearinghouse before issuing/renewing/upgrading/transferring any CLP/CDL, and
- **remove commercial privileges (downgrade) within 60 days** of a driver entering "prohibited" status, restored only after return-to-duty.

Operational meaning for Thind: a positive test now costs the driver the *license itself*, not just the seat — so the compliance wall's CDL-expiry tracking can silently catch a downgrade, and pre-employment full queries are the only shield against hiring someone already prohibited.

---

## Task 3 — IFTA + IRP + Washington/Kent items

### 3a. IFTA quarterly returns, Q3-2026 → Q2-2027 (WA DOL, License eXpress / TAP)

Rule: due the **last day of the month after the quarter ends**; if that lands on a Saturday/Sunday (or legal holiday), the due date is the **next business day** (IFTA Procedures Manual **P1040** — the exact rule the repo's `iftaDueDate()` implements and documents; iftach.org). Day-of-week rolls below are (computed) and agree with the repo engine:

| Quarter | Nominal due | Day it lands | **Actual 2026–27 due date** |
|---|---|---|---|
| Q3 2026 (Jul–Sep) | Oct 31, 2026 | Saturday | **Mon Nov 2, 2026** |
| Q4 2026 (Oct–Dec) | Jan 31, 2027 | Sunday | **Mon Feb 1, 2027** |
| Q1 2027 (Jan–Mar) | Apr 30, 2027 | Friday | **Fri Apr 30, 2027** (no roll) |
| Q2 2027 (Apr–Jun) | Jul 31, 2027 | Saturday | **Mon Aug 2, 2027** |

No WA filing fee; remit net tax due (varies with miles/fuel by jurisdiction). File even for zero-activity quarters.

**WA IFTA license renewal:** licenses run calendar-year and **expire Dec 31, 2026**. WA DOL guidance: submit the renewal **before Nov 30, 2026** to get 2027 credentials in time; **2027 decals may be displayed from Dec 1, 2026**; a **grace period into February 2027** applies only if the renewal was submitted on time (search-verified 2026-08-08 — dol.wa.gov "Get your license and decals: IFTA" + TruckingOffice WA guide; grace mechanics per IFTA Articles R655). Decal cost is nominal, per-vehicle (verify current WA fee at renewal — not pinned to a primary source today).

### 3b. WA IRP (prorate) renewal — Department of Licensing, Prorate & Fuel Tax Services

- WA apportioned registrations run a **12-month registration year specific to the fleet**; DOL **mails/posts the renewal ~90 days before your fleet's expiration** and renewals are processed in License eXpress "Prorate Online" (search-verified 2026-08-08 — dol.wa.gov process-IRP-renewal + irpregistrationservices.com/jurisdiction/washington).
- **Public sources do not pin one statewide month** (WA is not a universal Dec-31 state) — **action: read the fleet's expiration month off any cab card**; the hub compliance wall already stores per-truck `registration_expiry`, so the true date is in the owner's own data. Flagged here as *verify-from-cab-card* rather than guessed.
- Renewal needs: mileage by jurisdiction for the Jul 1 2025–Jun 30 2026 reporting year, **stamped 2290 Schedule 1**, fees vary by mileage mix (RCW 46.87). Keep both cab cards in-truck during changeover (WAC 308-91-040, search-verified 2026-08-08).

### 3c. Washington state & City of Kent

| Item | What/when | Source |
|---|---|---|
| **L&I workers'-comp quarterly report + premium** | Q1 → Apr 30 · Q2 → Jul 31 · Q3 → **Oct 31, 2026** (Sat — file by Fri Oct 30) · Q4 → **Jan 31, 2027** (Sun — file by Fri Jan 29). L&I publishes the fixed dates; no official weekend-roll was verified, so file the business day *before* | lni.wa.gov/insurance/quarterly-reports/file-quarterly-reports (search-verified 2026-08-08) |
| **WA business license (UBI) renewal** | Annual via DOR Business Licensing Service, on the account's own renewal date (DOR sends notice). Small state renewal fee + any endorsements | dor.wa.gov/manage-business (search-verified 2026-08-08) |
| **Paid Family & Medical Leave / ESD quarterly** | Same quarter-end cadence as L&I (end of following month) — bundle with L&I filing dates | knowledge — stable practice; verify in Employer Account Management Services |
| **City of Kent business license** | **Expires Dec 31 each year; renewal ≈ $214/yr for 0–24 employees** (corrected on page-verification 2026-08-08 — the ~$101 figure is the independent-contractor rate; confirm on Kent's 2026 fee schedule); city mails renewal invoices in January | kentwa.gov/pay-and-apply/apply-for-a-business-license |
| **WA UTC intrastate authority** | **Only relevant if Thind hauls loads with BOTH origin and destination inside WA.** Intrastate for-hire common carriers of general freight need a UTC common-carrier permit (RCW 81.80) + **Form E** insurance certificate ($750k CSL for >10,000 lb vehicles). As a pure interstate carrier Thind needs none of this; there is no annual UTC date on this calendar unless a permit is ever obtained | utc.wa.gov common-carriers page (search-verified 2026-08-08) |

### 3d. UCR ↔ WA note

WA participates in UCR (state agency = UTC), so the Oct–Dec UCR filing in Task 1b **is** the WA-side obligation; there is no separate WA UCR form (search-verified 2026-08-08).

---

## Task 4 — Insurance and periodic proofs

- **MCS-90 endorsement + BMC-91/91X filing (49 CFR Part 387; §387.7, §387.15, §387.313):** the **insurance company files** the BMC-91 (single policy) or BMC-91X (stacked) electronically with FMCSA and keeps it evergreen; the MCS-90 endorsement lives on the policy itself. Cancellation requires **30 days' notice to FMCSA** (35 days between the parties); a lapse with no replacement filing → *involuntary revocation* proceedings and OOS. **Carrier's only calendar duty: at every policy renewal (date is in the hub's `insurance_expiry`), confirm the new filing shows "Active" on li-public.fmcsa.dot.gov within days** (search-verified 2026-08-08 — industry compliance sources; CFR cites knowledge — stable rule).
- **Annual vehicle inspections (49 CFR §396.17):** every CMV — **tractors and trailers** — must pass a periodic inspection **every 12 months** (qualified inspector per §396.19); keep the report/sticker evidence **14 months** (§396.21(b)). WA runs no substitute mandatory state periodic-inspection program, so these are carrier-arranged (can ride along with PM services). Per-unit anniversaries → tracked as `inspection_due` in the compliance wall (knowledge — stable rule; ecfr.gov).
- **Driver files:** medical certificates max **24 months** (§391.45), per-driver expiries already on the compliance wall. Since **June 23, 2025**, the Medical Examiner's Certification Integration rule has certified MEs transmitting results to FMCSA electronically and FMCSA pushing them to state licensing agencies — CDL drivers stop shuttling paper med cards to WA DOL (knowledge — stable rule; fmcsa.dot.gov National Registry). **Annual MVR review (§391.25):** pull the MVR from each licensing state and formally review it **at least once every 12 months** per driver (keep in DQ file 3 years, §391.51); the old separate annual driver "certificate of violations" (§391.27) was folded into this review by FMCSA's 2022 rule — one annual artifact per driver now (knowledge — stable rule).
- **CVSA International Roadcheck:** 2026 ran **May 12–14** (cvsa.org, search-verified 2026-08-08; focus: ELD tampering + cargo securement). Pattern 2024: May 14–16, 2025: May 13–15, 2026: May 12–14 — all Tue–Thu mid-May. **2027 projection: May 11–13, 2027** *(inference from pattern; CVSA announces officially in early spring 2027)*. Not a filing — a readiness window: DVIRs tight, permit books current, ELDs clean.

---

## Deliverable — chronological compliance calendar, Aug 2026 → Aug 2027

Legend for "Agent?": **yes** = an agent can complete it end-to-end from hub data · **prep** = agent computes/pre-fills everything, owner supplies credential/signature/payment · **no** = owner or third party (e.g., insurer) must act.

| Date (2026–27) | Obligation | Who files | Cost | Statute / source | Agent? |
|---|---|---|---|---|---|
| **OVERDUE — was due 2026-04-30** | **MCS-150 biennial update** (USDOT 2523064: last digit 4 = April, next-to-last 6 = even years). Verify filed; if not, file immediately | Owner (Login.gov/PIN) | $0 (penalty ≤$1,000/day, max $10,000) | 49 CFR 390.19; fmcsa.dot.gov/registration/updating-your-registration | prep |
| Aug 2026 (now) | Verify **BOC-3** blanket agent still on file (one-time filing; re-file only on agent change) | Process-agent co. | $0 (agent ~$20–50 one-time) | 49 CFR Part 366; li-public.fmcsa.dot.gov | yes (verify) |
| **Mon Aug 31, 2026** | **Form 2290 HVUT**, period 7/1/26–6/30/27, all 15 trucks; e-file → stamped Schedule 1 (needed for IRP renewal) | Owner/accountant | **~$8,250** (15 × $550) + ~$20 e-file fee | 26 U.S.C. 4481; irs.gov/businesses/small-businesses-self-employed/when-form-2290-taxes-are-due | prep |
| ~Sep 1, 2026 | Check **UCR 2027 final fee rule** (NPRM proposed +20%; final expected by ~Sep 1) | — (watch item) | $0 | 91 FR 17618 (Apr 7, 2026), docket FMCSA-2026-06726 | yes |
| **Thu Oct 1, 2026** | **UCR 2027 registration window opens** (file any time Oct–Dec) | Owner via plan.ucr.gov | $276 if 2026 fees carry over; **$333 proposed** (bracket 6–20, docket FMCSA-2025-0655) | 49 U.S.C. 14504a; 49 CFR 367.50; plan.ucr.gov/fee-brackets | prep |
| Fri Oct 30, 2026 | **WA L&I Q3 report + premium** (printed due date Sat Oct 31 — file the business day before) | Owner/bookkeeper | Premium varies (hours × rate) | lni.wa.gov/insurance/quarterly-reports | prep |
| **Mon Nov 2, 2026** | **IFTA Q3-2026 return** (nominal Oct 31 = Saturday → next business day) | Owner via License eXpress | Net tax varies; $0 filing fee | IFTA Procedures Manual P1040; dol.wa.gov IFTA | prep |
| **Mon Nov 30, 2026** | **WA IFTA renewal submitted** (license expires Dec 31; on-time filing preserves the Jan–Feb grace) | Owner via License eXpress | Nominal per-vehicle decal fee | dol.wa.gov "Get your license and decals: IFTA" | prep |
| Tue Dec 1, 2026 | 2027 IFTA decals may go on trucks | Shop | — | dol.wa.gov IFTA | yes (task out) |
| Dec 2026 | **CY2027 random rates announced** (FMCSA/ODAPC) — update hub `randomTesting` percentages if changed | — (watch item) | $0 | 49 CFR 382.305; transportation.gov/odapc/random-testing-rates | yes |
| **Thu Dec 31, 2026** | **UCR 2027 registration completed** (recommended by year-end; enforcement starts Jan 1) | Owner | $276 / $333 proposed (see above) | plan.ucr.gov | prep |
| **Thu Dec 31, 2026** | **City of Kent business license year ends** (~$214 renewal, 0–24 employees; invoices mailed Jan) + confirm WA UBI/BLS renewal current | Owner | ~$214 (Kent, page-verified) + state renewal | kentwa.gov business licenses; dor.wa.gov | prep |
| **Thu Dec 31, 2026** | **WA IFTA license expires**; 2027 credentials take over (grace into Feb only if renewed on time) | — | — | dol.wa.gov IFTA | — |
| **Fri Jan 1, 2027** | UCR 2027 enforcement begins; CY2027 random-testing year opens (Q1 pool draw) | — | — | 49 CFR 382.305 | yes (draw) |
| ~Fri Jan 15, 2027 | **Annual Clearinghouse limited queries — all ~15 drivers** (satisfies the rolling-365-day rule for the year; general consents on file) | Owner/TPA in portal | **$1.25/driver ≈ $19** | 49 CFR 382.701(b); clearinghouse.fmcsa.dot.gov | prep |
| Fri Jan 29, 2027 | **WA L&I Q4-2026 report** (printed due Sun Jan 31 — file business day before) | Owner/bookkeeper | Premium varies | lni.wa.gov | prep |
| **Mon Feb 1, 2027** | **IFTA Q4-2026 return** (nominal Jan 31 = Sunday → next business day) | Owner | Net tax varies | IFTA P1040; dol.wa.gov | prep |
| **Mon Mar 1, 2027** | IFTA grace period over — 2027 license/decals must be displayed | — | — | IFTA Articles R655; dol.wa.gov | — |
| **Mon Mar 15, 2027** | **DOT MIS drug/alcohol report — ONLY if FMCSA selects Thind** (notice arrives ~Jan–Feb) | Owner/consortium | $0 | 49 CFR 382.403 | prep |
| Apr 2027 | Q2 random pool draw; **next MCS-150 NOT due until Apr 30, 2028** (after 2026 filing is cured) | — | — | 49 CFR 382.305; 390.19 | yes |
| **Fri Apr 30, 2027** | **IFTA Q1-2027 return** (weekday — no roll) **+ WA L&I Q1 report** | Owner | Net tax / premium vary | IFTA P1040; lni.wa.gov | prep |
| **May 11–13, 2027 (PROJECTED)** | **CVSA International Roadcheck 2027** — inspection-readiness window (*inference from 2024–26 mid-May Tue–Thu pattern; 2026 was May 12–14. Confirm when CVSA announces*) | — (readiness) | $0 | cvsa.org/news/2026-roadcheck (pattern) | yes (prep packet) |
| **Wed Jun 30, 2027** | HVUT period 2026–27 ends; lock VIN/weight list for the new 2290 | — | — | 26 U.S.C. 4481 | yes |
| **Thu Jul 1, 2027** | New HVUT period 2027–28 begins; IRP mileage-reporting year 7/1/26–6/30/27 closes for the next renewal | — | — | IRS i2290; IRP Plan | yes |
| Fri Jul 30, 2027 | **WA L&I Q2 report** (printed due Sat Jul 31) | Owner/bookkeeper | Premium varies | lni.wa.gov | prep |
| **Mon Aug 2, 2027** | **IFTA Q2-2027 return** (nominal Jul 31 = Saturday → next business day) | Owner | Net tax varies | IFTA P1040; dol.wa.gov | prep |
| **Tue Aug 31, 2027** | **Form 2290 HVUT** for period 7/1/27–6/30/28 | Owner/accountant | ~$8,250 (2027 rates unchanged barring statute change) | 26 U.S.C. 4481; IRS | prep |
| **Rolling — month set by fleet, verify cab card** | **WA IRP (prorate) fleet renewal** — DOL notice ~90 days pre-expiry; needs stamped Schedule 1 + jurisdiction miles | Owner via Prorate Online | Apportioned fees vary (thousands/truck-yr) | RCW 46.87; dol.wa.gov process-IRP-renewal | prep |
| **Rolling — per truck/trailer anniversary** | **Annual periodic inspection** every 12 months, every unit; keep report 14 months | Carrier/shop | ~market $50–150/unit | 49 CFR 396.17, 396.21(b) | yes (schedule) |
| **Rolling — per driver** | **Med-card expiries (≤24 mo)**, CDL expiries (watch Clearinghouse-II downgrades), **annual MVR review each driver-anniversary** | Carrier | MVR ~$13/pull (WA) | 49 CFR 391.45; 391.25; 383 | yes (track) / prep (MVR pull) |
| **Rolling — quarterly** | **Random testing draws + collections** at ≥50% drug / ≥10% alcohol annualized; spread through year | Carrier/consortium | ~$50–100/driver/yr (market) | 49 CFR 382.305 | yes (draw) / no (collection) |
| **Rolling — at policy renewal** | **BMC-91/91X refiled by insurer; MCS-90 on policy** — confirm "Active" on FMCSA L&I after renewal | **Insurance company** | Premium (market) | 49 CFR 387.7, 387.15, 387.313 | yes (verify) |
| **One-time — verify done** | Supervisor reasonable-suspicion training (60+60 min) for every dispatcher/supervisor; before duties for new ones | Carrier | ~$50/supervisor (market) | 49 CFR 382.603 | prep |

### 📌 NEXT 30 DAYS (Aug 8 – Sep 7, 2026)

> 1. **TODAY — MCS-150 status check.** Biennial update was due **Apr 30, 2026** (derived from USDOT 2523064). If it wasn't filed this spring it is **~100 days overdue** → file online immediately (free); risk is USDOT deactivation + up to $1,000/day.
> 2. **File Form 2290 by Monday, Aug 31, 2026** — ~$8,250 for 15 trucks; e-file for the instant stamped Schedule 1 (IRP renewal hostage without it). Ignore "Sept 1" claims on vendor blogs — Aug 31, 2026 is a Monday.
> 3. **Around Sep 1 — check the UCR 2027 final rule** (docket FMCSA-2025-0655) so the right fee (current $276 vs proposed $333) is budgeted before the Oct 1 window opens.
> 4. **Verify insurance filings**: BMC-91/MCS-90 "Active" on li-public.fmcsa.dot.gov, and the policy-renewal date is on the compliance wall.
> 5. **Quarter hygiene**: Q3 IFTA fuel receipts/mileage flowing into the hub now (quarter closes Sep 30, return due Nov 2); confirm Q3 random-test selections were drawn and collections completed.
> 6. **Clearinghouse sweep**: every driver has a query dated within the last 365 days and a general consent on file; any hire in progress gets a full pre-employment query before first dispatch.

### Machine-readable calendar (YAML)

```yaml
# Compliance calendar — Thind Transport LLC (USDOT 2523064, MC 876103), Aug 2026 → Aug 2027.
# due: ISO date, "rolling", or "one-time-verify". fee_usd: whole dollars as published (agents
# convert to integer cents per repo money rule); null = varies or $0-filing-with-variable-remittance.
# agent: yes | prep | no  (prep = agent computes/pre-fills, owner supplies credential/payment).
# status: overdue-check | projected | pending-final-rule | firm
- due: 2026-04-30
  title: "MCS-150 biennial update (USDOT 2523064: April, even years) — VERIFY FILED; overdue if not"
  cadence: biennial
  authority: "49 CFR 390.19"
  source: "https://www.fmcsa.dot.gov/registration/updating-your-registration"
  fee_usd: 0
  agent: prep
  status: overdue-check
- due: 2026-08-31
  title: "Form 2290 HVUT, period 2026-07-01..2027-06-30 (15 trucks; e-file; stamped Schedule 1 for IRP)"
  cadence: annual
  authority: "26 U.S.C. 4481"
  source: "https://www.irs.gov/businesses/small-businesses-self-employed/when-form-2290-taxes-are-due"
  fee_usd: 8250
  agent: prep
  status: firm
- due: 2026-09-01
  title: "Check UCR 2027 final fee rule (docket FMCSA-2025-0655; NPRM proposed ~+20%; bracket 6-20 = $333)"
  cadence: annual
  authority: "91 FR 17618 (FMCSA NPRM 2026-06726)"
  source: "https://www.federalregister.gov/documents/2026/04/07/2026-06726/fees-for-the-unified-carrier-registration-plan-and-agreement"
  fee_usd: null
  agent: yes
  status: pending-final-rule
- due: 2026-10-01
  title: "UCR 2027 registration window opens (file at plan.ucr.gov; WA participates via UTC)"
  cadence: annual
  authority: "49 U.S.C. 14504a; 49 CFR 367.50"
  source: "https://plan.ucr.gov/fee-brackets/"
  fee_usd: 276
  agent: prep
  status: firm
- due: 2026-10-30
  title: "WA L&I Q3-2026 workers-comp report + premium (printed due Sat 10-31; file prior business day)"
  cadence: quarterly
  authority: "WA L&I quarterly reporting"
  source: "https://www.lni.wa.gov/insurance/quarterly-reports/file-quarterly-reports/"
  fee_usd: null
  agent: prep
  status: firm
- due: 2026-11-02
  title: "IFTA Q3-2026 return (nominal 10-31 Saturday -> next business day)"
  cadence: quarterly
  authority: "IFTA Procedures Manual P1040; RCW 82.38"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta"
  fee_usd: null
  agent: prep
  status: firm
- due: 2026-11-30
  title: "WA IFTA renewal submitted (license expires 12-31; on-time filing preserves grace to Feb)"
  cadence: annual
  authority: "IFTA Articles R655; WA DOL"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta/get-your-license-and-decals-ifta"
  fee_usd: null
  agent: prep
  status: firm
- due: 2026-12-31
  title: "UCR 2027 registration completed (enforcement begins 2027-01-01)"
  cadence: annual
  authority: "49 U.S.C. 14504a"
  source: "https://plan.ucr.gov/"
  fee_usd: 276
  agent: prep
  status: pending-final-rule   # amount may become $333 under the 2027 final rule (docket FMCSA-2025-0655)
- due: 2026-12-31
  title: "City of Kent business license renewal (calendar-year; invoices mailed January)"
  cadence: annual
  authority: "Kent City Code; WA BLS"
  source: "https://www.kentwa.gov/pay-and-apply/apply-for-a-business-license"
  fee_usd: 214
  agent: prep
  status: firm
- due: 2027-01-15
  title: "Annual Clearinghouse limited queries, all drivers (rolling 365-day rule; general consent)"
  cadence: annual
  authority: "49 CFR 382.701(b)"
  source: "https://clearinghouse.fmcsa.dot.gov/FAQ/Topics/queries-and-consent-requests"
  fee_usd: 19   # $1.25 x ~15 drivers
  agent: prep
  status: firm
- due: 2027-01-29
  title: "WA L&I Q4-2026 report + premium (printed due Sun 01-31; file prior business day)"
  cadence: quarterly
  authority: "WA L&I quarterly reporting"
  source: "https://www.lni.wa.gov/insurance/quarterly-reports/file-quarterly-reports/"
  fee_usd: null
  agent: prep
  status: firm
- due: 2027-02-01
  title: "IFTA Q4-2026 return (nominal 01-31 Sunday -> next business day)"
  cadence: quarterly
  authority: "IFTA Procedures Manual P1040"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta"
  fee_usd: null
  agent: prep
  status: firm
- due: 2027-03-01
  title: "IFTA grace ends — 2027 license and decals must be displayed"
  cadence: annual
  authority: "IFTA Articles R655"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta"
  fee_usd: null
  agent: yes
  status: firm
- due: 2027-03-15
  title: "DOT MIS drug/alcohol report — ONLY if FMCSA selects the carrier this year"
  cadence: annual-conditional
  authority: "49 CFR 382.403"
  source: "https://www.ecfr.gov/current/title-49/section-382.403"
  fee_usd: 0
  agent: prep
  status: firm
- due: 2027-04-30
  title: "IFTA Q1-2027 return (Friday, no roll) + WA L&I Q1-2027 report"
  cadence: quarterly
  authority: "IFTA Procedures Manual P1040; WA L&I"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta"
  fee_usd: null
  agent: prep
  status: firm
- due: 2027-05-11
  title: "CVSA International Roadcheck 2027 (projected May 11-13; readiness window, not a filing)"
  cadence: annual
  authority: "CVSA program (2026 ran May 12-14)"
  source: "https://cvsa.org/news/2026-roadcheck/"
  fee_usd: 0
  agent: yes
  status: projected
- due: 2027-06-30
  title: "HVUT period ends; lock VIN/weight roster for the 2027-28 Form 2290"
  cadence: annual
  authority: "26 U.S.C. 4481"
  source: "https://www.irs.gov/instructions/i2290"
  fee_usd: 0
  agent: yes
  status: firm
- due: 2027-07-30
  title: "WA L&I Q2-2027 report + premium (printed due Sat 07-31; file prior business day)"
  cadence: quarterly
  authority: "WA L&I quarterly reporting"
  source: "https://www.lni.wa.gov/insurance/quarterly-reports/file-quarterly-reports/"
  fee_usd: null
  agent: prep
  status: firm
- due: 2027-08-02
  title: "IFTA Q2-2027 return (nominal 07-31 Saturday -> next business day)"
  cadence: quarterly
  authority: "IFTA Procedures Manual P1040"
  source: "https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta"
  fee_usd: null
  agent: prep
  status: firm
- due: 2027-08-31
  title: "Form 2290 HVUT, period 2027-07-01..2028-06-30"
  cadence: annual
  authority: "26 U.S.C. 4481"
  source: "https://www.irs.gov/businesses/small-businesses-self-employed/when-form-2290-taxes-are-due"
  fee_usd: 8250
  agent: prep
  status: firm
- due: rolling
  title: "WA IRP (prorate) fleet renewal — month is fleet-specific; DOL notice ~90 days pre-expiry; VERIFY month on cab card / compliance wall"
  cadence: annual
  authority: "RCW 46.87; IRP Plan"
  source: "https://dol.wa.gov/guides/license-express-prorate-and-fuel-tax/international-registration-plan-prorate/process-irp-renewal"
  fee_usd: null
  agent: prep
  status: firm
- due: rolling
  title: "Annual periodic inspection, every truck AND trailer, every 12 months (retain 14 months)"
  cadence: per-unit-annual
  authority: "49 CFR 396.17; 396.21(b)"
  source: "https://www.ecfr.gov/current/title-49/section-396.17"
  fee_usd: null
  agent: yes
  status: firm
- due: rolling
  title: "Driver med-card expiries (max 24 months) and CDL expiries; watch Clearinghouse-II downgrades"
  cadence: per-driver
  authority: "49 CFR 391.45; Clearinghouse-II (eff. 2024-11-18)"
  source: "https://clearinghouse.fmcsa.dot.gov/FAQ/Topics/CDL-Downgrades"
  fee_usd: null
  agent: yes
  status: firm
- due: rolling
  title: "Annual MVR pull + review per driver anniversary (violations review folded in since 2022)"
  cadence: per-driver-annual
  authority: "49 CFR 391.25; 391.51"
  source: "https://www.ecfr.gov/current/title-49/section-391.25"
  fee_usd: 13
  agent: prep
  status: firm
- due: rolling
  title: "Random D&A testing at >=50% drug / >=10% alcohol annualized; quarterly draws spread through year"
  cadence: quarterly
  authority: "49 CFR 382.305; 84 FR 71771 (rates unchanged for 2026)"
  source: "https://www.transportation.gov/odapc/random-testing-rates"
  fee_usd: null
  agent: yes
  status: firm
- due: rolling
  title: "Pre-employment: full Clearinghouse query (in-portal consent) + drug test before first dispatch, every hire"
  cadence: per-hire
  authority: "49 CFR 382.701(a); 382.301"
  source: "https://clearinghouse.fmcsa.dot.gov/Resource/Index/Conduct-Full-Query-Employer"
  fee_usd: 1.25
  agent: prep
  status: firm
- due: rolling
  title: "Insurance continuity: insurer refiles BMC-91/91X at each renewal; MCS-90 on policy; verify Active on FMCSA L&I"
  cadence: per-policy-renewal
  authority: "49 CFR 387.7, 387.15, 387.313"
  source: "https://li-public.fmcsa.dot.gov/"
  fee_usd: null
  agent: yes
  status: firm
- due: one-time-verify
  title: "BOC-3 process agent on file (re-file only on agent change)"
  cadence: one-time
  authority: "49 CFR Part 366"
  source: "https://www.fmcsa.dot.gov/registration/form-boc-3-designation-agents-service-process"
  fee_usd: 0
  agent: yes
  status: firm
- due: one-time-verify
  title: "Supervisor reasonable-suspicion training (60 min drugs + 60 min alcohol) documented for all supervisors"
  cadence: one-time-per-supervisor
  authority: "49 CFR 382.603"
  source: "https://www.ecfr.gov/current/title-49/section-382.603"
  fee_usd: 50
  agent: prep
  status: firm
- due: 2028-04-30
  title: "Next MCS-150 biennial update (April, even years) — beyond this calendar's window"
  cadence: biennial
  authority: "49 CFR 390.19"
  source: "https://www.fmcsa.dot.gov/registration/updating-your-registration"
  fee_usd: 0
  agent: prep
  status: firm
```

---

## Sources

**.gov / primary (surfaced in search results 2026-08-08; direct page loads egress-blocked from this sandbox):**
1. IRS — When Form 2290 taxes are due: https://www.irs.gov/businesses/small-businesses-self-employed/when-form-2290-taxes-are-due
2. IRS — Instructions for Form 2290 (rev. 07/2026): https://www.irs.gov/instructions/i2290
3. FMCSA — Updating your registration (biennial rule, penalties): https://www.fmcsa.dot.gov/registration/updating-your-registration · 49 CFR 390.19: https://www.law.cornell.edu/cfr/text/49/390.19
4. Federal Register — UCR fees NPRM, 2027 registration year, 91 FR 17618 (Apr 7, 2026): https://www.federalregister.gov/documents/2026/04/07/2026-06726/fees-for-the-unified-carrier-registration-plan-and-agreement · govinfo PDF: https://www.govinfo.gov/content/pkg/FR-2026-04-07/pdf/2026-06726.pdf
5. UCR Plan — fee brackets: https://plan.ucr.gov/fee-brackets/ · 49 CFR 367.50: https://www.ecfr.gov/current/title-49/section-367.50 · WA UCR agency: https://www.utc.wa.gov/UCR
6. DOT ODAPC — random testing rates table: https://www.transportation.gov/odapc/random-testing-rates · 49 CFR 382.305: https://www.ecfr.gov/current/title-49/section-382.305 · 2020 rate notice: https://www.govinfo.gov/content/pkg/FR-2019-12-27/pdf/2019-27902.pdf
7. FMCSA Clearinghouse — queries & consent FAQ: https://clearinghouse.fmcsa.dot.gov/FAQ/Topics/queries-and-consent-requests · full-query how-to: https://clearinghouse.fmcsa.dot.gov/Resource/Index/Conduct-Full-Query-Employer · CDL downgrades: https://clearinghouse.fmcsa.dot.gov/FAQ/Topics/CDL-Downgrades · 49 CFR 382.701: https://www.law.cornell.edu/cfr/text/49/382.701
8. WA DOL — IRP renewal: https://dol.wa.gov/guides/license-express-prorate-and-fuel-tax/international-registration-plan-prorate/process-irp-renewal · IFTA license/decals: https://dol.wa.gov/vehicles-and-boats/prorate-and-fuel-tax/international-fuel-tax-agreement-ifta/get-your-license-and-decals-ifta · WAC 308-91-040 (cab cards)
9. WA L&I — quarterly report due dates: https://www.lni.wa.gov/insurance/quarterly-reports/file-quarterly-reports/
10. WA UTC — common carriers (intrastate): https://www.utc.wa.gov/regulated-industries/transportation/regulated-transportation-industries/common-carriers · RCW 46.87: https://app.leg.wa.gov/rcw/default.aspx?cite=46.87&full=true
11. City of Kent — business licenses: https://www.kentwa.gov/pay-and-apply/apply-for-a-business-license · WA DOR BLS: https://dor.wa.gov/manage-business/my-dor-help/renew-or-update-business-license
12. CVSA — 2026 Roadcheck May 12–14: https://cvsa.org/news/2026-roadcheck/
13. eCFR (stable rules cited): 49 CFR 396.17, 396.21, 391.25, 391.45, 391.51, 382.301, 382.403, 382.603, 387.7, 387.15, 387.313, Part 366.

**Secondary (context/corroboration):** CCJ & Overdrive on the 2027 UCR NPRM; Land Line & Foley on 2026 random rates and the UCR comment extension; TruckingOffice WA IFTA guide; irpregistrationservices.com WA page (90-day renewal notices); RMS/United Lanes on BMC-91 mechanics; DISA/Embark on Clearinghouse-II; TheTrucker/Penske on Roadcheck 2026. ez2290 blog **rejected** on the 2026 2290 due date (calendar contradiction documented in Task 1a).

**Repo corroboration (read-only):** `src/lib/hub/ifta-core.ts` (`iftaDueDate()` implements IFTA P1040 weekend roll — matches every rolled date above), `src/lib/hub/hvut.ts` (26 U.S.C. 4481 rate table, $550 cap, July–June period, "15 trucks ≈ $8,250"), `src/lib/hub/random-testing.ts` (382.305 quarterly draws), `src/lib/hub/compliance.ts` (per-entity CDL / med-card / registration / inspection / insurance expiries), `docs/OWNER-CHECKLIST.md` (existing "Form 2290 by Aug 31" item — this calendar supersedes it with the full year).

**Honest gaps (could not pin to a primary page today):** exact 2027 UCR bracket-3 dollar figure (NPRM table not loadable — marked *pending-final-rule*); WA IFTA decal dollar amount (nominal, verify at renewal); WA IRP fleet expiration month (fleet-specific by design — read the cab card); L&I weekend-roll policy (calendar uses prior-business-day to be safe); Roadcheck 2027 dates (projection). Everything else is date-cited above.

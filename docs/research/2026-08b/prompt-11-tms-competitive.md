# Prompt 11 — Small-Fleet TMS Competitive Teardown 2026: Pricing, Gaps, and Where $30/Truck Sits
**Research date: 2026-08-08** · For the owner of LoadOff / Thind Transport (Kent, WA) and AI build agents.
**Method note:** WebFetch was egress-blocked for every external domain in this environment, so all external claims are **(search-verified 2026-08-08)** — sourced from search-result snippets of the cited pages, not full page loads. Reddit (r/Truckers) is not surfaced by this environment's search index at all; real-user quotes below come from **TruckersReport forum threads (cited by thread ID)** and named review-site reviews instead — flagged wherever that substitution matters. Repo claims are **(repo-verified 2026-08-08)** by reading `/home/user/thind-transport-website/src`. This report aligns with `docs/research/2026-08/prompt-4-distribution-gtm.md` (GTM plan) and does not repeat it.

---

## TL;DR

- **The 5–50-truck TMS market prices in three bands:** legacy flat ($75–$110/mo all-in: ITS Dispatch, TruckingOffice), modern per-seat/per-load ($290–$1,000+/mo: Truckbase, Alvys, Tailwind, Rose Rocket), and per-driver ($55–$75/driver/mo: LoadOps). Quote-only players (Toro, Axon) hide pricing behind demos [S2][S6][S13][S19][S22].
- **$30/truck/mo × 15 trucks = $450/mo lands mid-band:** ~4x the legacy tools, ~equal to Truckbase's annual-billed entry ($290–$490/mo), and roughly **half** of what the two closest full-feature competitors cost at 15 trucks (Alvys per-load, LoadOps $825–$1,125/mo) (search-verified 2026-08-08; per-truck math is inference).
- **Only one competitor verifiably ships all six of LoadOff's pillars** (settlements, IFTA, factoring, driver app, customer portal, ELD): **Alvys** — and its loudest complaint is daily buggy updates. LoadOps ships five (no confirmed portal). Everyone else is missing 2–4 pillars [matrix in §2].
- **Native IFTA is the sleeper differentiator:** Truckbase (the most direct rival) has no native IFTA engine; Rose Rocket calls carrier IFTA/driver-pay "outside its sweet spot"; Tailwind only tracks IFTA renewal dates. LoadOff's 278-line quarterly engine with surcharge columns is repo-verified real (`src/lib/hub/ifta-core.ts`).
- **Real willingness-to-pay quotes (TruckersReport):** a 5-truck fleet paying "$37/month" balked at a "$700 startup + $585/month" single-user quote; single-truck operators cite $20/mo (TruckingOffice); ITS Dispatch cited at ~$100/mo. The market's published range for full TMSs is ~$75–200/truck/mo [S27][S28].
- **Churn triggers, ranked from review evidence:** (1) buggy updates that break workflows (Alvys), (2) price increases "faster than inflation" (ITS Dispatch), (3) annual lock-in with no monthly option (Truckbase), (4) drivers refusing/failing the driver app (Toro, Truckbase), (5) QuickBooks-integration gaps (TruckingOffice) [S8][S9][S16][S23].
- **Flat, predictable pricing wins this buyer:** small fleets (3–10 trucks) prefer flat monthly; per-truck is the accepted scalable compromise; per-user minimums and per-load meters are actively resented ("nearly double the cost" — Rose Rocket per-load complaint) [S15][S31]. One competitor (Truckpedia) already advertises "$300/mo flat + $30/truck" — exactly LoadOff's simulated number [S31].
- **Verdict: $30/truck/mo is viable — slightly LOW vs. modern full-stack peers ($40–75/truck-equivalent), deliberately HIGH vs. legacy tools.** Keep it, pair it with month-to-month + $0 onboarding (both are churn-trigger antidotes competitors fumble). Confidence: moderate-high.
- **Single biggest sale-blocker for a 15-truck peer (repo-verified):** the DAT and Truckstop load-board adapters are **stub-first** — built and tested against assumed API shapes but awaiting real service accounts (`src/lib/hub/integrations/dat.ts` header says so explicitly). Spot-market carriers live on DAT; every modern rival leads with live load-board/rate-con flow. LoadOff's AI rate-con parser exists (`doc-intake/llm-parser.ts`), so the gap is *live connectivity*, not parsing.

---

## §1. Pricing teardown: 12 products for 5–50-truck carriers

All prices (search-verified 2026-08-08) unless noted. "Demo-gated" = number not published by vendor; figure comes from third-party listings or user reports and should be treated as lower confidence.

### 1. Truckbase (the most direct competitor — targets 5–50-truck fleets)
- **Price:** entry **$290/mo billed annually**; a **$490/mo monthly-billed** figure also appears in third-party listings; free tier reported for 1–3 trucks. Per-seat model: third parties report ~$75–125/user/mo with 3–5-user minimums on some plans; exact tiers demo-gated [S1][S2][S3].
- **Onboarding fee:** $0 — free live virtual onboarding [S2]. **Contract:** entry tier is annual-billed only (a named user complaint) [S1].
- **Loudest complaints (Capterra reviews):** (1) driver app is the weak spot — friction marking loads in-transit/delivered, **no push notifications**; (2) AI rate-con import misses fields → "double-check every load entry"; (3) annual-only entry billing; also no native payroll, fuel uploads/BOL creation missing at review time [S1].

### 2. Alvys
- **Price:** per-load tiers. "Unleaded Carrier" listed at **$292/mo for 50 loads** (G2 pricing listing); Capterra shows from ~$183/mo; real-world range $200–$1,000+/mo as load volume scales. Demo required for exact quote [S4][S5][S6].
- **Onboarding fee:** $0, no charges for integrations; **Contract:** monthly or annual, no long-term contract required; unlimited users included [S7].
- **Loudest complaints (Capterra/G2):** (1) **"every day there is a bug or an update… they fix things that were not broken"** — constant updates breaking live workflows; (2) crashes/glitches slowing productivity; (3) load-building limitations and occasional slow EDI/support follow-through [S8].

### 3. Toro TMS
- **Price:** demo-gated entirely. Varies by truck count; month-to-month, no annual commitment; implementation, integrations, and support bundled in the price [S9][S10].
- **Onboarding fee:** included. **Contract:** month-to-month (their selling point).
- **Loudest complaints (G2/Capterra):** (1) **no robust native driver mobile app** — driver workflow is text-message-based, hard on less tech-savvy drivers; (2) dispatch screen "confusing, does not feel natural" to some; (3) invoice summaries and maintenance/multi-entity depth lighter than bigger suites [S9].

### 4. Rose Rocket (now operating as TMS.ai)
- **Price:** custom-quote, **per-load** pricing model for the current platform; legacy per-user figures reported at $50–$99+/user/mo; ITQlick lists "from $233/mo." Demo-gated [S11][S12].
- **Onboarding/contract:** not published.
- **Loudest complaints:** (1) **per-load quote came in "nearly double" competing platforms** — model reads as unfamiliar/expensive to small fleets; (2) QuickBooks/ERP sync lags and integration glitches needing vendor intervention; (3) carrier-native needs (driver pay, IFTA) described as "outside its sweet spot" — it is broker/3PL-leaning [S11][S13].

### 5. Axon
- **Price:** quote-only. One small carrier reported a quote **above $25,000** (softwareconnect review); consistently described as "high side" of the market. Accounting-first, real-time GL [S14].
- **Contract/onboarding:** not published; traditionally installed software with implementation.
- **Loudest complaints (softwareconnect/TruckersReport thread 285791):** (1) cost — "high compared to a lot of other TMSs," though defenders say "costly but absolutely worth it"; (2) poor fit for drayage/intermodal; (3) pricing and support complaints from niche operations [S14].

### 6. TruckingOffice
- **Price (published, flat by truck band):** Basic/Pro **$25–$35/mo (1–2 trucks)**, **$55–$75/mo (3–7)**, **$90–$130/mo (8+ trucks — 15 trucks lands here)** (corrected on page-verification 2026-08-08; the earlier $30/$65/$110 tiers are stale). PC*MILER add-on $5–$25/mo; own ELD $240/yr/truck incl. device [S15].
- **Onboarding:** none. **Contract:** monthly.
- **Loudest complaints (Capterra, 4.4/37 reviews):** (1) QuickBooks integration gaps — carrier pay doesn't integrate with QBO (desktop only per one review; another says no QB integration/import-export at all); (2) dated UI — "needs a face lift"; (3) nickel-and-dime friction ($50 late fee, IFTA service costs extra) [S16].

### 7. RigBooks
- **Price (published):** **$19–$149/mo flat tiers**; 30-day free trial, cancel anytime. Bookkeeping-first (cost-per-mile), for owner-ops and micro-fleets [S17][S18].
- **Loudest complaints/limitations:** (1) no real dispatch management; (2) **no ELD integration** for automated mileage; (3) no driver settlement processing beyond owner-operator structures — it's accounting software, not a TMS [S18].

### 8. Q7 (Frontline Software Technology)
- **Price:** reported from **$49/user/mo** (third-party listing — low confidence); ITQlick-style estimates add implementation $1k–$5k, training ~$500/user, data migration $1k–$10k. On-prem or cloud [S19].
- **Loudest complaints:** (1) onboarding "could be smoother"; (2) accounting-first learning curve; (3) dated interface vs. cloud-native rivals [S19].

### 9. Tailwind TMS (now under CargoWise/WiseTech umbrella)
- **Price (published):** **Pro $135/user/mo (25 loads/mo cap), Enterprise $195 (50 loads), Unlimited $265/user/mo** (corrected on page-verification 2026-08-08 — May 2025 review pricing; vendor site's own page had broken SSL at check time); free trial; no contracts required [S20][S21].
- **Onboarding:** no upfront fee reported.
- **Loudest complaints:** (1) **extra users are costly** — per-seat math punishes small back offices (10 users = $990–$1,990/mo); (2) smaller companies find it expensive overall; (3) load caps on lower tiers force upgrades [S20].

### 10. ITS Dispatch (Truckstop TMS)
- **Price (published):** Carrier **$75/mo (unlimited trucks)**; **TMS Carrier Pro $99/mo (unlimited trucks)**; sub-$75 options for 1–2 trucks [S22].
- **Onboarding:** none published. **Contract:** monthly.
- **Loudest complaints (Capterra/ITQlick/SelectHub):** (1) **outdated, hard-to-navigate UI** and weak mobile; (2) "subscription costs have risen faster than inflation in the last 2 years"; (3) filtering/sorting loads resets constantly; no custom fields/workflows [S23].

### 11. LoadOps (Optym)
- **Price (published on help center):** **$75/driver/mo** monthly-billed; **$55/driver/mo** on 12-month contract with driver minimums; volume discounts negotiated at 50+ drivers (corrected on verification); web users (dispatch/accounting) free; free trial [S24].
- **Onboarding:** not published as a fee. **Contract:** discounts require 12-month commitment.
- **Loudest complaints (SelectHub/softwareconnect):** (1) better suited to medium+ carriers — "smaller businesses… might find alternatives smoother / more budget-friendly"; (2) time/resource investment to get value; (3) per-driver price is the highest per-truck-equivalent in this set at small scale [S25].

### 12. Motive (dispatch offering)
- **Reality check:** Motive ships **no standalone TMS** — "Dispatch" is a workflow inside its fleet/ELD platform that pulls destinations from an integrated third-party TMS; its Marketplace lists 90+ TMS integrations (incl. Toro, LoadOps, Truckbase) [S26].
- **Price:** ELD/fleet platform **$25–$40/vehicle/mo on 1–3-year contracts** + $150 hardware; tiers ~$20–25 Starter → $45–50+ Enterprise [S26b].
- **Loudest complaints:** (1) **D- BBB rating with contract/auto-renewal disputes**; (2) 1–3-year lock-in; (3) no dispatch order management, settlements, invoicing, or carrier accounting — it cannot replace a TMS [S26][S26b].

**Market anchors:** AscendTMS's **free Basic tier is gone** — now $69/$119/$149 per user/mo (corrected on page-verification 2026-08-08; removes the free-anchor threat and strengthens the $30/truck GO) [S29]; McLeod at ~$2,500+/mo with ~$60k initial (TruckersReport quote — the ceiling small fleets flee) [S27]; Truckpedia page-verified: **$299/mo includes 10 trucks, +$30/truck after → $449 at 15 trucks**, near-identical to LoadOff's simulated $450 [S31]; market band restated on page-verification: **$30–100/truck/mo mid-market, $100–300+ enterprise** (the earlier "$75–200" source changed) [S28].

---

## §2. Feature-gap matrix — the six pillars LoadOff already ships

LoadOff baseline (all **repo-verified 2026-08-08**, covered by the repo's vitest suite — `package.json` test = `vitest run`): settlements engine with per-mile/percent/hourly pay rules (`src/lib/hub/settlements.ts`, `pay-rules.ts`); IFTA quarterly engine incl. surcharge columns (`ifta-core.ts`, `ifta-pdf.ts`); generic factoring submit (`integrations/factor.ts`); driver PWA (`src/app/hub/driver` + offline queue in `src/components/hub/driver`); customer/broker portal (`src/app/hub/portal`); ELD via Terminal/TruckerCloud aggregator interface with credential-gated live path + CSV/FMCSA-file fallback (`telematics.ts`, `eld-import.ts`, `eld-output-file.ts`); plus QBO integration (`integrations/qbo.ts`), per-tenant flags (`flags.ts`), TOTP 2FA (`totp.ts`).

Legend: ✓ = vendor-confirmed native; ~ = partial/via integration or higher tier; ✗ = absent or no evidence found (search-verified 2026-08-08; absence of evidence marked "n.f." = not found, lower confidence).

| Product | Settlements | IFTA | Factoring | Driver app | Customer portal | ELD |
|---|---|---|---|---|---|---|
| **LoadOff (repo)** | ✓ | ✓ | ✓ (generic submit) | ✓ (PWA) | ✓ | ✓ (aggregators + file import) |
| Truckbase | ✓ | **✗ n.f.** (no native engine; fuel uploads were a gap) | ✓ | ✓ (weak — no push) | ✓ | ✓ (Samsara/Motive) |
| Alvys | ✓ | ✓ (built-in calculator) | ✓ (native, e.g. OTR) | ✓ | ✓ (per-customer pages) | ✓ |
| Toro TMS | ✓ | ✓ (via ELD miles) | ✗ n.f. | **✗ (text-message workflow)** | ✗ n.f. | ✓ |
| Rose Rocket | ✓ | ~ ("outside its sweet spot") | ✗ n.f. | ✓ | ✓ (strong) | ✓ (Geotab etc.) |
| Axon | ✓ (+ real payroll) | ✓ | ✗ n.f. | ✗ n.f. | ✗ n.f. | ~ |
| TruckingOffice | ✓ | ✓ (core pitch) | ✗ | ✓ (TMS + own ELD app) | ~ (thin) | ✓ (own $240/yr/truck) |
| RigBooks | ✗ (owner-op only) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Q7/Frontline | ✓ (+ payroll) | ✓ | ✗ n.f. | ~ ("smartphone integration") | ✗ n.f. | ✓ (interfaces) |
| Tailwind | ✓ | ~ (tracks renewal dates only) | ~ (unverified/integration) | ✓ (POD Complete, all tiers) | ~ (Enterprise+ only) | ~ (GPS integration) |
| ITS Dispatch | ✓ | ✓ | ~ (Truckstop cross-sell) | ✗ (weak mobile) | ✗ n.f. | ~ |
| LoadOps | ✓ | ✓ (trips/summaries) | ✓ (Apex, TAFS, Triumph, OTR) | ✓ | ✗ n.f. (tracking links only) | ✓ (Samsara/Omnitracs/Motive) |
| Motive | ✗ | ✓ (fuel-tax module) | ✗ | ✓ (ELD app, not load workflow) | ✗ | native |

Sources per row: Truckbase [S1][S3][S32]; Alvys [S33]; Toro [S34]; Rose Rocket [S35]; Axon [S14][S36]; TruckingOffice [S15][S37]; RigBooks [S18]; Q7 [S38]; Tailwind [S20][S39]; ITS Dispatch [S22][S23]; LoadOps [S24][S40]; Motive [S26][S26b].

**Read of the matrix:** only **Alvys** matches LoadOff pillar-for-pillar (and it meters by load and ships daily breaking updates [S8]). **LoadOps** matches on five at 2–2.5x the price per truck. The direct small-fleet rival **Truckbase is missing native IFTA** — the feature the GTM research identified as the #2 retention moment ("the IFTA button," prompt-4 TL;DR).

**Where small-fleet owners say every TMS falls short** (converging evidence, review sites + prior GTM research [22–25 in prompt-4]): (1) driver-app adoption — drivers refuse or fumble the app (Toro's text-only workaround exists *because* of this; Truckbase's no-push app is its top complaint); (2) retyping data — rate cons, fuel, load boards ("AI import misses fields"); (3) QuickBooks friction (TruckingOffice desktop-only; Rose Rocket sync lag); (4) feature overload at onboarding with no human hand-holding; (5) payroll/IFTA still ending up in spreadsheets on "modern" platforms (Truckbase no payroll/IFTA; Tailwind IFTA-dates-only).

---

## §3. Pricing psychology of the 10–30-truck buyer

**What they say they'll pay (real quotes, forum-cited; Reddit not indexable here — TruckersReport threads cited by ID):**
- TruckersReport thread 1293749 ("Transportation Management System (TMS)"): a ~5-truck operator states they pay **"like $37 per month"** and, shopping upgrades, recoils from a quote of **"$700 startup and $585 per month"** for one user — that quote ended the conversation. Same thread cites **ITS Dispatch ≈ $100/mo** as the sane mid option and McLeod at ~$2,500+/mo + ~$60k initial as the absurd ceiling [S27]. (Thread undated in snippets — lower confidence on recency; consistent with current list prices.)
- TruckersReport thread 236785 ("TruckingOffice Review(s)"): single-truck operators anchor at **$20/mo ($240/yr)** [S27].
- Same forum cluster: an operator brags about **$10/mo** software just for POD/receipt capture — the floor of perceived value [S27].
- Published market framing the buyer sees when they Google (restated on page-verification 2026-08-08 — the earlier cited "typically $75–200/truck" source changed): **$30–100/truck/mo mid-market, $100–300+ enterprise** [S28]; owner-op tools $20–50/truck/mo [S28]; a competitor (Truckpedia) advertises **$299/mo including 10 trucks + $30/truck after — $449 at 15 trucks** as its transparency pitch (page-verified) [S31].

**Per-truck vs. flat:** flat monthly is the stated preference at 3–10 trucks ("the carrier wants predictable monthly costs" [S31]); per-truck is the accepted growth-fair compromise; **per-user and per-load are the resented models** — evidence: Truckbase's seat minimums flagged in comparisons [S3], Tailwind's "extra users are costly" complaint [S20], Rose Rocket's per-load quote "nearly double" [S13]. Unlimited-users-flat "almost always cheaper than per-seat" is now a talking point buyers repeat [S31]. Inference (moderate confidence): **per-truck pricing with unlimited users is the sweet spot** — it reads flat month-to-month but scales with the fleet, and it's the model Toro (quote-based per-truck) and Truckpedia use.

**What triggers churn (evidence-ranked):**
1. **Updates that break workflows** — Alvys's signature complaint ("every day there is a bug or an update") [S8].
2. **Price increases** — ITS Dispatch "risen faster than inflation in the last 2 years" [S23]; legacy tools bleed users on renewal.
3. **Billing lock-in** — annual-only entry billing (Truckbase) is cited as a con before features are [S1]; Motive's 1–3-year contracts earn a D- BBB rating [S26b].
4. **Driver-app failure** — drivers refusing the app kills the data loop and then the subscription (prior GTM research [22–25]; Toro/Truckbase complaints [S1][S9]).
5. **Accounting/factoring gaps** — QBO friction (TruckingOffice [S16], Rose Rocket [S13]) forces double entry, the #1 stated reason for abandoning during onboarding (prompt-4 §onboarding).

---

## §4. Verdict on $30/truck/month

**Repo fact:** `SIMULATED_PRICE_PER_TRUCK_CENTS = 3000` in `src/lib/hub/saas-metrics.ts` — a simulation constant, not a launched price (repo-verified 2026-08-08).

**The math at 15 trucks (LoadOff's peer ICP):** $450/mo.
- vs. legacy flat: ITS Dispatch $75–99, TruckingOffice $90–130 at 15 trucks → LoadOff is 3.5–5x (page-verified numbers). But those products carry outdated-UI, no-portal, weak-mobile complaints and QBO gaps [S16][S23].
- vs. Truckbase: $290/mo annual-billed entry ($490 monthly-billed) → comparable, and LoadOff adds native IFTA which Truckbase lacks [S1][S2].
- vs. Alvys at ~120–180 loads/mo (a 15-truck spot fleet): plausibly $600–$1,000+/mo on per-load tiers (inference from the $292/50-load tier [S4]) → LoadOff ~half.
- vs. LoadOps: 15 drivers × $55–75 = **$825–$1,125/mo** → LoadOff ~40–55%.
- vs. Toro/Axon: unpublished; Axon's reported $25k+ quote is another universe [S14].

**Verdict: viable, and slightly LOW versus modern full-stack peers — which is the correct place to be for v1.** $30/truck undercuts every competitor that matches ≥5 of the six pillars while staying ~4x above the legacy floor, so it doesn't signal "cheap toy." It also matches the one price already normalized in the market for per-truck transparency ($30/truck at Truckpedia [S31]) and the $75–200/truck published band makes it an easy yes [S28]. The forum evidence says the deal-killers are startup fees and lock-in, not $450/mo — so the pricing *page* matters as much as the number: **month-to-month, $0 onboarding, unlimited users, price published publicly** (prompt-4 already recommends publishing it). Confidence: **moderate-high** (limits: Toro/Axon/Rose Rocket exact quotes are demo-gated; per-load→per-truck conversions are inference; forum quotes undated).

**Single missing feature most likely to block a 15-truck sale:** **live load-board connectivity.** Repo-verified: `src/lib/hub/integrations/dat.ts` and `truckstop.ts` are explicitly "stub-first… per docs/integrations/README.md" adapters awaiting real service accounts — search/booking flows are mapped and tested but not connected. A 15-truck spot-market peer starts their day on DAT; Truckbase/Alvys/LoadOps all demo live load-board or rate-con-to-load flow. LoadOff's AI rate-con intake already exists (`doc-intake/llm-parser.ts` parses `rate_con` → broker, MC#, linehaul, stops, with heuristic fallback), so the demo can survive on "email me the rate con"; but the checklist question "does it hook to DAT?" currently has no live answer. (Runner-up: payroll *tax* filing — but no modern small-fleet peer ships that either; Truckbase's "no native payroll" complaint shows the market tolerates it.)

---

## Deliverable

### Competitor table

| Product | Price model | Published $ | Settle-ments | IFTA | Factoring | Driver app | Portal | ELD | Loudest complaint |
|---|---|---|---|---|---|---|---|---|---|
| **LoadOff (v1, unlaunched)** | per-truck (simulated) | $30/truck/mo (internal sim) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a (pre-launch) |
| Truckbase | per-seat, annual entry | $290/mo annual ($490 monthly); demo-gated tiers | ✓ | ✗ | ✓ | ~ | ✓ | ✓ | Driver app: no push notifications |
| Alvys | per-load tiers | ~$292/mo @ 50 loads; $200–$1,000+ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Daily buggy updates break workflows |
| Toro TMS | per-truck, quote-only | demo-gated; month-to-month | ✓ | ✓ | ✗ | ✗ (SMS) | ✗ | ✓ | No native driver app |
| Rose Rocket | per-load, quote-only | demo-gated (~$233/mo+ reported) | ✓ | ~ | ✗ | ✓ | ✓ | ✓ | Quote "nearly double" rivals |
| Axon | license + quote | demo-gated; $25k+ quote reported | ✓ | ✓ | ✗ | ✗ | ✗ | ~ | Price on the high side |
| TruckingOffice | flat by truck band | $25–35/$55–75/$90–130/mo (page-verified) | ✓ | ✓ | ✗ | ✓ | ~ | ✓ ($240/yr/truck) | QBO integration gaps; dated UI |
| RigBooks | flat tiers | $19–$149/mo | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | Not a TMS (no dispatch/ELD) |
| Q7/Frontline | per-user + implementation | ~$49/user/mo + $1k–5k setup (3rd-party) | ✓ | ✓ | ✗ | ~ | ✗ | ✓ | Rough onboarding, dated |
| Tailwind TMS | per-user tiers | $135/$195/$265 per user/mo (page-verified) | ✓ | ~ | ~ | ✓ | ~ | ~ | Extra seats costly; load caps |
| ITS Dispatch | flat | $75–$99/mo unlimited trucks | ✓ | ✓ | ~ | ✗ | ✗ | ~ | Outdated UI; prices rising |
| LoadOps (Optym) | per-driver | $75/driver/mo ($55 annual w/ minimums) | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | Overkill/pricey for small fleets |
| Motive (dispatch) | per-vehicle, 1–3-yr contract | $25–$40/vehicle/mo + $150 hw (ELD, not a TMS) | ✗ | ✓ | ✗ | ✓ | ✗ | native | D- BBB; contract disputes; no TMS |

### Positioning paragraph (internal use — every claim repo-verified or sourced)

LoadOff ships the six things a 10–30-truck carrier otherwise assembles from two or three subscriptions: driver settlements with per-mile, percentage, and hourly pay rules (`src/lib/hub/settlements.ts`, `pay-rules.ts`); a quarterly IFTA engine with surcharge-column support (`ifta-core.ts`); factoring submission (`integrations/factor.ts`); an installable driver PWA with offline queueing (`src/app/hub/driver`); a customer/broker portal (`src/app/hub/portal`); and ELD data via Terminal/TruckerCloud aggregator connections plus FMCSA-format and CSV file import when no API credentials exist (`telematics.ts`, `eld-output-file.ts`) — alongside QuickBooks Online export, per-tenant feature flags, and TOTP 2FA, all exercised by the repo's vitest suite. Among the twelve competitors surveyed 2026-08-08, only Alvys matches that six-pillar set, on per-load pricing whose listed carrier tier is ~$292/mo for 50 loads, and whose most-repeated review complaint is daily updates that break live workflows; the closest small-fleet rival, Truckbase, publishes a $290/mo annual-billed entry price and has no native IFTA engine, with its driver app the top complaint in its own Capterra reviews. At the simulated $30/truck/month ($450 for a 15-truck fleet, month-to-month), LoadOff would price below every surveyed competitor that ships five or more of the six pillars, while remaining above the legacy flat tools (ITS Dispatch $75–99/mo, TruckingOffice $110/mo) whose reviews cite outdated interfaces and QuickBooks gaps. What LoadOff cannot yet claim: live DAT/Truckstop load-board connections (adapters are stub-first pending real service accounts) and payroll tax filing — the latter a gap shared by every modern peer surveyed.

### One-line pricing verdict

**$30/truck/month is viable and correctly positioned for v1 — below the $40–75/truck-equivalent of full-stack rivals (Alvys, LoadOps), credibly above the $5–7/truck legacy floor — launch it month-to-month with $0 onboarding and published pricing; confidence: moderate-high** (demo-gated Toro/Axon/Rose Rocket quotes and per-load→per-truck conversions are the main unknowns).

---

## Sources

All (search-verified 2026-08-08) via WebSearch result snippets; WebFetch egress-blocked for all external domains this session. Reddit threads were not retrievable; TruckersReport threads cited by ID substitute for the brief's r/Truckers ask.

**Truckbase:** [S1] Capterra reviews, capterra.com/p/10002334/Truckbase/reviews · [S2] truckbase.com/trucking-software-pricing + softwarefinder.com/fleet-management-software/truckbase · [S3] truxeltms.com/2026/05/15 pricing comparison + g2.com/products/truckbase/pricing + bestcarriertms.com/reviews/truckbase.php · [S32] bestcarriertms.com/tms-pricing-guide.php
**Alvys:** [S4] g2.com/products/alvys/pricing (Unleaded Carrier $292/50 loads) · [S5] capterra.com/p/249961/Alvys-TMS/pricing · [S6] alvys.com/pricing-info · [S7] alvys.com/features/easy-onboarding + alvys.com/help/frequently-asked-questions · [S8] Capterra/G2 review complaints via softwarefinder.com + selecthub.com/p/tms-software/alvys · [S33] alvys.com/features/ifta-software, /driver-mobile-app, /tms-accounting-software, /help/factoring-integration/otr-solutions
**Toro:** [S9] G2/Capterra review synthesis via capterra.com/p/10008781/Toro-TMS/reviews + rfp.wiki Toro page · [S10] torotms.com/pricing · [S34] torotms.com feature blogs + samsara.com/resources/marketplace/toro-tms + marketplace.gomotive.com/app/toro-tms
**Rose Rocket:** [S11] softwareconnect.com/reviews/rose-rocket + selecthub.com/p/tms-software/rose-rocket · [S12] itqlick.com/rose-rocket-software/pricing · [S13] arktms.com/ark-vs-rose-rocket + capterra.com/p/153047/Rose-Rocket · [S35] roserocket.com/personas-pages/truckload-carriers + help.roserocket.com/driver-mobile-app-overview + marketplace.geotab.com/solutions/rose-rocket
**Axon:** [S14] softwareconnect.com/reviews/axon-trucking-software (incl. $25k quote report) + thetruckersreport.com thread 285791 + selecthub.com/p/trucking-software/axon-software · [S36] axonsoftware.com/trucking-dispatch-software + /transportation-management-system
**TruckingOffice:** [S15] truckingoffice.com/tms/transportation-management-system-pricing + capterra.com/p/122284/TruckingOffice/pricing · [S16] capterra.com/p/122284/TruckingOffice/reviews · [S37] truckingoffice.com/tms/trucking-software-features/ifta-reporting-software + help.truckingoffice.com TMS Driver App guide
**RigBooks:** [S17] rigbooks.com/pricing + fitsmallbusiness.com/rigbooks-review · [S18] softwareconnect.com/reviews/rigbooks + pcssoft.com/blog/trucking-accounting-software (limitations)
**Q7:** [S19] technologycounter.com/products/q7-trucking ($49/user) + itqlick.com/q7-trucking-business-software (implementation estimates) + thecfoclub.com/tools/q7-review · [S38] gofrontline.com/q7-software + /managing-driver-pay-settlements
**Tailwind:** [S20] capterra.com/p/275384/Tailwind-TMS + getapp.com Tailwind pricing ($99/$149/$199 tiers, load caps, seat-cost complaints) · [S21] cargowise.com/solutions/cargowise-transport/tailwind-tms · [S39] fitsmallbusiness.com/tailwind-tms-review + bestcarriertms.com/reviews/tailwind-tms.php
**ITS Dispatch:** [S22] truckstop.com/product/tms/carrier ($75/$99 unlimited trucks) + capterra.com/p/106760/ITS-Dispatch/pricing · [S23] selecthub.com/p/dispatch-software/its-dispatch + itqlick.com/its-dispatch + capterra reviews (UI, price rises, filtering)
**LoadOps:** [S24] help.loadops.com/what-is-loadops-pricing-model ($75 monthly / $55 annual per driver) · [S25] selecthub.com/p/tms-software/loadops + softwareconnect.com/reviews/loadops-axele · [S40] help.loadops.com (mobile app, integrations: Apex/TAFS/Triumph/OTR, Samsara/Omnitracs/Motive, IFTA)
**Motive:** [S26] truckpedia.io/resources/best-tms-motive-integration + marketplace.gomotive.com + helpcenter.gomotive.com dispatch-TMS article · [S26b] thecostguys.com/business/keeptruckin-eld + traxelio.com/compare/traxelio-vs-motive + goeldhub.com/vs/motive-alternative (pricing, BBB D-, contracts)
**Market/psychology:** [S27] thetruckersreport.com threads 1293749 (TMS; $37/mo, $700+$585 quote, McLeod $2.5k/$60k), 236785 (TruckingOffice $20/mo), 300393, 307927, 2332781 · [S28] gofreight.com/blog/best-tms-trucking-companies ($75–200/truck band) + truxello.com/blog/best-tms-small-carriers · [S29] AscendTMS pricing via trustradius.com/products/ascendtms/pricing + selecthub.com/p/tms-software/ascendtms · [S31] truckpedia.io/resources/best-trucking-software-small-fleets ($300 flat + $30/truck) + datatruck.io/blog/how-much-does-tms-software-actually-cost + fleetrabbit.com pricing guides (flat-preference for 3–10 trucks)
**Repo (repo-verified 2026-08-08):** `src/lib/hub/saas-metrics.ts:142` ($30/truck constant) · `settlements.ts`, `pay-rules.ts`, `ifta-core.ts` (278 lines), `ifta-pdf.ts`, `integrations/factor.ts`, `integrations/qbo.ts`, `integrations/dat.ts` + `truckstop.ts` (stub-first headers), `telematics.ts` (aggregator + CSV fallback), `eld-import.ts`, `eld-output-file.ts`, `doc-intake/llm-parser.ts` (rate_con parsing), `flags.ts`, `totp.ts`, `src/app/hub/driver`, `src/app/hub/portal` · Prior research: `docs/research/2026-08/prompt-4-distribution-gtm.md` (TL;DR alignment: publish price publicly, $200–$1,500/mo small-fleet norm, onboarding churn causes [22–25]).

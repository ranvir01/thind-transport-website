# Prompt 14 — Payment rails for LoadOff: SaaS billing + carrier receivables (2026)

**Date:** 2026-08-08 · **Researcher:** deep-research agent (1 of 6, batch 2026-08b)
**Repo ground truth used:** `src/lib/hub/saas-metrics.ts` (simulateBillingFromTenants, SIMULATED_PRICE_PER_TRUCK_CENTS=3000), `src/app/hub/admin/page.tsx` ("Simulated billing" badge), `src/lib/hub/integrations/factor.ts` + `docs/integrations/factor.md` (2026-07 scout passes), `docs/decisions/0003-everything-app.md` (ADR format model). All read-only; nothing modified.
**Verification tags:** almost every external claim is **(search-verified 2026-08-08)** — this environment's egress proxy blocks direct fetches of stripe.com and most vendor sites (WebFetch attempt on stripe.com/billing/pricing returned EGRESS_BLOCKED), so numbers come from search results including stripe.com/support.stripe.com/docs.stripe.com snippets and dated third-party fee trackers. Repo files are **(page-verified 2026-08-08)** — read directly.

---

## TL;DR

- **Recommendation: Stripe Billing with ACH debit as the default payment method, hosted Checkout/portal, Stripe Tax enabled for WA only.** All-in cost ≈ **1.5% of revenue** (0.8% ACH capped at $5/txn + 0.7% Billing fee) vs ~3.7% on cards and **5–6.5% for merchant-of-record options**.
- At LoadOff's scale the MoR pitch solves a problem LoadOff doesn't have: 200 trucks × $360/yr = **$72k/yr total revenue — below every state's ~$100k economic-nexus threshold**, so out-of-state sales-tax registration isn't owed anyway. Only **Washington** (physical presence in Kent) must be handled from dollar one — and an MoR does **not** remove WA B&O gross-receipts tax.
- **WA taxes SaaS** (retail sales tax + Retailing B&O 0.471%); most early tenants are WA carriers, so tax lands on most early invoices. Stripe Tax (0.5% of taxable volume) computes it; filing is a MyDOR return.
- Fees at 10/50/200 trucks (per month, modeled 1/4/15 tenants): Stripe ACH **$4.50 / $22.50 / ~$90**; Stripe card $11.10 / $55.20 / $220.50; Paddle $15.50 / $77 / $307.50; Lemon Squeezy $17 / $84.50 / $337.50; Stripe Managed Payments ~$19.50 / ~$97.20 / ~$388.50.
- **Integration is a near-1:1 mapping onto the existing seam**: Stripe Customer=hub.carriers row, Subscription item quantity=truck count, `invoice.paid` webhook → the same `BillingRow` shape `computeSaasMonth` already eats. Stripe amounts are **integer cents natively** — zero impedance with the repo's money rule. `stripe` npm SDK is **MIT** (license-hygiene pass).
- Effort with the existing seam: **~3–5 agent-days to test-mode E2E, ~1–2 days to go live**, plus human-only tasks (Stripe account activation, WA DOR registration).
- Carrier side 2026: small-carrier factoring runs **~2.5–3.5% recourse (Q2 2026 index avg 2.8%), non-recourse ~+0.5–1% (3–5%)**; broker QuickPay **1.5–3%** (C.H. Robinson 2%, TQL 2.5%, Coyote 3%) but only per-broker. Best carrier strategy: QuickPay where cheap, factor the rest.
- API-era factors: **OTR Solutions is the only factor with public developer docs + sandbox** (Azure APIM, subscription key, "Show and Tell" go-live gate). Apex/Denim = partner API keys. RTS and standard-tier Triumph = **FTP file drops, not APIs**. Porter = McLeod-certified integration, no public API. **TriumphPay is a payor/factor network — no public, self-serve carrier-TMS payments API to integrate** (TriumphPay marketing references partner-level carrier-TMS connections, but access is partner-provisioned) (corrected on verification); LoadOff's lever is picking factors already on the network.
- **Hard line: LoadOff must never touch the money.** Holding, pooling, or forwarding carrier/driver funds without state money-transmitter licenses (WA RCW 19.230.030) + FinCEN MSB registration is the felony-adjacent trap. Safe patterns LoadOff already uses: be the payee for its own SaaS fees (Stripe), submit invoices/documents to factors (`factor.ts`), export data (QBO IIF), referral links. Driver pay: compute and export, never disburse.

---

## 1. SaaS billing rails for a solo-operator SaaS at ~$30/truck/mo

### 1.1 The candidates and their 2026 prices

| Rail | Model | Price (2026) | Per-seat/usage support | B2B invoicing fit | Tax handling |
|---|---|---|---|---|---|
| **Stripe Billing + card** | PSP; you are the merchant | 2.9% + $0.30 card + **0.7% of Billing volume** (single Billing plan for new users since 2024-07-10; legacy Starter/Scale 0.5%/0.8% retired) (search-verified 2026-08-08, support.stripe.com "Changes to the Stripe Billing Starter and Scale plans", stripe.com/billing/pricing snippets) | First-class: quantity-based ("licensed") subscriptions, proration, usage metering, Smart Retries, dunning, hosted invoices, customer portal | Strong — real invoices with your name, memo fields, net-terms option (`send_invoice`) | You collect/remit. **Stripe Tax add-on 0.5%** of transaction volume where registered (no-code/Basic tier; filing separate) (search-verified 2026-08-08) |
| **Stripe Billing + ACH debit** | Same, ACH pull | **0.8% capped $5/txn** + 0.7% Billing. Failed debit **$4**; ACH dispute **$15, final, no evidence process** (search-verified 2026-08-08, stripe.com/pricing + support.stripe.com ACH pricing snippets) | Same as above | **Best fit — trucking companies live on ACH**; mandate + bank verification handled by Stripe Checkout/Financial Connections | Same as above |
| **Lemon Squeezy** | Merchant of record | **5% + $0.50**, **+0.5% on subscription payments**, +1.5% international, +1.5% PayPal (search-verified 2026-08-08) | Subscriptions yes; per-seat quantity via API is thinner than Stripe's | Weak — consumer-checkout shaped; card/PayPal-first, **no ACH debit pull**; invoice shows Lemon Squeezy as seller | MoR: they are the seller; they register/remit sales tax/VAT globally |
| **Paddle** | Merchant of record | **5% + $0.50** per checkout; custom pricing for scale (search-verified 2026-08-08) | Subscriptions + quantities yes; B2B manual invoicing exists but geared to larger contract deals | Medium — compliant invoices, but **buyer's paperwork says Paddle, not LoadOff**, which confuses a trucking company's bookkeeper and (EU) reclaim flows; ACH pull not a standard pay-in | MoR: Paddle registers/remits everywhere |
| **Stripe Managed Payments** (Lemon Squeezy's successor) | MoR, public preview | **+3.5% on top of standard fees ≈ 6.4% + $0.30** domestic all-in (search-verified 2026-08-08) | Stripe stack underneath | Digital-product focus, preview status | MoR |
| **QuickBooks (QBO) invoicing + QuickBooks Payments** | Accounting suite + PSP | ACH **1%** (the old $10 cap removed for newer accounts; some grandfathered $15 cap); invoiced cards **2.9%**; $25 "convenience fee" games on ACH-only invoices (search-verified 2026-08-08) | **None that maps to hub.carriers** — recurring invoices are manual/templated per customer; no per-truck quantity API story without building against Intuit's API | Fine for one-off B2B invoices; not a multi-tenant subscription engine | QBO computes US sales tax on invoices; you register/remit |
| *(baseline)* **Bare Stripe PaymentIntents, no Billing** | PSP, DIY subscriptions | 0.8%/$5 ACH or 2.9%+$0.30 card, **no 0.7%** | You rebuild proration/dunning/retries/portal yourself | n/a | Stripe Tax still available |

Notes: Lemon Squeezy was **acquired by Stripe (July 2024)**; as of 2026 it still operates alongside Stripe Managed Payments (public preview) but onboarding has slowed to weeks and the roadmap is unclear — real platform risk for a new adopter (search-verified 2026-08-08).

### 1.2 Fee math at 10 / 50 / 200 billed trucks

Assumptions (stated, adjustable): $30/truck/mo list (matches `SIMULATED_PRICE_PER_TRUCK_CENTS=3000`); average tenant ≈ 13 trucks (Thind-like ICP), so 10 trucks ≈ 1 tenant, 50 ≈ 4 tenants, 200 ≈ 15 tenants; one invoice per tenant per month; LoadOff absorbs processing fees (not surcharged).

| Monthly volume → | **10 trucks · $300/mo** | **50 trucks · $1,500/mo** | **200 trucks · $6,000/mo** |
|---|---|---|---|
| Stripe **ACH** + Billing (0.8% cap $5 + 0.7%) | **$4.50 (1.50%)** | **$22.50 (1.50%)** | **$90.00 (1.50%)** — drops toward ~$82 (1.37%) as fleets >20 trucks hit the $5 cap ($625+ invoices) |
| Stripe **card** + Billing (2.9%+30¢ + 0.7%) | $11.10 (3.70%) | $55.20 (3.68%) | $220.50 (3.68%) |
| Paddle (5% + 50¢) | $15.50 (5.17%) | $77.00 (5.13%) | $307.50 (5.13%) |
| Lemon Squeezy (5.5% + 50¢ on subs) | $17.00 (5.67%) | $84.50 (5.63%) | $337.50 (5.63%) |
| Stripe Managed Payments (~6.4% + 30¢) | ~$19.50 (6.5%) | ~$97.20 (6.5%) | ~$388.50 (6.5%) |
| QuickBooks Payments ACH (1%, uncapped) | $3.00 (1.0%) | $15.00 (1.0%) | $60.00 (1.0%) |
| *(baseline)* bare Stripe ACH, no Billing | $2.40 | $12.00 | $48.00 |

Annualized at 200 trucks: Stripe ACH ≈ **$1,080/yr**; cards ≈ $2,646/yr; Paddle ≈ $3,690/yr; SMP ≈ $4,662/yr. **The MoR premium over Stripe ACH is ≈ $2,600–3,600/yr at 200 trucks** — paid to outsource a tax burden that (see 1.3) barely exists at this scale. QuickBooks is nominally cheapest per transaction but has no subscription/quantity automation to drive from `hub.carriers` — its ops cost (manual monthly invoices per tenant, no self-serve payment-method portal, no dunning) dwarfs the 0.5-point rail saving; it stays what it already is in this repo: the **accounting layer** (`exportQboIif*` in `src/lib/hub/expenses.ts`), which will ingest Stripe payouts through the QBO bank feed with zero code.

Add to every non-MoR row: Stripe Tax **0.5% of the taxed (WA) volume** if enabled — e.g. if half the trucks are WA carriers at 200 trucks, ≈ $15/mo — plus WA **B&O Retailing 0.471%** of WA-sourced gross (a tax, not a fee; owed regardless of rail).

### 1.3 The sales-tax reality for SaaS sold to trucking companies

- **Roughly two dozen US jurisdictions tax SaaS in some form (~25 incl. DC)**; B2B SaaS is taxable in e.g. **New York, Texas, Pennsylvania, Washington**; some states split B2B/B2C (Connecticut: 1% business use; Iowa: exempt for business use); Illinois exempts SaaS statewide but **Chicago taxes it** (lease transaction tax); Colorado begins taxing SaaS 2026-01-01; D.C. rises to 7% on 2026-10-01 (search-verified 2026-08-08; Anrok/TaxCloud/Numeral 50-state guides).
- **Washington — LoadOff's home state — squarely taxes SaaS** as a digital automated service / remote-access software: **retail sales tax (destination-sourced to the WA customer's location, ~8.9–10.6% depending on locale; Kent ≈ 10.1%) + Retailing B&O at 0.471% of gross** (retailing B&O rate is scheduled to rise 0.471% → 0.5% effective 2027-01-01 under 2025's ESHB 2081) (corrected on verification). Physical presence in Kent means these obligations start at the **first dollar** — no threshold. WA also broadened taxable digital/tech services effective 2025-10-01 (ESSB 5814) with contract transition rules through 2026-04-01; SaaS itself was already taxable long before that (search-verified 2026-08-08; DOR-derived guides: Kintsugi, Numeral, Hands Off Sales Tax, SALT Shaker).
- **Practical consequence:** WA carrier tenants must be invoiced $30/truck **plus ~10% WA sales tax** (or the price absorbs it). Out-of-state tenants: LoadOff owes nothing to their states until it crosses each state's economic nexus — typically **$100,000/yr of sales into that state** (WA's own out-of-state threshold is $100k; most states match; transaction-count prongs are being repealed). At $30/truck/mo, **200 trucks is $72k/yr across ALL states combined** — no single foreign state gets anywhere near $100k. Inference, clearly flagged: LoadOff's multistate exposure rounds to zero until roughly **280+ trucks concentrated in one taxing state**; monitor per-state revenue in the admin metrics and register when a state approaches threshold.
- **Does an MoR remove the burden?** It removes **sales-tax registration/collection/remittance** (the MoR is the retailer) — the burden LoadOff mostly doesn't have yet. It does **not** remove **WA B&O** (a gross-receipts tax on LoadOff's own revenue — under an MoR the receipts are still LoadOff's, likely reclassified retailing→wholesaling 0.471%→0.484%; flag for a WA CPA — inference) and not income tax or 1099-K reconciliation. Paying 5–6.5% of revenue to outsource one state's quarterly MyDOR return is a bad trade; Stripe Tax at 0.5% of WA volume + a quarterly filing (or a $0 DIY calc at tiny scale) covers it.

### 1.4 ACH specifics: pricing, failure/dispute mechanics, NACHA mandates

- **Pricing:** 0.8% capped at $5 — the fee stops growing at a $625 payment, so a 21+ truck tenant costs $5 flat, which is why ACH gets *cheaper* as fleets grow (search-verified 2026-08-08).
- **Failures:** $4 per failed debit (insufficient funds, closed account). Failures surface asynchronously (days, not seconds) — Stripe Billing's Smart Retries + dunning emails handle re-collection; the subscription state machine (`past_due` → `unpaid`/`canceled`) is configurable.
- **Disputes:** ACH has **no evidence/representment process** — a customer-initiated return (e.g. R10 "unauthorized") is **final**, costs $15, and claws the funds back; consumer accounts have ~60 days to dispute, business accounts ~2 banking days (search-verified 2026-08-08). Mitigation is the mandate + relationship, not paperwork: B2B churn-by-dispute is rare when the mandate is clean.
- **NACHA (WEB debit) mandate rules, and who carries them:** authorization must be clearly worded and captured; **account validation is required for first-use of a new account** (NACHA WEB Debit Account Validation Rule, in force since 2021-03-19); authorization records must be retained **2 years past revocation**; for **variable-amount recurring debits the customer must be notified ≥10 calendar days before** a debit whose amount changed (search-verified 2026-08-08; Nacha.org, Sila, PDCflow). **Stripe operationalizes nearly all of this** when you use Checkout/Payment Element with `us_bank_account`: it renders compliant mandate text (covering variable amounts), performs instant verification via Financial Connections (or micro-deposits), and stores the mandate object. **LoadOff's one duty: turn on upcoming-invoice notifications** (Billing can email upcoming invoices; also `invoice.upcoming` webhook) so a truck-count change that raises the debit is announced ≥10 days ahead. Per-truck billing amounts change — this is the single NACHA obligation the integration must consciously own.

---

## 2. The integration shape (Stripe Billing → the existing simulateBillingFromTenants seam)

### 2.1 Object mapping — LoadOff ↔ Stripe

| LoadOff (exists today) | Stripe object | Notes |
|---|---|---|
| `hub.carriers` row (tenant) | **Customer** (`metadata.carrier_id = <uuid>`) | Create at tenant provisioning; store `stripe_customer_id` on the carrier row (one nullable column) |
| $30/truck list price (`SIMULATED_PRICE_PER_TRUCK_CENTS = 3000`) | **Product** "LoadOff per-truck" + **Price** `unit_amount: 3000, currency: usd, recurring: {interval: month}` (licensed quantity) | Stripe amounts are **integer cents** — same unit as the whole repo, no conversion boundary (contrast the `centsToDecimalString` care taken in `factor.ts`) |
| Truck count per tenant (`TenantForSimulation.trucks`) | **Subscription** with one item, `quantity = trucks` | On truck add/remove: `subscriptions.update` the item quantity. Recommend `proration_behavior: 'none'` + quantity synced at period boundaries (bill next month for the new count) — simplest to explain to a carrier, and NACHA-notice friendly. Mid-cycle proration is a later option |
| `active: false` (suspended tenant stops billing — churn signal) | Subscription `cancel` / `pause_collection` | Mirrors `simulateBillingFromTenants`'s "suspended tenants bill nothing this month" rule exactly |
| `BillingRow { carrierId, month, billedCents, trucks }` | **`invoice.paid` webhook** → insert row: `carrierId` = customer metadata, `month` = period start "YYYY-MM", `billedCents` = `invoice.amount_paid` (already cents), `trucks` = line quantity | `computeSaasMonth`/NRR/ARPU run **unchanged** — this is the exact swap the module header promises ("the day Stripe billing goes live the same functions run on real invoices") |
| Admin page "Simulated billing" badge (`src/app/hub/admin/page.tsx`) | Flip to "Live billing" when real invoice rows exist for the month; keep simulation as the zero-rows fallback | The commit contract: page renders either source through the same tiles |

New table (one migration): `hub.billing_invoices` (carrier_id, month, billed_cents, trucks, stripe_invoice_id UNIQUE, status, created_at) — the UNIQUE stripe_invoice_id gives webhook idempotency the same way `factor.ts` dedupes on `reference = "factor:<external_id>"`.

**Webhooks to handle** (a dedicated `/api/hub/stripe/webhook` route — this is a LoadOff-level integration, not per-carrier, so it does NOT go through the per-carrier HMAC receiver in `/api/hub/webhooks/[provider]`; Stripe signs with its own scheme, verified via `stripe.webhooks.constructEvent` and the endpoint secret):

- `invoice.paid` → insert billing row (the metrics feed)
- `invoice.payment_failed` → mark tenant past-due; surface on admin page; Smart Retries continue
- `customer.subscription.updated` / `.deleted` → mirror status onto the carrier row (suspend on terminal nonpayment)
- `invoice.upcoming` → the NACHA ≥10-day variable-amount notice hook (email the carrier if amount changed)
- Store every event verbatim first, then process — the `hub.integration_events` store-then-apply pattern already proven by the factor receiver.

### 2.2 Payment-method collection and PCI scope

- **Recommended: Stripe-hosted Checkout Session** (`mode: 'setup'` or first invoice) offering `us_bank_account` (ACH, with Financial Connections instant verification + mandate) and `card` as fallback, plus the **hosted customer portal** for self-serve payment-method changes and invoices. Card/bank data never touches LoadOff's origin → the merchant qualifies for **SAQ A**, the smallest PCI self-assessment; Stripe pre-fills the SAQ in the Dashboard (search-verified 2026-08-08; docs.stripe.com/security guide).
- **Elements embedded on loadoff pages** keeps data in Stripe iframes but, under **PCI DSS 4.0.x (requirements 6.4.3 / 11.6.1, enforced since 2025-03-31)**, the merchant page embedding the iframe takes on script-inventory/integrity and change-monitoring duties, and several QSAs classify it **SAQ A-EP** (search-verified 2026-08-08). For a solo operator: not worth it. **Hosted Checkout + portal, full stop.**
- ACH-only would even sidestep card-PCI, but keep card as fallback for the tenant whose bank fights debits.

### 2.3 Test-mode → live checklist (concrete, for the build agents)

1. **Test mode build:** `sk_test_` keys in env; create Product/Price ($3000 cents licensed monthly); provisioning hook creates Customer+Subscription; truck-count change updates quantity; Checkout setup flow with `us_bank_account` test banks; webhook endpoint with test endpoint secret; Stripe CLI (`stripe listen`/`trigger`) drives `invoice.paid`, `invoice.payment_failed`, subscription lifecycle; verify billing rows land and the admin tiles equal what `simulateBillingFromTenants` would have said for the same tenants (the regression that proves the swap contract).
2. **Clock tests:** Stripe **test clocks** advance a simulated subscription through months — exercise NRR/churn tiles against synthetic time without waiting a month.
3. **Account activation (human):** legal name/EIN, Kent WA address, bank account for payouts; statement descriptor "LOADOFF".
4. **Tax (human):** WA DOR registration (likely already exists for Thind Transport — LoadOff may need its own account/UBI depending on entity structure — CPA question); enable Stripe Tax, register WA in the Tax dashboard, set the Price to `tax_behavior: 'exclusive'` so tax adds on top of $30.
5. **Go live:** swap to `sk_live_` keys; create the **live** webhook endpoint (separate secret — test and live secrets differ); re-run one real $1-style end-to-end with the owner's own carrier as tenant zero; confirm payout arrives; confirm dunning emails render with LoadOff branding; keep test mode wired in non-prod. Stripe's official checklist: docs.stripe.com/get-started/checklist/go-live (search-verified 2026-08-08).
6. **Migration:** for existing tenants, create subscriptions with `backdate_start_date`/anchor = signup month only if historical invoices are wanted (they are not — history stays simulated, clearly badged; real rows begin at go-live month. NRR becomes fully real after two live months).

### 2.4 Effort estimate (agent team, seam already in place)

| Slice | Scope | Estimate |
|---|---|---|
| SDK + config | `npm i stripe` (**MIT license** — passes the repo's MIT/Apache-2.0/BSD gate; search-verified 2026-08-08 via github.com/stripe/stripe-node LICENSE), env plumbing, product/price bootstrap script | 0.5 agent-day |
| Provisioning + quantity sync | Customer/Subscription create on tenant create; quantity update on truck change; suspend→pause mapping | 1 agent-day |
| Checkout + portal | Setup-mode Checkout route, success/cancel pages, portal deep link on tenant settings | 0.5–1 agent-day |
| Webhook route + billing rows | Signature verify, store-then-apply, `hub.billing_invoices` migration, idempotency, admin page swap + badge flip | 1–1.5 agent-days |
| Tests | Pure-function mapping tests + webhook fixture tests + the simulation-parity regression | 0.5–1 agent-day |
| Go-live + tax | Checklist above; Stripe Tax config; dunning/retry settings | 1–2 days elapsed (human gates: account activation, DOR) |
| **Total** | | **~4–6 agent-days; ~1–2 calendar weeks** with human approvals |

An MoR would not materially shrink this: provisioning, quantity sync, webhooks, and the metrics swap are needed regardless — the only work an MoR removes is Stripe Tax setup (a WA-only afternoon), while adding its own checkout/domain-verification integration.

---

## 3. Carrier receivables landscape 2026 (the money coming *into* carrier tenants)

### 3.1 Price of getting paid fast

- **Factoring, 2026:** industry range **1–5% of invoice face value**; most carriers pay **2–3.5%**; **Q2 2026 small-carrier index average 2.8%/invoice**; published "as low as 1.5%" teaser rates run 0.5–1.5 points below what small fleets actually sign (search-verified 2026-08-08; freightfactoringusa.com Q2 2026 rate index, Porter/TCE/T-Management 2026 guides).
- **Recourse vs non-recourse:** recourse (carrier eats broker default) **1–3%**; non-recourse (factor eats it) **3–5%**, typically **+0.5–1 point** over recourse; ~85% of trucking factoring agreements remain recourse (search-verified 2026-08-08). A 15-truck carrier with decent broker mix should target ~2.5% recourse / ~3% non-recourse before add-ons (ACH-out fees, monthly minimums, reserve terms — read for them).
- **Broker QuickPay:** **1.5–3%** for payment in ~2–7 days — e.g. **C.H. Robinson 2%, TQL 2.5%, Coyote 3%** (search-verified 2026-08-08; FreightWaves, otrucking QuickPay rate table). Only exists broker-by-broker, paperwork-gated, and speed is the broker's promise, not a contract.
- **Optimal small-carrier strategy** (worth encoding as LoadOff guidance UI later): take QuickPay from brokers whose fee ≤ the factoring rate; factor everyone else; keep strong-credit direct shippers on net-30 and pay 0%. LoadOff already knows days-to-pay per customer — a "cost to get paid now" hint on the invoice page is cheap and valuable.

### 3.2 Which factors have real APIs a TMS can integrate (2026)

The repo's `docs/integrations/factor.md` (three scout passes, 2026-07-17/-21/-26) already pinned this down; re-verified today with no contradictions found (search-verified 2026-08-08):

- **OTR Solutions — the only factor with a public developer-docs portal** (docs.otrsolutions.com) and a testing environment. Auth = account credentials + Azure API Management **`Ocp-Apim-Subscription-Key`**; bare `429` throttles; named APIs: Rate Verification, **Document Exchange** (what `submitInvoiceToFactor` targets), Carrier Setup, Load Shares. Partner-provisioned (email your OTR rep), and a **required "Show and Tell" walkthrough gates production**. Funding status is **poll-based** — no factor publicly documents outbound webhooks to carrier systems.
- **Apex Capital** — REST via partner program; carrier pastes an API key in TMS settings (Alvys/Ditat/Vektor-style); batch submission with rate-con/BOL; status pulled.
- **RTS Financial** — **FTP file drop only** (xlsx/csv batches + PDF docs); status via RTS Pro portal/reports. A transport LoadOff's fetch-based adapter deliberately doesn't speak — don't pick first.
- **Triumph (factoring arm)** — standard tier is an **hourly FTP carrier-sync file**; direct API exists at partner level only, undocumented publicly.
- **Porter Freight Funding** — McLeod-certified partner integration; no public carrier-facing API docs found (search-verified 2026-08-08).
- **Fintech tier — HaulPay (ComFreight, Dakota Financial-backed; pitches flat ~3% max, no reserve)** and **Denim (Truckstop-owned, broker-first)** — both market open APIs/key-based TMS integration; outbound-webhook signature schemes unpublished; first candidates to exercise LoadOff's existing generic webhook receiver.

**LoadOff implication (already true in code):** the generic Bearer-key submit in `factor.ts` + the planned funding-status poll cover OTR/Apex/HaulPay/Denim shapes; the email-packet fallback (`sendFactoringPacket`) covers everyone else including FTP-only factors.

### 3.3 TriumphPay — what it is and what a TMS integration actually requires

- **What it is:** the freight industry's **payor-side payments + audit network** (Triumph Financial, NASDAQ: TFIN): brokers/3PLs/shippers on one side, **factors** on the other, exchanging structured invoice data (NextGen Audit: POD detection, BOL validation) and settlement. Scale claims: **interacts with ~$47B in transportation spend — roughly 1 in 3 US brokered invoices** (search-verified 2026-08-08; triumph.io, Port TMS announcement).
- **Who integrates:** (a) **payors** — a broker's TMS/ERP (McLeod, Revenova, Tai, Port TMS are named partners) integrates for audit → clearance → settlement → payment; (b) **factors** — their factor-management systems connect for near-real-time verification and purchase decisions. Both are **partner-provisioned direct APIs — no public self-serve developer portal**; integration starts with a TriumphPay partnership conversation, not an API key page.
- **What it means for LoadOff (a carrier-side TMS): there is no public, self-serve carrier-TMS payments API to integrate — TriumphPay marketing does reference partner-level carrier-TMS integrations, but access is partner-provisioned, not self-serve (corrected on verification).** Carriers touch TriumphPay through the **TriumphPay carrier portal** — payment status across participating brokers, payment method, terms/QuickPay election, and "factor of record" handling (TriumphPay enforces NOA/factor-of-record to prevent misdirected payments). Realistic LoadOff moves, cheapest first: (1) surface "this broker pays via TriumphPay" knowledge + portal deep link on the invoice/customer page; (2) prefer first factor integrations that are **on** the TriumphPay network (faster verification → faster funding for tenants); (3) track NOA/factor-of-record per customer in LoadOff so tenant paperwork never fights the network's records; (4) only if LoadOff ever gains broker tenants does a payor-side TriumphPay integration become available/relevant.

---

## 4. Risk & compliance: the money-transmission line LoadOff must not cross

### 4.1 The trap, precisely

"Money transmission" (Washington's Uniform Money Services Act, **RCW 19.230**, mirrored in ~49 states) = **receiving money or its equivalent value to transmit, deliver, or instruct to be delivered to another person or location** (RCW 19.230.010; license required by RCW 19.230.030) (search-verified 2026-08-08, app.leg.wa.gov). A TMS that "helps carriers get paid" walks next to this line constantly. Triggers are about **possession/control of third-party funds**, not intent, not size, not "it's just a feature." Unlicensed money transmission is a state licensing violation *and* a **federal crime (18 U.S.C. §1960)**, plus FinCEN MSB registration/BSA duties attach. Payroll-style disbursement is exempt in *some* states and not others — never assume (search-verified 2026-08-08; InnReg/Brico/Lithic MTL guides).

### 4.2 What keeps LoadOff safe (patterns it already uses)

- **Being the payee for its own SaaS fees is not money transmission** — Stripe (a licensed money transmitter in US states since 2016) processes; funds settle to LoadOff for LoadOff's own services (search-verified 2026-08-08; stripe.com money-transmitter resources, DFPI filing).
- **Data-only factoring integration** — `factor.ts` submits invoice *documents and data*; the advance flows **factor → carrier's bank** directly. LoadOff never sees funds. Keep it exactly this shape.
- **Exports, not payouts** — QBO IIF export (`expenses.ts`), settlement/driver-pay *computation* (pay rules as data) handed to the carrier's own payroll/banking rails.
- **Referral links** to factors/QuickPay with disclosed compensation — marketing, not transmission (disclose in-app; some states have credit-services-organization rules if it drifts toward brokering loans — keep it to referral).
- **If embedded payouts are ever wanted** (e.g. "pay drivers from LoadOff"): do it only as a **licensed partner's platform** — Stripe Connect/Treasury-style, where the licensed entity holds and moves funds and LoadOff never has possession or control ("platforms using Connect avoid coming into possession or control of user funds and do not require a license" — search-verified 2026-08-08, stripe.com Connect/PSD2 guide; same architecture pattern in the US). WA also has a narrow **payment-processor exemption** (facilitating payment for goods/services through BSA-regulated institutions **under written contract with the payee**, RCW 19.230.020) — do not self-certify into it; that is a counsel question.

---

## Deliverable (a) — ADR-style recommendation (ready to adapt into `docs/decisions/`)

# 000X — Billing rail for LoadOff v1: Stripe Billing, ACH-first, WA-only Stripe Tax

**Status:** proposed · 2026-08-08
**Owner request:** turn the simulated $30/truck/month into real money without hiring a finance department, and keep the option to help carrier tenants get paid faster without becoming a bank.

## Decision

Adopt **Stripe Billing** as LoadOff's billing rail: one Product/Price at **3000 cents/truck/month**, one Subscription per carrier with **quantity = truck count**, **ACH debit (`us_bank_account`) as the default payment method** with card fallback, **Stripe-hosted Checkout + customer portal** (SAQ A PCI scope), **Stripe Tax registered for Washington only**, and a webhook-fed `hub.billing_invoices` table that feeds `computeSaasMonth` unchanged — the exact swap `saas-metrics.ts` was built for. The `stripe` npm SDK is MIT-licensed (passes license hygiene).

## Why

1. **Cost:** all-in ≈ **1.5% of revenue** ACH-first (0.8% capped $5 + 0.7% Billing) — $4.50/mo at 10 trucks, $22.50 at 50, ~$90 at 200 (improving past 20-truck fleets as the $5 cap bites). Cards ≈ 3.7%; MoRs ≈ 5–6.5% ($2.6k–3.6k/yr more than ACH at 200 trucks).
2. **Fit:** trucking companies pay by ACH; invoices carry LoadOff's name; per-seat (per-truck) quantity updates, proration, dunning, Smart Retries, hosted portal are first-class. Stripe amounts are integer cents — the repo's money rule holds with no conversion boundary.
3. **Tax:** the only obligation at v1 scale is **Washington** (physical presence; WA taxes SaaS + Retailing B&O 0.471%, scheduled to rise to 0.5% on 2027-01-01) (corrected on verification). Stripe Tax (0.5% of WA volume) computes destination-sourced WA sales tax; filing is a MyDOR return. Out-of-state economic nexus starts around $100k/yr **per state** — unreachable below roughly 280 concentrated trucks; monitored via the admin metrics.
4. **Effort:** ~4–6 agent-days to live on the existing `simulateBillingFromTenants` seam; the admin page's "Simulated billing" badge flips to live rows with history staying honestly badged.

## Rejected alternatives

- **Paddle (MoR, 5% + 50¢):** pays 3.4×–3.7× Stripe-ACH fees to outsource multistate/global tax LoadOff doesn't owe; invoices say Paddle, which confuses B2B trucking bookkeepers; no ACH pull; does not remove WA B&O.
- **Lemon Squeezy (MoR, 5% + 50¢ + 0.5% subs):** same MoR logic plus acquisition limbo (Stripe bought it 2024; onboarding now takes weeks; roadmap folds into Stripe Managed Payments).
- **Stripe Managed Payments (MoR preview, ~6.4% + 30¢ all-in):** most expensive; digital-products focus; preview status.
- **QuickBooks invoicing + Payments (1% ACH):** nominally cheapest rail but no subscription/quantity automation from `hub.carriers`, no portal/dunning — ops cost swamps the 0.5-point saving. QBO remains the accounting layer via bank feed + the existing IIF export.
- **Bare PaymentIntents (no Billing, saves 0.7% ≈ $42/mo at 200 trucks):** rebuilding proration/dunning/retries/portal/mandate emails is weeks of agent work and permanent maintenance for ~$500/yr.
- **Plain ACH with self-managed NACHA mandates:** the WEB-debit rules (account validation, 2-year retention, 10-day variable-amount notice) are exactly what Stripe's mandate machinery already does; DIY adds compliance risk for zero fee savings beyond the same 0.8%.

## Revisit when

- Any single non-WA state approaches ~$80k/yr of LoadOff revenue (register there or reconsider MoR).
- Stripe Managed Payments exits preview with B2B invoicing + ACH and a price near PSP rates.
- LoadOff considers touching payouts (driver pay, carrier disbursements) → that is ADR-worthy on its own and gated by §4 / Deliverable (c).

---

## Deliverable (b) — Factoring / QuickPay comparison for the carrier side (2026)

| Option | Typical cost (2026) | Speed | Risk model | Real API for a TMS? | LoadOff integration path today |
|---|---|---|---|---|---|
| Broker net terms | 0% | 30–45+ days | Carrier carries broker credit risk | n/a | Invoices + aging already in hub |
| **Broker QuickPay** | **1.5–3%** (CHR 2%, TQL 2.5%, Coyote 3%) | 2–7 days | Broker still the payer | No (per-broker portals/paperwork) | Days-to-pay data → "QuickPay vs factor" hint (future) |
| **Recourse factoring** | **1–3%**, small-carrier average ≈ **2.8%** (Q2 2026 index) | Same/next day | Carrier buys back broker defaults | Varies by factor (below) | `submitInvoiceToFactor` + email-packet fallback |
| **Non-recourse factoring** | **3–5%** (≈ +0.5–1 pt over recourse) | Same/next day | Factor eats qualifying defaults | Varies | Same |
| **OTR Solutions** | non-recourse-oriented; rate quoted per carrier | Same day | Non-recourse focus | **Yes — the only public dev portal + sandbox** (Azure APIM key; "Show and Tell" go-live gate; status by polling) | **Recommended first live factor** (matches `factor.ts` + planned status poll) |
| **Apex Capital** | quoted | Same day | Both | Partner API key (Alvys/Vektor-style) | Bearer-key shape already supported |
| **RTS Financial** | quoted | Same day | Both | **No — FTP file drop** | Email fallback only (FTP out of scope) |
| **Triumph (factoring arm)** | quoted | Same day | Both | FTP standard tier; partner API unpublished | Email fallback; note TriumphPay ≠ Triumph factoring |
| **TriumphPay (network)** | n/a (payor/factor network; ~$47B spend, ~1 in 3 brokered invoices) | n/a | n/a | **Partner-provisioned payor/factor integrations — no public carrier-TMS API (corrected on verification)** | Surface portal links; prefer network factors; track NOA/factor-of-record |
| **Porter Freight Funding** | quoted | Same day | Both | McLeod-certified integration; no public API | Email fallback |
| **HaulPay / Denim (fintech)** | HaulPay pitches flat ≤3%, no reserve | Same day | Both | API-forward, key-based; webhook schemes unpublished | First candidates to exercise the existing webhook receiver |

(Rates search-verified 2026-08-08; API/transport rows page-verified against `docs/integrations/factor.md` scout passes and re-checked by search today.)

---

## Deliverable (c) — NEVER do without a license (payments hard lines)

LoadOff must **never**, in any feature, marketing promise, or "quick favor for a tenant":

1. **Hold, pool, or escrow anyone else's money** — no LoadOff bank account that receives funds destined for a carrier, driver, or factor. Possession/control of third-party funds is the money-transmission trigger (RCW 19.230.010/.030; ~49-state licensing; 18 U.S.C. §1960 federally).
2. **Disburse driver pay or settlements** from any LoadOff-controlled account — payroll-style disbursement is licensed activity in many states and exempt only in some; compute and export, never pay.
3. **Sit in the factoring funds flow** — advances go factor → carrier bank. LoadOff submits data/documents only (`factor.ts` shape). No "funds pass through us for reconciliation."
4. **Offer "LoadOff QuickPay"** or any advance/float against tenant receivables from LoadOff funds — that is lending + likely transmission (and usury/CSO exposure).
5. **Aggregate broker/shipper payments and forward them** to carriers — classic unlicensed-transmitter fact pattern, even if fee-free.
6. **Issue payment instruments or stored value** (wallet balances, prepaid fuel cards under LoadOff's name) — separately licensed under the same act.
7. **Operate an FBO ("for benefit of") account** without a chartered/licensed partner program that legally owns the funds flow (Stripe Connect/Treasury-class), with counsel sign-off.
8. **Self-certify into exemptions** (WA's payment-processor/agent-of-payee carve-out, payroll exemptions) — these are narrow, state-specific, and require written payee contracts; counsel decides, not a feature ticket.
9. **Touch cross-border payments** to non-US drivers/vendors — adds federal remittance-rule exposure on top of state MTL.
10. **Hold card data** — keep hosted Checkout/portal (SAQ A); never build card forms on LoadOff origins.

Always safe (and already the codebase's instinct): be the **payee** for LoadOff's own fees via a licensed processor; **move data, not money** (factor submissions, QBO exports, pay statements); **refer** with disclosed compensation; **display** other parties' payment status.

---

## Sources

**Repo (page-verified 2026-08-08):** `src/lib/hub/saas-metrics.ts`; `src/app/hub/admin/page.tsx`; `src/lib/hub/integrations/factor.ts`; `docs/integrations/factor.md` (2026-07-17/-21/-26 scout passes incl. OTR/Apex/RTS/Triumph/HaulPay/Denim sourcing); `docs/decisions/0003-everything-app.md`; `package.json`.

**Billing rails (search-verified 2026-08-08):**
- Stripe Billing single-plan 0.7% + legacy Starter/Scale: https://support.stripe.com/questions/changes-to-the-stripe-billing-starter-and-scale-plans · https://stripe.com/billing/pricing · https://stripe.com/pricing
- Stripe Invoicing 0.4% one-off: https://stripe.com/invoicing/pricing · third-party trackers (costbench.com, flexprice.io, checkoutpage.com)
- Stripe Tax 0.5% (Basic/no-code; filing separate): https://feetrace.com/blog/stripe-tax-fees-for-saas-in-2026-complete-guide · https://frontdeskreview.com/software/sales-tax-automation/stripe-tax/ · https://www.galvix.com/article/stripe-sales-tax-automation-guide/
- Stripe ACH 0.8%/$5 cap, $4 failure, $15 final dispute: https://stripe.com/pricing · https://support.stripe.com/questions/ach-direct-debit-pricing · https://docs.stripe.com/payments/ach-direct-debit · https://feeprobe.com/stripe-ach-fees/ · https://feetrace.com/blog/stripe-ach-fees-for-saas-what-finance-teams-should-know
- Paddle 5% + $0.50: https://www.stackscored.com/pricing/saas-billing/paddle/ · https://dodopayments.com/blogs/paddle-fees-explained
- Lemon Squeezy 5% + $0.50 (+0.5% subs, +1.5% intl/PayPal) and Stripe acquisition status: https://www.lemonsqueezy.com/blog/2026-update · https://finovate.com/stripe-acquires-lemon-squeezy-for-undisclosed-amount/ · https://www.swell.is/content/lemon-squeezy-pricing · https://creatdrop.com/compare/lemon-squeezy-fees
- Stripe Managed Payments ~+3.5% (≈6.4%+30¢ all-in, preview): https://stripe.com/managed-payments · https://dodopayments.com/blogs/stripe-managed-payments-fees-explained · https://tiun.io/blog/cost-of-stripe-managed-payments-2026
- QuickBooks Payments (1% ACH cap changes, 2.9% invoiced card, $25 convenience fee): https://dodopayments.com/blogs/quickbooks-payments-fees · https://www.depositfix.com/blog/quickbooks-ach-fees · https://peakadvisers.com/blog/quickbooks-new-25-ach-convenience-fee-explained/
- stripe-node MIT license: https://github.com/stripe/stripe-node/blob/master/LICENSE

**Tax (search-verified 2026-08-08):**
- WA SaaS taxability + B&O 0.471% + $100k nexus + 2025-26 expansion: https://trykintsugi.com/sales-tax-guides/usa/washington · https://www.numeral.com/blog/washington-b-and-o-tax · https://handsoffsalestax.com/is-saas-taxable-in-washington-state/ · https://www.stateandlocaltax.com/sales-and-use-tax/washington-dor-rules-saas-implementation-services-and-travel-costs-subject-to-sales-tax/ · https://www.avalara.com/blog/en/north-america/2025/07/washington-digital-ad-tech-tax.html
- State-by-state SaaS taxability (incl. B2B NY/TX/PA, CT 1%, Chicago, CO 2026, DC 7%): https://www.anrok.com/saas-sales-tax-by-state · https://taxcloud.com/blog/saas-sales-tax-by-state/ · https://www.numeral.com/blog/sales-tax-on-saas

**NACHA / PCI (search-verified 2026-08-08):**
- WEB debit account validation, 2-yr retention, 10-day variable-amount notice: https://www.nacha.org/rules/meaningful-modernization · https://www.silamoney.com/ach/understanding-the-nacha-web-debit-rule-what-it-is-and-why-it-matters · https://www.pdcflow.com/resources/guides/ach-authorization-requirements/
- SAQ A via Checkout/Elements + PCI DSS 4.0 6.4.3/11.6.1: https://docs.stripe.com/security · https://stripe.com/guides/pci-compliance · https://cside.com/blog/can-you-use-stripe-for-pci-dss
- Go-live checklist / test-live separation: https://docs.stripe.com/get-started/checklist/go-live · https://docs.stripe.com/webhooks

**Carrier receivables (search-verified 2026-08-08):**
- Factoring rates/recourse: https://freightfactoringusa.com/freight-factoring-rate-index-q2-2026/ · https://freightfactoringusa.com/freight-factoring-rates-benchmark-2026/ · https://porterfreightfunding.com/blog/how-much-do-freight-factoring-companies-charge/ · https://tmanagementgroup.com/freight-factoring-rates-explained/ · https://otrucking.com/resources/guides/freight-factoring-rates-2026/
- QuickPay fees/broker table: https://otrucking.com/resources/guides/quickpay-rates-by-broker/ · https://www.freightwaves.com/news/the-broker-offers-you-quick-pay-and-it-sounds-like-free-money-read-this-before-you-take-it · https://truckstop.com/blog/carrier-quickpay-program/
- TriumphPay network/TMS-partner/factor model + $47B / 1-in-3: https://triumph.io/factors/ · https://triumph.io/broker/audit/ · https://porttms.com/blog/port-tms-announces-integration-with-triumphpay-to-deliver-next-generation-audits-and-payments · https://triumph.io/blog/broker/meet-our-tms-partners/ · https://support.triumphpay.com/support/solutions/articles/44002492009-triumph-payments-factor-of-record-holds · https://triumph.io/carrier/payments/
- RTS FTP-only re-check: https://help.alvys.com/en/articles/11560094-rts-financial-factoring-integration · https://www.vektortms.com/integrations/rts-factoring · https://help.ditat.com/dtm/integrate-with-rts-factoring
- Porter/McLeod: https://www.mcleodsoftware.com/certified-partners/porter-freight-funding/

**Money transmission (search-verified 2026-08-08):**
- RCW 19.230 definitions/license/exclusions: https://app.leg.wa.gov/rcw/default.aspx?Cite=19.230&full=true · https://app.leg.wa.gov/rcw/default.aspx?cite=19.230.020 · https://law.justia.com/codes/washington/title-19/chapter-19-230/section-19-230-030/
- MTL triggers, payroll variance, who needs one: https://www.innreg.com/blog/money-transmitter-license-steps-and-requirements · https://www.brico.ai/post/who-needs-a-money-transmitter-license-8-common-company-types · https://www.lithic.com/blog/money-services-business
- Stripe licensing + Connect keeps platforms out of possession/control: https://stripe.com/resources/more/what-is-a-money-transmitter · https://stripe.com/guides/frequently-asked-questions-about-stripe-connect-and-psd2 · https://dfpi.ca.gov/wp-content/uploads/sites/337/2019/05/PRO-07-17-Stripe.pdf

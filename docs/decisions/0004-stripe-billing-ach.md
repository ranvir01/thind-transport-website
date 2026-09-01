# 0004 — LoadOff billing: Stripe Billing, ACH-first; no merchant of record

**Status:** accepted · 2026-08-08
**Input:** research wave 2, `docs/research/2026-08b/prompt-14-payment-rails.md`
(adversarially verified 2026-08-08: 12 claims checked, 10 confirmed, 1 corrected,
1 softened).

## Decision

Charge carriers for LoadOff subscriptions with **Stripe Billing**, collecting by
**ACH debit first** (cards allowed, not steered to), using **hosted Checkout and
the hosted customer portal** — never Elements or custom card fields. Do not use a
merchant-of-record (Paddle, Lemon Squeezy, Stripe Managed Payments).

## Why

- **Cost.** ACH is 0.8% capped at $5, plus Billing's 0.7%: ~1.5% all-in, or about
  $4.50 / $22.50 / ~$90 per month at 10 / 50 / 200 trucks under $30/truck
  pricing. Cards run ~3.7%; MoR offerings run 5–6.5%. At this scale the MoR
  premium buys nothing (next point).
- **The MoR tax pitch is moot here.** 200 trucks ≈ $72k/yr total revenue — under
  every state's ~$100k economic-nexus threshold. The only jurisdiction owed
  regardless is Washington (physical presence; WA taxes SaaS, and B&O applies —
  0.471% retailing rate today, **scheduled to rise to 0.5% on 2027-01-01** per
  ESHB 2081). An MoR does not remove B&O, and Stripe Tax scoped WA-only covers
  the sales-tax half for 0.5% of WA volume.
- **PCI scope.** Hosted Checkout/portal keeps LoadOff at SAQ A. Embedding
  Elements would add PCI DSS 4.0 script-integrity and monitoring duties for zero
  product gain.
- **The seam already exists.** Stripe is integer-cents native (repo money rule);
  Customer = carrier, subscription quantity = truck count, and `invoice.paid`
  maps 1:1 onto the `BillingRow` shape `computeSaasMonth` already consumes, so
  the admin SaaS metrics page moves from simulation-fed to fact-fed without a
  schema change.
- **License.** The `stripe` npm SDK is MIT — inside the dependency gate.

## Sharp edges owned by LoadOff, not Stripe

- **NACHA WEB debit, variable amounts:** per-truck billing changes month to
  month, so the ≥10-calendar-day advance notice for variable-amount recurring
  debits is ours to send — wire it to Stripe's `invoice.upcoming` webhook.
- Stripe's mandate machinery covers authorization capture/retention otherwise.

## Hard lines (carrier-side money, from the same report)

LoadOff **moves data, never money**, on the carrier-payments side: no holding or
pooling funds, no driver-pay disbursement, no LoadOff-branded QuickPay or cash
advances, no FBO accounts. Factoring stays "prepare and submit the packet to the
carrier's own factor" (OTR Solutions remains the one factor with public
developer docs + sandbox, confirming the stub-first adapter bet). TriumphPay has
no public self-serve carrier-TMS API — partner-level integrations exist, but the
lever for a 15-truck carrier is factor choice, not a TriumphPay build.

## Effort and gates

~4–6 agent-days of build (Checkout session + webhook receiver + `BillingRow`
bridge + portal link + WA-only Stripe Tax config), behind human gates the owner
holds: Stripe account activation, WA DOR registration check, and pasting
`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` env-var **names** into Vercel
(values never enter this repo).

## Revisit when

Any of: revenue approaching ~$100k in any single state (nexus), a second
physical-presence state, EU/CA customers (VAT/GST is where MoR earns its 5%), or
Stripe pricing changes that close the ACH gap.

# LoadOff Security Roadmap: Decentralization Verdict, 2FA Plan, Threat Model, Buyer Checklist

Date: 2026-08-07 · Prepared for the LoadOff owner (solo, non-technical; AI build agents execute against this report)

---

## TL;DR

- **Decentralization is the wrong tool for LoadOff.** The two flagship blockchain-logistics platforms are dead: Maersk/IBM's TradeLens shut down in Q1 2023 for lack of commercial viability, and ShipChain paid the SEC $2.05M and ceased operations. E2E encryption would break search, settlements math, and the Claude-powered document intake — the features that ARE the product.
- **The 90/10 answer already half-exists in the codebase:** extend the existing integration-credential encryption to field-level encryption of SSNs and bank details, with per-carrier derived keys. Days of work, not months, and it survives a database leak.
- **The real threats are boring and documented:** freight fraud ≈ $800M/yr (Freight Fraud Symposium 2026), cyber-enabled cargo theft ≈ $725M in North America in 2025, BEC $3.04B (FBI IC3 2025) — all driven by stolen logins and fake emails, not by centralized databases.
- **Trucking is the worst industry in America at MFA:** 42% workforce adoption, dead last (Okta 2025). Shipping 2FA is a genuine competitive differentiator for a TMS, not a checkbox.
- **2FA path is clear and license-clean:** TOTP via `@oslojs/otp` or `otpauth` (both MIT) + passkeys via `@simplewebauthn/server` v13 (MIT). Skip Auth.js's built-in Passkey provider — it is experimental, Prisma-adapter-only, and pins an obsolete SimpleWebAuthn v9. Skip SMS 2FA entirely (NIST-restricted, SIM-swap-prone, costs money).
- **Expect low voluntary 2FA uptake from dispatchers** (consumer baselines: 2.6% Twitter 2021, <10% Google 2018). The lever is policy, not persuasion: require it for admin/money roles and offer a per-carrier "require 2FA" toggle.
- **NIST SP 800-63B Rev 4 (final, Aug 2025) rewrote password rules:** 15-char minimum when password is the only factor, NO composition rules, NO forced rotation, and a **mandatory** breached-password blocklist check — the last one is a half-day of work (HIBP k-anonymity API) LoadOff doesn't have yet.
- **The RLS memo's reasoning has a specific, revisitable gap:** Neon pools in PgBouncer *transaction mode*, and `SET LOCAL` is transaction-scoped by PostgreSQL semantics — a per-request single-transaction pattern cannot leak across pooled connections. RLS as belt-and-suspenders becomes viable exactly when the memo says it must: before onboarding a stranger carrier.
- **Cheapest credibility wins buyers check first:** SPF/DKIM/DMARC on thindtransport.com (Microsoft joined Google/Yahoo in enforcing these in May 2025), `/.well-known/security.txt` (RFC 9116, 30 minutes), and a /security page. Total: about two days.

---

## 1. Decentralization, honestly evaluated

The owner asked about "some sort of decentralization" for security. There are three things that phrase can mean for a SaaS. Each is evaluated against what LoadOff actually does: multi-tenant dispatch, server-side settlements math in integer cents, server-side search/aggregation across loads and invoices, and LLM-based document parsing that by definition requires the server to read documents.

### 1a. Blockchain / distributed-ledger storage

**What it claims to buy:** tamper-evident shared records, no single trusted operator.

**What actually happened in logistics — the graveyard:**

- **TradeLens** (Maersk + IBM, blockchain-enabled global trade platform, ~$100M+ invested, hundreds of ecosystem members): discontinued. Maersk's own announcement (2022-11-29): "TradeLens has not reached the level of commercial viability necessary to continue" — the platform went offline by end of Q1 2023. This was the best-funded, best-connected blockchain logistics project ever attempted. (Maersk announcement; Supply Chain Dive, source dated 2022-11/2023-Q1; verified 2026-08-07)
- **ShipChain** — the closest thing to a "blockchain TMS" — raised $27.6M in an unregistered ICO, was fined by the SEC ($2.05M penalty, Dec 2020), and agreed to cease operations and dissolve. (SEC.gov In the Matter of ShipChain, Inc., Admin. Proc. 3-20185; FreightWaves; verified 2026-08-07)
- The pattern generalizes: consortium blockchains failed commercially because the trust problem they solve (mutually distrusting parties sharing one ledger) is not the problem carriers/brokers actually pay to solve (moving loads and getting paid faster).

**What it costs:** consensus infrastructure, key management for every participant, an ops burden no solo owner can carry, and — critically — it does nothing for LoadOff's real risk. A blockchain would happily record a fraudulent double-brokered load immutably. Fraudsters with stolen credentials write to ledgers just fine.

**Verdict: No.** Zero fit. The market already ran this experiment with nine-figure budgets and shut it down.

### 1b. Self-hosted per-tenant nodes (each carrier runs their own instance)

**What it buys:** hard tenant isolation (separate DB per carrier), data residency control.

**What it costs:** N deployments, N migration runs, N monitoring surfaces, N support burdens. It destroys the economics that let one owner + AI agents serve many carriers, and small carriers — the actual customers — have no IT staff to host anything (the industry with 42% MFA adoption is not going to run Postgres). It also breaks cross-tenant features LoadOff legitimately needs (the broker/shipper portals touching multiple carriers' loads).

**Verdict: No, with one future exception.** If a single enterprise shipper ever demands a dedicated single-tenant deployment and will pay 5–10x for it, that's a sales conversation, not an architecture. (Inference from standard SaaS practice.)

### 1c. End-to-end encryption (server cannot read tenant data)

**What it buys:** even a full database breach or a malicious insider yields ciphertext. This is the strongest honest meaning of "decentralized security" — the trust moves to customer-held keys.

**What it breaks — for LoadOff, almost everything:**

- **Search and aggregation:** the server can't filter loads by broker, sum settlements, or compute driver pay over data it can't read. Searchable/homomorphic encryption remains research-grade with severe leakage-vs-performance tradeoffs (IACR ePrint 2019/693, "Security-Efficiency Tradeoffs in Searchable Encryption"; opensse.github.io; verified 2026-08-07).
- **Settlements math:** integer-cent money math, audited by `logAudit`, happens server-side in server actions. E2E moves it into the client — every device becomes a place money math can silently diverge, and the audit trail loses its meaning.
- **Document intake:** `src/lib/hub/doc-intake/llm-parser.ts` sends documents to the Claude API with PII redaction. An E2E server cannot parse what it cannot read. This feature is impossible under E2E, full stop.
- **Recovery:** a dispatcher who forgets a password loses the carrier's data unless you build key-escrow — which quietly reintroduces the server-held key and voids the E2E claim.
- **Integrations:** ELD/accounting/webhook integrations require server-side plaintext.

**Who tried it in B2B and what happened:**

- **Skiff** (E2E email + docs + calendar, the most credible E2E productivity suite): acquired by Notion Feb 2024 and shut down — the sunset was announced at six months, then extended to ~12 months after user pushback (corrected on verification) — users given months to migrate out. The E2E architecture was not what Notion wanted; the product died. (TechCrunch, 2024-02-09; verified 2026-08-07)
- **Keybase** (E2E identity/chat/git): acquired by Zoom May 2020; product effectively frozen since. (Source dated 2020; inference on current status from public repo activity.)
- **Survivors exist only where encryption IS the product** — Tresorit, Proton, Bitwarden, Signal. No mainstream B2B workflow SaaS (CRM, ERP, TMS) runs E2E, because workflow SaaS sells server-side computation over the data. (Inference, consistent with all sources reviewed.)

**Verdict: No for E2E of operational data.** It defends against the least likely threat (LoadOff's own database read by an attacker) by destroying the product's reason to exist.

### 1d. The 90/10 answer: application-layer field encryption with per-tenant keys

This is what the E2E instinct is actually reaching for, at ~10% of the cost:

1. **Field-level encryption for the crown jewels** — driver SSNs, bank account/routing numbers, factoring details. LoadOff *already* encrypts integration credentials at rest with a server-held key; extend that exact mechanism to these columns. The server can still decrypt when needed (settlements, 1099s), but a SQL-injection dump or a leaked backup yields ciphertext for the fields that cause identity theft. **Effort: 1–2 days** (new encrypt/decrypt call sites + migration to backfill).
2. **Per-tenant derived keys (envelope encryption):** derive or store one data-key per carrier, wrapped by the master key — the standard multi-tenant KMS pattern (AWS Architecture Blog, "Simplify multi-tenant encryption with a cost-conscious AWS KMS key strategy," source dated 2025-08; verified 2026-08-07). Buys: cryptographic blast-radius containment (one carrier's key compromise ≠ all carriers), and instant "cryptographic deletion" of a departed carrier by destroying their key. **Effort: +1–2 days** on top of item 1.
3. **The enterprise endgame, only if demanded:** customer-managed keys, where the tenant holds the wrapping key but the server still computes — Slack's Enterprise Key Management is the canonical precedent (customer keys in AWS KMS, Slack still searches/processes, customer gets CloudTrail audit + targeted revocation; Enterprise+ add-on; slack.com/enterprise-key-management, verified 2026-08-07). This is Tier-3 material, priced accordingly.

This engages, rather than contradicts, the codebase's actual posture: tenant isolation by `carrier_id` + harness stays the primary wall; encryption keys become the second, independent wall for the data whose leak is unrecoverable.

### 1e. Where this intersects the RLS memo (docs/decisions/0002)

The memo (read in full at `/tmp/ttw-probe/docs/decisions/0002-application-level-tenant-isolation.md`) rejected RLS *for now* because "a `SET LOCAL` that leaks across a reused connection is a worse failure than the one being fixed." That reasoning deserves one precise update:

- **The fear is exactly right for session-level `SET`.** Neon (which powers Vercel Postgres) pools via **PgBouncer in transaction mode** and documents session-level `SET`/`RESET` as unsupported over the pooled connection — session state genuinely leaks/vanishes across transactions. (neon.com/docs/connect/connection-pooling, verified 2026-08-07)
- **But `SET LOCAL` is transaction-scoped by PostgreSQL semantics** — its effect ends at COMMIT/ROLLBACK and *cannot* survive onto a reused connection (postgresql.org/docs/current/sql-set.html). Under transaction-mode pooling, a connection is only ever shared *between* transactions. So the safe pattern exists: every tenant-scoped request runs `BEGIN; SET LOCAL app.carrier_id = $1; …queries…; COMMIT` as one transaction.
- **The remaining failure mode fails closed, not open:** `SET LOCAL` outside a transaction silently no-ops — but with default-deny policies keyed on `current_setting('app.carrier_id', true)`, a missing setting returns zero rows, not foreign rows. That is the failure direction you want.
- **Two implementation landmines the memo correctly flags:** the app must not connect as the table owner (or use `FORCE ROW LEVEL SECURITY` per table), and `BYPASSRLS` on the migration role must be audited.

**Recommendation:** keep the harness as the primary mechanism (it catches bugs RLS can't, like cross-carrier writes with a *valid* but wrong carrier_id in app logic). Add RLS as a Tier-2 pilot — the memo itself sets the trigger: *"This should land before a carrier the owner does not personally know is onboarded."* Effort: ~1–2 weeks phased (policy per table over 69 tables, a `withTenantTransaction()` helper, and the live harness extended to prove RLS blocks what the app-layer scoping blocks).

---

## 2. 2FA specifics for THIS stack (Next.js 16 + NextAuth v5 beta.30, JWT sessions, raw pg, MIT/Apache gate)

### 2a. What NOT to use

- **Auth.js's built-in Passkey provider: skip it.** The official docs mark it "experimental and not recommended for production use," it requires a database adapter (Prisma ≥1.3.0 — LoadOff uses raw `pg` with no adapter), and it pins `@simplewebauthn/server@9.0.3` — four major versions behind. (authjs.dev/getting-started/authentication/webauthn, verified 2026-08-07)
- **SMS 2FA: skip permanently.** NIST has treated SMS/PSTN out-of-band as a **RESTRICTED** authenticator since SP 800-63B Rev 3 (2017), and the final Rev 4 (published August 2025) keeps that status — restricted means agencies must justify it, warn users, and offer alternatives; the industry reads it as deprecated-in-practice due to SIM-swap and SS7 attacks. It also costs per-message money forever. (NIST SP 800-63B; TypingDNA analysis of Rev 4, source dated 2025; verified 2026-08-07)

### 2b. What to build (all MIT — passes the license gate)

| Component | Library | License | Status (verified 2026-08-07) |
|---|---|---|---|
| TOTP (RFC 6238) | `@oslojs/otp` | MIT | Zero dependencies, oslo-project |
| TOTP alternative | `otpauth` (hectorm) | MIT | v9.5.1, Apr 2026, actively maintained |
| Passkeys/WebAuthn | `@simplewebauthn/server` + `/browser` | MIT | v13.3.2, June 2026, actively maintained (single-maintainer, closed to external PRs but responsive) |
| QR for TOTP enrollment | `qrcode` npm | MIT | stable |

**Architecture that fits the existing code (agent-ready):**

1. **Tables:** `hub.user_totp` (user_id, encrypted secret — reuse the existing integration-credential encryption util, confirmed_at) and `hub.user_recovery_codes` (user_id, code_hash bcrypt, used_at). Later: `hub.user_passkeys` (credential_id, public_key, counter, transports, name, last_used_at).
2. **Login flow with JWT strategy:** the Credentials `authorize()` already returns the user; add a `mfaPending: true` claim in the JWT callback when the user has TOTP enrolled; middleware confines `mfaPending` sessions to a single `/verify-2fa` route; a server action verifies the 6-digit code (±1 time-step window, rate-limited through the existing `auth-throttle` with a new `"totp"` scope) and reissues the JWT without the flag. No adapter needed.
3. **Recovery codes UX (the part users actually feel):** generate 10–16 single-use codes at enrollment (GitHub generates 16), display + force download **once**, store only bcrypt hashes, burn on use, "regenerate" invalidates the previous set, and warn at ≤3 remaining. Accepting a recovery code should also prompt re-enrollment. (docs.github.com two-factor recovery methods, verified 2026-08-07)
4. **Passkeys (Tier 2):** implement registration/authentication ceremonies directly with `@simplewebauthn/server` v13 in server actions — no Auth.js provider involved. Offer passkey as (a) a second factor and (b) eventually a passwordless first factor for the driver PWA, where Face ID beats typed passwords in a truck cab.

**Effort:** TOTP + recovery codes + enforcement flag ≈ **3–5 agent-days**. Passkeys ≈ **3–5 more**. Per-carrier "require 2FA" org toggle ≈ **1 day**.

### 2c. Adoption reality — set expectations, then use policy

- Voluntary consumer 2FA uptake is dismal: **2.6%** of active Twitter accounts (Twitter transparency report, source dated 2021); **<10%** of active Google accounts (Google engineer, Usenix Enigma, source dated 2018).
- Workforce MFA overall reached **70%** (Okta Secure Sign-in Trends 2025) — but **transportation & warehousing is the LOWEST industry at 42%**. (Okta via Swif MFA statistics roundup, verified 2026-08-07)
- Passkeys change the friction math: **93% login success vs 63% for traditional MFA, 8.5s vs 31.2s** (FIDO Alliance State of Passkeys 2026, via same roundup); 5B active passkeys worldwide, 75% consumer awareness.
- Effectiveness: phishing-resistant MFA blocks **>99%** of identity attacks even when the attacker has a valid password (Microsoft Digital Defense Report 2025).

**Practical forecast (labeled inference):** expect **5–15%** voluntary opt-in from non-technical dispatchers/drivers if 2FA is merely offered. Therefore: **mandate by role, not by plea** — hard-require TOTP for owner/admin/settlement-money roles at rollout, default-on prompt for office staff, optional for drivers until passkeys ship. That converts "adoption %" from a hope into a setting.

---

## 3. The realistic threat model for small-carrier SaaS (ranked, cited, mapped to controls)

Ranked by likelihood × damage for LoadOff's actual users (small carriers, dispatch + money data):

### #1 — Double-brokering & carrier identity theft (fraud via stolen/fabricated identity)
- **Scale:** ≈ **$800M/yr** freight-fraud losses, understated by underreporting; **80,000+ unresolved complaints** in FMCSA's database (Freight Fraud Symposium 2026, Cleveland; verified 2026-08-07). Cyber-enabled cargo crime ≈ **$725M in North America in 2025**, and NMFTA calls digital compromise "a leading precursor to stolen freight" — FMCSA account hijacking and load-board impersonation are now *standard* tactics (NMFTA 2026 Transportation Cybersecurity Trends Report; BleepingComputer/NMFTA, verified 2026-08-07).
- **Mechanics:** phish dispatch/accounting staff → take over email or load-board accounts → re-tender loads as a fake broker, or clone a legitimate carrier's DOT/MC identity and book real freight. Regulators are responding: FMCSA's Motus Phase II registration now requires government-ID verification with facial scans; the CORCA anti-fraud bill passed the House 2026-05-12.
- **LoadOff controls:** broker/counterparty verification step in load intake (MC + bond status surface), alert + second-channel confirmation on any counterparty banking change, immutable `logAudit` on money mutations (exists), anomaly flag when a settlement's payee details changed within N days of payment. **Effort: 2–4 days** for the verification/alert layer.

### #2 — BEC / invoice-redirect fraud on email
- **Scale:** BEC losses **$3.04B in 2025** (up from $2.77B in 2024), and **86% of BEC losses moved via wire/ACH** — i.e., exactly the invoice/settlement flows a TMS touches. Total US cybercrime losses hit **$20.9B (+26% YoY)**. (FBI IC3 2025 Annual Report, ic3.gov, via SpyCloud summary; verified 2026-08-07)
- **LoadOff-specific surface:** the IMAP document-intake pipeline (`imapflow`/`mailparser`) ingests emailed docs — a spoofed "rate confirmation" or "updated remittance instructions" email is an *injection path into the product*. DMARC checking on inbound intake mail and a "banking details never change via emailed document" rule are cheap, high-value guards.
- **Controls:** outbound SPF/DKIM/DMARC on thindtransport.com (Section 4) so LoadOff's own invoices can't be trivially spoofed; inbound sender-authentication check in doc intake; UI treats any payment-detail change as a privileged, audited, two-person/second-channel event. **Effort: 1–2 days** beyond Section 4's DNS work.

### #3 — Credential stuffing & account takeover
- **Scale:** IC3 2025 tracked account takeover for the first time as a category: **$359.7M** losses; phishing losses **tripled to $215.8M** on flat complaint volume. Transportation's 42% MFA adoption (lowest of all industries, Okta 2025) makes carrier staff soft targets.
- **Existing LoadOff controls (verified in code):** DB-backed lockout — 5 failures/15 min per email, scoped keys, serverless-safe (`src/lib/hub/auth-throttle.ts`); bcrypt hashes; demo-login gate.
- **Gaps → controls:** breached-password blocklist at signup/password-change (NIST Rev 4 makes this **mandatory**; HIBP Pwned Passwords k-anonymity API is free — **0.5–1 day**); 2FA (Section 2); session invalidation on password change (JWT strategy needs a per-user token-version claim — **0.5 day**); login-notification email on new device (nice-to-have).

### #4 — Ransomware on the carrier (or on LoadOff itself)
- **The cautionary tale to tell customers:** KNP Logistics Group (UK, 158 years old, ~700 jobs, "Knights of Old") was destroyed by the Akira ransomware gang after **one guessed employee password** — the company went into administration; widely covered 2023–2025. (The Hacker News, source dated 2025-09; Tom's Hardware; verified 2026-08-07) US parallels: Estes Express (LockBit, Nov 2023), Forward Air (Dec 2020, ~$7.5M impact) (source dated; from incident coverage).
- **NMFTA's 2026 prediction that implicates LoadOff directly:** "supply-chain compromise through SaaS vendors" is a top-5 2026 threat — *LoadOff is part of its customers' attack surface.* That is the honest pitch for taking Sections 2 and 4 seriously, and the honest content of a /security page.
- **Controls:** Neon point-in-time recovery verified + restore drill (**0.5 day**), dependency audit in CI (license gate exists; add `npm audit`/osv-scanner gate — **0.5 day**), least-privilege on the DB roles (also an RLS prerequisite).

### #5 — Insider / over-permissioned users
- Already partially controlled: `requirePermission` in server actions, money mutations audited. Add: quarterly access review ritual per carrier (a page listing users × roles × last login — **1 day**), and offboarding that actually disables (not just hides) accounts.

**One-line summary for the owner:** every documented attack pattern in this industry starts with a stolen login or a fake email — none starts with "the vendor's database was too centralized."

---

## 4. Professionalism signals an enterprise shipper's IT reviewer checks

The checklist below is what a reviewer runs in the first 30 minutes, before any questionnaire. Each item: current LoadOff status → target → effort.

1. **SPF / DKIM / DMARC on thindtransport.com** — reviewers check MXToolbox before they read your deck. Google & Yahoo have required SPF+DKIM+DMARC for bulk senders since Feb 2024; **Microsoft Outlook joined May 2025** (enforcement for 5,000+/day senders, but reviewers apply the norm to everyone). (Microsoft Tech Community "Strengthening Email Ecosystem," dmarcian; verified 2026-08-07). Path: publish SPF; DKIM-sign via the SMTP provider; DMARC `p=none` with rua reporting → 2–4 weeks observation → `p=quarantine` → `p=reject`. **Effort: 0.5–1 day + monitoring.** This simultaneously blunts threat #2 (spoofed LoadOff invoices).
2. **`/.well-known/security.txt`** — RFC 9116; requires `Contact:` and `Expires:` fields, optionally `Policy:`/`Encryption:`. A static file in Next.js `public/.well-known/`. **Effort: 30 minutes.** Disproportionate signal: it says "someone here has read an RFC."
3. **A /security page** — plain-English: encryption in transit/at rest, field-level encryption of SSNs/bank data (after Tier 1), tenant isolation *with the build-time harness story told honestly* (the ADR narrative — "every build proves cross-tenant isolation with live tests" — is genuinely more credible than most vendors' vague claims), subprocessor list (Vercel, Neon, Anthropic, SMTP provider), backup/PITR policy, vulnerability disclosure channel, data-deletion commitment. **Effort: 1 day.**
4. **Session policy** — norms per NIST SP 800-63B **Rev 4 (final)**: AAL1 reauth ≤ **30 days**; AAL2 (i.e., once MFA exists) reauth ≤ **24 hours**, inactivity timeout ≤ **1 hour**, and verifiers **SHALL offer at least one phishing-resistant option** at AAL2 (passkeys satisfy this). (pages.nist.gov/800-63-4/sp800-63b/aal/, verified 2026-08-07). LoadOff today: 30-day JWT `maxAge` — exactly at the AAL1 ceiling, fine for now, but a reviewer will ask. Target: role-differentiated sessions — 24h absolute for office/admin/money roles, longer for driver PWA (re-login friction on the road is a real safety/usability cost), idle-timeout for admin screens. **Effort: 0.5–1 day.**
5. **Password policy** — NIST Rev 4: minimum **15 characters when password is the sole authenticator** (8 absolute floor with MFA), allow up to 64+ incl. spaces/Unicode, **no composition rules** (now "shall not"), **no scheduled rotation**, **mandatory breached-password blocklist**. (Enzoic Rev 4 analysis; verified 2026-08-07). LoadOff gap: blocklist check. **Effort: 0.5–1 day** (HIBP k-anonymity — only a hash prefix leaves the server).
6. **2FA availability** — the questionnaire line every reviewer has: "Does the application support MFA?" Answer must be yes before an enterprise pilot (Section 2).
7. **Questionnaire readiness (Tier 3)** — expect SIG Lite or CAIQ-style spreadsheets; a maintained answer bank + the /security page covers 80% of it. SOC 2 stays correctly queued until enterprise demand — starting it now would burn months for buyers who aren't asking yet (typical market cost when the time comes: $7k–$25k audit + $5k–15k/yr compliance tooling, 3–6 months to Type I — figures are market-typical estimates, labeled inference).

---

## Deliverable

### 3-tier security roadmap

**TIER 1 — NOW (next 1–2 build cycles, ≈ 2 weeks total agent effort)**
| # | Item | Effort | Why now |
|---|---|---|---|
| 1 | SPF + DKIM + DMARC (`p=none`→`reject` over ~6 weeks) on thindtransport.com | 0.5–1 day + monitoring | #1 reviewer check; blunts invoice spoofing (BEC $3.04B/yr) |
| 2 | `security.txt` (RFC 9116) | 30 min | Cheapest credibility signal that exists |
| 3 | Breached-password check (HIBP k-anonymity) + 15-char guidance, no composition rules | 0.5–1 day | Mandatory under NIST Rev 4; blocks stuffing |
| 4 | TOTP 2FA + hashed single-use recovery codes; hard-required for admin/money roles | 3–5 days | Trucking is last in MFA (42%); this is the control that would have saved KNP Logistics |
| 5 | Field-level encryption of SSNs + bank details (extend existing credential-encryption util) | 1–2 days | The 90/10 "decentralization" answer; survives a DB dump |
| 6 | Banking-detail-change alert + second-channel verification rule | 1–2 days | Directly targets double-brokering/BEC payout redirection |
| 7 | Session hardening: 24h absolute for office/money roles (keep 30d for drivers), token-version claim so password change kills sessions | 1 day | Moves toward AAL2 norms; closes stolen-JWT window |
| 8 | Backup restore drill on Neon PITR + `npm audit`/osv gate in CI | 1 day | Ransomware resilience; NMFTA lists SaaS-vendor compromise as a 2026 top threat |

**TIER 2 — AT 10 CARRIERS (the "stranger carrier" threshold the RLS memo itself sets)**
| # | Item | Effort |
|---|---|---|
| 1 | Passkeys via `@simplewebauthn/server` v13 (second factor now, passwordless driver-PWA login later) | 3–5 days |
| 2 | Per-carrier "require 2FA for all users" org policy toggle | 1 day |
| 3 | RLS pilot as belt-and-suspenders: per-request single-transaction `BEGIN; SET LOCAL app.carrier_id; …; COMMIT` (safe under Neon's transaction-mode PgBouncer), default-deny fail-closed policies, `FORCE ROW LEVEL SECURITY`/non-owner app role, harness extended to prove RLS independently — keep the harness | 1–2 weeks, phased table-group by table-group |
| 4 | Per-tenant envelope keys for the encrypted fields (blast-radius + cryptographic deletion) | 2–3 days |
| 5 | /security page + subprocessor list + vulnerability-disclosure policy | 1 day |
| 6 | Quarterly access-review page (users × roles × last login, per carrier) + real offboarding | 1 day |

**TIER 3 — AT ENTERPRISE-SHIPPER DEMAND (triggered by a real prospect, not by calendar)**
| # | Item | Effort / cost (market-typical, labeled inference) |
|---|---|---|
| 1 | SOC 2 Type I → II | 3–6 months elapsed; $7k–$25k audit + $5k–15k/yr tooling |
| 2 | SSO/SAML + SCIM for shipper portals (build on OIDC or a permissive-licensed connector; every candidate must pass the MIT/Apache gate) | 1–2 weeks |
| 3 | External penetration test + letter for reviewers | $8k–$20k |
| 4 | SIG Lite / CAIQ answer bank | 2–3 days initial, then maintained |
| 5 | Customer-managed keys (Slack-EKM pattern) or dedicated single-tenant deployment — only if a contract pays for it | scoped per deal |

### Decentralization, in plain English (for the owner)

Honest answer: decentralization is the wrong medicine for what actually hurts trucking companies. The two biggest attempts to decentralize logistics data — Maersk and IBM's TradeLens blockchain and the blockchain TMS ShipChain — are both dead; one couldn't find customers and the other was shut down by the SEC. Full end-to-end encryption, where the server can't read anyone's data, would kill the exact things LoadOff is paid for: searching loads, adding up settlements to the penny, and reading rate confirmations automatically — a server can't compute on data it can't see, which is why no TMS, CRM, or accounting SaaS on earth works that way. Meanwhile, every documented attack in this industry — $800M a year in freight fraud, $3B a year in fake-invoice email scams, the 158-year-old carrier KNP that died from one guessed password — starts with a stolen login or a spoofed email, never with "the database was too centralized." So take the good idea hiding inside "decentralization" — don't keep all your eggs readable in one basket — and get 90% of it for 10% of the cost: encrypt the truly dangerous fields (SSNs, bank details) with a separate key per carrier, turn on two-factor login (required for anyone who touches money), and lock down the email domain so nobody can send fake LoadOff invoices. That's roughly two weeks of build time, and it defends against the attacks that are actually happening.

---

## Sources

**Decentralization / case studies**
- Maersk: "A.P. Moller–Maersk and IBM to discontinue TradeLens" — https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens (source dated 2022-11; verified 2026-08-07)
- Supply Chain Dive: TradeLens shutdown — https://www.supplychaindive.com/news/Maersk-IBM-shut-down-TradeLens/637580/ (verified 2026-08-07)
- SEC: In the Matter of ShipChain, Inc., Admin. Proc. 3-20185 — https://www.sec.gov/enforcement-litigation/distributions-harmed-investors/matter-shipchain-inc-admin-proc-file-no-3-20185 (verified 2026-08-07)
- FreightWaves: ShipChain shutting down after SEC payment — https://www.freightwaves.com/news/logistics-provider-shipchain-which-built-on-blockchain-shutting-down-after-big-payment-to-sec (source dated 2020-12)
- TechCrunch: Notion acquires Skiff — https://techcrunch.com/2024/02/09/notion-acquires-privacy-focused-productivity-platform-skiff/ (source dated 2024-02; verified 2026-08-07)
- IACR ePrint 2019/693, searchable-encryption tradeoffs — https://eprint.iacr.org/2019/693.pdf (verified 2026-08-07)
- IronCore Labs: SaaS application-layer encryption — https://ironcorelabs.com/blog/2021/why-your-saas-needs-better-encryption/ (verified 2026-08-07)
- AWS Architecture Blog: multi-tenant KMS key strategy — https://aws.amazon.com/blogs/architecture/simplify-multi-tenant-encryption-with-a-cost-conscious-aws-kms-key-strategy (source dated 2025-08; verified 2026-08-07)
- Slack Enterprise Key Management — https://slack.com/enterprise-key-management (verified 2026-08-07)

**RLS revisit**
- LoadOff ADR: /tmp/ttw-probe/docs/decisions/0002-application-level-tenant-isolation.md (read 2026-08-07)
- Neon: connection pooling, PgBouncer transaction mode, SET unsupported — https://neon.com/docs/connect/connection-pooling (verified 2026-08-07)
- PostgreSQL docs: SET LOCAL transaction scoping — https://www.postgresql.org/docs/current/sql-set.html (standard reference)

**2FA / auth**
- Auth.js WebAuthn (experimental, Prisma-only, SimpleWebAuthn v9 pin) — https://authjs.dev/getting-started/authentication/webauthn (verified 2026-08-07)
- SimpleWebAuthn (MIT, v13.3.2 Jun 2026) — https://github.com/MasterKale/SimpleWebAuthn (verified 2026-08-07)
- @oslojs/otp (MIT, zero-dep) — https://github.com/oslo-project/otp (verified 2026-08-07)
- otpauth (MIT, v9.5.1 Apr 2026) — https://github.com/hectorm/otpauth (verified 2026-08-07)
- GitHub Docs: 2FA recovery methods — https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication-recovery-methods (verified 2026-08-07)
- NIST SP 800-63B-4 AAL requirements — https://pages.nist.gov/800-63-4/sp800-63b/aal/ (verified 2026-08-07)
- Enzoic: NIST 800-63B Rev 4 password rules — https://www.enzoic.com/blog/nist-sp-800-63b-rev4/ (verified 2026-08-07)
- TypingDNA: Rev 4 keeps SMS OTP restricted — https://blog.typingdna.com/nist-sp-800-63b-rev-4-sms-otp-is-now-a-restricted-authenticator-but-we-have-the-fix/ (source dated 2025)
- Swif MFA statistics roundup (Okta Secure Sign-in Trends 2025: 70% workforce / 42% transportation; FIDO State of Passkeys 2026; Microsoft DDR 2025) — https://www.swif.ai/blog/mfa-statistics (verified 2026-08-07)
- Twitter transparency report 2.6% 2FA (source dated 2021); Google <10% 2FA, Usenix Enigma (source dated 2018) — consumer-baseline figures, widely reported

**Threat model**
- FBI IC3 2025 Annual Report — https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf ; summary via https://spycloud.com/blog/fbi-internet-crime-report-2025/ (verified 2026-08-07)
- NMFTA 2026 Transportation Industry Cybersecurity Trends Report — https://nmfta.org/a-first-look-at-the-2026-transportation-cybersecurity-trends-report/ and https://nmfta.org/wp-content/media/2025/12/2026-NMFTA-Transportation-Industry-Cybersecurity-Trends-Report.pdf (verified 2026-08-07)
- BleepingComputer/NMFTA: Cyber-Enabled Cargo Crime (~$725M NA 2025; kill chain) — https://www.bleepingcomputer.com/news/security/cyber-enabled-cargo-crime-how-cybercrime-tradecraft-is-used-to-steal-freight/ (verified 2026-08-07)
- Freight Fraud Symposium 2026 takeaways ($800M/yr; FMCSA Motus Phase II; CORCA House passage 2026-05-12) — https://idispatchhub.com/freight-fraud-symposium-2026-convenes-at-the-rock-roll-hall-of-fame-ai-deepfakes-800-million-in-annual-industry-losses-identity-theft-schemes-and-the-new-security-standards-every-independent-ca/ (verified 2026-08-07)
- The Hacker News: KNP Logistics / one bad password — https://thehackernews.com/2025/09/how-one-bad-password-ended-158-year-old.html (source dated 2025-09); Tom's Hardware — https://www.tomshardware.com/tech-industry/cyber-security/158-year-old-company-forced-to-close-after-ransomware-attack-precipitated-by-a-single-guessed-password-700-jobs-lost-after-hackers-demand-unpayable-sum (verified 2026-08-07)

**Buyer signals**
- Microsoft Tech Community: Outlook high-volume sender requirements (May 2025) — https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730 (verified 2026-08-07); dmarcian summary — https://dmarcian.com/microsoft-enforces-spf-dkim-dmarc/ (verified 2026-08-07)
- RFC 9116 (security.txt) — https://www.rfc-editor.org/rfc/rfc9116 (standard reference)

**Codebase facts verified locally (read-only, 2026-08-07):** `/tmp/ttw-probe/package.json` (Next 16.0.7, next-auth 5.0.0-beta.30, pg 8.21, bcrypt); `/tmp/ttw-probe/src/app/api/auth/[...nextauth]/route.ts` (JWT strategy, 30-day maxAge, lockout integration); `/tmp/ttw-probe/src/lib/hub/auth-throttle.ts` (5 fails/15 min, DB-backed); `/tmp/ttw-probe/src/lib/license-policy.ts` (permissive allowlist, strong-copyleft ban); `/tmp/ttw-probe/docs/decisions/0002-application-level-tenant-isolation.md`.

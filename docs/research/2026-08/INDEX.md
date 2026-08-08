# LoadOff Research Packet — INDEX / cover sheet

**Produced:** 2026-08-07/08 · **Method:** 8 parallel deep-research agents (one per prompt in RESEARCHPROMPTS.md) + 2 adversarial verification agents, all Claude Fable 5, grounded in a fresh clone of `ranvir01/thind-transport-website` (decision memos 0002/0003, `workbench.ts`, `AGENTS.md`, integration adapters).

**Verification pass:** 91 load-bearing claims independently re-verified against primary sources (ToS clauses read verbatim, header scans re-run, NIST/SEC/court documents fetched). 86 confirmed, 5 corrected in place, 0 verdicts changed. Corrections: Flipt v2 is FCL not GPL (still fails the MIT/Apache gate), one FreightWaves article date, Q3 IFTA deadline rolls Sat Oct 31 → **Mon Nov 2, 2026**, Punjabi Radio USA audience figure nuanced, Skiff sunset was ~12 months not 6.

**To the build agent: execute against this.** Each report is self-contained with cited sources and ends with the deliverable its prompt specified.

---

## Execution order

**Same-day (report 5 → Toolbox):**
- Flip 4 rows to in-frame: `wsdot.com/travel/real-time/mountainpasses`, `tripcheck.com`, `weather.gov`, `eia.gov/petroleum/gasdiesel/` (no XFO / no frame-ancestors, scans dated 2026-08-07).
- Keep 7 as sheets: eCFR ×3 (`frame-ancestors 'none'`), ELD registry + SAFER (`'self'`), Idaho 511 + iftach.org (`SAMEORIGIN`).
- `workbench.test.ts` hard-fails external frame rows — amend with a dated allowlist. The report includes a HEAD-check Node script to run in CI so flips stay verified.
- Then route real value through APIs (all documented in report 5): WSDOT Traveler API (free AccessCode), api.weather.gov (no key, User-Agent header), Idaho 511 API (key, 10 calls/60s), eCFR API (no key). EIA v2 and FMCSA QCMobile are already planned in `docs/integrations/` — extend, don't rebuild.

**Already-queued build cycle (report 8 arms it):**
- 2FA: `otpauth` or `@oslojs/otp` (MIT) + `@simplewebauthn/server` v13 (MIT). No SMS (NIST SP 800-63B-4, final Aug 2025). Mandate for money-touching roles — trucking MFA adoption is last-place 42% (Okta), opt-in won't happen.
- Email: SPF/DKIM/DMARC on thindtransport.com, security.txt, HIBP breached-password check (blocklist is a SHALL in 800-63B-4), banking-change alerts, role-based session timeouts.
- New 90/10 item: field-level encryption of SSNs/bank details with per-carrier envelope keys (~2–4 days). **Decentralization: no** — TradeLens (dead Q1 2023), ShipChain (SEC $2.05M, dissolved), Skiff (acquired, killed) — E2E would break search, settlements math, and Claude doc-intake.
- RLS memo 0002 update worth adopting: Neon pools in transaction mode and `SET LOCAL` is transaction-scoped — single-transaction-per-request RLS fails closed; pilot as Tier-2 belt-and-suspenders at the memo's own "stranger carrier" trigger. Keep the harness.

**This cycle's decisions (reports 1, 3, 6):**
- **Report 1 verdict: WAIT on Capacitor.** Do not start a native shell. Truckstop ToS §3.3 explicitly prohibits framing (eff. 2026-03-13); DAT ToS §1.2/§5.2.1 bans plug-in/automated access (eff. 2026-07-30); Google OAuth hard-blocks webviews (`disallowed_useragent`); *Facebook v. Power Ventures* (9th Cir. 2016) makes credentialed embedding CFAA-risky post-C&D. Capacitor also breaks the driver PWA's offline shell, web push, and NextAuth cookies (`capacitor://localhost`). The DAT API adapter (built, awaiting seat) IS the everything-app move. Three explicit revisit triggers are in the report. Saves 4–8 weeks now, ~2–5 hrs/wk forever.
- **Report 3:** build the homegrown Postgres flags table (SQL schema included, matches house conventions) + Vercel Flags SDK (MIT). First migration found a real bug: small-carrier mode is a **global env var** (`src/lib/hub/navigation.ts:121`) trimming every tenant at once → make it the first per-tenant flag (~1 day). Then: per-driver app language (~150k Punjabi truckers, 23%+ Hispanic; TruckX/Samsara precedent), per-role dashboard tiles, notification granularity. Anti-features list: no DSL, no custom workflow states — labels, not logic.
- **Report 6:** don't add agents — add mechanism. Statused evidence-gated task queue (agents tick with proof, never rewrite), 5 daily build slots replacing hourly sprawl, gate-tamper trailer guard + StrykerJS (Apache-2.0) mutation ratchet on the six money modules, fast-check property tests incl. TS↔Rust parity fuzz, nightly Playwright screenshot rig, weekly no-fix LLM red-team, GitHub-Actions branch-reaper (fixes the 234+ pending branches agents can't delete), finder/fixer separation. §7 = 8-commit rollout order, implementation-ready. Owner loop = one Friday 30-min digest + approve/reject queue.

**Owner-personal, zero engineering (report 4):**
- **Week 1, hard deadline: enter Thind Transport in Overdrive's Small Fleet Championship — entries close Aug 15, 2026** (re-verified open as of Aug 8).
- 13-week calendar at ~7 hrs/wk: white-glove 5 formalized design partners (3–6 months free, discount on conversion, case-study rights in writing, cap at 5, publish the $30/truck price), then Punjabi community motion (NAPTA vendor membership $600/yr), r/Truckers-style communities engaged as an operator (never as ads), named case study by Week 10. Activation metric to instrument: **first real invoice with POD attached within 48h of signup**. Note: outreach email is dead until SMTP is fixed — that stays the top human action.

**Phased backlog (reports 2, 7):**
- **Report 2:** mini-app platform = manifest + scoped REST + sandboxed iframe + postMessage bridge + 60s audience-scoped JWT (Pipedrive Custom UI is the copyable template; Shopify's two-token split; Slack's scope review). v0 internal mini-apps ~18–25 agent-days → v1 one design partner (factoring/insurance stub → real app, +12–18) → v2 self-serve gated on 3+ waiting vendors. 12-point security contract written for agents to implement verbatim. Real breach history says spend rigor on token scoping + kill switches, not iframe exotica. No trucking incumbent has an open spec — this is a differentiator, not a fast follow.
- **Report 7:** ship free mechanics first — endowed-progress checklist (starts at 2/8), ≤4-step user-triggered spotlights (forced video completes 21% vs 44% text), offline-reassurance copy in the driver PWA. Then 7 reels in ranked order (driver PWA install, status-tap/detention, POD snap, multilingual settlement explainer top the ticket-prevention list). Punjabi rule: never auto-ASR (Whisper WER ~55%) — translated script + family review, ElevenLabs for dubbing (has Punjabi; HeyGen doesn't). Distribute YouTube Shorts + Facebook + WhatsApp, not TikTok. Whole program ≈ 40–60 owner-hours, <$150 cash.

---

## The files

| # | File | Bottom line |
|---|------|-------------|
| 1 | `prompt-1-native-shell.md` | WAIT — stay PWA + APIs + sheets; ToS/legal kills embedded webviews; revisit triggers defined |
| 2 | `prompt-2-miniapp-platform.md` | Phased v0/v1/v2 platform spec, 12-point security contract, Pipedrive-style contract |
| 3 | `prompt-3-customization-engine.md` | Homegrown flags table (SQL included) + ranked 10 features; small-carrier-mode env-var bug found |
| 4 | `prompt-4-distribution-gtm.md` | 13-week community-led GTM calendar; championship entry due Aug 15; invoice-with-POD-in-48h activation metric |
| 5 | `prompt-5-embeddability.md` | 4 of 11 URLs iframe-ok today; full header table + API details + CI verification script |
| 6 | `prompt-6-agent-team.md` | Operating manual: statused queue, mutation/tamper/reaper guards, Friday 30-min owner ritual; 8-commit rollout |
| 7 | `prompt-7-onboarding-training.md` | Checklist + spotlights first, 7 ranked reels after; Punjabi = scripted captions, never auto-ASR |
| 8 | `prompt-8-security-roadmap.md` | 3-tier roadmap; decentralization = no, field-level encryption = yes; exact 2FA libraries |

Cross-cutting: every library recommendation was checked against the MIT/Apache license gate; every date-sensitive item re-verified as of 2026-08-08; three repo defects surfaced during research (nav env var, workbench test hard-fail, branch backlog) are folded into the work items above.

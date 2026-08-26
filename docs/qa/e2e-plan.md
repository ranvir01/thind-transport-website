# HaulDesk E2E click-path sweep — 1:1 with Phase 7 gates

Phase 7 (`docs/phases/phase-7.md`) is the Step-7 prompt. Each **G7-n** below is
one item from §2 Build scope / §5 Acceptance. The integration agent owns
`e2e-sweep.mjs`; this file is the spec. QA wrote no test code.

Demo logins (password `ThindDemo1!`) after `npm run seed:demo`. Routes are the
live Hub paths.

---

## G7-1 — Tenant onboarding wizard (M11 / Smart Setup pre-step)
| Step | Click path | Expected |
|---|---|---|
| 1 | Sign in as `admin@hauldesk.app` (platform_admin) | Tenant list; **no** Thind loads/invoices/settlements |
| 2 | Create / open onboarding for a new carrier | Wizard: company facts (DOT/MC) → branding → import trucks/drivers/customers/loads → pay config (both types) → price book |
| 3 | Finish | Dashboards render with **that** tenant's data only; timed run documented if claiming the "one business day" bar |

**Pass:** a second fictional carrier can be stood up without touching Thind rows.

## G7-2 — Cross-tenant isolation (LAUNCH BLOCKER)
Execute `isolation-tests.md` I-1…I-14 in full (loads, invoices, documents, settlements, both directions, plus negative controls).

| Step | Click path | Expected |
|---|---|---|
| 1 | `owner@demo.thind` → `/hub/loads` | THD-* only; **no** CAS-5001/CAS-5002 |
| 2 | Same session, open `/hub/money/invoices`, `/hub/money/settlements` | Thind money only |
| 3 | Guess Cascade IDs / `GET /api/hub/files/cas-5002-bol.pdf` | 404/403, no bytes |
| 4 | `owner@cascademo.example` reverse | cannot read THD-1005, THD-INV-*, Harpreet settlements, `thind-w9.pdf` |

**Pass:** zero bleed both directions **and** own-tenant reads still 200. This is the launch blocker.

## G7-3 — Per-tenant branding
| Step | Click path | Expected |
|---|---|---|
| 1 | Thind owner → any office screen + an invoice PDF | Thind navy/gold; invoice letterhead Thind |
| 2 | Cascade owner → same screens + PDF | Cascade accent `#369C82` from seed settings; **not** Thind logo |
| 3 | Driver PWA manifest as each tenant | Name/theme color follow `carrier_settings.branding` |

**Pass:** no Thind chrome leaks onto Cascade (or vice versa) in UI, PWA, PDF, or email.

## G7-4 — GeocodeSource at scale
| Step | Click path | Expected |
|---|---|---|
| 1 | Book a load with a new city via `/hub/loads/new` or paste | Geocode succeeds through the `GeocodeSource` interface |
| 2 | Confirm env-based selection | Public Nominatim is not the only path; rate-limit respected |

**Pass:** swap path exists; booking does not depend on the public 1 req/s instance.

## G7-5 — Security pass
| Step | Click path | Expected |
|---|---|---|
| 1 | Burst login failures at `/login` | Lockout / rate limit; no user enumeration |
| 2 | `GET /api/hub/files/<other-tenant-name>` signed out | 401 |
| 3 | Same URL signed in as the wrong tenant | 404/403, **no PDF bytes** (signed Blob URLs expire) |
| 4 | Money mutation (approve settlement / record payment) | `hub.audit_log` row with actor, old/new |

**Pass:** auth lockout live; every file URL is tenancy-gated; money mutations audited.

## G7-6 — In-app help
| Step | Click path | Expected |
|---|---|---|
| 1 | `/hub/money/settlements` and `/hub/money/invoices` | Contextual explainer (90%+100% FSC, remit-to/NOA) |
| 2 | A compliance screen | Tooltip with a CFR citation |

**Pass:** money + compliance screens carry help; a new carrier is not blocked on a training manual.

## G7-7 — Billing-ready hooks (design only)
| Step | Click path | Expected |
|---|---|---|
| 1 | Inspect `carrier_settings` / flags | Metering points identified; **no** live Stripe charges unless explicitly directed |

**Pass:** plan/flags documented; Stripe not silently introduced.

## G7-8 — Smart Setup (`/hub/setup`)
| Step | Click path | Expected |
|---|---|---|
| 1 | `/hub/setup` | Upload PDF/CSV/photo → classify → extract → review → apply |
| 2 | Drop a rate con / W-9 / truck registration | Lands on the right entity after review; nothing applies without confirmation |

**Pass:** review-before-apply; deterministic parsers; no silent writes.

## G7-9 — Sales demo + phone demo re-verify
| Step | Click path | Expected |
|---|---|---|
| 1 | Walk `docs/sales-demo.md` end-to-end at 390px | Owner dashboard → paste-to-dispatch → driver POD → one-click invoice → broker tracking → IFTA → settlement PDF → Smart Setup |
| 2 | Re-walk `docs/demo-script.md` | Every step works; both tenants independently pass the 5-minute demo |

**Pass:** both scripts green at 390px with screen recordings.

---

## Money appendix (Phase 2 acceptance — consumed by G7-2 / G7-9)

These are **not** extra Phase 7 gates; they are the settlement/invoice/1099
checks G7-9 and the worksheets require. Mapped here so the sweep has one list.

| ID | Click path | Expected (integer cents) | Worksheet / fixture |
|---|---|---|---|
| P2-INV-F | Accountant opens factored `THD-1015` invoice | Face **344000**; remit-to = factor (NOA); **no** invented factor fee; dunning skipped | `fixtures/invoices.json` INV-F-SEED |
| P2-INV-D | One-click invoice `THD-1009` (`pod_received`) | Face **336000** = 295000+31000+10000; remit-to = Thind; POD+BOL attached | INV-POD |
| P2-SET-MILE | Draft this week → Harpreet | **net 50500**, gross 78000, deductions 27500 | tariff-01 |
| P2-SET-OO | Draft this week → Jasdeep | **net 263500**, gross 268500; detention line 13500 | tariff-02 period A |
| P2-SET-MIX | Evaluate mixed rule set on THD-2001/2002 | **net 46815** | tariff-04 (already unit-tested) |
| P2-1099 | Money → export 1099-NEC (year of `period_end`) | Jasdeep Box1 = **2375.00** as seeded; **5060.00** after approving S-OO-SEED. Harpreet **absent** | `1099-check.md` |

---

## Sweep roll-up
| Gate | Name | Pass condition |
|---|---|---|
| G7-1 | Onboarding wizard | New carrier live on its own data |
| G7-2 | Isolation | `isolation-tests.md` all pass (launch blocker) |
| G7-3 | Branding | Per-tenant logo/color/PDF/email |
| G7-4 | Geocode swap | Interface + env selection |
| G7-5 | Security | Lockout + file tenancy + audit |
| G7-6 | In-app help | Money + compliance |
| G7-7 | Billing hooks | Flags only; no surprise Stripe |
| G7-8 | Smart Setup | Review-before-apply |
| G7-9 | Demos | sales-demo + demo-script at 390px |
| P2-* | Money ground truth | Worksheets + 1099 to the penny |

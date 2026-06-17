# HaulDesk Sign-Off Gates

This is the current verification state for the mobile sandbox milestone. Full
production launch gates remain open until real owner data and credentials are
entered.

| Gate | Status | Evidence |
|---|---|---|
| `npm run build` | PASS | Production build completed successfully after latest changes. |
| `npm test` | PASS | Vitest: 9 files, 65 tests passing. |
| `npm run lint` | PASS | ESLint completed with zero errors. |
| `npm run e2e:sweep` | PASS | Against HTTPS tunnel: owner sign-in, Today, loads, dispatch, drivers, customers, money, fleet, fuel, compliance, import, ranker, reports, report builder, onboarding, setup pages, driver PWA tabs/offline page, `/track/sandbox`, manifest, service worker, CSV exports, and import-template downloads all returned success. |
| HTTPS mobile tunnel | PASS | `npm run dev:mobile` created Cloudflare quick tunnel and printed public HTTPS URL. |
| Tunnel sign-in | PASS | Script smoke signed in with sandbox driver credentials and loaded `/hub/driver`. |
| PWA manifest/service worker | PASS | `/hub.webmanifest` and `/hub-sw.js` returned HTTP 200 over the HTTPS tunnel. |
| Driver PWA at 390px | PASS | Manual browser test showed SANDBOX DRIVER, current load, PWA status, camera POD button, Save POD button, and bottom tabs. |
| Camera POD path | PARTIAL PASS | Browser called camera API over HTTPS; VM has no camera and returned “Requested device not found.” Owner must confirm on real iPhone hardware. |
| Owner sandbox pages without local DB | PASS | Manual and fetch smoke verified `/hub`, `/hub/loads`, `/hub/money`, `/hub/ranker`, `/hub/fleet` render populated sandbox fallback content with no `POSTGRES_URL`. |
| Two-company sandbox switcher | PASS | Manual test showed SANDBOX badge and All companies / Thind / ATS switcher. |
| Broker tracking portal sandbox | PASS | `/track/sandbox` returned HTTP 200 over the HTTPS tunnel and rendered carrier/load tracking content without local DB. |
| Production seed safety | PASS | `seed:production` is confirmation-gated and only upserts known carrier facts/blockers; it does not fabricate loads/drivers/money. |
| Production import templates | PASS | `seed:production` writes 10 CSV templates under `docs/production-intake/templates/` for drivers, trucks, trailers, customers, pay tariffs, recurring transactions, open AR, loadboard, fuel, and tolls. |
| Sandbox reset safety | PARTIAL PASS | With no `POSTGRES_URL`, reset exits cleanly without touching anything. With Postgres, script is scoped to sandbox carrier IDs/data-mode. |
| Full seeded sandbox database | FALLBACK PASS | No `POSTGRES_URL` exists in this VM, so `seed:sandbox` now exits successfully and the app uses built-in no-DB sandbox fallback content. With Postgres, it writes the full seeded dataset. |
| Production go-live data | BLOCKED | Owner must fill the items in `FILL-THESE-NEXT.md`. |

## Current iPhone test URL

The last verified quick tunnel was:

```text
https://apr-shift-scored-volunteer.trycloudflare.com
```

Quick tunnel URLs change every time `npm run dev:mobile` restarts.

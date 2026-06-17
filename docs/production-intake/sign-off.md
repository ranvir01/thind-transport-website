# HaulDesk Sign-Off Gates

This is the current verification state for the mobile sandbox milestone. Full
production launch gates remain open until real owner data and credentials are
entered.

| Gate | Status | Evidence |
|---|---|---|
| `npm run build` | PASS | Production build completed successfully after latest changes. |
| `npm test` | PASS | Vitest: 5 files, 51 tests passing. |
| `npm run lint` | PASS | ESLint completed with zero errors. |
| HTTPS mobile tunnel | PASS | `npm run dev:mobile` created Cloudflare quick tunnel and printed public HTTPS URL. |
| Tunnel sign-in | PASS | Script smoke signed in with sandbox driver credentials and loaded `/hub/driver`. |
| PWA manifest/service worker | PASS | `/hub.webmanifest` and `/hub-sw.js` returned HTTP 200 over the HTTPS tunnel. |
| Driver PWA at 390px | PASS | Manual browser test showed SANDBOX DRIVER, current load, PWA status, camera POD button, Save POD button, and bottom tabs. |
| Camera POD path | PARTIAL PASS | Browser called camera API over HTTPS; VM has no camera and returned “Requested device not found.” Owner must confirm on real iPhone hardware. |
| Owner sandbox pages without local DB | PASS | Manual and fetch smoke verified `/hub`, `/hub/loads`, `/hub/money`, `/hub/ranker`, `/hub/fleet` render populated sandbox fallback content with no `POSTGRES_URL`. |
| Two-company sandbox switcher | PASS | Manual test showed SANDBOX badge and All companies / Thind / ATS switcher. |
| Production seed safety | PASS | `seed:production` is confirmation-gated and only upserts known carrier facts/blockers; it does not fabricate loads/drivers/money. |
| Sandbox reset safety | NOT RUNTIME-VERIFIED | Script is scoped to sandbox carrier IDs/data-mode, but local Postgres is unavailable in this VM, so DB execution could not be completed here. |
| Full seeded sandbox database | BLOCKED | Requires `POSTGRES_URL`; this VM currently has no `.env.local` or `POSTGRES_URL`. No-DB fallback covers immediate iPhone UI testing. |
| Production go-live data | BLOCKED | Owner must fill the items in `FILL-THESE-NEXT.md`. |

## Current iPhone test URL

The last verified quick tunnel was:

```text
https://apr-shift-scored-volunteer.trycloudflare.com
```

Quick tunnel URLs change every time `npm run dev:mobile` restarts.

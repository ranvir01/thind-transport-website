# Phase 3 readiness — role logins & mobile

Last updated: merged to `main`.

## Health check (Part A)

| Check | Status | Notes |
|-------|--------|-------|
| `main` has Phase 1 load board | ✅ | `/hub/loadboard`, inline edit, CSV export |
| Phase 2 fuel → load linking | ✅ | Migration `012`, unassigned panel, load detail fuel |
| `npm run build` | Run before merge | Must pass |
| `npm test` | Run before merge | Includes `landing.test.ts`, `loadboard.test.ts`, `fuel-use.test.ts` |
| Migration `012_fuel_load_link.sql` | Apply on prod | `npm run db:migrate` once |

## Phase 3 shipped in this prep

| Item | Status | Where |
|------|--------|-------|
| Role landing after login | ✅ | `src/lib/hub/landing.ts`, `src/proxy.ts`, `src/app/hub/login/page.tsx` |
| Login role hint (read-only badge) | ✅ | `GET /api/hub/role-hint`, debounced on email field |
| Owner invites dispatcher + accountant | ✅ | `/hub/settings/users` — `OFFICE_INVITE_ROLES` dropdown |
| Driver → `/hub/driver` via proxy | ✅ | Already in `src/proxy.ts` (verified) |
| Driver PWA manifest + SW | ✅ | `public/hub.webmanifest`, `public/hub-sw.js`, hub layout metadata |

### Role landing map

| Role | Lands on |
|------|----------|
| Owner | `/hub` (Today) |
| Dispatcher | `/hub/loadboard` |
| Accountant | `/hub/money` |
| Driver | `/hub/driver` |
| Broker / shipper | `/hub/portal` |

## Still manual (owner / Phase 3 session)

- [ ] Create real dispatcher + accountant accounts (Settings → Users) and share temp passwords
- [ ] Link each driver user to a driver record (Drivers roster or invite flow)
- [ ] Test driver PWA on a phone: Add to Home Screen from `/hub/driver`, offline stop queue
- [ ] Push notifications — **deferred** (needs VAPID keys; use SMS/email for V1)
- [ ] Remove or gate demo credentials in production (`HUB_DEMO_LOGIN=false` — Phase 5)

## Env vars (no new vars for Phase 3)

Existing production requirements: see `docs/hub-go-live-requirements.md`.

| Variable | Phase 3 use |
|----------|-------------|
| `NEXTAUTH_SECRET` | Required — session + proxy JWT |
| `NEXTAUTH_URL` | Required — cookie security |
| `POSTGRES_URL` | Required — users, role hint lookup |
| `HUB_DEMO_LOGIN` | Optional — hide demo block on login (Phase 5) |

## Demo paths after deploy

1. **Owner** — `owner@demo.thind` → Today (`/hub`)
2. **Dispatcher** — `dispatch@demo.thind` → Load board
3. **Accountant** — create via Users or seed; lands on Money
4. **Driver** — `driver@demo.thind` → Driver PWA tabs

Password for demo accounts: `ThindDemo1!` (rotate before go-live).

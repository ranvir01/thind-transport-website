# HaulDesk Small Carrier V1 — Master Execution Prompt

**Audience:** Cursor agent (or any dev) working in `ranvir01/thind-transport-website`  
**Customer:** Thind Transport — ~15 trucks, Kent WA, TruckX ELD, DAT, fuel cards, Excel load board today  
**Goal:** Get **one small carrier** running on HaulDesk **now**. Scale and enterprise features later.

**How to use:** Paste everything below `# PROMPT START` into a new Cursor Agent session. Execute **one phase at a time**; each phase must end with `npm run build` green and a short demo path.

**Related docs:** `docs/tms-master-prompt.md` (full TMS vision), `docs/hub-go-live-requirements.md` (production env), `docs/design/HANDOFF.md` (UI tokens), `AGENTS.md`.

---

# PROMPT START

You are finishing **HaulDesk** (`/hub/*`) for **Thind Transport** — a single small trucking company, not a SaaS product. The owner thinks in **Excel load boards**, texts, and fuel card statements. Your job is to make HaulDesk feel like a better spreadsheet that also invoices, pays drivers, and syncs to phones — **not** to ship every Phase 7 feature.

Read `docs/small-carrier-v1-master-prompt.md` (this file) and `AGENTS.md` before writing code. Follow `.cursor/skills/thind-brand-identity`, `responsive-performance`, and `dev-workflow-testing` on every UI change.

## 0. Non-negotiables

1. Company facts (DOT, MC, phone, pay rates) come **only** from `src/lib/constants.ts`.
2. `npm run build` must pass before any commit.
3. Mobile-first for driver screens (390px). Office screens desktop-first but usable on phone.
4. **Import-first, API-second** — CSV paths must work on day one; paid APIs are optional env vars.
5. Permissions enforced in server actions (`src/lib/hub/permissions.ts`), never UI-only.
6. Do not commit secrets, `.env.local`, or `postgresql-*.deb`.
7. HaulDesk is the **system of record** for loads/money once go-live — do not build parallel DataTruck sync unless explicitly requested.

---

## 1. What “done” looks like for V1

| Person | Login | Primary screens |
|--------|-------|-----------------|
| **Owner** | `owner` role | Today, **Load board**, Money, Reports, Settings |
| **Dispatcher** | `dispatcher` | **Load board**, Dispatch, Loads, Fleet, Drivers |
| **Accountant** | `accountant` | Money, Fuel, Invoices, Settlements, IFTA |
| **Driver** | `driver` role → `/hub/driver` PWA | My loads, DVIR, docs, messages, pay stub |

Success = owner can **book, edit, and track loads on the load board**, import fuel CSV weekly, assign drivers from dispatch, driver sees load on phone, accountant invoices from load data — **without Excel**.

---

## 2. Keep vs hide (small-carrier mode)

HaulDesk already has 40+ routes. For V1 **keep visible** in nav:

| Area | Routes | Why |
|------|--------|-----|
| Overview | `/hub`, `/hub/map` | Morning dashboard + live trucks |
| **Load board** | `/hub/loadboard` | **Owner’s Excel replacement** |
| Dispatch | `/hub/dispatch` | Kanban + assign |
| Loads | `/hub/loads`, `/hub/loads/new`, `/hub/loads/paste` | Detail + rate con intake |
| Money | `/hub/money`, invoices, settlements, `/hub/fuel` | AR + driver pay + fuel |
| Fleet | `/hub/fleet` | Trucks/trailers |
| People | `/hub/drivers`, `/hub/customers` | Roster + brokers |
| Utility | `/hub/import`, `/hub/compliance`, `/hub/reports`, `/hub/settings/users`, `/hub/settings/integrations` | Ops essentials |

**Hide or de-emphasize** (keep code, remove from default nav / ⌘K for V1):

- `/hub/recruiting`, `/hub/facilities` — HR marketing loop; not daily ops for 15 trucks
- `/hub/planner`, `/hub/capacity` — move under Dispatch submenu or hide until needed
- `/hub/safety`, `/hub/tasks`, `/hub/messages` — optional; owner can use phone
- `/hub/setup` Smart Setup — keep link in Settings, not top utility row
- Public `/load-board` marketing page — unrelated to internal load board

**Implementation:** Add `SMALL_CARRIER_MODE=true` env (default `true` in `.env.example`) and filter `HUB_PRIMARY_SECTIONS` / `HUB_UTILITY_LINKS` in `src/lib/hub/navigation.ts`. Do not delete routes — only simplify IA.

---

## 3. Phase 1 — Excel load board (PRIORITY)

**Route:** `/hub/loadboard`  
**User story:** “I open Excel every morning. I want the same columns, click a cell, change it, done.”

### Columns (match typical broker spreadsheet)

| Column | DB source | Inline edit |
|--------|-----------|-------------|
| Ref | `loads.reference` | No (link to detail) |
| Broker # | `customer_reference` | Yes |
| Status | `loads.status` | Yes (dropdown) |
| Origin | first pickup stop | Yes (city, ST) |
| Destination | last delivery stop | Yes (city, ST) |
| Customer | join | No (link) |
| Driver | `driver_id` | Yes (dropdown) |
| Truck | `truck_id` | Yes (dropdown) |
| Pickup | pickup `appt_start` | Yes (date) |
| Linehaul $ | `linehaul_cents` | Yes |
| FSC $ | `fuel_surcharge_cents` | Yes |
| Miles | `loaded_miles` | Yes |
| Total $ | computed | No |
| Notes | `notes` | Yes (expand) |

### Files to create / edit

```
src/app/hub/(office)/loadboard/page.tsx       # server page, fetches loads + dropdown data
src/components/hub/LoadBoardGrid.tsx          # client: spreadsheet table, inline edit
src/app/hub/_actions/loadboard.ts             # patchLoadBoardFieldAction
src/lib/hub/loadboard.ts                      # patchLoadBoardField(), exportLoadsCsv()
src/lib/hub/loads.ts                          # extend LOAD_SELECT: pickup_appt, delivery_appt
src/lib/hub/navigation.ts                     # Load board first under Loads
src/lib/hub/__tests__/loadboard.test.ts       # patch + CSV export unit tests
```

### Server action contract

```ts
patchLoadBoardFieldAction(loadId, field, value) → { ok, error? }
```

Fields: `customer_reference`, `status`, `origin_city`, `origin_state`, `dest_city`, `dest_state`, `driver_id`, `truck_id`, `pickup_date`, `linehaul`, `fuel_surcharge`, `loaded_miles`, `notes`.

- Requires `loads:write` (dispatcher + owner).
- Status changes use existing `changeLoadStatus` + audit event.
- Lane changes update first pickup / last delivery stops via `replaceStops` or targeted stop UPDATE.
- Money fields use `dollarsToCents` from `types.ts`.
- Revalidate: `/hub/loadboard`, `/hub/loads`, `/hub/dispatch`, `/hub`.

### UI rules

- Sticky header row, horizontal scroll on mobile.
- Double-click or Enter to edit; Escape cancels; blur saves.
- Toast on save/error (sonner, like `FuelUseBadge`).
- Toolbar: search, status filter, **Export CSV** (same columns as grid), **New load** link.
- Use hub design tokens (`Panel`, `fieldCls`, `moneyCls`) — no marketing gold.

### Acceptance

- [x] Owner can change status, driver, rate, lane without opening load detail
- [x] Export CSV opens in Excel with recognizable column headers
- [x] `npm run build` passes
- [ ] Works at 390px (scroll, no broken layout) — verify manually

---

## 4. Phase 2 — Fuel card (daily use)

**Route:** `/hub/fuel` (exists — extend)

### Use cases

1. **Import statement** — EFS / Comdata / WEX CSV → `/hub/import?kind=fuel` (exists)
2. **Per-truck MPG + cost** — dashboard on fuel page (exists)
3. **Reefer vs tractor** — `FuelUseBadge` reclassify (exists)
4. **Fraud flags** — duplicate swipe detection (exists)
5. **NEW: Link fuel to load** — optional `load_id` on transaction; dispatcher assigns from load detail
6. **NEW: Driver fuel advance** — driver PWA request → office approve → deduct from settlement (partial: `AdvanceRequestForm` exists)

### Files

```
src/lib/hub/fuel.ts                    # assignFuelToLoad(), listUnassignedFuel()
src/app/hub/_actions/fuel.ts           # assignFuelLoadAction
src/app/hub/(office)/fuel/page.tsx     # “Unassigned transactions” panel
src/app/hub/(office)/loads/[id]/page.tsx  # show linked fuel rows
```

### Free integration

- **EIA diesel index** — `EIA_API_KEY` (already wired)
- No live EFS API until vendor credentials — CSV is V1

---

## 5. Phase 3 — Role logins & mobile

### Office roles (exist)

Roles in `src/lib/hub/types.ts`: `owner`, `dispatcher`, `accountant`. Matrix in `permissions.ts`.

**Tasks:**

1. `/hub/settings/users` — ensure owner can invite dispatcher + accountant with temp password
2. Login page — show role hint after email (read-only badge)
3. Redirect: accountant landing → `/hub/money`; dispatcher → `/hub/loadboard`

### Driver mobile PWA (exists at `/hub/driver`)

**Tasks:**

1. Verify `manifest.json` + service worker install prompt
2. Driver login uses same NextAuth; role `driver` routes to `/hub/driver` via `src/proxy.ts`
3. Push notifications — **defer** (needs web push keys); use SMS/email for V1
4. Offline queue — `OfflineSync.tsx` exists; test stop timestamp queue

### Broker/shipper portals

Keep minimal — `/hub/portal` for POD download. Not V1 priority.

---

## 6. Phase 4 — Free & low-cost integrations

Wire behind Settings → Integrations. **CSV fallback always.**

| Integration | Cost | Env var | Use |
|-------------|------|---------|-----|
| **OpenStreetMap Nominatim** | Free | (none) | Geocode cities — `geocode.ts` |
| **Mapbox** | Free tier | `NEXT_PUBLIC_MAPBOX_TOKEN` | Fleet map — `mapbox.ts` |
| **FMCSA broker lookup** | Free | `FMCSA_WEBKEY` | Vet broker MC |
| **EIA diesel** | Free | `EIA_API_KEY` | Fuel benchmark |
| **Terminal** (TruckX ELD) | Paid | API key in integrations | GPS + HOS sync |
| **TruckX CSV export** | Free | — | Positions + IFTA mileage → `/hub/import` |
| **DAT load search** | Paid | DAT API | Optional; paste rate con is V1 |
| **OSRM routing** | Free (self-host or public demo) | `OSRM_URL` optional | Drive miles estimate between stops |
| **GraphHopper** | Free tier 500 req/day | `GRAPHHOPPER_KEY` | Route optimization suggestion on dispatch |
| **QuickBooks CSV** | Free | — | Export invoices/settlements |

### Route optimization (V1 scope)

**Not full auto-dispatch.** Add “Suggest miles” button on load detail:

1. Geocode pickup + delivery (Nominatim)
2. Call OSRM `route/v1/driving/{lng},{lat};{lng},{lat}` or GraphHopper
3. Write suggested miles to `loaded_miles` (user confirms)

Files: `src/lib/hub/routing.ts`, `src/app/hub/_actions/routing.ts`, button on load detail.

**Trilingual extraction (optional):** route miles can move to the Go worker (`services/go/hauldesk-worker`, `POST /route/miles`); IFTA penny math can move to Rust (`services/rust/hauldesk-compute`, `POST /ifta/summary`). Wire via `src/lib/hub/sidecars.ts` and `HAULDESK_GO_WORKER_URL` / `HAULDESK_RUST_COMPUTE_URL`. Production stays on pure TypeScript until those env vars are set.

### Load sources (V1)

1. Manual / load board / paste rate con
2. CSV import (`/hub/import`)
3. DAT API — behind integration card when credentials exist

---

## 7. Phase 5 — Trim & polish

1. Implement `SMALL_CARRIER_MODE` nav filter
2. Today page — prioritize load board link + action cards (POD missing, AR aging — exist)
3. Remove demo credentials from production login (env `HUB_DEMO_LOGIN=false`)
4. Update `docs/hub-go-live-requirements.md` with load board + fuel checklist
5. Owner quick-start PDF or `/hub/guide` section: “Day 1: import loads CSV, import fuel, invite drivers”

---

## 8. Phase 6 — Production go-live

Follow `docs/hub-go-live-requirements.md`:

```bash
npm run db:migrate          # production once
# create owner via /hub/signup — NOT seed:demo
npx vercel deploy --prod
```

Verify: owner login → load board → edit load → dispatch assign → driver phone → fuel import → invoice from load.

---

## 9. File map (quick reference)

| Concern | Path |
|---------|------|
| Auth / roles | `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/hub/session.ts`, `permissions.ts` |
| Loads CRUD | `src/lib/hub/loads.ts`, `src/app/hub/_actions/loads.ts` |
| Load board | `src/app/hub/(office)/loadboard/`, `src/lib/hub/loadboard.ts` |
| Dispatch | `src/app/hub/(office)/dispatch/page.tsx` |
| Fuel | `src/lib/hub/fuel.ts`, `src/app/hub/(office)/fuel/page.tsx` |
| Import CSV | `src/components/hub/ImportWizard.tsx`, `src/lib/hub/csv.ts` |
| Driver PWA | `src/app/hub/driver/*` |
| Integrations | `src/app/hub/(office)/settings/integrations/page.tsx`, `src/lib/hub/telematics.ts` |
| Nav | `src/lib/hub/navigation.ts`, `src/components/hub/HubNav.tsx` |
| Design tokens | `src/styles/hub-theme.css` |

---

## 10. Execution order for Cursor

```
Session 1 → Phase 1 (load board) — ship /hub/loadboard
Session 2 → Phase 2 (fuel load linking + unassigned panel)
Session 3 → Phase 3 (role landing pages + user invite polish)
Session 4 → Phase 4 (routing suggest miles + OSRM)
Session 5 → Phase 5 (SMALL_CARRIER_MODE nav + guide)
Session 6 → Phase 6 (go-live with owner)
```

After each session:

```bash
npm run build
npm test -- --testPathPattern=hub   # if DB available; skip ok locally
```

Do **not** attempt native iOS/Android apps — the driver PWA **is** the mobile app for V1.

---

## 11. Copy-paste one-liner for Cursor

> Implement Phase 1 of `docs/small-carrier-v1-master-prompt.md`: Excel-style load board at `/hub/loadboard` with inline edit, CSV export, nav link, server actions with permission checks, tests, and `npm run build` green. Match hub design tokens. Do not add new npm dependencies.

---

# PROMPT END

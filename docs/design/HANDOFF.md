# HaulDesk Redesign — Handoff for Cursor

This package redesigns the HaulDesk TMS (`ranvir01/thind-transport-website`, the `/hub/*` app) into a **calm, OpenRouter-style** system: light by default with a dark toggle, a global top bar + contextual sub-nav (replacing the 23-item left sidebar), monospace numbers, hairline borders, slim status pills, ⌘K command palette, and understated empty states.

- **Prototype:** `HaulDesk.dc.html` (source) / `HaulDesk.html` (standalone, runs offline)
- **Live screens:** Overview, Loads, Load detail, Dispatch board, Planner, Money, Invoices, Settlements, Trucks, Drivers, Settings
- **3 visual directions** (Indigo / Teal / Ink) × light + dark, switchable in the in-app Appearance menu (top-right)

> The website's marketing colors (red `#E0392F` + gold `#F2A900`) stay on the public site. The **software** gets its own neutral identity below. Pick ONE accent direction to ship (default: **Indigo**).

---

## 1. Design tokens

Semantic tokens as CSS variables, themed by `data-mode` (light/dark) and `data-theme` (indigo/teal/ink) on `<html>`. Tailwind maps color names to these vars so classes like `bg-surface text-fg-2 border-border` just work and re-theme automatically.

### 1a. `globals.css` — default (Indigo)

```css
:root,
[data-theme="indigo"] {
  --bg:#FBFBFC; --surface:#FFFFFF; --surface-2:#F5F6F8;
  --border:#ECEEF1; --border-strong:#E0E3E8;
  --text:#16181D; --text-2:#565C66; --text-3:#888E99; --hover:#F3F4F6;
  --accent:#5B5BD6; --accent-hover:#4D4DC9; --accent-fg:#FFFFFF;
  --accent-soft:#EEEEFA; --accent-text:#4842BE; --ring:rgba(91,91,214,.28);
  --green:#1A8A4F; --green-soft:#E7F4EC;
  --amber:#A9760A; --amber-soft:#FAF0DA;
  --red:#CE3D3D;   --red-soft:#FBEAEA;
  --blue:#2C6FE0;  --blue-soft:#E9F1FD;
  --shadow:0 1px 2px rgba(16,18,29,.04),0 1px 3px rgba(16,18,29,.05);
}

[data-mode="dark"],
[data-mode="dark"][data-theme="indigo"] {
  --bg:#0B0C10; --surface:#131620; --surface-2:#1A1E2A;
  --border:rgba(255,255,255,.08); --border-strong:rgba(255,255,255,.15);
  --text:#ECEDF1; --text-2:#9DA2AD; --text-3:#6C7280; --hover:rgba(255,255,255,.05);
  --accent:#7C7DEC; --accent-hover:#8E8FF0; --accent-fg:#0B0C10;
  --accent-soft:rgba(124,125,236,.16); --accent-text:#A6A7F2; --ring:rgba(124,125,236,.35);
  --green:#34C77B; --green-soft:rgba(52,199,123,.14);
  --amber:#E0A92E; --amber-soft:rgba(224,169,46,.14);
  --red:#F2615C;   --red-soft:rgba(242,97,92,.15);
  --blue:#5E97F0;  --blue-soft:rgba(94,151,240,.15);
  --shadow:0 1px 2px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.28);
}
```

### 1b. Alternate accents (override only what changes)

```css
/* TEAL */
[data-theme="teal"]{
  --bg:#FBFBFB;--surface-2:#F5F6F6;--border:#ECEEEE;--border-strong:#DFE3E3;
  --text:#16191A;--text-2:#565B5C;--text-3:#878D8E;--hover:#F2F4F3;
  --accent:#0E9384;--accent-hover:#0C8175;--accent-soft:#E2F3F0;--accent-text:#0B6E66;--ring:rgba(14,147,132,.26);
}
[data-mode="dark"][data-theme="teal"]{
  --bg:#0A0C0C;--surface:#121615;--surface-2:#19201D;
  --text:#EAEEEC;--text-2:#9BA3A0;--text-3:#6B736F;
  --accent:#22B8A6;--accent-hover:#34C7B5;--accent-fg:#04130F;--accent-soft:rgba(34,184,166,.16);--accent-text:#46CFBF;--ring:rgba(34,184,166,.32);
}
/* INK (monochrome) */
[data-theme="ink"]{
  --bg:#FAF9F7;--surface-2:#F5F4F1;--border:#EAE8E4;--border-strong:#DEDBD5;
  --text:#1A1814;--text-2:#57534C;--text-3:#8B867D;--hover:#F1EFEB;
  --accent:#1C1B19;--accent-hover:#000000;--accent-soft:#EEEDEA;--accent-text:#1C1B19;--ring:rgba(0,0,0,.16);
}
[data-mode="dark"][data-theme="ink"]{
  --bg:#0C0B0A;--surface:#141312;--surface-2:#1C1A18;--hover:rgba(255,255,255,.045);
  --text:#ECE9E4;--text-2:#A29D95;--text-3:#726D64;
  --accent:#ECEAE5;--accent-hover:#FFFFFF;--accent-fg:#191714;--accent-soft:rgba(255,255,255,.09);--accent-text:#E7E4DE;--ring:rgba(255,255,255,.16);
}
```

### 1c. `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: { DEFAULT: "var(--surface)", 2: "var(--surface-2)" },
        border: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        fg: { DEFAULT: "var(--text)", 2: "var(--text-2)", 3: "var(--text-3)" },
        hover: "var(--hover)",
        accent: {
          DEFAULT: "var(--accent)", hover: "var(--accent-hover)",
          fg: "var(--accent-fg)", soft: "var(--accent-soft)", text: "var(--accent-text)",
        },
        ok:   { DEFAULT: "var(--green)", soft: "var(--green-soft)" },
        warn: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)" },
        bad:  { DEFAULT: "var(--red)",   soft: "var(--red-soft)" },
        info: { DEFAULT: "var(--blue)",  soft: "var(--blue-soft)" },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      boxShadow: { card: "var(--shadow)" },
      borderRadius: { card: "14px", control: "9px", pill: "20px" },
    },
  },
} satisfies Config;
```

### 1d. Scales (use consistently)

- **Type:** Geist (UI) + Geist Mono (all IDs, money, counts, plates, HOS). Page title 22/600; section heading 13.5/600; body 13–14/450; label 11/600 uppercase `tracking-.03em`; KPI value 24–25px mono. `letter-spacing:-0.006em` on body. **Sentence case everywhere** (no uppercase headings).
- **Radius:** cards 14px · controls/buttons/inputs 9px · pills 20px · avatars 50%.
- **Borders:** 1px hairline (`border`), `border-strong` for inputs/secondary buttons. Light theme uses near-white borders, not gray boxes.
- **Shadow:** one elevation only (`shadow-card`). No glows, no heavy drop shadows.
- **Spacing:** page padding 28–32px · card padding 14–18px · grid gaps 12–14px · control height 34px · row height ~46–50px.
- **Status → tone:** booked/neutral = surface-2/fg-2 · dispatched/booked-accent = accent-soft/accent-text · in transit = info · at pickup/needs invoice = warn · delivered/paid/available = ok · overdue/alert = bad.

---

## 2. Information architecture (nav consolidation)

23 links → **6 primary areas** in the top bar, each with a contextual sub-nav. Compliance / Reports / Messages / Tasks / Settings move to a secondary "utility" group (shown in the sub-nav rail and ⌘K).

| Top bar | Sub-nav (contextual left rail) |
|---|---|
| **Overview** | Today · Live map |
| **Dispatch** | Dispatch board · Planner · Capacity |
| **Loads** | All loads · Quotes · Templates |
| **Money** | Overview · Invoices · AR aging · Settlements · Advances · Expenses · Fuel & cards · IFTA |
| **Fleet** | Trucks · Trailers · Maintenance · Inspections |
| **People** | Drivers · Recruiting · Customers · Facilities |
| _utility_ | Compliance (DOT & docs · Safety) · Reports · Messages · Tasks · Settings |

**Shell rules:** top bar is `sticky` 56px (logo + tenant switcher · primary tabs · ⌘K search · notifications · appearance · avatar). Sub-nav is `sticky` 212px left rail, only shows the active section's children + utility links. ⌘K opens a command palette (loads, go-to screens, actions). On mobile: top bar collapses, primary areas become a bottom tab bar, sub-nav becomes a top scroller.

---

## 3. Component patterns (rebuild `src/components/hub/ui.tsx`)

Lift these from the prototype — every value is already in the tokens above:

- **Button** — primary `bg-accent text-accent-fg`, secondary `bg-surface border-border-strong`, ghost `hover:bg-hover`. Height 34, radius 9, weight 550.
- **Card / Section** — `bg-surface border border-border rounded-card shadow-card`; header row 14–16px padding with a 13.5/600 title + optional mono count chip.
- **Table** — sticky `bg-surface-2` header (11/600 uppercase labels), hairline row separators, `hover:bg-hover`, whole row is a button to the detail. Numbers/IDs right-aligned mono. Wrap in `overflow-x-auto` with a `min-width` so columns never clip (scroll on narrow screens).
- **Pill** — `inline-flex text-[11.5px] font-semibold px-2.5 py-[3px] rounded-pill` using `{tone}-soft` bg + `{tone}` text.
- **KPI card** — label (12/500 fg-3) · value (24–25 mono) · sub (11.5 fg-3); whole card clickable.
- **Command palette** — fixed overlay, grouped results (Loads / Go to / Actions), ⌘K + Esc, autofocus.
- **Empty state** — centered icon tile + one calm sentence, never a wall of text.
- **HOS bar** — 5px track, ok/warn/bad by hours remaining.

---

## 4. Stack — TypeScript + Go + Rust

> **SUPERSEDED (kept for history).** The contract-first service-mesh below (`services/api`,
> `services/optimizer`, `services/ingest`, gRPC, Postgres-owning Go core) was never wired
> and its stubs have been removed. The live architecture is TypeScript as the V1 gateway and
> system of record, with **two optional sidecars** — `services/go/hauldesk-worker` and
> `services/rust/hauldesk-compute` — called over HTTP only when enabled. See
> `docs/architecture/trilingual-stack.md` for the current design.

The repo is **Next.js (App Router) + TypeScript** today; keep that for the web app — the prototype maps 1:1 onto `src/app/hub/*` + `src/components/hub/*`. Add **Go** and **Rust** as backend services behind a contract-first API.

- **TypeScript / Next.js** — web app (this UI), thin BFF/route handlers, auth session, SSR. Generates its API types from the backend contract (no hand-written DTOs).
- **Go** — core TMS API & domain services: loads, dispatch, billing/invoicing, settlements, customers, auth/tenancy, documents. REST + gRPC. Owns Postgres. This is the system of record.
- **Rust** — compute-heavy / streaming services where it earns its keep: route & ETA optimization, real-time ELD/telematics ingestion, IFTA mileage/jurisdiction calc, fuel-route math. Exposed to Go/TS over gRPC.
- **Contract-first:** define the API in **protobuf** (gRPC) and/or **OpenAPI**. Generate TS clients/types for Next, Go stubs, and Rust (`tonic`/`prost`). Frontend never guesses a shape.

```
apps/web        (Next.js + TS)  ──HTTP/gRPC──▶  services/api (Go)  ──gRPC──▶  services/optimizer (Rust)
                                                      │                         services/ingest    (Rust)
                                                      ▼
                                                  Postgres
```

---

## 5. The prompt to paste into Cursor

> Copy everything in the block below into Cursor (with `HANDOFF.md` + `HaulDesk.html` open in the workspace so it can reference the visual target).

```text
You are working in the thind-transport-website repo (Next.js App Router + TypeScript).
We are redesigning the HaulDesk TMS under src/app/hub/* into a calm, OpenRouter-style
system. The visual target is HaulDesk.html (open it) and the spec is HANDOFF.md (open it).
Match the prototype's tokens, spacing, and components exactly. Do NOT touch the public
marketing site or its red/gold branding — this is the software UI only.

STACK: TypeScript/Next.js for the web app (this work). Go for the core TMS API and
Rust for compute-heavy services come later behind a contract-first gRPC/OpenAPI layer;
for now keep the existing data layer and only restructure the frontend, but write all
new data access against typed clients so we can swap in generated Go/Rust clients later.

Do this in order, committing after each step:

1. TOKENS. Add the CSS variables from HANDOFF.md §1a/§1b to src/app/globals.css
   (or the global stylesheet). Replace tailwind.config.ts color/font/radius/shadow
   scales with §1c. Default <html> to data-mode="light" data-theme="indigo".
   Load Geist + Geist Mono. Remove the old dark-navy / #E0392F / #F2A900 software theme.

2. APPEARANCE. Add a light/dark toggle + theme (indigo/teal/ink) picker in the top bar,
   persisted to localStorage and applied as data-mode/data-theme on <html>. No flash on
   load (read the value before first paint).

3. NAV. Refactor src/components/hub/HubNav.tsx from the left sidebar into:
   - a sticky 56px global top bar (logo + tenant switcher, the 6 primary tabs from
     HANDOFF.md §2, ⌘K search button, notifications, appearance, avatar), and
   - a sticky 212px contextual left rail showing only the active section's sub-nav
     plus the utility links. Keep all existing routes; just regroup them per §2.

4. PRIMITIVES. Rebuild src/components/hub/ui.tsx (Button, Card/Section, Table, Pill,
   KpiCard, EmptyState, HosBar) to match HANDOFF.md §3 using the new tokens. Replace
   usages across hub pages. Sentence case all headings; mono for IDs/money/counts.

5. COMMAND PALETTE. Add a ⌘K palette component (loads, go-to screens, quick actions),
   wired to the router. Esc closes; autofocus on open.

6. SCREENS. Restyle each hub page to the prototype: Overview (KPIs + Due today /
   Not confirmed / Trucks needing freight / Ready to invoice + compliance/tasks),
   Loads (filter chips + calm table), Load detail (stops, financials, driver,
   documents), Dispatch board (HOS-aware), Planner (week grid), Money + Invoices +
   Settlements, Trucks, Drivers, Settings. Wrap tables in overflow-x-auto with a
   min-width. Keep current functionality and data; this is a visual + IA refactor.

7. RESPONSIVE. Below md: top bar condenses, the 6 primaries become a bottom tab bar,
   the sub-nav becomes a horizontal scroller, tables scroll horizontally.

Constraints: inline tokens via Tailwind classes that reference the CSS vars (bg-surface,
text-fg-2, border-border, bg-accent, etc.) — no hard-coded hex in components. One shadow
(shadow-card), hairline borders, no glows or gradients. Keep diffs reviewable: one concern
per commit. After each step, run the app and confirm light + dark + all three accents render.
```

---

## 6. API contract — `hauldesk-api.js` (the Go/Rust/TS seam)

The prototype now runs real interactions (create load, assign driver, advance status, draft invoice, run payroll, toggle tasks, notifications, tenant switch). Every mutation goes through one ops layer. `hauldesk-api.js` in this project is that layer written as a swappable client — keep the method names/args/return shapes and replace the bodies with `fetch()`/gRPC. Endpoint + service map:

- `listLoads` / `createLoad` — `GET|POST /v1/loads` → Go
- `assignDriver` — `POST /v1/loads/:ref/assign` → Go
- `advanceLoad` — `POST /v1/loads/:ref/advance` → Go (server enforces the status machine `quoted→booked→dispatched→at_pickup→in_transit→needs_invoice→invoiced→paid`)
- `createInvoice` / `sendInvoice` — `POST /v1/invoices` → Go (billing)
- `addDriver` / `addTruck` — `POST /v1/drivers|trucks` → Go
- `runPayroll` — `POST /v1/settlements/run` → Go (pay engine)
- `toggleTask` — `PATCH /v1/tasks/:id` → Go
- `markNotificationsRead` — `POST /v1/notifications/read` → Go
- `estimateEta` / `optimizeRoute` — `POST /v1/routing/*` → **Rust** (services/optimizer)
- `calcIfta` — `POST /v1/ifta/calc` → **Rust**
- `ingestEld` — telematics stream → **Rust** (services/ingest)

Domain types (mirror as TS interfaces / Go structs / Rust structs) and the status machine constants are defined at the top of `hauldesk-api.js`. Define them once in protobuf/OpenAPI and generate all three languages so the UI never hand-writes a DTO.

Extra Cursor step (append to §5 prompt):

```text
8. DATA LAYER. Port hauldesk-api.js into the app as a typed client (src/lib/hub/api.ts).
   Keep the method signatures; back them with the Go API over fetch/gRPC. Generate
   TS types from the OpenAPI/proto definition. The status machine lives server-side in
   Go; Rust owns routing/ETA, IFTA, and ELD ingestion behind /v1/routing, /v1/ifta,
   and the telematics stream. Wire the UI's create/assign/advance/invoice/payroll
   actions to these endpoints — the prototype shows the exact call sites.
```

---

## 7. Suggested follow-ups (ask before building)

Placeholder screens in the prototype (good empty states, not yet designed): Live map, Capacity, Quotes, Templates, AR aging, Advances, Expenses, Fuel & cards, IFTA, Trailers, Maintenance, Inspections, Recruiting, Customers, Facilities, Compliance, Safety, Reports, Messages, Tasks. Prioritize by what Thind needs to run fully online, and I'll design them in this same system.

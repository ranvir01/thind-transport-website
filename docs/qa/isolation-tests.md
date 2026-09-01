# Cross-tenant isolation tests (LAUNCH BLOCKER — Phase 7 §2.2)

A user scoped to **Thind Transport** must never read **Cascade Demo Lines**
loads, invoices, documents, or settlements — by URL, by id, via list/search, or
via `/api/hub/files/[name]`. Reverse must also hold. Any leak blocks launch.

There is **no Postgres RLS**. Isolation is application-level (`carrier_id = $n`
on every query). These steps prove it at the product surface, complementing
`src/lib/hub/__tests__/cross-tenant-harness.test.ts`.

## Actors (after `npm run seed:demo`)
| Tenant | UUID | Login | Password | Owns |
|---|---|---|---|---|
| Thind | `11111111-1111-1111-1111-111111111111` | `owner@demo.thind` | `ThindDemo1!` | THD-* loads, THD-INV-* invoices, `/api/hub/files/thind-w9.pdf`, Harpreet/Jasdeep settlements |
| Cascade | `22222222-2222-2222-2222-222222222222` | `owner@cascademo.example` | `ThindDemo1!` | CAS-5001, CAS-5002, Pete Larson |

If a fixture loader is used instead of seed-demo, the same emails/UUIDs apply.

## IDOR matrix
Every foreign cell must be **404 or 403** (never 200 with the other tenant's
body). Lists may 200 but the foreign row must be **absent**.

| # | Resource | Vector | As Thind owner | Expected |
|---|---|---|---|---|
| I-1 | Load | office route | open `/hub/loads` and search `CAS-5001` / Wenatchee | empty; lane never shown |
| I-2 | Load | direct id | `/hub/loads/<cascade-load-uuid>` (resolve uuid from DB as Cascade, paste as Thind) | 404/403 |
| I-3 | Load | list API / server action | any loads list filtered to Cascade's reference | CAS-5002 absent |
| I-4 | Invoice | office list | `/hub/money/invoices` | no CAS-INV-*; no Wenatchee Produce |
| I-5 | Invoice | direct id | `/hub/money/invoices/<cascade-invoice-uuid>` (create one on Cascade first if seed has none) | 404/403 |
| I-6 | Document | file route | `GET /api/hub/files/cas-5002-bol.pdf` (or Cascade's real filename) with Thind session | 401/403/404, **no bytes** |
| I-7 | Document | known Thind name from Cascade | (see reverse I-13) | — |
| I-8 | Settlement | list | `/hub/money/settlements` | Harpreet/Jasdeep only; no Pete Larson |
| I-9 | Settlement | direct id | `/hub/money/settlements/<cascade-settlement-uuid>` | 404/403 |
| I-10 | 1099 export | CSV | Money → 1099-NEC | payees ⊆ Thind percentage drivers; **Pete Larson absent** (and he is per_mile anyway) |

### Reverse (Cascade owner)
| # | Action | Expected |
|---|---|---|
| I-11 | `/hub/loads` search `THD-1005` / Los Angeles | empty |
| I-12 | `/hub/money/invoices` | no THD-INV-*; no factored Summit/Thind invoices |
| I-13 | `GET /api/hub/files/thind-w9.pdf` with Cascade session | 401/403/404, **no bytes** |
| I-14 | `/hub/money/settlements` | no Harpreet, no Jasdeep, no net **50500** / **263500** |

## Detailed steps

### Setup
1. `npm run db:migrate && npm run seed:demo`
2. Session A: log in `owner@demo.thind`. Session B: `owner@cascademo.example` (other browser / incognito).
3. Optionally as Cascade owner, one-click invoice CAS-5002 so I-5 has a real invoice uuid.

### I-1 / I-2 / I-3 — Loads
1. As A, `/hub/loadboard` and `/hub/loads`: count of `CAS-*` references is **0**.
2. From session B, copy the CAS-5001 load uuid from the URL. Paste that uuid onto session A's origin as `/hub/loads/<uuid>`.
   - **PASS:** not found / forbidden. **FAIL:** Cascade lane or $1,680.00 linehaul shown.
3. As A, search "Wenatchee" / "CAS-5002". **PASS:** zero hits.

### I-4 / I-5 — Invoices
1. As A, `/hub/money/invoices`. **PASS:** only `THD-INV-*`. Face amounts 255000 / 344000 may appear; **164000** (Cascade CAS-5002 face) must not.
2. If Cascade has an invoice uuid, open it as A. **PASS:** 404/403.

### I-6 / I-13 — Documents (the leak that hurts)
1. As A: `GET {origin}/api/hub/files/thind-w9.pdf` → **200** (negative control).
2. As A: `GET {origin}/api/hub/files/cas-5002-bol.pdf` (or any Cascade-owned name) → **not 200 with file bytes**.
3. As B: `GET {origin}/api/hub/files/thind-w9.pdf` → **not 200 with file bytes**.
4. Signed-out GET of either URL → **401**.

`resolveHubFile` is the gate (`src/lib/hub/documents.ts` / `/api/hub/files/[name]`).
A 200 that returns the *wrong tenant's* PDF is an automatic fail, even if the UI list was filtered.

### I-8 / I-9 / I-14 — Settlements
1. As A, `/hub/money/settlements`. After "Draft this week": Harpreet net **50500**, Jasdeep net **263500** may appear. Pete Larson / Cascade nets must not.
2. Copy a Thind settlement uuid; open as B. **PASS:** 404/403.

### I-10 — 1099
1. As A, export 1099-NEC. **PASS:** Jasdeep Brar present (percentage); Harpreet **absent**; no Cascade payee.
2. As B, same export. **PASS:** empty or only Cascade percentage payees (seed has none).

## Negative control (proves this is not a false pass)
As Thind owner these **must** 200 with the right body:
- `/hub/loads` shows `THD-1005` (Kent → Los Angeles)
- Factored invoice for `THD-1015` face **344000**
- `GET /api/hub/files/thind-w9.pdf` returns PDF bytes
- After draft: Harpreet settlement **net 50500**

## Pass criterion
**All** of I-1…I-14 block foreign data **and** all four negative-control reads succeed.
If any foreign read returns the other tenant's load, invoice, file bytes, or
settlement, **this is the launch-blocking leak**.

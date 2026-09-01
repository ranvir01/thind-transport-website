# DataTruck Parity Map

This tracks the HaulDesk scope against the DataTruck-style benchmark named in the
owner prompt.

## Adopted now

| Benchmark item | HaulDesk status |
|---|---|
| Multi-MC / multi-company | Implemented for Thind + ATS with company switcher and All-companies owner view. |
| Onboarding checklist | Implemented as `/hub/onboarding` with production profile and setup links. |
| Pay tariffs | Implemented as `/hub/settings/pay-tariffs` with plain-English rule capture. |
| Recurring transactions | Implemented as setup table + mobile form for weekly deductions. |
| Revenue/debit categories | Implemented as production setup forms. |
| Load lifecycle board | Implemented from baseline with fixed semantic statuses. |
| Load intake by paste/import | Implemented from baseline. |
| Invoices and AR aging | Implemented from baseline; sandbox fallback shows paid/overdue/current mix. |
| Settlements | Implemented from baseline; sandbox seed creates tariff-based drafts where DB exists. |
| Fuel transaction views / IFTA foundation | Implemented from baseline; sandbox seed includes fuel/toll rows where DB exists. |
| Compliance expiry dashboard | Implemented from baseline; sandbox data includes red/amber/green cases. |
| Profit/reporting foundations | Implemented from baseline reports and dashboard KPIs. |
| Driver mobile experience | Implemented initial `/hub/driver` PWA camera POD smoke path. |
| Broker tracking portal | Implemented baseline `/track/[token]` share-link status page. |

## Exceeded / customized

| Area | HaulDesk difference |
|---|---|
| Two-company owner workflow | Owner can switch Thind / ATS / All companies from one login. |
| Production-safe missing input policy | Unknown production facts stay blank and appear in blocked/setup docs. |
| iPhone HTTPS test workflow | `npm run dev:mobile` creates a quick HTTPS tunnel and verifies sign-in. |
| No-database sandbox fallback | The app can show populated sandbox office and driver pages even before local Postgres is configured. |
| 1099-specific setup | Pay setup and docs are explicitly all-1099; no W-2 payroll path is introduced. |

## Deliberately skipped for launch

| Skipped item | Reason |
|---|---|
| Paid AI add-ons / black-box dispatch suggestions | Owner requested deterministic math, not AI show features. |
| EDI tender automation | Out of launch scope. |
| Dynamic per-user statuses | Fixed lifecycle avoids spreadsheet chaos. |
| Multi-currency | Out of launch scope. |
| Broker-side modules beyond tracking | Out of launch scope. |
| Telegram notifications | Out of launch scope. |

## Remaining parity hardening

- Full live ELD/HOS sync via TruckX/Terminal once credentials are available.
- Live fuel/toll/factoring feeds once vendor access is available.
- QuickBooks Online OAuth if the owner chooses live sync instead of CSV.
- Full driver DVIR/offline upload queue beyond the current camera POD smoke.
- Final white/tokenized UI redesign across every Hub component and PDF.

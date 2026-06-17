# Production Intake — Thind Transport LLC + ATS Transport LLC

This file records only owner-provided production facts. Anything not provided is
tagged `PENDING` and must stay blank in production until entered by the owner in
HaulDesk. Sandbox data is separate and never becomes go-live data.

## 1.1 Two companies

| Field | Thind Transport LLC | ATS Transport LLC |
|---|---|---|
| Legal name confirmed as on authority | `PENDING` — owner wrote “Thind Transport LLC confirm” | `PENDING` — owner wrote “ATS Transport LLC confirm” |
| DOT # | `PROVIDED` — `2523064`; active SAFER confirmation still `PENDING` | `PENDING` |
| MC # | `PROVIDED` — `876103`; confirmation still `PENDING` | `PENDING` |
| EIN last 4 | `PENDING` | `PENDING` |
| Ops phone | `PROVIDED` — `(206) 765-6300` | `PROVIDED` — `(253) 410-7259`; confirmation still `PENDING` |
| Mailing address | `PROVIDED/PENDING CONFIRM` — `PO Box 5114, Kent, WA 98064` from existing constants | `PENDING` |
| Physical yard | `PENDING` | `PENDING` |
| Email domain / billing email | `PENDING` | `PENDING` |
| Logo file | `PENDING` | `PENDING` |
| Invoice prefix + last invoice # | `PENDING` | `PENDING` |
| Factoring company | `PENDING` | `PENDING` |
| Factoring remit-to | `PENDING` | `PENDING` |
| Factoring fee % + reserve | `PENDING` | `PENDING` |
| NOA file | `PENDING` | `PENDING` |
| Insurance agent | `PENDING` | `PENDING` |
| Driver payout method + bank last 4 | `PENDING` | `PENDING` |

Operating relationship:

- After-hours phones: `PENDING`
- Can drivers/trucks run under either authority: `PENDING`
- Customer sharing/split: `PENDING`
- Reason for two companies: `PENDING`

## 1.2 People and access

| Person | Status |
|---|---|
| Sukhdev Thind | `PROVIDED` as owner for both companies; email/mobile `PENDING`; settlement approval `PROVIDED` yes; invoice send permission `PENDING` |
| Other office users | `PENDING` |
| Backup dispatcher | `PENDING` |
| Settlement chain | `PENDING` |
| First 3 drivers for phone app | `PENDING` |
| First 3 brokers for portal invites | `PENDING` |

## 1.3 Fleet

All power units, trailers, ELD IDs, fuel-card last 4, tank gallons, ownership, and
odometers are `PENDING`. Use **Hub → Onboarding → Trucks/Trailers** or the
fleet import template.

Reefer fuel and toll transponders: `PENDING`.

## 1.4 Drivers and pay — all 1099

Owner mandate: every driver and owner-operator is paid as a 1099 contractor.
Explicit confirmation line still says `<<agreed>>`, so legal/business confirmation
is tagged `PENDING CONFIRM` while the system is configured for 1099 settlements.

Driver list, CDL/med card expiries, assigned trucks, advance balances, and escrow:
`PENDING`.

Pay tariffs:

- Tariff 1: `PENDING`
- Tariff 2: `PENDING`
- Tariff 3: `PENDING`

DQ file status: `PENDING`.

## 1.5 Customers

Broker/shipper list, MC numbers, billing emails, terms, credit limits, factoring
flags, contacts, tracking requirements, slow payer flags: `PENDING`.

`PREMIER_BROKERS` active/removal/addition list: `PENDING`.

## 1.6 Money state

- Broker payment methods: `PENDING`
- Settlement/payroll cycle: `PENDING`
- Accessorial price book: `PENDING`
- Cost-per-mile baseline: `PENDING`
- Revenue types: `PENDING` — defaults can be used only as editable setup labels.
- Debit/deduction categories: `PENDING` — defaults can be used only as editable setup labels.
- Recurring weekly transactions: `PENDING`
- Open AR: `PENDING`
- Driver advances: `PENDING`
- Factoring fees YTD: `PENDING`
- QuickBooks Desktop/Online and export format: `PENDING`
- QB account mapping: `PENDING`

## 1.7 Files

No production-intake files were present in the repository at the time this file
was created. Drop files into `docs/production-intake/files/`.

Required files remain `PENDING`:

- Live Excel loadboard
- 12–24 month load history
- Last full quarter fuel card CSVs
- Last full quarter toll statements
- Recent factoring remittance reports
- TruckX IFTA mileage export
- Real rate confirmations
- Company compliance PDFs
- Per-truck documents
- Per-driver CDL/med/MVR documents

## 1.8 Secrets & vendor accounts

All credential statuses are `PENDING` until the owner sets them in Vercel
Production Environment Variables. Never paste secrets into this file.

Required env vars include:

- `POSTGRES_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `CRON_SECRET`
- `CREDENTIALS_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `FROM_EMAIL`, `HR_EMAIL`
- IMAP mailbox variables
- `VAPID_PUBLIC`, `VAPID_PRIVATE`
- `FMCSA_WEBKEY`
- `EIA_API_KEY`

Vendor statuses all `PENDING`: TruckX/Terminal, DAT, Uber Freight, other load
sources, fuel feeds, toll portals, factoring portal, QuickBooks Online OAuth,
rate-con forwarding process.

## 1.9 Cutover choices

- Target go-live date: `PENDING`
- Parallel run with Excel: `PENDING`
- First load per company in HaulDesk: `PENDING`
- Explicit not-in-scope list confirmation: `PENDING`

## 1.10 Look & feel

- Retire current blue + red decoration: `PROVIDED`
- Red reserved only for errors/overdue/destructive: `PROVIDED`
- Base surface white/near-white: `PROVIDED`
- Accent preset: `PENDING`
- Office screen mode: `PENDING`
- Table density: `PENDING`
- Current look to keep: `PENDING`

## 1.11 Load sources and best-load rules

Source mix and dispatcher workflow: `PENDING`.

Owner’s ranker rule text: `PENDING`.

Automatic factors mandated by prompt and awaiting data feeds:

- HOS hours remaining
- current empty location
- home-time day per driver
- equipment type

## System-created known production facts

These are already prefilled in production carrier settings by
`CONFIRM_PRODUCTION_SEED=yes npm run seed:production`:

- Thind Transport LLC DOT `2523064`
- Thind Transport LLC MC `876103`
- Thind phone `(206) 765-6300`
- ATS phone `(253) 410-7259`

Everything else remains blank by policy.

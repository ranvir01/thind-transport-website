# LoadOff Go-Live — What We Need From You

This is the checklist to take LoadOff from **demo-ready** to **Thind Transport production**. The software runs on Vercel + Postgres today; integrations are wired but need your real credentials and carrier data.

**One-command status:** `npm run connections:check` (with `POSTGRES_URL` pointed at the target DB) prints every env switch, every integration provider's credential/sync state, and the cron schedule — the permanent answer to "is everything connected?". Which paid credentials to chase first is ranked in `docs/integrations/creds-shopping-list.md`.

**One-command readiness gate:** `POSTGRES_URL=<prod url> HUB_DEMO_LOGIN=false npm run go-live:check` verifies this checklist automatically — §1 secrets, migrations, demo lockout, blob/SMTP, §3 free keys, §6 web-push keys, sidecar auth, and Hobby-safe crons. Exit 0 = ready; warnings don't block.

---

## 1. Required before anyone logs in (production)

| Item | Where to set | Why |
|------|----------------|-----|
| **Postgres URL** | Vercel → `POSTGRES_URL` | System of record (loads, money, users). Use Vercel Postgres or Neon. |
| **NextAuth secret** | `NEXTAUTH_SECRET` (or `AUTH_SECRET`, Auth.js v5's native name — either works) | `openssl rand -base64 32` |
| **NextAuth URL** | `NEXTAUTH_URL` | `https://thindtransport.com` (or your hub domain) |
| **Credentials encryption** | `CREDENTIALS_KEY` | 32+ random chars — encrypts fuel/telematics/mailbox passwords in DB |
| **Cron secret** | `CRON_SECRET` | Protects `/api/hub/cron/*` (compliance scan, AR reminders, mailbox, FMCSA recheck, etc.) |
| **Blob storage** | `BLOB_READ_WRITE_TOKEN` (Vercel Blob) | Vercel's filesystem is ephemeral — without this, POD uploads and generated invoice/settlement PDFs are lost between invocations |

After env is set:

```bash
npm run db:migrate    # on production DB once
# Do NOT run seed:demo on production
npm run go-live:check # every §1 item above is verified here — fix anything ✗
```

Create your **owner account** via `/hub/signup` or insert owner user manually, then disable demo logins.

---

## 2. Email (invoices, reminders, digests)

| Item | Env vars |
|------|----------|
| SMTP (Gmail app password or SendGrid) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| HR / ops copies | `HR_EMAIL` |

**Test locally:** `npx maildev --smtp 1025 --web 1080` + `SMTP_HOST=localhost` `SMTP_PORT=1025`

**Used for:** invoice PDF email to brokers, AR reminders, weekly owner digest, portal invites.

---

## 3. Free API keys (5 minutes each)

| Integration | Env var | Get it from |
|-------------|---------|-------------|
| FMCSA broker vetting | `FMCSA_WEBKEY` | [mobile.fmcsa.dot.gov](https://mobile.fmcsa.dot.gov/QCDevsite/docs/apiAccess) |
| Weekly diesel index (fuel screen) | `EIA_API_KEY` | [eia.gov/opendata](https://www.eia.gov/opendata/register.php) |

Without these: broker MC lookup and EIA diesel chart show manual/CSV fallback only.

---

## 4. Integrations (Settings → Integrations)

Each has a **CSV/manual fallback** — connect when you have vendor access. The full provider list (live/stub/planned) is the registry at `src/lib/hub/integrations/registry.ts`; the settings page renders from it directly, and webhook-style providers show a copy-paste inbound URL on their card.

### Telematics (GPS + HOS sync)

| Provider | What we need | Fallback |
|----------|----------------|----------|
| **Terminal** | API key + fleet ID | Manual truck location on dispatch board |
| **TruckerCloud** | Client ID + secret | Same |

Set in app: `/hub/settings/integrations` (requires `CREDENTIALS_KEY`).

### Fuel cards

| Provider | What we need | Fallback |
|----------|----------------|----------|
| **EFS / WEX / Comdata** | Merchant export CSV → `/hub/fuel` import | Quarterly CSV import |

### Load board (optional)

| Provider | What we need |
|----------|----------------|
| **DAT** | API credentials (when activated) |

### Document mailbox (rate cons → loads)

| Provider | What we need |
|----------|----------------|
| **IMAP mailbox** | Host, port, user, password for e.g. `docs@thindtransport.com` |

Cron `docs-mailbox` runs every 15 min on Vercel. Unmatched PDFs go to a review queue.

**Please provide:** IMAP host, port, username, password (or app password), and the email address you want documents sent to.

---

## 5. Production data intake (your documents)

Use **Smart Setup** (`/hub/setup`) instead of typing everything:

**Full walkthrough:** `docs/hub-setup-guide.md` (same content as **Setup guide** in the app at `/hub/guide`)

1. Upload W-9, COI, carrier packet PDFs  
2. Upload broker lists (CSV or screenshots) — MC/DOT → FMCSA lookup  
3. Upload truck/trailer registration scans  
4. Upload fuel card CSVs for the current quarter  
5. Upload open invoice AR export from QuickBooks or Excel  

Printable owner guide: `docs/production-intake/thind-transport.md`

---

## 6. Optional but recommended

| Item | Env var | Purpose |
|------|---------|---------|
| Web Push (driver notifications) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT` | `npx web-push generate-vapid-keys` |
| Self-hosted geocoder | `GEOCODER_BASE_URL` | Scale geocoding beyond Nominatim rate limits |

---

## 7. What is already working (verified)

- `npm run build` — passes  
- `npm test` — 117 tests  
- Office smoke — announcements, doc requests, tasks  
- Portal smoke — broker tracking  
- Driver smoke — dispatch confirm → arrive → POD flow (after demo re-seed)  
- UI — HaulDesk redesign shell (light/dark, top nav, ⌘K)  
- Sidecars — `services/go/hauldesk-worker` (Go) and `services/rust/hauldesk-compute` (Rust), optional and off by default (see `docs/architecture/trilingual-stack.md`)

---

## 8. Send us this packet

Reply with (redact passwords in chat — use a secure channel for secrets):

1. **Production Postgres** — confirm Vercel Postgres is linked or paste connection string for staging first  
2. **SMTP** — host, port, from-address (we configure app password in Vercel)  
3. **docs@ mailbox** — IMAP settings for rate con intake  
4. **Fuel vendor** — which card (EFS/WEX/Comdata) + sample CSV export  
5. **Telematics** — Terminal or TruckerCloud credentials if you use them  
6. **FMCSA webkey + EIA key** — or confirm we should register them for you  
7. **Factoring** — remit-to address for factored invoices (if applicable)  
8. **Go-live date** — when to disable demo accounts and cut over from Excel  

---

## 9. Post go-live verification

Run on production URL:

```bash
node scripts/e2e-sweep.mjs https://thindtransport.com
```

Sign-off checklist: `docs/production-intake/sign-off.md`

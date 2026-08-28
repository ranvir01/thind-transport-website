# Start here — HaulDesk is a working simulation

This is the one onboarding document. HaulDesk’s **default running state** is a complete, internally-coherent **SIMULATION** of two companies:

| Company | What’s real | What’s generated |
|---|---|---|
| **Thind Transport LLC** | DOT 2523064, MC 876103, (206) 765-6300, Kent WA | loads, invoices, settlements, ELD pings, fuel |
| **ATS Transport LLC** | (253) 410-7259 | DOT/MC labeled SAMPLE, fleet, brokers, loads |

A persistent **SIMULATION** badge sits in the header and footer. Invoice, settlement, IFTA, and 1099 PDFs are watermarked `SIMULATION — NOT A REAL DOCUMENT`. Every outbound email lands in **Settings → Simulated outbox** — nothing leaves the building. Live ELD / fuel-card / QuickBooks / FMCSA calls stay on their CSV/mock fallbacks.

When you are ready for real data, one command wipes the generated world: `npm run go-legit`.

---

## 1. Run it

```bash
npm install
cp .env.example .env.local   # POSTGRES_URL + NEXTAUTH_SECRET at minimum
npm run db:migrate
npm run sim:seed             # or: npm run sim:new  /  npm run sim:reset
npm run dev                  # http://localhost:3000/hub
```

Phone (Safari, Add to Home Screen, camera for POD):

```bash
npm run sim:seed && npm run dev:mobile
```

That prints an `https://….trycloudflare.com/hub` URL. Open it in Safari → Share → Add to Home Screen. Camera and install require HTTPS; `localhost` is fine on this machine.

### Simulation logins (password `ThindDemo1!`)

| Email | Who |
|---|---|
| `owner@demo.thind` | Thind owner — **Thind / ATS / All** switcher (header on desktop, workspace menu on the phone) |
| `dispatch@demo.thind` | Dispatcher, **locked to Thind** (isolation gate) |
| `accounting@demo.thind` | Accounting |
| `driver@demo.thind` | Driver PWA at `/hub/driver` |
| `broker@demo.thind` | Broker portal |
| `owner@demo.ats` | ATS owner |
| `owner@cascademo.example` | ATS owner (e2e alias, same tenant) |

---

## 2. Tour (real features, generated data)

1. **Switcher** — as `owner@demo.thind`, toggle Thind / ATS / All (header on desktop; tap the workspace chip on the phone). Dispatchers never see this.
2. **Paste a rate con** — Loads → Paste. Use the DAT-shaped sample in `src/lib/hub/__tests__/parser.test.ts` (`PACIFIC CREST LOGISTICS`, load `PCL-99120`, $3,200 + $350 FSC) or the Uber Freight-shaped sample in the same file.
3. **Lane ranker** — Reports → Lanes. Margin is **revenue − miles × cost-per-mile** (Settings → Cost per mile). Not a new formula.
4. **Driver POD** — log in as `driver@demo.thind` on the phone, open a delivered load, take a photo. That is the same camera path production uses.
5. **Invoices** — Money → Invoices. Open two, download PDFs, hold them side by side. Both say SIMULATION.
6. **Friday settlements** — Money → Settlements. Company drivers are per-mile (63¢ loaded); owner-operators are 90% of linehaul + 100% FSC. Integer cents, `roundHalfAwayFromZero`. The math did not change.
7. **Broker portal** — `broker@demo.thind`. Simulated portal, same badge.
8. **Cmd+K** — command palette. Theme picker is in the user menu (office screens use semantic tokens only).
9. **Advance simulated day** — Today, or Settings → Simulation. Optional. Moves a few in-flight loads, nudges ELD pings, ages AR. First open is a snapshot; you do not have to advance it.
10. **Public apply / pre-qualify / calculator / meeting** — SMTP can stay blank. Submissions land in Settings → Simulated outbox, same as invoices and packets.

The `/hub/sandbox` “practice company” is a **separate** Blue Ridge tenant. Do not confuse it with this default Thind+ATS simulation.

---

## 3. Flip to real data

```bash
npm run go-legit
# type: DELETE SIMULATION
```

That truncates generated operational data, sets `hub.platform_state.mode = legit`, and leaves you an empty Thind carrier. Open `/hub/signup` and walk the wizard.

Guards lift as credentials land — they are not a second product:

| Next | Where | Notes |
|---|---|---|
| SMTP | Vercel env `SMTP_USER` / `SMTP_PASS` | Until set, legit mode still will not send. See `docs/OWNER-CHECKLIST.md`. |
| Factoring | Settings → company / factoring | Remit-to on invoices. |
| Pay rules | Settings → Driver pay | Settlements read these; do not hand-edit cents. |
| Fuel CSVs | Settings → Integrations → EFS/WEX/Comdata | CSV fallback stays forever. |
| ELD | Terminal or TruckerCloud, same screen | Positions CSV if you have no key. |
| `CREDENTIALS_KEY` | env | Encrypts stored keys. Pasting a key is activation, not development. |

`npm run sim:seed` brings the generated world back (and sets mode back to simulation).

Seeds: `sim:seed` always replays `hauldesk-default`. `sim:new` picks a random seed (same skeleton, jittered ATS extras). `sim:reset` re-reads the seed stored in the database.

---

## 4. Commands

| Command | What |
|---|---|
| `npm run sim:seed` | Generate the default Thind + ATS world |
| `npm run sim:new` | New random seed |
| `npm run sim:reset` | Replay the stored seed |
| `npm run go-legit` | Wipe sim, enter empty legit mode |
| `npm run dev:mobile` | Next.js + HTTPS tunnel |
| `npm run verify:sim` | Isolation + penny + watermark proofs against the DB |
| `npm run build` / `npm test` | Must stay green |

Postgres: `docker compose up -d` or a local 16.x. Details that used to live only in `docs/getting-started.md` still apply (NEXTAUTH_SECRET, canvas deps).

---

Backlog the fleet should not forget: phone camera and PWA-install can only be signed off on a physical device; this document cannot click “Add to Home Screen” for you.

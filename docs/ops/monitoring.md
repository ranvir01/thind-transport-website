# Monitoring & uptime — what fires, to whom, first response

Status: the free, no-signup tier is live (this doc's §1–§2). Full error
monitoring (§3) is one owner signup away — it needs an account/DSN only
Ranvir can create.

## 1. Uptime — `/api/version` is the target

`GET https://thindtransport.com/api/version` returns, publicly and cheaply:

```json
{ "sha": "…", "ref": "main", "env": "production", "db": true, "migrations": 22 }
```

- `http != 200` → the app is down.
- `db: false` → the app is up but Postgres isn't answering (worse: forms
  silently fall back to email-only capture).
- `sha` ≠ origin/main tip → production is stale (the Vercel dedupe trap;
  remedy is the main-only stamp push in docs/claude-routines.md).

**Owner setup (5 minutes, free):** point any uptime pinger (UptimeRobot free
tier, Better Stack free tier) at `/api/version` with keyword monitoring on
`"db":true`, 5-minute interval, alert → thindcarrier@gmail.com and a phone
number. This is the single highest-value alert; do it first.

## 2. Cron failures now raise

Every scheduled job (`/api/hub/cron/[job]`) already writes success/failure to
`hub.integration_syncs`. As of Task 5 it also:

- logs a structured `[cron:<job>] N/M carrier run(s) failed` line to the
  Vercel runtime log (visible in the dashboard's Logs tab and to
  `get_runtime_errors`), and
- returns **500** when any carrier's run failed, so the Vercel → Project →
  Cron dashboard shows the invocation red instead of silently green.

**First response to a red cron:** open /hub/settings/integrations → Sync
history (it reads integration_syncs) — the error message is there. A 401
means CRON_SECRET is unset or rotated in only one place.

## 3. Error monitoring (owner-gated: needs an account)

Recommendation: **Sentry, free tier** (5k events/month covers this app's
volume; first-party Vercel integration; `@sentry/nextjs`).
Deliberately NOT installed yet because:

- it needs a DSN from a Sentry account only the owner can create, and
- the SDK is a real bundle/build-pipeline change — it should land in a
  change where its effect on the 230KB homepage budget is measured, per
  AGENTS.md's heavy-dependency rule.

When installed, the non-negotiables (from AGENT_TASKS Task 5):
- tag every event with `carrier_id` so a tenant-specific failure reads as one;
- **never send PII**: no driver names, CDL numbers, addresses, credential
  values; scrub request bodies by default and allowlist;
- alert routing: server errors → email to the owner; a spike (>10/hour) →
  phone. An alert nobody owns is noise — the owner is the owner.

## Alert routing summary

| Signal | Carried by | Who | First response |
|---|---|---|---|
| Site down / db:false | Uptime pinger on /api/version | Owner (email+SMS) | Vercel dashboard → latest deployment logs |
| Cron run failed | Vercel Cron dashboard (500) + runtime log | Whoever checks /hub Sync history | Read the error in Settings → Integrations → Sync history |
| Server exception | Sentry (once connected) | Owner email | Event's carrier_id tells you who's affected |
| Stale production | scripts/prod-smoke.mjs (sha vs main) | Fleet agents | Main-only stamp push |

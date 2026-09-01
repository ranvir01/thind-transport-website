# HaulDesk Go-Live Runbook

## Immediate iPhone sandbox test

1. Apply schema and sandbox data:
   ```bash
   npm run db:migrate
   npm run seed:sandbox
   npm run dev:mobile
   ```
2. Open the printed `https://...` URL in iPhone Safari.
3. Sign in with:
   - Owner: `owner@sandbox.hauldesk.local` / `SandboxOwner1!`
   - Dispatcher: `dispatch@sandbox.hauldesk.local` / `SandboxDispatch1!`
   - Driver: `driver@sandbox.hauldesk.local` / `SandboxDriver1!`
4. Driver PWA install:
   - Open `/hub/driver`.
   - Tap Safari Share.
   - Tap **Add to Home Screen**.
   - Launch HaulDesk from the icon.
5. Camera POD:
   - Open `/hub/driver`.
   - Tap **Open camera POD**.
   - Allow camera.
   - Tap **Save POD**.

Quick-tunnel URLs change every run. For stable repeated testing, use:

```bash
npm run deploy:preview
```

Same-Wi-Fi fallback for UI only:

```bash
npm run dev:lan
```

Do not use the LAN URL to validate iOS camera/PWA/service worker; iOS requires HTTPS.

## Moving from sandbox to production

1. Read `docs/production-intake/FILL-THESE-NEXT.md`.
2. Set production email env vars in Vercel.
3. Run production-safe known-facts seed only when ready:
   ```bash
   CONFIRM_PRODUCTION_SEED=yes npm run seed:production
   ```
4. Sign in as a production owner and open **Hub → Onboarding**.
5. Fill each company profile, invoice/remit-to, pay tariffs, drivers, fleet, customers, and imports.

Known production facts prefilled:

- Thind DOT `2523064`, MC `876103`, phone `(206) 765-6300`.
- ATS phone `(253) 410-7259`.

Unknowns stay blank until entered.

# Docs mailbox (IMAP) — scouting notes

Researched: 2026-07-06, OAuth2 path added 2026-07-10. Status: **built adapter, live** in
`src/lib/hub/mailbox.ts` (`pollDocsMailbox`), wired to the `docs-mailbox` cron job. Not a
vendor SDK — it's a generic IMAP client (`imapflow` + `mailparser`) pointed at whatever inbox
the carrier's office already uses. This doc covers the two mailbox providers row 2 of
`creds-shopping-list.md` names (Gmail, Microsoft 365 / Google Workspace) since "auth model"
here means "what the mailbox provider allows for IMAP login," not a single company's API.

## Auth model (as implemented, confirmed against our code)

- Credential fields (`src/lib/hub/integrations/registry.ts`, `mailbox` entry): `host`, `port`
  (default 993), `user`, `password` (`secret: true`, Gmail app password), `folder` (default
  `INBOX`), plus four OAuth2 fields — `tokenEndpoint`, `clientId`, `clientSecret` (`secret:
  true`), `refreshToken` (`secret: true`).
- `pollDocsMailbox` calls `resolveMailboxAuth`, which picks the auth mode per carrier:
  - **OAuth2 (XOAUTH2)** when all four OAuth2 fields are set (`isOAuthConfigured`) — exchanges
    the stored refresh token for a bearer access token via a standard `grant_type=refresh_token`
    POST to `tokenEndpoint`, then builds `auth: { user, accessToken }`. A rotated
    `refresh_token` in the response is persisted back through `saveCredentials` before the next
    poll needs it (same rotation pattern as `qbo.ts`'s `refreshAccessToken`).
  - **Plain password** otherwise, when `password` is set — unchanged Gmail app-password path,
    `auth: { user, pass: password }`.
  - Neither configured → `connected: false`, CSV/manual-upload fallback stays the product.
- `secure: true` is hardcoded (implicit TLS on port 993) — there's no STARTTLS fallback for
  a provider only offering port 143.
- `tokenEndpoint` is a plain credential field, not hardcoded per-vendor, so the same code path
  covers Microsoft identity platform (`https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token`)
  and Google OAuth2 (`https://oauth2.googleapis.com/token`) — both are standard
  `refresh_token`-grant, form-encoded, JSON-response endpoints.

## ⚠️ Setup gap: no in-app OAuth2 consent flow yet

- This ships the **token-exchange plumbing**, not a one-click "Connect Microsoft 365" button.
  An office still needs an admin (theirs, or Thind's, depending on who owns the app
  registration) to complete an Entra ID app registration (or Google Cloud OAuth client) once,
  run the authorization-code consent flow by hand, and paste the resulting client
  ID/secret/refresh token/token endpoint into the four new credential fields — a real onboarding
  step, not zero-touch. Building an in-app "Connect" button that runs the consent redirect
  itself is future work; not started this cycle (scope: Gmail app-password parity, not a
  full OAuth consent UI).
- Previously this doc filed an "urgent" finding that Office 365/Workspace mailboxes couldn't
  authenticate at all and the settings copy wrongly implied they could — both are now
  resolved: `registry.ts`'s blurb and field labels spell out which fields are for Gmail vs.
  OAuth2, and the OAuth2 path actually works end-to-end once those four fields are filled in.

## Gmail-side auth (confirmed working)

- Gmail requires 2-Step Verification to be enabled on the account, then an **App Password**
  (a 16-character generated secret, Google Account → Security → App passwords) goes in our
  `password` field — this is real basic auth over IMAP that Google still honors for app
  passwords specifically, even though Google finished retiring the old blanket "less secure
  apps" toggle. Google enforced OAuth2 for non-app-password IMAP clients starting **May 1,
  2025**; app passwords are the documented workaround and remain supported as of this
  research date.
- IMAP is on by default for every Google account since January 2025 (the old admin on/off
  toggle is gone), so there's no "enable IMAP first" step to document anymore.
- Google Workspace admins can still block IMAP org-wide via Admin Console → Apps → Google
  Workspace → Gmail → some organizational units — worth a one-line callout in onboarding docs
  if a carrier's Workspace admin has it off.

## Rate limits

- **Connections:** Gmail allows up to **15 simultaneous IMAP connections** per account. Our
  cron does one connect-poll-disconnect cycle per carrier per run, well under that.
- **Bandwidth:** Gmail throttles at roughly **2,500 MB/day IMAP download, 500 MB/day upload**
  per account; exceeding it triggers temporary throttling, not a hard ban. Attachment size is
  already capped at 15 MB per file in `pollDocsMailbox` and only the first 25 unseen messages
  are processed per run, so a single sync run can't realistically hit the daily cap.
- Office365/Exchange Online numeric IMAP throttling budgets exist (per-tenant EWS/IMAP
  throttling policies) but weren't independently confirmed — worth checking against a real
  tenant once a carrier's first Microsoft 365 OAuth2 connection goes live.

## Sandbox

No formal sandbox needed — any real Gmail account with 2FA + an app password (or a free
Workspace trial) is a fully working test target, which is presumably how this adapter's
Phase 6 author validated it originally.

## Pricing

Free either way: Gmail personal/Workspace accounts and Microsoft 365 mailboxes the carrier
already pays for — this integration needs no new vendor spend, just the app-password setup
step (Gmail) or an Entra ID / Google Cloud OAuth app registration (Microsoft 365 / Workspace).

## What this scout could and couldn't verify

- **Confirmed from source**: exact credential fields, basic-auth-only `ImapFlow` config,
  15 MB attachment cap, 25-message-per-run cap, `docs-mailbox` cron wiring.
- **Confirmed from public search**: Exchange Online IMAP basic-auth retirement date (Oct 1,
  2022, Microsoft Learn/community-blog consensus — the Microsoft Learn deprecation page itself
  returned HTTP 403 to this scout's fetch, same Cloudflare-style block noted in `terminal.md`,
  so this is cross-referenced from secondary sources, not Microsoft's page directly), Gmail's
  2,500/500 MB daily IMAP bandwidth caps, 15-connection cap, May 2025 OAuth2 enforcement date
  and app-password carve-out, January 2025 IMAP-always-on change.
- **Not independently verified**: current Microsoft 365 IMAP-specific throttling numbers (moot
  per the auth blocker above), and whether any newer Exchange Online tenant setting has quietly
  reopened a basic-auth path since the 2022 retirement — treat the "Office 365 broken" finding
  above as high-confidence but re-check before building the OAuth2 fix, since exact tenant
  policy exceptions can vary.

Sources: [Deprecation of Basic authentication in Exchange Online — Microsoft Learn](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) (fetch blocked, cited via secondary coverage), [Gmail Help — Sign in with app passwords](https://support.google.com/mail/answer/185833), [Google Workspace Admin Help — Gmail bandwidth limits](https://support.google.com/a/answer/1071518), [Transition from less secure apps to OAuth — Google Workspace Help](https://knowledge.workspace.google.com/admin/sync/transition-from-less-secure-apps-to-oauth), [Gmail API Limits in 2026 — Unipile](https://www.unipile.com/gmail-api-limits/).

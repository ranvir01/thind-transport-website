# Docs mailbox (IMAP) — scouting notes

Researched: 2026-07-06. Status: **built adapter, live** in `src/lib/hub/mailbox.ts`
(`pollDocsMailbox`), wired to the `docs-mailbox` cron job. Not a vendor SDK — it's a generic
IMAP client (`imapflow` + `mailparser`) pointed at whatever inbox the carrier's office already
uses. This doc covers the two mailbox providers row 2 of `creds-shopping-list.md` names
(Gmail, Office365) since "auth model" here means "what the mailbox provider allows for
IMAP login," not a single company's API.

## Auth model (as implemented, confirmed against our code)

Updated 2026-07-11: OAuth2/XOAUTH2 shipped in `src/lib/hub/mailbox-oauth.ts` — the ⚠️ finding
below is resolved. Three auth paths, selected by which credential fields are filled in
(`mailboxAuthMethod`; OAuth fields win over a stale password):

- **Gmail app password** (unchanged): `user` + `password` → `auth: { user, pass }`.
- **Microsoft 365** (Entra ID client-credentials grant): `tenantId` + `clientId` +
  `clientSecret` → token from `login.microsoftonline.com/<tenant>/oauth2/v2.0/token` with
  scope `https://outlook.office365.com/.default`, then `auth: { user, accessToken }`
  (SASL XOAUTH2). Setup: app registration with the **`IMAP.AccessAsApp` application
  permission + admin consent**, then register the service principal in Exchange Online and
  grant it mailbox access (`New-ServicePrincipal` + `Add-MailboxPermission` in Exchange
  Online PowerShell) — Microsoft's "Authenticate an IMAP, POP or SMTP connection using
  OAuth" doc covers the exact steps.
- **Google Workspace** (service-account JWT-bearer grant with domain-wide delegation):
  paste the service account's JSON key file into `serviceAccountKey` → RS256-signed JWT
  (`sub` = the mailbox user, scope `https://mail.google.com/`) exchanged at
  `oauth2.googleapis.com/token`, then `auth: { user, accessToken }`. Setup: create a
  service account (no key restrictions needed beyond the JSON key), then authorize its
  client ID for scope `https://mail.google.com/` under Admin console → Security → API
  controls → Domain-wide delegation.

Tokens are minted per poll (no cache — the cron is hourly, tokens live ~60 min), mirroring
`qbo.ts`'s refresh pattern. `host` may now be left blank: it defaults per auth method
(`outlook.office365.com` / `imap.gmail.com`). `secure: true` is still hardcoded (implicit
TLS on port 993) — no STARTTLS fallback for a provider only offering port 143.

## ~~⚠️ Finding~~ (resolved 2026-07-11): Office 365 / Exchange Online basic auth is retired

- Microsoft **disabled Basic Authentication for IMAP in Exchange Online on October 1, 2022**
  (21Vianet-operated tenants followed in March 2023). A username+password IMAP login — which
  is the only thing our `password` field and `ImapFlow` config support — is rejected outright
  by Microsoft 365 mailboxes now. There is no tenant-side opt-back-in; Microsoft's own guidance
  is "migrate to OAuth2," full stop.
- Microsoft 365 "app passwords" (the MFA-bypass secrets some legacy docs mention) are a
  **different, mostly-retired mechanism** and don't restore IMAP basic auth even where still
  available — they were for legacy Office desktop clients, not a basic-auth IMAP exception.
- Net effect: the credential field label in `page.tsx` (`"IMAP host (e.g. imap.gmail.com)"`)
  already only examples Gmail, but `creds-shopping-list.md` row 2 still says "Gmail/Office365
  app-password settings" as if the two are symmetric. **They are not** — a carrier who points
  this integration at an `outlook.office365.com`/`imap-mail.outlook.com` host with a password
  will get an authentication failure, not a working sync, no matter what password they use.
- ~~**Backlog (urgent):** either (a) correct `creds-shopping-list.md` + the settings-page copy to
  say Gmail-only until OAuth2 is added, or (b) add an XOAUTH2 path to `pollDocsMailbox` (ImapFlow
  supports `auth: { user, accessToken }`) plus an Entra ID app registration + refresh-token
  storage.~~ **Done 2026-07-11** — option (b) shipped (see "Auth model" above); no refresh-token
  storage needed since both grants mint tokens directly from paste-able credentials.

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
  throttling policies) but are moot until the auth blocker above is resolved.

## Sandbox

No formal sandbox needed — any real Gmail account with 2FA + an app password (or a free
Workspace trial) is a fully working test target, which is presumably how this adapter's
Phase 6 author validated it originally.

## Pricing

Free either way: Gmail personal/Workspace accounts and Microsoft 365 mailboxes the carrier
already pays for — this integration needs no new vendor spend, just the app-password setup
step (Gmail) or, longer term, an Entra ID app registration (Office 365, once OAuth2 ships).

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

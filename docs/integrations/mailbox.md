# Docs mailbox (IMAP) — scouting notes

Researched: 2026-07-06; refreshed 2026-07-18 (code-drift + provider-policy recheck — see
"2026-07-18 recheck" notes inline). Status: **built adapter, live** in `src/lib/hub/mailbox.ts`
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

Tokens are minted per poll (no cache), mirroring `qbo.ts`'s refresh pattern. **Cadence
correction (2026-07-18):** the `docs-mailbox` cron runs **once a day at 12:30 UTC**
(`vercel.json`), not hourly — the "hourly" cadence this doc and the `mailbox-oauth.ts`
header comment describe predates the Hobby-plan daily-only cron fix (`hobby-cron-guard`).
The per-poll token mint is even more clearly correct at daily cadence (tokens live ~60 min).
Staff-facing consequence: forwarded paperwork auto-files once a day (~5:30 AM Pacific);
the card's **Sync now** button on `/hub/settings/integrations` is the on-demand path.
`host` may now be left blank: it defaults per auth method (`outlook.office365.com` /
`imap.gmail.com`). `secure: true` is still hardcoded (implicit TLS on port 993) — no
STARTTLS fallback for a provider only offering port 143.

**2026-07-18 recheck, Microsoft side:** no adapter impact found. April 2026 completes
Microsoft's basic-auth retirement in Exchange Online (the last holdout, SMTP AUTH client
submission — we don't send, so moot); the `IMAP.AccessAsApp` client-credentials flow this
adapter uses remains the documented, current path (corroborated via Limilabs/community
writeups; the Microsoft Learn page itself still 403s this scout's fetches).

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
  *(2026-07-18: both since corrected — the registry password field is now labeled "App
  password (Gmail only — M365/Workspace use OAuth2 below)" and shopping-list row 2 names the
  OAuth2 setup paths.)*
- ~~**Backlog (urgent):** either (a) correct `creds-shopping-list.md` + the settings-page copy to
  say Gmail-only until OAuth2 is added, or (b) add an XOAUTH2 path to `pollDocsMailbox` (ImapFlow
  supports `auth: { user, accessToken }`) plus an Entra ID app registration + refresh-token
  storage.~~ **Done 2026-07-11** — option (b) shipped (see "Auth model" above); no refresh-token
  storage needed since both grants mint tokens directly from paste-able credentials.

## Gmail-side auth (confirmed working — consumer accounts; Workspace nuance below)

- **Consumer `@gmail.com`** (2026-07-18 recheck: still current): 2-Step Verification on the
  account, then an **App Password** (16-character generated secret, Google Account →
  Security → App passwords) goes in our `password` field — real basic auth over IMAP that
  Google still honors for app passwords specifically. Multiple 2026 setup guides confirm
  app passwords remain the supported IMAP path for personal Gmail.
- **Google Workspace accounts — password path now contested (new 2026-07-18 finding):**
  Google's less-secure-apps retirement finished rolling out to Workspace **May 1, 2025**
  (OAuth enforcement for CalDAV/CardDAV/IMAP/POP/SMTP began March 14, 2025). Google's own
  wind-down announcement carved out app passwords as the exception, but several 2025–26
  migration guides report that Workspace accounts now reject IMAP logins with app passwords
  too, and Google's canonical help pages (`support.google.com/a/answer/14114704`,
  `knowledge.workspace.google.com`) return HTTP 403 to this scout, so the carve-out can't be
  confirmed from source. **Treat Workspace app passwords as unreliable** — the shipped
  `serviceAccountKey` OAuth2 path is the dependable Workspace route, and the settings-page
  label already steers there ("App password (Gmail only — M365/Workspace use OAuth2 below)").
- IMAP is on by default for every Google account since January 2025 (the old admin on/off
  toggle is gone), so there's no "enable IMAP first" step to document anymore.
- Google Workspace admins can still block IMAP org-wide via Admin Console → Apps → Google
  Workspace → Gmail → some organizational units — worth a one-line callout in onboarding docs
  if a carrier's Workspace admin has it off.
- Unrelated to us but adjacent: Gmail's January 2026 retirement of Gmailify/POP3-fetching
  covers Gmail *pulling from* external mailboxes — it does not affect third-party IMAP
  clients polling Gmail, which is what this adapter does.

## Rate limits

- **Connections:** Gmail allows up to **15 simultaneous IMAP connections** per account. Our
  cron does one connect-poll-disconnect cycle per carrier per run, well under that.
- **Bandwidth:** Gmail throttles at roughly **2,500 MB/day IMAP download, 500 MB/day upload**
  per account; exceeding it triggers temporary throttling, not a hard ban. Attachment size is
  already capped at 15 MB per file in `pollDocsMailbox` and only the first 25 unseen messages
  are processed per run, so a single sync run can't realistically hit the daily cap.
- Office365/Exchange Online numeric IMAP throttling budgets exist (per-tenant EWS/IMAP
  throttling policies); they apply now that XOAUTH2 shipped, but exact numbers remain
  unpublished — at one connect-poll-disconnect per carrier per **day**, we're nowhere near
  any plausible budget.

## Sandbox

No formal sandbox needed — any real Gmail account with 2FA + an app password (or a free
Workspace trial) is a fully working test target, which is presumably how this adapter's
Phase 6 author validated it originally.

## Pricing

Free either way: Gmail personal/Workspace accounts and Microsoft 365 mailboxes the carrier
already pays for — this integration needs no new vendor spend, just the app-password setup
step (Gmail) or, longer term, an Entra ID app registration (Office 365, once OAuth2 ships).

## What this scout could and couldn't verify

- **Confirmed from source (2026-07-18 re-verify)**: exact credential fields (all three auth
  paths in `mailbox-oauth.ts` match the "Auth model" section above: selection order
  m365 → google → password, token endpoints, scopes, JWT `sub` claim, per-poll minting),
  15 MB attachment cap, 25-message-per-run cap, `docs-mailbox` cron wiring — now **daily
  12:30 UTC** per `vercel.json`, not hourly as previously written.
- **Confirmed from public search**: Exchange Online IMAP basic-auth retirement date (Oct 1,
  2022, Microsoft Learn/community-blog consensus — the Microsoft Learn deprecation page itself
  returned HTTP 403 to this scout's fetch, same Cloudflare-style block noted in `terminal.md`,
  so this is cross-referenced from secondary sources, not Microsoft's page directly), Gmail's
  2,500/500 MB daily IMAP bandwidth caps, 15-connection cap, May 2025 OAuth2 enforcement date
  and app-password carve-out, January 2025 IMAP-always-on change.
- **Not independently verified**: current Microsoft 365 IMAP-specific throttling numbers
  (unpublished; low risk at daily cadence), and — new 2026-07-18 — whether Google Workspace's
  app-password carve-out survived the May 2025 less-secure-apps shutoff (conflicting
  secondary sources, primary pages 403-blocked; doesn't matter operationally since the
  Workspace OAuth2 path shipped and the UI steers Workspace users to it).

Sources: [Deprecation of Basic authentication in Exchange Online — Microsoft Learn](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) (fetch blocked, cited via secondary coverage), [Gmail Help — Sign in with app passwords](https://support.google.com/mail/answer/185833), [Google Workspace Admin Help — Gmail bandwidth limits](https://support.google.com/a/answer/1071518), [Transition from less secure apps to OAuth — Google Workspace Help](https://knowledge.workspace.google.com/admin/sync/transition-from-less-secure-apps-to-oauth), [Gmail API Limits in 2026 — Unipile](https://www.unipile.com/gmail-api-limits/).

2026-07-18 recheck sources: [Winding down Google Sync and Less Secure Apps support — Google Workspace Updates](https://workspaceupdates.googleblog.com/2023/09/winding-down-google-sync-and-less-secure-apps-support.html) (403 to this scout; app-password exception quoted via secondary coverage), [Transition from less secure apps to OAuth — Google Workspace Admin Help](https://support.google.com/a/answer/14114704) (403), [How to Create a Gmail App Password in 2026 — MailJerry](https://www.mailjerry.com/create-gmail-app-password), [Gmail OAuth changes 2026 — Mailbird](https://www.getmailbird.com/gmail-oauth-authentication-changes-user-guide/), [Microsoft modern-auth enforcement 2026 — Mailbird](https://www.getmailbird.com/microsoft-modern-authentication-enforcement-email-guide/), [OAuth2 client-credential flow with Office365 IMAP — Limilabs](https://www.limilabs.com/blog/oauth2-client-credential-flow-office365-exchange-imap-pop3-smtp), [Authenticate an IMAP, POP or SMTP connection using OAuth — Microsoft Learn](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth) (403).

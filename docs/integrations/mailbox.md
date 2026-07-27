# Docs mailbox (IMAP) — scouting notes

Researched: 2026-07-06; refreshed 2026-07-18 (code-drift + provider-policy recheck), 2026-07-22
(Workspace app-password carve-out resolved), 2026-07-27 (SMTP AUTH timeline converged, IMAP
throttling knob named — see "2026-07-27 pass" notes inline). Status:
**built adapter, live** in `src/lib/hub/mailbox.ts`
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

**2026-07-27 recheck, Microsoft side (resolves the 2026-07-22 "dates still in flux" note):**
found the primary source behind the Windows Forum coverage this doc already cited — a
Microsoft Community Hub post titled "Updated Exchange Online SMTP AUTH Basic Authentication
Deprecation Timeline," which a search-result summary dates to a Jan 27, 2026 revision. That
explains the 2026-07-22 doc's two-different-dates conflict: **March–April 2026 was the
original plan**; Microsoft pushed it back and the **Dec 2026 / H2 2027 figures are the
current, revised timeline** (unchanged through Dec 2026 → **disabled by default for existing
tenants at end of Dec 2026**, admins can still re-enable → new tenants created after Dec 2026
get it unavailable by default → final removal date to be announced in H2 2027). Still scoped
to **SMTP AUTH client submission only** (send path) — this adapter is IMAP-read-only and
never sends, so the retirement stays moot for `pollDocsMailbox` regardless of the exact date.
`techcommunity.microsoft.com` and `learn.microsoft.com` both 403 this scout directly, same
as every pass — the Jan 27, 2026 revision date and full timeline are read from the search
result's synthesis of the Community Hub post, not fetched from Microsoft's page itself.

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
- **Google Workspace accounts — password path (2026-07-22 update, carve-out now confirmed):**
  Google's less-secure-apps retirement finished rolling out to Workspace **May 1, 2025**
  (OAuth enforcement for CalDAV/CardDAV/IMAP/POP/SMTP began March 14, 2025) — that shutoff
  was scoped to **raw username+password**, not app passwords. This pass found five
  independent 2026-dated how-to sources (InfoSwitch, LeadsMonky, XpectoIT, Systron, plus the
  Domain India KB) converging on the same claim: **app passwords for Workspace IMAP still
  work in 2026**, same mechanism as consumer Gmail — 2-Step Verification, then a generated
  16-character secret. That resolves the 2026-07-18 "contested/unconfirmed" finding. One new
  wrinkle: whether it works for a given mailbox now depends on a **Workspace-admin-controlled
  toggle** — Admin console → Security → Authentication → 2-Step Verification →
  *"Allow users to generate app passwords"* — that can be turned off org-wide independent of
  the IMAP-access toggle already documented below. A carrier whose Workspace admin has that
  setting off gets an app-password failure that looks identical to the pre-2025-carve-out
  failure; the shipped `serviceAccountKey` OAuth2 path is unaffected by this toggle either
  way, so it remains the more robust default recommendation, but "unreliable" was the wrong
  word — downgrading this from a real gap to a documented admin-config caveat. Every primary
  Google page on this topic (`support.google.com/a/answer/14114704`,
  `knowledge.workspace.google.com/...`) still 403s this scout — search-excerpt confirmation
  only, same wall as every pass since 2026-07-18.
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
- **2026-07-27 refinement:** the specific knob is named — Exchange throttling policies
  expose an `ImapMaxConcurrency` parameter (`Set-ThrottlingPolicy` / `Set-CASMailbox` in
  Exchange Online PowerShell, valid range 0–2147483647) that caps simultaneous IMAP
  connections per mailbox. The tenant-default numeric value for Exchange Online specifically
  is still not published anywhere this scout could reach (on-prem Exchange docs and forum
  threads cite defaults in the single digits, e.g. ~8, for older Exchange Server versions,
  which is suggestive but not confirmed as the EXO default) — same "unpublished number, named
  mechanism" shape as the rest of this doc's open items. Irrelevant at our cadence either way:
  one connection per carrier per day is nowhere near a single-digit concurrency cap.

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
- **Not independently verified**: the Exchange Online tenant-default numeric value for
  `ImapMaxConcurrency` (the parameter name is now confirmed via `Set-ThrottlingPolicy` /
  `Set-CASMailbox` PowerShell docs, but its EXO default isn't published; low risk at daily
  cadence), and the exact admin-console path/label for the Workspace app-password toggle
  (secondary sources agree on "Security → Authentication → 2-Step Verification → Allow users
  to generate app passwords" but Google's own admin-help pages and the community thread that
  names it are all 403-walled to this scout, so the label isn't source-confirmed).
- **Flagged, not acted on (2026-07-27)**: two same-domain (getmailbird.com) articles'
  AI-search-synthesized summaries stated Google Workspace "does not allow IMAP access via
  app password anymore" since May 2025 — squarely contradicting this doc's 2026-07-22
  five-source finding that app passwords still work, gated by an admin toggle. Direct fetch
  of both getmailbird pages 403'd, so the claim couldn't be read in full context (a
  search-synthesis paraphrase of "less secure apps disabled" easily blurs into "app
  passwords disabled" without a careful read). Weighed against six independent 2026-dated
  sources (five from 2026-07-22 plus a 2026-07-27 reco.ai/googally recheck) all agreeing app
  passwords still work: treating the getmailbird claim as unconfirmed/likely-imprecise
  rather than acting on it, but leaving it here since it directly contradicts the doc's
  current recommendation and deserves a second look if it resurfaces from an independently
  fetchable source.
- **Resolved this pass (2026-07-27)**: the Exchange Online SMTP AUTH Basic Authentication
  retirement timeline, previously "dates still inconsistent across sources," now converges
  on a single Microsoft-published schedule (unchanged through Dec 2026 → disabled by default
  for existing tenants end of Dec 2026, admin-re-enable still possible → new tenants after
  Dec 2026 default to unavailable → final removal date announced H2 2027). No adapter impact
  either way — SMTP AUTH is the send path, this adapter only reads via IMAP.
- **Resolved this pass (2026-07-22)**: whether Google Workspace's app-password carve-out
  survived the May 2025 less-secure-apps shutoff — five independent 2026-dated secondary
  sources now agree it did (app passwords still work for Workspace IMAP, gated by a
  separate admin toggle, not by the 2025 shutoff itself). SMTP AUTH basic-auth retirement
  timelines for Exchange Online are still in flux across sources (phased March–April 2026 per
  one source, "disabled by default late 2026 / removed H2 2027" per another) but remain
  scoped to **SMTP AUTH only** — this adapter only reads via IMAP and never sends, so the
  exact date is not adapter-relevant, same conclusion as every prior pass. Gmail's 2,500 MB
  download / 500 MB upload daily IMAP bandwidth caps reconfirmed unchanged.

Sources: [Deprecation of Basic authentication in Exchange Online — Microsoft Learn](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/deprecation-of-basic-authentication-exchange-online) (fetch blocked, cited via secondary coverage), [Gmail Help — Sign in with app passwords](https://support.google.com/mail/answer/185833), [Google Workspace Admin Help — Gmail bandwidth limits](https://support.google.com/a/answer/1071518), [Transition from less secure apps to OAuth — Google Workspace Help](https://knowledge.workspace.google.com/admin/sync/transition-from-less-secure-apps-to-oauth), [Gmail API Limits in 2026 — Unipile](https://www.unipile.com/gmail-api-limits/).

2026-07-18 recheck sources: [Winding down Google Sync and Less Secure Apps support — Google Workspace Updates](https://workspaceupdates.googleblog.com/2023/09/winding-down-google-sync-and-less-secure-apps-support.html) (403 to this scout; app-password exception quoted via secondary coverage), [Transition from less secure apps to OAuth — Google Workspace Admin Help](https://support.google.com/a/answer/14114704) (403), [How to Create a Gmail App Password in 2026 — MailJerry](https://www.mailjerry.com/create-gmail-app-password), [Gmail OAuth changes 2026 — Mailbird](https://www.getmailbird.com/gmail-oauth-authentication-changes-user-guide/), [Microsoft modern-auth enforcement 2026 — Mailbird](https://www.getmailbird.com/microsoft-modern-authentication-enforcement-email-guide/), [OAuth2 client-credential flow with Office365 IMAP — Limilabs](https://www.limilabs.com/blog/oauth2-client-credential-flow-office365-exchange-imap-pop3-smtp), [Authenticate an IMAP, POP or SMTP connection using OAuth — Microsoft Learn](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth) (403).

2026-07-22 pass sources (all Google/Microsoft primary pages 403 to this scout — search-excerpt
confirmation only): [App Passwords and OAuth 2.0 in Google Workspace — Domain India KB](https://www.domainindia.com/client/knowledgebase/743/How-to-Use-App-Passwords-and-OAuth-2.0-in-Google-Workspace-A-Complete-Setup-Guide.html), [Google Workspace: create an app password to access Gmail over IMAP — InfoSwitch](https://infoswitch.fr/en/blog/google-workspace-app-password-imap), [Google Workspace IMAP Settings 2026 — LeadsMonky](https://leadsmonky.com/google-workspace-imap-settings/), [Setting Up Google Workspace for Third-Party Email Clients Using App Passwords — XpectoIT](https://www.xpectoitsolutions.com/setting-up-google-workspace-for-thirdparty-email-clients-using-app-passwords), [How to Generate App Passwords for Google Workspace — Systron Micronix](https://orders.systron.net/knowledgebase/148/How-to-Generate-App-Passwords-for-Google-Workspace.html), [Exchange Online SMTP AUTH Basic Authentication: 2026 Default Disable and 2027 Removal Timeline — Windows Forum](https://windowsforum.com/threads/exchange-online-smtp-auth-basic-authentication-2026-default-disable-and-2027-removal-timeline.399158/), [End of Basic Authentication for SMTP in Exchange Online — itpro-tips](https://itpro-tips.com/end-of-life-basic-authentication-smtp-exchange-online/) (fetch 403'd, cited via search excerpt).

2026-07-27 pass sources (Microsoft/Google primary pages and the Google Workspace admin
community thread all 403'd this scout again — search-result-synthesis confirmation only):
[Updated Exchange Online SMTP AUTH Basic Authentication Deprecation Timeline — Microsoft
Community Hub](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835)
(403, cited via search synthesis), [Exchange Online limits — Service Descriptions, Microsoft
Learn](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
(403), [Set-ThrottlingPolicy (ExchangePowerShell) — Microsoft
Learn](https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/set-throttlingpolicy?view=exchange-ps)
(403, `ImapMaxConcurrency` parameter name/range from search snippet), [Can't add app
passwords option for users from admin console — Google Workspace Admin
Community](https://support.google.com/a/thread/341275089/can-t-add-app-passwords-option-for-users-from-admin-console?hl=en)
(403), [Gmail OAuth 2.0 Authentication Changes 2026 —
Mailbird](https://www.getmailbird.com/gmail-oauth-authentication-changes-user-guide/) (403;
flagged as an unconfirmed contradicting claim, see "What this scout could and couldn't
verify" above), [How to Set Up IMAP in Google Workspace — Reco](https://www.reco.ai/hub/google-workspace-imap-settings-email-access), [Google Workspace GMAIL IMAP Settings — Googally](https://www.googally.com/blog/google-workspace-gmail-imap-settings).

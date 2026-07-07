# Docs mailbox (IMAP) — inbound rate-con/POD auto-filing

Researched: 2026-07-07. Status: **built, live** — `pollDocsMailbox` in `src/lib/hub/mailbox.ts`,
wired to the daily `docs-mailbox` cron (`vercel.json`, `30 12 * * *`) and registered as
`status: "live"` in `src/lib/hub/integrations/registry.ts`. No manual "sync now" — poll-only
(`page.tsx` comment, `MANUAL_SYNC_PROVIDERS`). This doc did not exist before this cycle
(`scout-rotation.md` listed it "missing — never researched") despite the adapter being shipped
code, which per the rotation rule (a built adapter is production-impacting) made it higher
priority than any of the still-stub fuel/load-board providers.

## What it does today (confirmed from source)

`pollDocsMailbox(carrierId)`:
1. Loads `host`/`user`/`password`/`port`/`folder` via `getCredentials(carrierId, "mailbox")`;
   returns `{connected: false}` if unset (CSV/manual-upload fallback stays the product).
2. Opens an `ImapFlow` connection (`imapflow@^1.4.0`) with `secure: true` (implicit TLS) on the
   given port (default 993), `auth: { user, pass }` — **plain IMAP `LOGIN`, not OAuth**.
3. Searches the target folder (default `INBOX`) for up to 25 unseen messages, parses each with
   `mailparser@^3.9.9`, extracts a load reference (`THD-1042`-style token) from the subject via
   `extractReference()`, and attaches matching PDFs/images (capped at 15 MB each) to that load
   as a `rate_confirmation` document.
4. Unmatched mail (no reference, or reference doesn't resolve to a load) triggers an
   owner/dispatcher notification rather than being silently dropped — mail is always marked
   `\Seen` either way so it isn't reprocessed.
5. Every run writes a `hub.integration_syncs` row (`source = 'mailbox'`, `counts: {filed, unmatched}`).

## Auth model — **this is the finding that matters**

The credentials form (`registry.ts` fields: `host`, `port`, `user`, `password`, `folder`) and the
shopping-list copy ("use an existing mailbox + app password") both assume a plain
username+app-password IMAP login works against any mailbox host. **That assumption is no longer
true for the two providers a 15-truck carrier is actually likely to use for a company mailbox:**

- **Microsoft 365 / Exchange Online**: Basic authentication for IMAP (and POP, EAS, EWS) was
  disabled tenant-wide years ago — Microsoft's own migration timeline states EAS/POP/IMAP/EWS/
  Remote PowerShell were all moved to Modern Auth-only by the end of 2022, and only SMTP AUTH
  Client Submission still has a basic-auth allowance (now scheduled to go disabled-by-default at
  the end of December 2026). **An Exchange Online mailbox cannot authenticate via plain
  `user`/`password` IMAP LOGIN today** — full stop, no app-password escape hatch exists for IMAP
  specifically (app passwords are an MFA convenience for other legacy protocols, not a bypass of
  the IMAP Basic Auth retirement). OAuth 2.0 (XOAUTH2) is required.
- **Google Workspace** (paid business Gmail — the likely host for `docs@<carrier>.com`, as
  opposed to a personal `@gmail.com`): Google's admin documentation on the "less secure apps to
  OAuth" transition states Workspace accounts can no longer sign in to third-party apps with
  username/password (including app passwords) as of the account's LSA-retirement date in 2025 —
  OAuth is required org-wide. **Personal, non-Workspace `@gmail.com` accounts with 2-Step
  Verification can still generate an IMAP app password and log in with it** (that mechanism is
  unaffected — it's a distinct code path from the deprecated "less secure apps" toggle), so the
  adapter still works for a carrier using a personal Gmail inbox as their docs mailbox, just not
  a Workspace one.

Net effect: **the adapter works today only against a personal (non-Workspace) Gmail inbox, or any
smaller IMAP host that still allows plain LOGIN** (many non-Microsoft/non-Google business
webmail/cPanel-style IMAP hosts still do). It does **not** work against Microsoft 365 or Google
Workspace mailboxes — which is what "Gmail/Office365 app-password settings" in
`creds-shopping-list.md` currently implies will work, and won't for most real carrier setups.

**Backlog (urgent):** `mailbox.ts`/`registry.ts` need an OAuth2/XOAUTH2 path before this adapter
is usable by a carrier on Microsoft 365 or Google Workspace (the two most common business-mailbox
hosts). `ImapFlow` already supports `auth: { user, accessToken }` for XOAUTH2 as a drop-in
alternative to `auth: { user, pass }`, so the client library is not the blocker — token
acquisition (Microsoft Entra ID app registration + `IMAP.AccessAsUser.All` scope, or a Google
Cloud OAuth client + `https://mail.google.com/` scope) and refresh-token storage/rotation (same
pattern as `qbo.ts`'s persisted refresh token) are the actual work. Until that ships, the
integrations lane should update `creds-shopping-list.md`'s mailbox row and the settings-page copy
to say "personal Gmail (non-Workspace) or any IMAP host allowing password login" instead of
implying Gmail/Office365 business mail both work as-is — flagging that copy fix here rather than
making it myself since `page.tsx`/`creds-shopping-list.md` product-facing copy is outside this
docs-only research pass.

## Rate limits

- **Gmail** (personal): ~15 simultaneous IMAP connections per account; Workspace-tier bandwidth
  caps (2,500 MB/day download, 500 MB/day upload) apply to Workspace tenants but are moot until
  the OAuth gap above is closed. Our adapter opens one connection per cron run, fetches at most
  25 messages, then disconnects — nowhere near either limit.
- **Exchange Online**: N/A today — Basic Auth IMAP is rejected outright regardless of rate.
- No throttling/backoff logic exists in `pollDocsMailbox` today; not a practical concern at
  current volume (one connection, once a day, 25-message cap) but note for later if the cron
  cadence increases.

## Sandbox

No dedicated sandbox needed or used — the adapter talks to a real IMAP mailbox. Testing today is
via `mailbox.test.ts` (unit tests around `extractReference`) and any local IMAP test account the
developer configures by hand; no test double/mailserver has been wired into CI.

## Pricing

Free — "use an existing mailbox + app password" per the shopping list. No vendor cost, only the
carrier's existing email hosting. The only cost implication of the OAuth backlog item above is
engineering time, not a new vendor fee.

## What this scout could and couldn't verify

- **Confirmed from source**: exact fields, poll logic, 25-message/15 MB caps, notification
  fallback, cron schedule, `imapflow`/`mailparser` versions in `package.json`.
- **Confirmed from public documentation**: Exchange Online Basic Auth (incl. IMAP) retirement
  timeline (Microsoft Learn), Google Workspace less-secure-apps/OAuth transition scope, personal
  Gmail app-password IMAP continuing to function, Gmail connection/bandwidth limits.
- **Not verifiable this cycle**: the exact date a given carrier's specific Workspace tenant lost
  LSA access (Google rolled this out per-account through 2025, not a single hard cutover), and
  whether any smaller webmail providers a carrier might use still allow plain IMAP LOGIN (assumed
  yes for most non-Microsoft/non-Google hosts, not exhaustively checked).

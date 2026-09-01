/**
 * XOAUTH2 token acquisition for the docs mailbox — the fix for the
 * docs/integrations/mailbox.md finding that Microsoft 365 (basic-auth IMAP
 * retired Oct 2022) and Google Workspace (app passwords admin-blockable)
 * mailboxes can't authenticate with a plain password.
 *
 * Both flows are paste-credentials, no browser redirect — same shape as every
 * other adapter in the registry:
 *  - Microsoft 365: Entra ID client-credentials grant (tenant ID + app
 *    registration client ID/secret, admin-consented `IMAP.AccessAsApp`).
 *  - Google Workspace: service-account JWT-bearer grant with domain-wide
 *    delegation (paste the service account's JSON key; the mailbox user goes
 *    in the JWT `sub` claim).
 *
 * Tokens are minted per poll, mirroring qbo.ts's no-caching refresh pattern —
 * the docs-mailbox cron runs hourly and tokens live ~60 minutes, so a cache
 * would essentially never hit. The Gmail app-password path stays untouched
 * (fallback never removed).
 */
import { createSign } from "crypto"

/** Resolved IMAP auth, ready for ImapFlow ({ user, pass } or { user, accessToken }). */
export type MailboxAuth =
  | { method: "password"; user: string; pass: string }
  | { method: "m365" | "google"; user: string; accessToken: string }

export type MailboxAuthMethod = MailboxAuth["method"]

/**
 * Which auth path the saved credentials select. OAuth fields win over a
 * password when both are present: the only reason to add them is that the
 * provider rejects the password (that's the M365/Workspace situation).
 */
export function mailboxAuthMethod(
  creds: Record<string, string | undefined>
): MailboxAuthMethod | null {
  if (creds.tenantId && creds.clientId && creds.clientSecret) return "m365"
  if (creds.serviceAccountKey) return "google"
  if (creds.password) return "password"
  return null
}

/** Default IMAP host per auth method, used when the host field is left blank. */
export function defaultImapHost(method: MailboxAuthMethod): string {
  return method === "m365" ? "outlook.office365.com" : "imap.gmail.com"
}

async function fetchM365Token(creds: Record<string, string | undefined>): Promise<string> {
  const base = process.env.M365_OAUTH_BASE ?? "https://login.microsoftonline.com"
  const response = await fetch(
    `${base}/${encodeURIComponent(creds.tenantId!)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: creds.clientId!,
        client_secret: creds.clientSecret!,
        scope: "https://outlook.office365.com/.default",
      }).toString(),
    }
  )
  if (!response.ok) {
    // `error` is a stable machine code (e.g. invalid_client) — safe to surface;
    // never echo the secret or the raw body.
    const code = await response
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => undefined)
    throw new Error(`Microsoft 365 token → HTTP ${response.status}${code ? ` (${code})` : ""}`)
  }
  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) throw new Error("Microsoft 365 token response missing access_token")
  return json.access_token
}

const BASE64URL = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

async function fetchGoogleToken(
  creds: Record<string, string | undefined>,
  mailboxUser: string
): Promise<string> {
  let key: { client_email?: string; private_key?: string }
  try {
    key = JSON.parse(creds.serviceAccountKey!)
  } catch {
    throw new Error("Google service account key isn't valid JSON — paste the whole key file")
  }
  if (!key.client_email || !key.private_key) {
    throw new Error("Google service account key is missing client_email or private_key")
  }

  const tokenUrl = process.env.GOOGLE_OAUTH_TOKEN_URL ?? "https://oauth2.googleapis.com/token"
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: key.client_email,
    scope: "https://mail.google.com/",
    aud: tokenUrl,
    sub: mailboxUser, // domain-wide delegation: act as the shared docs mailbox
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${BASE64URL(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${BASE64URL(JSON.stringify(claims))}`
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key)
  const assertion = `${unsigned}.${BASE64URL(signature)}`

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  })
  if (!response.ok) {
    const code = await response
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => undefined)
    throw new Error(`Google Workspace token → HTTP ${response.status}${code ? ` (${code})` : ""}`)
  }
  const json = (await response.json()) as { access_token?: string }
  if (!json.access_token) throw new Error("Google Workspace token response missing access_token")
  return json.access_token
}

/**
 * Turn saved mailbox credentials into ImapFlow-ready auth, minting an OAuth2
 * access token when the credentials select an OAuth path. Returns null when
 * no auth method is configured (the caller reports `connected: false`).
 */
export async function resolveMailboxAuth(
  creds: Record<string, string | undefined>
): Promise<MailboxAuth | null> {
  const user = creds.user
  if (!user) return null
  const method = mailboxAuthMethod(creds)
  if (method === "m365") return { method, user, accessToken: await fetchM365Token(creds) }
  if (method === "google") return { method, user, accessToken: await fetchGoogleToken(creds, user) }
  if (method === "password") return { method, user, pass: creds.password! }
  return null
}

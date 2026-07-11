import { afterEach, describe, expect, it, vi } from "vitest"
import { createVerify, generateKeyPairSync } from "crypto"
import { defaultImapHost, mailboxAuthMethod, resolveMailboxAuth } from "../mailbox-oauth"
import { allowedFields } from "../integrations/registry"

const M365_CREDS = {
  user: "docs@carrier.com",
  tenantId: "tenant-123",
  clientId: "client-abc",
  clientSecret: "shh-secret",
}

function fetchOk(json: Record<string, unknown>, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(json), { status }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("mailboxAuthMethod — which auth path the saved fields select", () => {
  it("all three M365 fields → m365, even when a stale password is also saved", () => {
    expect(mailboxAuthMethod(M365_CREDS)).toBe("m365")
    expect(mailboxAuthMethod({ ...M365_CREDS, password: "old-app-password" })).toBe("m365")
  })

  it("a partial M365 set never selects m365", () => {
    expect(mailboxAuthMethod({ user: "a@b.c", tenantId: "t", clientId: "c" })).toBe(null)
    expect(mailboxAuthMethod({ user: "a@b.c", tenantId: "t", clientId: "c", password: "p" })).toBe("password")
  })

  it("serviceAccountKey → google (over password), password alone → password, nothing → null", () => {
    expect(mailboxAuthMethod({ user: "a@b.c", serviceAccountKey: "{}" })).toBe("google")
    expect(mailboxAuthMethod({ user: "a@b.c", serviceAccountKey: "{}", password: "p" })).toBe("google")
    expect(mailboxAuthMethod({ user: "a@b.c", password: "p" })).toBe("password")
    expect(mailboxAuthMethod({ user: "a@b.c" })).toBe(null)
  })
})

describe("defaultImapHost", () => {
  it("fills the blank host per method", () => {
    expect(defaultImapHost("m365")).toBe("outlook.office365.com")
    expect(defaultImapHost("google")).toBe("imap.gmail.com")
    expect(defaultImapHost("password")).toBe("imap.gmail.com")
  })
})

describe("resolveMailboxAuth — password path", () => {
  it("returns { user, pass } without any network call", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(resolveMailboxAuth({ user: "a@b.c", password: "app-pass" })).resolves.toEqual({
      method: "password",
      user: "a@b.c",
      pass: "app-pass",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns null when no user or no auth method is configured", async () => {
    await expect(resolveMailboxAuth({ password: "p" })).resolves.toBe(null)
    await expect(resolveMailboxAuth({ user: "a@b.c" })).resolves.toBe(null)
  })
})

describe("resolveMailboxAuth — Microsoft 365 client-credentials grant", () => {
  it("posts the client-credentials grant to the tenant token endpoint and returns the access token", async () => {
    const fetchMock = fetchOk({ access_token: "m365-token", expires_in: 3599 })
    vi.stubGlobal("fetch", fetchMock)

    await expect(resolveMailboxAuth(M365_CREDS)).resolves.toEqual({
      method: "m365",
      user: "docs@carrier.com",
      accessToken: "m365-token",
    })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://login.microsoftonline.com/tenant-123/oauth2/v2.0/token")
    const body = new URLSearchParams(String(init.body))
    expect(body.get("grant_type")).toBe("client_credentials")
    expect(body.get("client_id")).toBe("client-abc")
    expect(body.get("client_secret")).toBe("shh-secret")
    expect(body.get("scope")).toBe("https://outlook.office365.com/.default")
  })

  it("surfaces the HTTP status and stable error code on failure — never the secret", async () => {
    vi.stubGlobal("fetch", fetchOk({ error: "invalid_client" }, 401))
    const failure = await resolveMailboxAuth(M365_CREDS).catch((err: Error) => err)
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toContain("HTTP 401")
    expect((failure as Error).message).toContain("invalid_client")
    expect((failure as Error).message).not.toContain("shh-secret")
  })

  it("rejects a 200 response with no access_token instead of connecting with undefined", async () => {
    vi.stubGlobal("fetch", fetchOk({ token_type: "Bearer" }))
    await expect(resolveMailboxAuth(M365_CREDS)).rejects.toThrow(/missing access_token/)
  })
})

describe("resolveMailboxAuth — Google Workspace service-account JWT grant", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const keyJson = JSON.stringify({
    type: "service_account",
    client_email: "docs-bot@project.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  })

  it("sends a validly-signed RS256 assertion impersonating the mailbox user", async () => {
    const fetchMock = fetchOk({ access_token: "google-token" })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      resolveMailboxAuth({ user: "docs@carrier.com", serviceAccountKey: keyJson })
    ).resolves.toEqual({ method: "google", user: "docs@carrier.com", accessToken: "google-token" })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://oauth2.googleapis.com/token")
    const body = new URLSearchParams(String(init.body))
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer")

    const assertion = body.get("assertion")!
    const [headerB64, claimsB64, sigB64] = assertion.split(".")
    expect(JSON.parse(Buffer.from(headerB64, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" })

    const claims = JSON.parse(Buffer.from(claimsB64, "base64url").toString())
    expect(claims.iss).toBe("docs-bot@project.iam.gserviceaccount.com")
    expect(claims.sub).toBe("docs@carrier.com") // domain-wide delegation target
    expect(claims.scope).toBe("https://mail.google.com/")
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token")
    expect(claims.exp - claims.iat).toBe(3600)

    const verified = createVerify("RSA-SHA256")
      .update(`${headerB64}.${claimsB64}`)
      .verify(publicKey, Buffer.from(sigB64, "base64url"))
    expect(verified).toBe(true)
  })

  it("explains an unparseable pasted key instead of throwing a JSON stack", async () => {
    await expect(
      resolveMailboxAuth({ user: "a@b.c", serviceAccountKey: "-----BEGIN PRIVATE KEY-----" })
    ).rejects.toThrow(/isn't valid JSON/)
  })

  it("rejects a key file missing client_email or private_key", async () => {
    await expect(
      resolveMailboxAuth({ user: "a@b.c", serviceAccountKey: JSON.stringify({ type: "service_account" }) })
    ).rejects.toThrow(/missing client_email or private_key/)
  })

  it("surfaces token-endpoint failures with the stable error code", async () => {
    vi.stubGlobal("fetch", fetchOk({ error: "unauthorized_client" }, 400))
    await expect(
      resolveMailboxAuth({ user: "a@b.c", serviceAccountKey: keyJson })
    ).rejects.toThrow(/HTTP 400 \(unauthorized_client\)/)
  })
})

describe("registry wiring", () => {
  it("the credentials allowlist accepts every OAuth2 field the form now renders", () => {
    const fields = allowedFields("mailbox")
    for (const key of ["user", "password", "tenantId", "clientId", "clientSecret", "serviceAccountKey", "host", "port", "folder"]) {
      expect(fields, key).toContain(key)
    }
  })
})

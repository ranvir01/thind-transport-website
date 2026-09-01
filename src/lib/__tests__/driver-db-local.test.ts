import { describe, expect, it } from "vitest"
import { isLocalPostgresUrl } from "../driver-db-local"

describe("isLocalPostgresUrl", () => {
  it("matches localhost and 127.0.0.1 TCP URLs", () => {
    expect(isLocalPostgresUrl("postgres://hub:hub@localhost:5432/hauldesk")).toBe(true)
    expect(isLocalPostgresUrl("postgresql://u:p@127.0.0.1/db")).toBe(true)
  })

  it("rejects Vercel/Neon pooled URLs and empty values", () => {
    expect(isLocalPostgresUrl("postgres://user:pw@ep-abc-pooler.us-east-1.aws.neon.tech/verceldb")).toBe(false)
    expect(isLocalPostgresUrl("")).toBe(false)
    expect(isLocalPostgresUrl(undefined)).toBe(false)
  })
})

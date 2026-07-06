import { describe, expect, it } from "vitest"
import { buildQuery, isLocalPostgresUrl } from "../driver-db-local"

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

describe("buildQuery", () => {
  it("numbers placeholders in template order", () => {
    const email = "a@b.com"
    const id = "driver_1"
    const q = buildQuery(
      ["SELECT * FROM drivers WHERE email = ", " AND id = ", ""],
      [email, id]
    )
    expect(q.text).toBe("SELECT * FROM drivers WHERE email = $1 AND id = $2")
    expect(q.values).toEqual([email, id])
  })

  it("passes through queries with no interpolations", () => {
    const q = buildQuery(["SELECT 1"], [])
    expect(q.text).toBe("SELECT 1")
    expect(q.values).toEqual([])
  })

  it("handles adjacent placeholders and trailing text", () => {
    const q = buildQuery(["INSERT INTO t VALUES (", ", ", ")"], [1, 2])
    expect(q.text).toBe("INSERT INTO t VALUES ($1, $2)")
    expect(q.values).toEqual([1, 2])
  })
})

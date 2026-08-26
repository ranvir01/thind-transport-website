import { describe, expect, it } from "vitest"
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadEnvLocal, unquoteEnvValue } from "../../../scripts/env-local.mjs"

const SCRIPTS_DIR = path.join(process.cwd(), "scripts")

describe("unquoteEnvValue", () => {
  it("strips the double quotes the setup docs tell you to write", () => {
    // docs/getting-started.md and the docker-compose.yml header both document
    // exactly this line; the old loaders kept the quotes and pg then failed
    // with `getaddrinfo ENOTFOUND base`.
    expect(unquoteEnvValue('"postgresql://hauldesk:hauldesk@localhost:5432/hauldesk"')).toBe(
      "postgresql://hauldesk:hauldesk@localhost:5432/hauldesk"
    )
  })

  it("strips single and backtick quotes too", () => {
    expect(unquoteEnvValue("'secret'")).toBe("secret")
    expect(unquoteEnvValue("`secret`")).toBe("secret")
  })

  it("keeps quotes that are part of the value, not wrapping it", () => {
    expect(unquoteEnvValue('Thind "TT" Transport')).toBe('Thind "TT" Transport')
    expect(unquoteEnvValue('"unterminated')).toBe('"unterminated')
    expect(unquoteEnvValue("'")).toBe("'")
  })

  it("preserves inner characters a password may legitimately contain", () => {
    expect(unquoteEnvValue('"p#ss=w0rd!"')).toBe("p#ss=w0rd!")
    expect(unquoteEnvValue("p#ss=w0rd!")).toBe("p#ss=w0rd!")
  })

  it("drops the trailing \\r a CRLF .env.local leaves on every value", () => {
    expect(unquoteEnvValue("postgresql://localhost/db\r")).toBe("postgresql://localhost/db")
    expect(unquoteEnvValue('"postgresql://localhost/db"\r')).toBe("postgresql://localhost/db")
  })
})

describe("loadEnvLocal", () => {
  function withEnvFile(contents: string) {
    const dir = mkdtempSync(path.join(tmpdir(), "envlocal-"))
    writeFileSync(path.join(dir, ".env.local"), contents)
    return dir
  }

  it("unquotes values as it loads them", () => {
    const cwd = withEnvFile('POSTGRES_URL="postgresql://hauldesk@localhost:5432/hauldesk"\n')
    delete process.env.POSTGRES_URL
    try {
      loadEnvLocal({ cwd })
      expect(process.env.POSTGRES_URL).toBe("postgresql://hauldesk@localhost:5432/hauldesk")
    } finally {
      delete process.env.POSTGRES_URL
    }
  })

  it("never overwrites a value already in the environment", () => {
    const cwd = withEnvFile('SMTP_HOST="from-file"\n')
    process.env.SMTP_HOST = "from-environment"
    try {
      loadEnvLocal({ cwd })
      expect(process.env.SMTP_HOST).toBe("from-environment")
    } finally {
      delete process.env.SMTP_HOST
    }
  })

  it("skips the whole file when skipWhenSet names a variable already set", () => {
    const cwd = withEnvFile('CRON_SECRET="from-file"\n')
    process.env.POSTGRES_URL = "postgresql://elsewhere/db"
    delete process.env.CRON_SECRET
    try {
      loadEnvLocal({ cwd, skipWhenSet: "POSTGRES_URL" })
      expect(process.env.CRON_SECRET).toBeUndefined()
    } finally {
      delete process.env.POSTGRES_URL
    }
  })

  it("treats a missing .env.local as a no-op, not an error", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "envlocal-empty-"))
    expect(() => loadEnvLocal({ cwd })).not.toThrow()
  })
})

describe("no file re-introduces its own .env.local parser", () => {
  // Sixteen copies of this loader existed — six scripts, one more smoke, and
  // eight test files — and every one of them had the same quote bug. Match the
  // parser itself, not prose: several smokes mention .env.local in a comment
  // or an error message without ever reading it.
  const PARSER = "[A-Z0-9_]+)="

  function sourcesUnder(dir: string): string[] {
    const found: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue
        found.push(...sourcesUnder(full))
      } else if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
        found.push(full)
      }
    }
    return found
  }

  it("leaves scripts/env-local.mjs the only KEY=value parser in the repo", () => {
    const offenders = [...sourcesUnder(SCRIPTS_DIR), ...sourcesUnder(path.join(process.cwd(), "src"))]
      .filter((f) => path.basename(f) !== "env-local.mjs" && f !== __filename)
      .filter((f) => readFileSync(f, "utf-8").includes(PARSER))
      .map((f) => path.relative(process.cwd(), f))
    expect(offenders).toEqual([])
  })

  it("keeps every known caller importing the shared loader", () => {
    const callers = [
      "scripts/connections-check.mjs",
      "scripts/e2e-lib.mjs",
      "scripts/e2e-portal-accept-smoke.mjs",
      "scripts/fix-legacy-signatures.mjs",
      "scripts/go-legit.mjs",
      "scripts/go-live-check.mjs",
      "scripts/hub-migrate.mjs",
      "scripts/seed-demo.mjs",
      "scripts/sim/seed.mjs",
      "scripts/dev-mobile.mjs",
      "scripts/verify-sim.mjs",
      "src/lib/hub/__tests__/cross-tenant-harness.test.ts",
      "src/lib/hub/__tests__/driver-file-isolation.test.ts",
      "src/lib/hub/__tests__/portal-isolation.test.ts",
      "src/lib/hub/__tests__/sandbox-shift-money.test.ts",
      "src/lib/hub/__tests__/sandbox-shift-readers.test.ts",
      "src/lib/hub/__tests__/sandbox-sim-concurrency.test.ts",
      "src/lib/hub/__tests__/sandbox-sim-invariants.test.ts",
      "src/lib/hub/__tests__/sandbox-sim-live.test.ts",
      "src/lib/hub/__tests__/simulation-live.test.ts",
    ]
    for (const caller of callers) {
      const src = readFileSync(path.join(process.cwd(), caller), "utf-8")
      expect(src, caller).toContain("env-local.mjs")
    }
  })
})

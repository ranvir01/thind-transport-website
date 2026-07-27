/**
 * src/app/api/hub/cron/[job]/route.ts had zero test coverage — yet it is the
 * delivery path for every poll integration (telematics, docs mailbox, EFS/
 * WEX/Comdata fuel feeds, QBO payments): if a job name drifts between the
 * registry, vercel.json, and the route's dispatch chain, that provider's
 * nightly sync dies silently. Covers the secret gate, unknown-job 404,
 * per-carrier dispatch + hub.integration_syncs health rows (ok and error),
 * carrier isolation on adapter throw, and the three-way drift invariant:
 * every registry cronJob is scheduled in vercel.json AND dispatches in the
 * route; every vercel.json hub cron resolves to a known job (no scheduled
 * 404s).
 */
import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/db", () => ({ query: vi.fn() }))
vi.mock("@/lib/hub/compliance", () => ({ complianceEntries: vi.fn() }))
vi.mock("@/lib/hub/invoices", () => ({ runOverdueReminders: vi.fn() }))
vi.mock("@/lib/hub/detention", () => ({ runDetentionAlerts: vi.fn() }))
vi.mock("@/lib/hub/tasks", () => ({ runTaskAutomations: vi.fn() }))
vi.mock("@/lib/hub/lanes", () => ({ recomputeLanes: vi.fn() }))
vi.mock("@/lib/hub/recruiting", () => ({ computeDriverScores: vi.fn() }))
vi.mock("@/lib/hub/vetting", () => ({ recheckActiveCustomers: vi.fn() }))
vi.mock("@/lib/hub/telematics", () => ({ runTelematicsSync: vi.fn(), runHosViolationAlerts: vi.fn() }))
vi.mock("@/lib/hub/integrations/efs", () => ({ runEfsSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/comdata", () => ({ runComdataSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/wex", () => ({ runWexSync: vi.fn() }))
vi.mock("@/lib/hub/integrations/qbo", () => ({ runQboSync: vi.fn() }))
vi.mock("@/lib/hub/mailbox", () => ({ pollDocsMailbox: vi.fn() }))
vi.mock("@/lib/hub/digest", () => ({ sendOwnerDigest: vi.fn() }))
vi.mock("@/lib/hub/settings", () => ({ getCarrierSettings: vi.fn() }))
vi.mock("@/lib/hub/migrate", () => ({ runMigrations: vi.fn() }))
vi.mock("@/lib/mailer", () => ({ createMailTransport: vi.fn(), mailFrom: vi.fn() }))

import { query } from "@/lib/hub/db"
import { complianceEntries } from "@/lib/hub/compliance"
import { runOverdueReminders } from "@/lib/hub/invoices"
import { runDetentionAlerts } from "@/lib/hub/detention"
import { runTaskAutomations } from "@/lib/hub/tasks"
import { recomputeLanes } from "@/lib/hub/lanes"
import { computeDriverScores } from "@/lib/hub/recruiting"
import { recheckActiveCustomers } from "@/lib/hub/vetting"
import { runTelematicsSync, runHosViolationAlerts } from "@/lib/hub/telematics"
import { runEfsSync } from "@/lib/hub/integrations/efs"
import { runComdataSync } from "@/lib/hub/integrations/comdata"
import { runWexSync } from "@/lib/hub/integrations/wex"
import { runQboSync } from "@/lib/hub/integrations/qbo"
import { pollDocsMailbox } from "@/lib/hub/mailbox"
import { sendOwnerDigest } from "@/lib/hub/digest"
import { getCarrierSettings } from "@/lib/hub/settings"
import { runMigrations } from "@/lib/hub/migrate"
import { PROVIDERS } from "@/lib/hub/integrations/registry"
import { GET } from "@/app/api/hub/cron/[job]/route"

const queryMock = vi.mocked(query)

const CARRIERS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Carrier One" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Carrier Two" },
]
const SUSPENDED_CARRIER = { id: "33333333-3333-3333-3333-333333333333", name: "Suspended Carrier" }
const SECRET = "cron_test_secret"

/** The integration sync jobs this lane owns → the runner each must dispatch to. */
const INTEGRATION_JOBS: Record<string, ReturnType<typeof vi.fn>> = {
  "telematics-sync": vi.mocked(runTelematicsSync),
  "docs-mailbox": vi.mocked(pollDocsMailbox),
  "efs-sync": vi.mocked(runEfsSync),
  "wex-sync": vi.mocked(runWexSync),
  "comdata-sync": vi.mocked(runComdataSync),
  "qbo-sync": vi.mocked(runQboSync),
}

function call(job: string, auth: string | null = `Bearer ${SECRET}`) {
  const headers: Record<string, string> = {}
  if (auth !== null) headers.authorization = auth
  const req = new Request(`http://test/api/hub/cron/${job}`, { headers })
  return GET(req, { params: Promise.resolve({ job }) })
}

function syncLogCalls() {
  return queryMock.mock.calls.filter(([sql]) =>
    String(sql).includes("INSERT INTO hub.integration_syncs")
  )
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET)
  queryMock.mockReset().mockImplementation(async (sql: string) =>
    String(sql).includes("FROM hub.carriers") ? (CARRIERS as never) : ([] as never)
  )
  for (const runner of Object.values(INTEGRATION_JOBS)) {
    runner.mockReset().mockResolvedValue({ inserted: 1, skipped: 0 })
  }
  vi.mocked(runHosViolationAlerts).mockReset().mockResolvedValue({ checked: 0, alerted: 0 })
  vi.mocked(complianceEntries).mockReset().mockResolvedValue([])
  vi.mocked(getCarrierSettings).mockReset().mockResolvedValue({
    notifications: { officeEmail: null },
  } as never)
  vi.mocked(runOverdueReminders).mockReset().mockResolvedValue({ sent: 0 } as never)
  vi.mocked(runDetentionAlerts).mockReset().mockResolvedValue({ alerts: 0 } as never)
  vi.mocked(runTaskAutomations).mockReset().mockResolvedValue({ created: 0 } as never)
  vi.mocked(recomputeLanes).mockReset().mockResolvedValue({ lanes: 0 } as never)
  vi.mocked(computeDriverScores).mockReset().mockResolvedValue({ scored: 0 } as never)
  vi.mocked(recheckActiveCustomers).mockReset().mockResolvedValue({ checked: 0 } as never)
  vi.mocked(sendOwnerDigest).mockReset().mockResolvedValue({ sent: true } as never)
  vi.mocked(runMigrations).mockReset().mockResolvedValue({ applied: [] } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/hub/cron/[job] — secret gate", () => {
  it("401s without the bearer secret and never queries the DB", async () => {
    const res = await call("efs-sync", null)
    expect(res.status).toBe(401)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("401s a wrong secret", async () => {
    const res = await call("efs-sync", "Bearer wrong")
    expect(res.status).toBe(401)
    expect(runEfsSync).not.toHaveBeenCalled()
  })

  it("401s everything when CRON_SECRET is unset — even a matching header", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const res = await call("efs-sync", "Bearer ")
    expect(res.status).toBe(401)
  })

  it("404s an unknown job", async () => {
    const res = await call("not-a-job")
    expect(res.status).toBe(404)
  })
})

describe("GET /api/hub/cron/[job] — integration sync dispatch", () => {
  for (const [job, runner] of Object.entries(INTEGRATION_JOBS)) {
    it(`${job} runs its adapter for every active carrier and logs ok sync rows`, async () => {
      const res = await call(job)
      expect(res.status).toBe(200)
      expect(runner).toHaveBeenCalledTimes(CARRIERS.length)
      for (const carrier of CARRIERS) expect(runner).toHaveBeenCalledWith(carrier.id)
      const logs = syncLogCalls()
      expect(logs).toHaveLength(CARRIERS.length)
      for (const [sql, params] of logs) {
        expect(String(sql)).toContain("TRUE")
        expect(params).toEqual(
          expect.arrayContaining([expect.stringMatching(/^[0-9a-f-]{36}$/), `cron:${job}`])
        )
      }
    })
  }

  it("one carrier's adapter throw logs an error sync row and does not stop the next carrier", async () => {
    vi.mocked(runQboSync)
      .mockRejectedValueOnce(new Error("QBO token expired"))
      .mockResolvedValueOnce({ inserted: 2, skipped: 0 } as never)
    const res = await call("qbo-sync")
    // Fail-loudly contract (Task 5): any carrier failure turns the WHOLE
    // invocation red (500) so the Vercel Cron dashboard shows it — but the
    // remaining carriers still ran first, which is what this test pins.
    expect(res.status).toBe(500)
    expect(runQboSync).toHaveBeenCalledTimes(2)
    const failureLog = syncLogCalls().find(([sql]) => String(sql).includes("FALSE"))
    expect(failureLog?.[1]).toEqual(
      expect.arrayContaining([CARRIERS[0].id, "cron:qbo-sync", "QBO token expired"])
    )
    const body = await res.json()
    expect(body.results[CARRIERS[0].id]).toEqual({ error: "QBO token expired" })
    expect(body.results[CARRIERS[1].id]).toEqual({ inserted: 2, skipped: 0 })
  })
})

describe("GET /api/hub/cron/[job] — suspended tenants are excluded", () => {
  // TenantActions.tsx and _actions/admin.ts both tell the office "crons skip
  // suspended carriers" — this is the one query enforcing that for all 17
  // jobs. The dispatch-loop tests above mock query() to return CARRIERS for
  // any SQL containing "FROM hub.carriers", so they'd stay green even if the
  // WHERE clause were dropped entirely. Pin the clause directly, then prove
  // behaviorally that a suspended carrier's id never reaches an adapter.
  it("scopes the carriers query to active tenants only", async () => {
    await call("efs-sync")
    const carriersQuery = queryMock.mock.calls.find(
      ([sql]) => String(sql).includes("FROM hub.carriers") && !String(sql).includes("INSERT")
    )
    expect(carriersQuery).toBeDefined()
    expect(String(carriersQuery![0])).toMatch(/status\s*=\s*'active'/)
  })

  it("never dispatches a suspended carrier even if the query's WHERE clause regresses", async () => {
    // Stands in for a real Postgres WHERE status = 'active': only filters out
    // the suspended carrier when the route's SQL text still asks it to.
    queryMock.mockReset().mockImplementation(async (sql: string) => {
      if (!String(sql).includes("FROM hub.carriers")) return [] as never
      return (String(sql).includes("status = 'active'")
        ? CARRIERS
        : [...CARRIERS, SUSPENDED_CARRIER]) as never
    })
    const res = await call("efs-sync")
    expect(res.status).toBe(200)
    expect(runEfsSync).toHaveBeenCalledTimes(CARRIERS.length)
    expect(runEfsSync).not.toHaveBeenCalledWith(SUSPENDED_CARRIER.id)
  })
})

describe("registry ↔ vercel.json ↔ route drift", () => {
  const vercelCronPaths: string[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")
  ).crons.map((c: { path: string }) => c.path)

  it("every registry cronJob is scheduled in vercel.json", () => {
    for (const p of PROVIDERS.filter((p) => p.cronJob)) {
      expect(vercelCronPaths, `${p.id} → ${p.cronJob}`).toContain(`/api/hub/cron/${p.cronJob}`)
    }
  })

  it("every registry cronJob dispatches in the route (no silent 404 syncs)", async () => {
    const cronJobs = [...new Set(PROVIDERS.flatMap((p) => (p.cronJob ? [p.cronJob] : [])))]
    for (const job of cronJobs) {
      const res = await call(job)
      expect(res.status, job).toBe(200)
    }
  })

  it("every vercel.json hub cron resolves to a known job (nothing scheduled to 404 daily)", async () => {
    for (const cronPath of vercelCronPaths) {
      const job = cronPath.replace("/api/hub/cron/", "")
      const res = await call(job)
      // 404 is the drift this test exists to catch. A 500 is allowed here:
      // under these mocks a job whose adapter isn't stubbed fails its carrier
      // run, and the route now (correctly) reports that loudly.
      expect(res.status, cronPath).not.toBe(404)
    }
  })
})

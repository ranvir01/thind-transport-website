/**
 * Cross-tenant isolation harness.
 *
 * The premise worth stating plainly, because it is easy to assume otherwise:
 * this repo has NO Postgres row-level security. There is no ENABLE ROW LEVEL
 * SECURITY, no CREATE POLICY, and no SET LOCAL app.carrier_id anywhere in
 * migrations/hub/** or src/**. Isolation between carriers is entirely
 * application-level — every single query must carry its own `carrier_id = $n`,
 * and the database will cheerfully hand another carrier's rows to any query
 * that forgets.
 *
 * That is exactly how the 2026-07-26 leak happened: hub.website_leads has no
 * carrier_id column at all, the operator-only rule lived in one caller, and
 * every other tenant could read Thind's entire driver lead book and mass-close
 * leads by guessing sequential ids.
 *
 * Three guards live here, in increasing cost:
 *
 *  1. SCHEMA CENSUS (no database): the set of hub tables WITHOUT a carrier_id
 *     column is pinned. Adding a carrier-less table becomes a deliberate act
 *     that fails this test until someone writes down its isolation story.
 *
 *  2. STATIC SCAN (no database): every statement touching a hub table that HAS
 *     a carrier_id column must constrain carrier_id. Which tables those are is
 *     derived from the migrations, not hand-listed, so the scan can't drift
 *     from the schema. This is the guard that would have caught the leak.
 *
 *  3. LIVE PROOF (requires POSTGRES_URL): seeds a real second carrier and
 *     calls the actual exported read functions as that carrier, asserting it
 *     cannot see or address carrier A's rows — including by primary key.
 *
 * If real RLS ever lands, all three stay useful: 1 and 2 as defense in depth
 * (and for planner index selection), 3 as the regression proof for the policies.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const HUB_LIB = path.join(ROOT, "src", "lib", "hub")
const MIGRATIONS = path.join(ROOT, "migrations", "hub")

// ---------------------------------------------------------------------------
// Schema facts, derived from the migrations rather than hand-maintained
// ---------------------------------------------------------------------------

/**
 * Walk the migrations in order and return every live hub table mapped to
 * whether it carries a carrier_id column. Honors later ALTER ... ADD COLUMN
 * carrier_id (migration 016 did this to ifta_tax_rates) and DROP TABLE
 * (migration 002 dropped load_status_events), so the census reflects the
 * schema as it actually ends up, not as any single file describes it.
 */
function carrierIdByTable(): Map<string, boolean> {
  const tables = new Map<string, boolean>()
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf-8")
    for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?hub\.([a-z_]+)\s*\(([\s\S]*?)\n\);/gi)) {
      tables.set(m[1].toLowerCase(), /carrier_id/i.test(m[2]))
    }
    for (const m of sql.matchAll(/ALTER TABLE (?:IF EXISTS )?hub\.([a-z_]+)[\s\S]{0,200}?ADD COLUMN (?:IF NOT EXISTS )?carrier_id/gi)) {
      tables.set(m[1].toLowerCase(), true)
    }
    for (const m of sql.matchAll(/DROP TABLE (?:IF EXISTS )?hub\.([a-z_]+)/gi)) {
      tables.delete(m[1].toLowerCase())
    }
  }
  return tables
}

const SCHEMA = carrierIdByTable()

/**
 * Hub tables with no carrier_id column, each with the isolation story that
 * justifies it. This list is pinned: a new carrier-less table fails the census
 * test until it is added here with a reason, which is the whole point — the
 * 2026-07-26 leak was a carrier-less table nobody had thought about.
 */
const CARRIERLESS_TABLES: Record<string, string> = {
  carriers: "the tenant table itself — its `id` IS the carrier scope",
  auth_attempts: "login/signup throttle keys, deliberately global (pre-auth, no tenant known)",
  geocode_cache: "address→lat/lng cache of public data, shared by design",
  website_leads: "the site operator's own inbox; guarded by OPERATOR_CARRIER_ID in website-leads.ts after the 2026-07-26 leak",
  announcement_acks: "join row (announcement_id, user_id); scoped through hub.announcements",
  message_reads: "read cursor (thread_id, user_id); scoped through hub.message_threads",
  settlement_lines: "line items scoped through their parent hub.settlements row",
}

/**
 * Statements that read a carrier-scoped table without a carrier_id predicate
 * ON PURPOSE. Every entry is an authentication or invitation path that runs
 * before a tenant is known, so requiring a carrier here would be incoherent.
 * Keyed by a distinctive fragment of the statement.
 *
 * Keep this list short and boring. Anything added here is a query that can
 * see across every tenant in the system.
 */
const CROSS_CARRIER_BY_DESIGN: { fragment: string; why: string }[] = [
  {
    fragment: "SELECT id FROM hub.users WHERE LOWER(email) = $1",
    why: "driver-invite: email uniqueness is global — an address may exist under only one carrier",
  },
  {
    fragment: "SELECT id FROM hub.users WHERE email = $1",
    why: "portal invite acceptance: same global email-uniqueness check, pre-account",
  },
  {
    fragment: "WHERE i.token = $1",
    why: "portal invitation lookup: the token IS the credential and carries the carrier with it",
  },
  {
    fragment: "role = 'platform_admin'",
    why: "platform admin impersonation check is cross-carrier by definition (session.ts)",
  },
]

// ---------------------------------------------------------------------------
// 1. Schema census
// ---------------------------------------------------------------------------

describe("schema census: which hub tables opt out of carrier_id", () => {
  it("parses the migrations (guard against a silently empty census)", () => {
    expect(SCHEMA.size).toBeGreaterThan(50)
    expect(SCHEMA.get("loads")).toBe(true)
    expect(SCHEMA.get("carriers")).toBe(false)
    // Dropped in 002 — a stale census would still list it.
    expect(SCHEMA.has("load_status_events")).toBe(false)
  })

  it("every carrier-less hub table is one we have deliberately signed off on", () => {
    const actual = [...SCHEMA].filter(([, hasCarrier]) => !hasCarrier).map(([t]) => t).sort()
    const approved = Object.keys(CARRIERLESS_TABLES).sort()
    expect(
      actual,
      "A hub table without carrier_id appeared (or disappeared). If new: give it a carrier_id, " +
        "or add it to CARRIERLESS_TABLES with the isolation story that makes it safe. " +
        "hub.website_leads is the cautionary tale."
    ).toEqual(approved)
  })
})

// ---------------------------------------------------------------------------
// 2. Static scan
// ---------------------------------------------------------------------------

function tsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry)
    if (statSync(p).isDirectory()) {
      if (entry === "__tests__") continue
      tsFiles(p, acc)
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      acc.push(p)
    }
  }
  return acc
}

/** Template literals in the source that look like SQL statements. */
function sqlLiterals(source: string): string[] {
  const out: string[] = []
  for (const m of source.matchAll(/`([^`]*)`/g)) {
    if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(m[1])) out.push(m[1])
  }
  return out
}

/**
 * Some queries build their WHERE clause in a array and interpolate it
 * (`SELECT ... WHERE ${where.join(" AND ")}`). Resolve those by pulling in the
 * lines that construct the interpolated identifier — its declaration and any
 * .push() calls — so a predicate assembled at runtime still counts. Deliberately
 * narrow: only declaration and push lines, never the whole file, so an unrelated
 * scoped query elsewhere can't excuse an unscoped one here.
 */
function resolveInterpolations(sql: string, source: string): string {
  let resolved = sql
  for (const m of sql.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)/g)) {
    const ident = m[1]
    const builder = new RegExp(
      `^\\s*(?:const|let|var)\\s+${ident}\\b.*$|^\\s*${ident}\\.push\\(.*$`,
      "gm"
    )
    for (const line of source.match(builder) ?? []) resolved += `\n${line}`
  }
  return resolved
}

describe("static scan: every hub.* query carries its own carrier scope", () => {
  const files = tsFiles(HUB_LIB)

  it("finds the hub library to scan (guard against a silently empty scan)", () => {
    expect(files.length).toBeGreaterThan(30)
  })

  it("no statement touches a carrier-scoped hub table without constraining carrier_id", () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, "utf-8")
      for (const sql of sqlLiterals(source)) {
        // Only tables that actually HAVE a carrier_id column can be scoped by one.
        const touched = [...sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+hub\.([a-z_]+)/gi)]
          .map((m) => m[1].toLowerCase())
          .filter((t) => SCHEMA.get(t) === true)
        if (touched.length === 0) continue

        if (/carrier_id/i.test(resolveInterpolations(sql, source))) continue

        const exempt = CROSS_CARRIER_BY_DESIGN.find((e) => sql.includes(e.fragment))
        if (exempt) continue

        offenders.push(
          `${path.relative(ROOT, file)}: hub.${[...new Set(touched)].join(", hub.")} — ` +
            sql.replace(/\s+/g, " ").trim().slice(0, 120)
        )
      }
    }

    expect(
      offenders,
      "These statements can read or write another carrier's rows. Add `carrier_id = $n` " +
        "(the id is almost always already in scope), or — only for genuine pre-auth paths — " +
        `add an annotated entry to CROSS_CARRIER_BY_DESIGN:\n${offenders.join("\n")}`
    ).toEqual([])
  })

  it("every cross-carrier exemption still matches a real query (no stale entries)", () => {
    const allSql = files.flatMap((f) => sqlLiterals(readFileSync(f, "utf-8")))
    const stale = CROSS_CARRIER_BY_DESIGN.filter(
      (e) => !allSql.some((sql) => sql.includes(e.fragment))
    ).map((e) => e.fragment)
    expect(stale, `Exemptions no longer matching any query — delete them: ${stale.join(", ")}`).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. Live proof — requires POSTGRES_URL
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  if (process.env.POSTGRES_URL) return
  const envPath = path.join(ROOT, ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadEnvLocal()

const suite = process.env.POSTGRES_URL ? describe : describe.skip

suite("live proof: carrier B cannot see or address carrier A's rows", () => {
  let db: typeof import("../db")
  const THIND = "11111111-1111-1111-1111-111111111111"
  let other: string
  const tag = Math.random().toString(36).slice(2, 8)

  beforeAll(async () => {
    db = await import("../db")
    // A real second tenant WITH its own data, so "saw nothing of A's" can't
    // pass trivially by the reads being broken for everyone.
    const rows = await db.query<{ id: string }>(
      `INSERT INTO hub.carriers (name, dot_number, mc_number)
       VALUES ($1, $2, $3) RETURNING id`,
      [`Harness Carrier ${tag}`, `TEST${tag}`, `MC${tag}`]
    )
    other = rows[0].id
    await db.query(`INSERT INTO hub.customers (carrier_id, name) VALUES ($1, $2)`, [
      other,
      `Harness Customer ${tag}`,
    ])
  })

  afterAll(async () => {
    if (!other) return
    // Children first — the FKs are not ON DELETE CASCADE everywhere.
    for (const table of ["loads", "customers", "users", "drivers", "trucks"]) {
      await db.query(`DELETE FROM hub.${table} WHERE carrier_id = $1`, [other]).catch(() => undefined)
    }
    await db.query(`DELETE FROM hub.carriers WHERE id = $1`, [other]).catch(() => undefined)
  })

  it("both tenants really have data (so a passing isolation check means something)", async () => {
    const a = await db.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM hub.loads WHERE carrier_id = $1`,
      [THIND]
    )
    const b = await db.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM hub.customers WHERE carrier_id = $1`,
      [other]
    )
    expect(Number(a[0].n)).toBeGreaterThan(0)
    expect(Number(b[0].n)).toBeGreaterThan(0)
  })

  it("list reads as carrier B return only carrier B's own rows", async () => {
    const [{ listLoads }, { listCustomers }, { listDrivers }] = await Promise.all([
      import("../loads"),
      import("../customers"),
      import("../drivers"),
    ])

    // Carrier A's row ids, which must not appear in any of B's reads.
    const foreignIds = new Set(
      (await db.query<{ id: string }>(
        `SELECT id::text FROM hub.loads WHERE carrier_id = $1
         UNION ALL SELECT id::text FROM hub.customers WHERE carrier_id = $1
         UNION ALL SELECT id::text FROM hub.drivers WHERE carrier_id = $1`,
        [THIND]
      )).map((r) => r.id)
    )
    expect(foreignIds.size).toBeGreaterThan(0)

    const seen = [
      ...(await listLoads(other)),
      ...(await listCustomers(other)),
      ...(await listDrivers(other)),
    ].map((row) => String((row as { id: string }).id))

    const leaked = seen.filter((id) => foreignIds.has(id))
    expect(leaked, `carrier B's list reads returned carrier A's rows: ${leaked.join(", ")}`).toEqual([])
  })

  it("carrier A's rows are not addressable by primary key as carrier B", async () => {
    // The exact shape of the 1c audit finding: knowing (or guessing) an id
    // must not be enough without the matching carrier.
    const [{ getLoad }, { getCustomer }] = await Promise.all([
      import("../loads"),
      import("../customers"),
    ])
    const [load] = await db.query<{ id: string }>(
      `SELECT id::text FROM hub.loads WHERE carrier_id = $1 LIMIT 1`,
      [THIND]
    )
    const [customer] = await db.query<{ id: string }>(
      `SELECT id::text FROM hub.customers WHERE carrier_id = $1 LIMIT 1`,
      [THIND]
    )
    expect(load?.id).toBeTruthy()
    expect(customer?.id).toBeTruthy()

    expect(await getLoad(other, load.id)).toBeNull()
    expect(await getCustomer(other, customer.id)).toBeNull()
    // …and carrier A can still read its own, so the guard isn't just breaking reads.
    expect(await getLoad(THIND, load.id)).not.toBeNull()
  })

  it("the operator's website leads are invisible to another tenant (2026-07-26 regression)", async () => {
    const leads = await import("../website-leads")
    expect(await leads.listWebsiteLeads(other, 50)).toEqual([])
    expect(await leads.countNewWebsiteLeads(other)).toBe(0)
    expect(await leads.getWebsiteLead(other, "1")).toBeNull()
    // …and the operator still sees their own board.
    expect(Array.isArray(await leads.listWebsiteLeads(THIND, 5))).toBe(true)
  })

  it("a cross-carrier UPDATE by primary key alone cannot touch another tenant's row", async () => {
    const mine = await db.query<{ id: string }>(
      `INSERT INTO hub.customers (carrier_id, name) VALUES ($1, $2) RETURNING id`,
      [other, `Target ${tag}`]
    )
    const targetId = mine[0].id
    const res = await db.query(
      `UPDATE hub.customers SET name = 'HIJACKED' WHERE id = $1 AND carrier_id = $2 RETURNING id`,
      [targetId, THIND] // attacker's carrier, victim's row id
    )
    expect(res).toHaveLength(0)
    const after = await db.query<{ name: string }>(
      `SELECT name FROM hub.customers WHERE id = $1`,
      [targetId]
    )
    expect(after[0].name).not.toBe("HIJACKED")
  })
})

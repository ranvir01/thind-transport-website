/**
 * Static SQL-shape sweep (AGENTS.md: every query carrier-scoped): every
 * UPDATE/DELETE against hub.documents and hub.document_requests in product
 * code must carry a carrier_id guard in the statement itself — document rows
 * point at PODs, CDL scans, and settlement paperwork, so an unguarded write
 * lets one carrier retarget or destroy another's files. Same sweep pattern as
 * invoice-write-tenancy.test.ts; scans source so new call sites are covered
 * without a mock harness per function.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOTS = ["src/lib", "src/app"].map((p) => path.join(process.cwd(), p))
const WRITE_RE = /(UPDATE|DELETE FROM)\s+hub\.(documents|document_requests)\b[^`]*/g

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "__tests__" || name === "node_modules") return []
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

describe("documents-table writes are carrier-guarded", () => {
  it("every UPDATE/DELETE statement contains carrier_id", () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        const content = readFileSync(file, "utf-8")
        for (const match of content.matchAll(WRITE_RE)) {
          if (!/carrier_id/.test(match[0])) {
            const line = content.slice(0, match.index).split("\n").length
            offenders.push(`${path.relative(process.cwd(), file)}:${line} — ${match[0].slice(0, 100)}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

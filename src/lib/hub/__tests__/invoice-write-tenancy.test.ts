/**
 * Static SQL-shape sweep (AGENTS.md: every query carrier-scoped): every
 * UPDATE/DELETE against the money tables in product code must carry a
 * carrier_id guard in the statement itself, even when the row id came from
 * an already-scoped read — WHERE id = $1 alone has repeatedly crept in via
 * sent_log appends (factor.ts, reminders, statements, factoring packets)
 * and settlement approval/expense-marking (settlements.ts). Scans source so
 * new call sites are covered without writing a mock harness per function.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const ROOTS = ["src/lib", "src/app"].map((p) => path.join(process.cwd(), p))
const WRITE_RE = /(UPDATE|DELETE FROM)\s+hub\.(invoices|payments|settlements|settlement_lines|advances|expenses|escrow_ledger)\b[^`]*/g

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "__tests__" || name === "node_modules") return []
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

describe("money-table writes are carrier-guarded", () => {
  it("every UPDATE/DELETE statement contains carrier_id", () => {
    const offenders: string[] = []
    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        const content = readFileSync(file, "utf-8")
        for (const match of content.matchAll(WRITE_RE)) {
          // match[0] runs to the closing backtick of the template literal,
          // i.e. the full SQL statement.
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

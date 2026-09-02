/**
 * The customer portal shows a customer's shipment, not the carrier's books.
 *
 * "POD received", "Invoiced", "Paid" and "Settled" are back-office states:
 * a broker reading "Settled" on their load is being told when the driver got
 * paid. Outside the office a delivered load is "Delivered" and nothing more —
 * publicStatus (LoadProgressBar) already folds the money statuses, and the
 * portal's two status chips used the raw office labels beside it. Source
 * scan, like portal-accent-tokens: the wrong import is the whole defect.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const PORTAL = join(process.cwd(), "src/app/hub/portal")
const read = (rel: string) => readFileSync(join(PORTAL, rel), "utf8")

describe("portal pages show the public status only", () => {
  it("the portal home and the load detail fold money statuses to Delivered", () => {
    for (const rel of ["page.tsx", "loads/[id]/page.tsx"]) {
      const src = read(rel)
      expect(src, rel).not.toMatch(/import[^\n]*\bSTATUS_LABELS\b/)
      expect(src, rel).toMatch(/publicStatus\(/)
    }
  })

  it("no portal page reaches for the office label table", () => {
    for (const rel of ["page.tsx", "loads/[id]/page.tsx", "layout.tsx"]) {
      expect(read(rel), rel).not.toMatch(/STATUS_LABELS\[/)
    }
  })
})

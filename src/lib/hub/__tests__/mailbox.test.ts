import { describe, expect, it } from "vitest"
import { extractReference } from "../mailbox"

describe("docs mailbox — reference extraction", () => {
  const cases: [string, string | null][] = [
    ["Rate con for THD-1042", "THD-1042"],
    ["FW: RE: thd-1042 pod attached", "THD-1042"],
    ["Load LD-23 paperwork", "LD-23"],
    ["CASC-100023 BOL", "CASC-100023"],
    ["Invoice INV-2026-... wait that's not a load", "INV-2026"],
    ["no reference here", null],
    ["", null],
  ]
  for (const [subject, expected] of cases) {
    it(`"${subject || "(empty)"}" → ${expected}`, () => {
      expect(extractReference(subject)).toBe(expected)
    })
  }
})

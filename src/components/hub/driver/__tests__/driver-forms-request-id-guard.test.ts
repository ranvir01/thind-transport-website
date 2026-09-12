/**
 * The two driver forms whose filings the server dedupes must mint the
 * clientRequestId INSIDE the payload they hand to runOrQueue — that is the
 * only way the online attempt and a later replay of the same tap share one
 * id. Pinned on the source because the forms have no component test rig,
 * and a refactor that minted the id per attempt (or dropped it) would still
 * compile: the field is optional on both actions on purpose, so v2 queue
 * rows keep replaying.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const DRIVER_DIR = path.join(process.cwd(), "src", "components", "hub", "driver")

const FORMS = [
  { file: "DvirForm.tsx", kind: "dvir" },
  { file: "DriverIncidentForm.tsx", kind: "incident" },
] as const

describe.each(FORMS)("$file mints one clientRequestId per tap", ({ file, kind }) => {
  const source = readFileSync(path.join(DRIVER_DIR, file), "utf8")

  it("imports newClientRequestId from the driver offline queue", () => {
    expect(source).toMatch(
      /import \{[^}]*\bnewClientRequestId\b[^}]*\} from "@\/components\/hub\/driver\/offline-queue"/
    )
  })

  it("puts the id in the payload before runOrQueue sees it", () => {
    const mint = source.indexOf("clientRequestId: newClientRequestId()")
    const enqueue = source.indexOf(`runOrQueue({ kind: "${kind}", payload: input }`)
    expect(mint, "the payload must carry clientRequestId: newClientRequestId()").toBeGreaterThan(-1)
    expect(enqueue, `runOrQueue must be called with kind "${kind}" and the same input`).toBeGreaterThan(-1)
    expect(mint).toBeLessThan(enqueue)
    // Exactly once: a second mint would give the replay a different id.
    expect(source.split("newClientRequestId()").length - 1).toBe(1)
  })
})

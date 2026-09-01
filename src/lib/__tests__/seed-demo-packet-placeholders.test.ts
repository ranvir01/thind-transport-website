/**
 * Regression for: seed-demo.mjs inserts carrier-packet document rows
 * (thind-w9.pdf/thind-coi.pdf/thind-authority.pdf) with storage='local' but
 * never wrote the physical files under data/uploads/, so
 * readDocumentBytes() always returned null and "Email the packet" always
 * reported "Nothing to send yet" on a freshly seeded local rig.
 */
import { describe, expect, it } from "vitest"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { PDFDocument } from "pdf-lib"
import {
  PACKET_PLACEHOLDER_FILES,
  placeholderPdfBytes,
  writePacketPlaceholders,
} from "../../../scripts/seed-demo.mjs"

describe("seed-demo carrier-packet placeholders", () => {
  it("covers exactly the three carrier-packet documents seeded with storage='local'", () => {
    expect(PACKET_PLACEHOLDER_FILES).toEqual(["thind-w9.pdf", "thind-coi.pdf", "thind-authority.pdf"])
  })

  it("generates a real, parseable one-page PDF (not an empty stub)", async () => {
    const bytes = await placeholderPdfBytes("thind-w9.pdf")
    expect(bytes.byteLength).toBeGreaterThan(0)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
  })

  it("writes a readable file per name — the exact path readDocumentBytes() resolves for storage='local'", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "seed-demo-packet-"))
    try {
      await writePacketPlaceholders(dir)
      for (const name of PACKET_PLACEHOLDER_FILES) {
        // Mirrors readDocumentBytes(): UPLOAD_DIR/<url.split("/").pop()>
        const bytes = await readFile(path.join(dir, name))
        expect(bytes.byteLength).toBeGreaterThan(0)
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

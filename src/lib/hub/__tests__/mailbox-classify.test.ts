/**
 * Implementation brief §0.2: the docs mailbox filed EVERY attachment as
 * `rate_confirmation`, hardcoded at two call sites, while the integration
 * registry advertised "files rate cons and PODs."
 *
 * That is a money bug, not a labelling one. POD-gated invoicing never saw its
 * POD, and sendFactoringPacket's document filter selects `kind === "pod"` — so
 * a POD that arrived by email was invisible to the packet and the factor got
 * an incomplete submission.
 *
 * Table-driven over realistic subject/filename pairs, because the real input
 * is whatever a broker's back office happened to name the file.
 */
import { describe, expect, it } from "vitest"
import { classifyDocumentKind } from "../mailbox"

describe("classifyDocumentKind", () => {
  const cases: [string | null, string | null, string][] = [
    // filename, subject, expected
    ["POD_THD-1042.pdf", "Load THD-1042 paperwork", "pod"],
    ["proof-of-delivery.pdf", "THD-1042", "pod"],
    ["Delivery Receipt 8871.PDF", "THD-1042 docs", "pod"],
    ["signed_bol_thd1042.pdf", "THD-1042", "pod"],
    ["ratecon.pdf", "THD-1042", "rate_confirmation"],
    ["Rate Confirmation - THD-1042.pdf", "New load", "rate_confirmation"],
    ["rate_con_1042.pdf", "THD-1042", "rate_confirmation"],
    ["Load Confirmation.pdf", "THD-1042", "rate_confirmation"],
    ["carrier-confirmation-99.pdf", "THD-1042", "rate_confirmation"],
    ["BOL_1042.pdf", "THD-1042", "bol"],
    ["bill of lading.pdf", "THD-1042", "bol"],
    ["invoice-2231.pdf", "THD-1042", "invoice"],
    ["freight bill 88.pdf", "THD-1042", "invoice"],
  ]

  it.each(cases)("%s (subject %s) → %s", (filename, subject, expected) => {
    expect(classifyDocumentKind(filename, subject)).toBe(expected)
  })

  it("falls back to the subject when the filename says nothing", () => {
    expect(classifyDocumentKind("scan0001.pdf", "POD for THD-1042")).toBe("pod")
    expect(classifyDocumentKind("document.pdf", "Rate con THD-1042")).toBe("rate_confirmation")
    expect(classifyDocumentKind("attachment-1.pdf", "Bill of Lading THD-1042")).toBe("bol")
  })

  it("prefers the filename over the subject — one email carries several documents", () => {
    // The classic case: broker sends the rate con and the POD together under
    // a rate-con subject line. Classifying by subject would mislabel the POD.
    expect(classifyDocumentKind("POD_1042.pdf", "Rate confirmation THD-1042")).toBe("pod")
    expect(classifyDocumentKind("ratecon.pdf", "Rate confirmation THD-1042")).toBe("rate_confirmation")
  })

  it("still defaults to rate_confirmation when nothing matches", () => {
    // Preserves the old behaviour for genuinely unlabelled mail, which is what
    // the mailbox was built for.
    expect(classifyDocumentKind("scan0001.pdf", "THD-1042")).toBe("rate_confirmation")
    expect(classifyDocumentKind(null, null)).toBe("rate_confirmation")
    expect(classifyDocumentKind(undefined, undefined)).toBe("rate_confirmation")
  })

  it("is case- and separator-insensitive", () => {
    for (const name of ["POD.pdf", "pod.PDF", "Pod_1042.pdf", "PROOF_OF_DELIVERY.pdf", "proof-of-delivery.pdf"]) {
      expect(classifyDocumentKind(name, null), name).toBe("pod")
    }
  })

  it("does not mistake unrelated words containing the letters", () => {
    // "podium", "podcast" — \b anchors keep these out of the POD branch.
    expect(classifyDocumentKind("podium-photos.pdf", null)).toBe("rate_confirmation")
    expect(classifyDocumentKind("tripod-mount.pdf", null)).toBe("rate_confirmation")
  })
})

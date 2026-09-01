/**
 * FMCSA QCMobile contract — fixture shapes from docs/integrations/fmcsa.md.
 * Guards against silent authority-check degradation when FMCSA renames fields.
 */
import { describe, expect, it } from "vitest"
import {
  carrierAllowedToOperate,
  carrierAuthorityStatus,
  extractQcCarrier,
} from "../vetting-fmcsa"

/** Typical docket-number lookup envelope (content is an array). */
const DOCKET_ARRAY_ENVELOPE = {
  content: [
    {
      carrier: {
        legalName: "ACME FREIGHT LLC",
        dbaName: "ACME FREIGHT",
        allowedToOperate: "Y",
        brokerAuthorityStatus: "A",
        commonAuthorityStatus: "A",
      },
    },
  ],
} as const

/** Documented alternate spelling for the operate flag. */
const ALLOW_TO_OPERATE_ENVELOPE = {
  content: [
    {
      carrier: {
        legalName: "LEGACY BROKER INC",
        allowToOperate: "N",
        brokerAuthorityStatus: "I",
      },
    },
  ],
} as const

/** DOT lookup sometimes returns a bare content object instead of an array. */
const DOT_BARE_CONTENT_ENVELOPE = {
  content: {
    carrier: {
      legalName: "DOT ONLY CARRIER LLC",
      allowedToOperate: "Y",
      commonAuthorityStatus: "A",
    },
  },
} as const

describe("FMCSA QCMobile contract (fixture envelopes)", () => {
  it("extracts carrier from content[0].carrier array envelope", () => {
    const carrier = extractQcCarrier(DOCKET_ARRAY_ENVELOPE)
    expect(carrier?.legalName).toBe("ACME FREIGHT LLC")
    expect(carrierAllowedToOperate(carrier!)).toBe(true)
    expect(carrierAuthorityStatus(carrier!)).toBe("A")
  })

  it("maps allowToOperate when allowedToOperate is absent", () => {
    const carrier = extractQcCarrier(ALLOW_TO_OPERATE_ENVELOPE)
    expect(carrierAllowedToOperate(carrier!)).toBe(false)
    expect(carrierAuthorityStatus(carrier!)).toBe("I")
  })

  it("extracts carrier from bare content object envelope", () => {
    const carrier = extractQcCarrier(DOT_BARE_CONTENT_ENVELOPE)
    expect(carrier?.legalName).toBe("DOT ONLY CARRIER LLC")
    expect(carrierAllowedToOperate(carrier!)).toBe(true)
    expect(carrierAuthorityStatus(carrier!)).toBe("A")
  })

  it("returns null for empty, malformed, or carrier-less payloads", () => {
    expect(extractQcCarrier(null)).toBeNull()
    expect(extractQcCarrier({})).toBeNull()
    expect(extractQcCarrier({ content: [] })).toBeNull()
    expect(extractQcCarrier({ content: [{ dotNumber: "12345" }] })).toBeNull()
  })

  it("treats a missing operate flag as unknown (null), not allowed", () => {
    const carrier = extractQcCarrier({
      content: [{ carrier: { legalName: "NO FLAG BROKER", brokerAuthorityStatus: "A" } }],
    })
    expect(carrierAllowedToOperate(carrier!)).toBeNull()
  })

  it("prefers allowedToOperate when both spellings are present", () => {
    expect(
      carrierAllowedToOperate({
        allowedToOperate: "Y",
        allowToOperate: "N",
      })
    ).toBe(true)
  })
})

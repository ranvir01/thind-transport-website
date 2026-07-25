import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mergeDocAnalysis } from "../doc-intake/merge-analysis"
import { analyzeDocument, buildDocSummary } from "../doc-intake"
import { redactPiiForLlm } from "../doc-intake/pii"
import { aiParserConfigured } from "../doc-intake/analyze-enhanced"
import { parseDocumentWithLlm } from "../doc-intake/llm-parser"

describe("redactPiiForLlm", () => {
  it("redacts SSN and EIN patterns", () => {
    const out = redactPiiForLlm("SSN 123-45-6789 EIN 12-3456789")
    expect(out).not.toContain("123-45-6789")
    expect(out).not.toContain("12-3456789")
  })

  it("redacts street addresses — a driver's home address is not the API's business", () => {
    for (const line of [
      "18700 68th Ave S, Kent, WA 98032",
      "1234 SW Marine View Drive Apt 4B",
      "77 Industrial Park Rd., Suite 210",
      "P.O. Box 4471",
    ]) {
      const out = redactPiiForLlm(line)
      expect(out).toContain("[ADDRESS REDACTED]")
      expect(out).not.toMatch(/68th Ave|Marine View Drive|Industrial Park Rd|Box 4471/)
    }
  })

  it("redacts a labelled date of birth", () => {
    for (const line of [
      "DOB: 03/14/1985",
      "D.O.B. 3-14-1985",
      "Date of Birth: 1985-03-14",
      "Born on March 14, 1985",
    ]) {
      const out = redactPiiForLlm(line)
      expect(out).toContain("DOB [REDACTED]")
      expect(out).not.toMatch(/1985/)
    }
  })

  it("keeps a rate-con stop's date and city/state while dropping the street", () => {
    // The house number must not be allowed to start at the tail of a date:
    // "03/14" + "1200 Industrial Way" once redacted to "03/[ADDRESS REDACTED]",
    // destroying the stop date the parser is asked to extract.
    const out = redactPiiForLlm("PICKUP  Mon 03/14  1200 Industrial Way, Kent, WA 98032")
    expect(out).toContain("03/14")
    expect(out).toContain("Kent, WA 98032")
    expect(out).toContain("[ADDRESS REDACTED]")
    expect(out).not.toContain("Industrial Way")
  })

  it("never lets an address match run across a line break", () => {
    const doc = ["Settlement summary", "Total miles 1200", "Kent WA", "Route 5 corridor"].join("\n")
    expect(redactPiiForLlm(doc)).toBe(doc)
  })

  it("keeps the fields intake exists to extract — expiry dates, names, VIN, plate, city/state", () => {
    const doc = [
      "COMMERCIAL DRIVER LICENSE",
      "Name: Dana Ruiz",
      "EXP 03/14/2029",
      "Registration expires 11/30/2027",
      "VIN 1FUJGLDR8CSBB1234  PLATE C89123 WA",
      "Kent, WA 98032",
      "MC# 784512",
    ].join("\n")

    const out = redactPiiForLlm(doc)

    expect(out).toContain("Dana Ruiz")
    expect(out).toContain("03/14/2029")
    expect(out).toContain("11/30/2027")
    expect(out).toContain("1FUJGLDR8CSBB1234")
    expect(out).toContain("C89123")
    expect(out).toContain("Kent, WA 98032")
    expect(out).toContain("784512")
  })
})

describe("mergeDocAnalysis", () => {
  it("prefers higher-confidence LLM fields", () => {
    const base = analyzeDocument("MC# 111111")
    const llm = {
      ...base,
      kind: "customer" as const,
      payload: {
        kind: "customer" as const,
        data: {
          mcNumber: { value: "784512", confidence: "high" as const },
          name: { value: "Pacific Crest Logistics", confidence: "high" as const },
        },
      },
    }
    const summary = buildDocSummary("customer", llm.payload)
    const merged = mergeDocAnalysis(base, llm, summary)
    expect(merged.payload.kind === "customer" && merged.payload.data.mcNumber?.value).toBe("784512")
  })
})

describe("aiParserConfigured", () => {
  it("is false without env key", () => {
    const prev = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect(aiParserConfigured()).toBe(false)
    if (prev) process.env.ANTHROPIC_API_KEY = prev
  })
})

/**
 * The LLM pass was dead on arrival and would have stayed dead the moment a key
 * was pasted: it defaulted to claude-sonnet-4-20250514 (retired 2026-06-15), so
 * every call 404'd, and `if (!response.ok) return null` swallowed it — no log,
 * no error, silent heuristics forever.
 */
describe("parseDocumentWithLlm", () => {
  const API_KEY = "sk-ant-test-not-a-real-key"
  const fetchMock = vi.fn()
  let envKey: string | undefined
  let envModel: string | undefined

  /** One Anthropic Messages API response carrying `fields` for `kind`. */
  const llmResponse = (kind: string, fields: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ content: [{ type: "text", text: JSON.stringify({ kind, fields }) }] }),
  })

  const requestBody = () => JSON.parse(String(fetchMock.mock.calls[0][1].body))

  beforeEach(() => {
    envKey = process.env.ANTHROPIC_API_KEY
    envModel = process.env.ANTHROPIC_MODEL
    process.env.ANTHROPIC_API_KEY = API_KEY
    delete process.env.ANTHROPIC_MODEL
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(llmResponse("w9", { businessName: "Ruiz Trucking LLC" }))
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    if (envKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = envKey
    if (envModel === undefined) delete process.env.ANTHROPIC_MODEL
    else process.env.ANTHROPIC_MODEL = envModel
  })

  it("defaults to a current model id, not the retired sonnet-4 snapshot", async () => {
    await parseDocumentWithLlm("W-9\nName: Ruiz Trucking LLC", "w9.pdf")
    expect(fetchMock).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.anything())
    expect(requestBody().model).toBe("claude-sonnet-5")
    expect(requestBody().model).not.toBe("claude-sonnet-4-20250514")
  })

  it("still honours an explicit ANTHROPIC_MODEL", async () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-4-6"
    await parseDocumentWithLlm("W-9", "w9.pdf")
    expect(requestBody().model).toBe("claude-sonnet-4-6")
  })

  it("redacts the document text BEFORE it reaches the request body", async () => {
    await parseDocumentWithLlm(
      "Driver: Dana Ruiz\nSSN 123-45-6789\n18700 68th Ave S, Kent, WA 98032\nDOB: 03/14/1985",
      "cdl.pdf"
    )
    const sent = String(fetchMock.mock.calls[0][1].body)
    expect(sent).not.toContain("123-45-6789")
    expect(sent).not.toContain("68th Ave")
    expect(sent).not.toContain("1985")
    expect(sent).toContain("[SSN REDACTED]")
    expect(sent).toContain("[ADDRESS REDACTED]")
  })

  it("logs status and reason on a non-ok response instead of failing silently", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: { message: "model: claude-sonnet-4-20250514 not_found" } }),
    })

    const result = await parseDocumentWithLlm("SSN 123-45-6789 W-9", "w9.pdf")

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logged = errorSpy.mock.calls[0].join(" ")
    expect(logged).toContain("404")
    expect(logged).toContain("Not Found")
    expect(logged).toContain("claude-sonnet-5")
    // Never the credential, never the response body, never document text.
    expect(logged).not.toContain(API_KEY)
    expect(logged).not.toContain("not_found")
    expect(logged).not.toContain("123-45-6789")
  })

  it("logs an unreachable API instead of failing silently, and still returns null", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    const result = await parseDocumentWithLlm("SSN 123-45-6789 W-9", "w9.pdf")

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const logged = errorSpy.mock.calls[0].join(" ")
    expect(logged).toMatch(/unreachable/i)
    expect(logged).toContain("fetch failed")
    expect(logged).not.toContain(API_KEY)
    expect(logged).not.toContain("123-45-6789")
  })

  it("drops a redaction placeholder echoed back as a value, leaving it to the heuristic pass", async () => {
    fetchMock.mockResolvedValue(
      llmResponse("w9", {
        businessName: "Ruiz Trucking LLC",
        address: "[ADDRESS REDACTED]",
        ein: "[EIN REDACTED]",
      })
    )

    const result = await parseDocumentWithLlm("W-9", "w9.pdf")

    expect(result?.payload.kind).toBe("w9")
    const data = result!.payload.kind === "w9" ? result!.payload.data : null
    expect(data?.businessName?.value).toBe("Ruiz Trucking LLC")
    expect(data?.address).toBeUndefined()
    expect(data?.ein).toBeUndefined()
  })

  it("stays off entirely when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(await parseDocumentWithLlm("W-9", "w9.pdf")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

import { describe, expect, it } from "vitest"
import { mergeDocAnalysis } from "../doc-intake/merge-analysis"
import { analyzeDocument, buildDocSummary } from "../doc-intake"
import { redactPiiForLlm } from "../doc-intake/pii"
import { aiParserConfigured } from "../doc-intake/analyze-enhanced"

describe("redactPiiForLlm", () => {
  it("redacts SSN and EIN patterns", () => {
    const out = redactPiiForLlm("SSN 123-45-6789 EIN 12-3456789")
    expect(out).not.toContain("123-45-6789")
    expect(out).not.toContain("12-3456789")
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

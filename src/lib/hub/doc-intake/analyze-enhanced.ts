/**
 * Server-side document analysis: heuristic always, optional LLM merge when configured.
 */
import { analyzeDocument, buildDocSummary } from "./index"
import { mergeDocAnalysis } from "./merge-analysis"
import { aiParserConfigured, parseDocumentWithLlm } from "./llm-parser"
import type { DocAnalysis } from "./types"

export interface EnhancedDocAnalysis {
  analysis: DocAnalysis
  /** True when ANTHROPIC_API_KEY was set and the LLM pass ran successfully. */
  aiEnhanced: boolean
}

export async function analyzeDocumentEnhanced(
  text: string,
  fileName?: string
): Promise<EnhancedDocAnalysis> {
  const base = analyzeDocument(text, fileName)

  if (!aiParserConfigured()) {
    return { analysis: base, aiEnhanced: false }
  }

  try {
    const llm = await parseDocumentWithLlm(text, fileName)
    if (!llm) return { analysis: base, aiEnhanced: false }

    const merged = mergeDocAnalysis(base, llm, [])
    const summary = buildDocSummary(merged.kind, merged.payload)
    return {
      analysis: { ...merged, summary },
      aiEnhanced: true,
    }
  } catch {
    return { analysis: base, aiEnhanced: false }
  }
}

export { aiParserConfigured }

/**
 * Strip obvious PII before sending document text to an external LLM.
 * Heuristic parser still sees the original text on the client/server.
 */

const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const EIN_RE = /\b\d{2}-\d{7}\b/g
const CDL_RE = /\b(?:cdl|license)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9-]{5,20})\b/gi
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g

export function redactPiiForLlm(text: string): string {
  return text
    .replace(SSN_RE, "[SSN REDACTED]")
    .replace(EIN_RE, "[EIN REDACTED]")
    .replace(CDL_RE, "CDL [REDACTED]")
    .replace(PHONE_RE, "[PHONE REDACTED]")
}

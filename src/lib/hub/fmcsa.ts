export interface FmcsaVettingInput {
  name: string
  dotNumber?: string | null
  mcNumber?: string | null
}

export interface FmcsaVettingResult {
  status: "skipped" | "ok" | "warning" | "error"
  note: string
  raw?: unknown
}

/**
 * Credential-gated FMCSA carrier vetting. DOT lookups use the free FMCSA
 * mobile API when FMCSA_WEBKEY is present. Missing credentials never block
 * customer creation; the UI/import fallback remains manual.
 */
export async function vetCarrierWithFmcsa(input: FmcsaVettingInput): Promise<FmcsaVettingResult> {
  const webKey = process.env.FMCSA_WEBKEY
  if (!webKey) {
    return {
      status: "skipped",
      note: "FMCSA vetting skipped: FMCSA_WEBKEY is not configured. Manual vetting remains required.",
    }
  }
  if (!input.dotNumber) {
    return {
      status: "skipped",
      note: `FMCSA vetting skipped for ${input.name}: DOT number is blank.`,
    }
  }

  try {
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${encodeURIComponent(input.dotNumber)}?webKey=${encodeURIComponent(webKey)}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) {
      return { status: "error", note: `FMCSA lookup failed for DOT ${input.dotNumber}: HTTP ${res.status}` }
    }
    const data = await res.json()
    const carrier = data?.content?.carrier
    if (!carrier) {
      return { status: "warning", note: `FMCSA returned no carrier record for DOT ${input.dotNumber}.`, raw: data }
    }
    const allowed = String(carrier.allowedToOperate ?? carrier.allowed_to_operate ?? "").toUpperCase()
    const statusCode = String(carrier.statusCode ?? carrier.status_code ?? carrier.status ?? "")
    const legalName = carrier.legalName ?? carrier.legal_name ?? input.name
    const ok = allowed === "Y" || /active/i.test(statusCode)
    return {
      status: ok ? "ok" : "warning",
      note: `FMCSA vetting for ${legalName} DOT ${input.dotNumber}: allowed=${allowed || "unknown"}, status=${statusCode || "unknown"}.`,
      raw: { allowedToOperate: allowed, statusCode, legalName },
    }
  } catch (error) {
    return {
      status: "error",
      note: `FMCSA lookup failed for DOT ${input.dotNumber}: ${error instanceof Error ? error.message : "unknown error"}`,
    }
  }
}

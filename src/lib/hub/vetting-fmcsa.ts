/**
 * FMCSA QCMobile response parsing — pure helpers contract-tested against
 * documented API envelopes so field-name drift (e.g. allowToOperate vs
 * allowedToOperate) cannot silently degrade broker vetting.
 */

export interface QcCarrier {
  legalName?: string
  dbaName?: string
  /** Primary camelCase flag in live QCMobile responses. */
  allowedToOperate?: string
  /** Alternate spelling documented in FMCSA elements reference. */
  allowToOperate?: string
  statusCode?: string
  commonAuthorityStatus?: string
  contractAuthorityStatus?: string
  brokerAuthorityStatus?: string
}

/** Extract the carrier object from a QCMobile JSON body. */
export function extractQcCarrier(json: unknown): QcCarrier | null {
  if (!json || typeof json !== "object") return null
  const content = (json as { content?: unknown }).content
  const item = Array.isArray(content) ? content[0] : content
  if (!item || typeof item !== "object") return null
  const carrier = (item as { carrier?: QcCarrier }).carrier
  return carrier ?? null
}

/** Map Y/N authority flag; tolerates allowedToOperate vs allowToOperate drift. */
export function carrierAllowedToOperate(carrier: QcCarrier): boolean | null {
  const flag = carrier.allowedToOperate ?? carrier.allowToOperate
  if (flag == null) return null
  return flag === "Y"
}

export function carrierAuthorityStatus(carrier: QcCarrier): string | null {
  return carrier.brokerAuthorityStatus ?? carrier.commonAuthorityStatus ?? null
}

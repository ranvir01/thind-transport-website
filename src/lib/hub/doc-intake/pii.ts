/**
 * Strip obvious PII before sending document text to an external LLM.
 * Heuristic parser still sees the original text on the client/server, so a
 * field withheld here is withheld from the API, not lost: llm-parser drops any
 * value that comes back still carrying a [... REDACTED] marker and the
 * heuristic value wins the merge.
 *
 * REDACTED: SSN, EIN, labelled CDL/license numbers, phone numbers, US street
 * addresses (house number + street + optional apt/suite/unit, plus PO boxes),
 * and dates of birth that carry a birth label (DOB, D.O.B., date of birth,
 * birthdate, born).
 *
 * NOT REDACTED, deliberately — these are what document intake exists to read:
 * - names (CDL/med-card driver name, W-9 business name, broker/insured name)
 * - unlabelled dates: registration expiry, CDL expiry, med-card expiry and
 *   policy dates are all bare dates, so only a birth-LABELLED date is removed
 * - city / state / ZIP and stop dates: rate-con stops are addresses by nature,
 *   and the stop date is a field the parser is asked to extract, so the street
 *   pattern is anchored and single-line to leave both standing
 * - VIN, plate, MC/DOT, policy and invoice numbers, dollar amounts
 *
 * Conservative on purpose: a false-positive redaction costs one field that the
 * heuristic pass usually recovers; a miss ships a driver's home address to a
 * third party.
 */

const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const EIN_RE = /\b\d{2}-\d{7}\b/g
const CDL_RE = /\b(?:cdl|license)\s*(?:#|no\.?|number)?\s*:?\s*([A-Z0-9-]{5,20})\b/gi
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g

/** Birth-labelled dates only — a bare date is an expiry far more often than a DOB. */
const DOB_RE =
  /\b(?:d\.?\s?o\.?\s?b\.?|date\s+of\s+birth|birth\s*date|birthdate|born(?:\s+on)?)\s*[:\-]?\s*(?:\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})/gi

const STREET_SUFFIX =
  "st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|cir|circle|pl|place|ter|terrace|hwy|highway|pkwy|parkway|trl|trail|loop|sq|square|rte|route"
/**
 * House number + at least one street word + a street suffix, with an optional
 * apt/suite/unit tail. Requiring the suffix keeps VINs, plates, unit numbers,
 * model years and dollar amounts out of the match.
 *
 * Two deliberate limits keep it from eating the fields intake needs:
 * - the house number may not follow a digit, `/`, `.` or `-`, so the `14` in a
 *   rate-con stop line "Mon 03/14  1200 Industrial Way" can't start the match
 *   and swallow the stop date;
 * - separators are horizontal whitespace only, never `\s`, so a match can
 *   never run across a line break and take unrelated lines with it
 *   ("Total miles 1200" + a following line starting "Route 5" is not an
 *   address).
 */
const STREET_RE = new RegExp(
  String.raw`(?<![\w./-])\d{1,6}[ \t]+(?:[A-Za-z0-9.'-]+[ \t]+){1,4}(?:${STREET_SUFFIX})\b\.?` +
    String.raw`(?:[ \t]*,?[ \t]*(?:apt|apartment|ste|suite|unit|rm|room|#)[ \t]*\.?[ \t]*[A-Za-z0-9-]+)?`,
  "gi"
)
const PO_BOX_RE = /\bP\.?\s?O\.?\s*Box\s*#?\s*\d+/gi

export function redactPiiForLlm(text: string): string {
  return text
    .replace(SSN_RE, "[SSN REDACTED]")
    .replace(EIN_RE, "[EIN REDACTED]")
    .replace(DOB_RE, "DOB [REDACTED]")
    .replace(CDL_RE, "CDL [REDACTED]")
    .replace(PHONE_RE, "[PHONE REDACTED]")
    .replace(PO_BOX_RE, "[ADDRESS REDACTED]")
    .replace(STREET_RE, "[ADDRESS REDACTED]")
}

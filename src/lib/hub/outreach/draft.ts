/**
 * Outreach drafting — turns a prospect + our company facts into an on-brand,
 * personalized message a human approves before sending.
 *
 * Deliberately dependency-free and pure so it is fully unit-testable and cannot
 * fail at runtime (no network call in the hot path). The templates encode
 * Thind's real value proposition per audience; personalization tokens fill from
 * whatever the prospect row knows and degrade gracefully when a field is blank.
 *
 * An optional Claude-API enhancement can wrap this later (draft, then have the
 * model tighten the copy) — but the template output is the reliable floor, and
 * every message already carries a compliant CAN-SPAM footer.
 */

import { EQUIPMENT, PAY_RATES } from "@/lib/constants"

export type Audience = "broker" | "shipper" | "driver"
export type Channel = "email" | "sms"

export interface CompanyFacts {
  name: string
  phone: string
  phoneFormatted: string
  email: string
  address: string
  dot: string
  mc: string
  founded: number
  statesCovered: number
  trucks: number
}

export interface ProspectInput {
  audience: Audience
  company?: string | null
  contactName?: string | null
  email?: string | null
  phone?: string | null
  mcNumber?: string | null
  lane?: string | null
  equipment?: string | null
  notes?: string | null
}

export interface Draft {
  channel: Channel
  subject: string
  body: string
  /** A short SMS/DM variant (copy-able; never auto-sent to cold contacts). */
  sms: string
  /** A phone opener for when the owner would rather call. */
  callScript: string
}

/** First name if we have a name, else a safe, non-creepy greeting per audience. */
function greeting(p: ProspectInput): string {
  const first = (p.contactName ?? "").trim().split(/\s+/)[0]
  if (first) return `Hi ${first},`
  if (p.audience === "driver") return "Hi there,"
  if (p.company) return `Hi ${p.company} team,`
  return "Hello,"
}

/** A natural noun phrase for the prospect's freight focus, when known. */
function laneClause(p: ProspectInput): string {
  const bits = [p.equipment?.trim(), p.lane?.trim()].filter(Boolean)
  if (bits.length === 0) return ""
  if (bits.length === 1) return ` on your ${bits[0]} freight`
  return ` on your ${bits[0]} loads (${bits[1]})`
}

/**
 * CAN-SPAM compliant footer: sender identity, physical postal address, and a
 * clear opt-out. Reply-based opt-out is a valid mechanism; the suppression list
 * honors it. Returned as plain text; the send path wraps it for email.
 */
export function canSpamFooter(c: CompanyFacts): string {
  return [
    "—",
    `${c.name} · USDOT ${c.dot} · MC ${c.mc}`,
    c.address,
    `${c.phone} · ${c.email}`,
    "",
    "You received this because we believe our carrier services may be a fit for your business.",
    `Not interested? Reply STOP or "unsubscribe" and we won't contact you again.`,
  ].join("\n")
}

function brokerDraft(p: ProspectInput, c: CompanyFacts): Omit<Draft, "channel"> {
  const focus = laneClause(p)
  const subject = `Asset-based carrier for your lanes — ${c.name} (MC ${c.mc})`
  const body = [
    greeting(p),
    "",
    `I'm reaching out from ${c.name}, an asset-based carrier out of Kent, WA running ${c.trucks} late-model trucks — flatbed, reefer, and dry van across all ${c.statesCovered} states.`,
    "",
    `We're looking to move more of your freight${focus}. What you get working with us direct:`,
    "• Live tracking on every load from our own TMS — your customer asks, you already know",
    "• A dispatch desk that answers the phone — no broker-carrier telephone game",
    "• Clean inspections, modern equipment, $1M liability, W-9 + COI in one packet link",
    "",
    `Verify us anytime — USDOT ${c.dot}, MC ${c.mc} on FMCSA SAFER.`,
    "",
    `Can I send our carrier packet and the lanes we're strongest on? Reply here or call ${c.phone}.`,
    "",
    "Thanks,",
    `${c.name} Dispatch`,
    "",
    canSpamFooter(c),
  ].join("\n")
  const sms = `${c.name} (asset carrier, Kent WA, MC ${c.mc}) — flatbed/reefer/dry van, ${c.statesCovered} states, live tracking. Room for your freight${focus}? ${c.phone}`
  const callScript = [
    `Hi, this is ___ with ${c.name} — we're an asset-based carrier, MC ${c.mc}, ${c.trucks} trucks out of Kent WA.`,
    `I'm calling because we've got capacity${focus || " on your lanes"} and I'd love to be on your carrier list.`,
    `We run flatbed, reefer, and dry van, ${c.statesCovered} states, live tracking on every load. Who handles carrier onboarding on your side?`,
  ].join(" ")
  return { subject, body, sms, callScript }
}

function shipperDraft(p: ProspectInput, c: CompanyFacts): Omit<Draft, "channel"> {
  const focus = laneClause(p)
  const subject = `Ship direct, skip the broker markup — ${c.name}`
  const body = [
    greeting(p),
    "",
    `I'm with ${c.name}, a family-run asset-based carrier in Kent, WA (since ${c.founded}). We haul direct for shippers${focus} — no broker in the middle taking a cut of your freight budget.`,
    "",
    "Why shippers move to us:",
    "• Direct rates — the broker margin stays in your pocket",
    "• Live tracking + POD the moment it's signed, from our own TMS",
    "• Real people on dispatch, not a load board and a prayer",
    `• Flatbed, reefer, and dry van across all ${c.statesCovered} states`,
    "",
    `Fully insured and FMCSA-registered — USDOT ${c.dot}, MC ${c.mc}.`,
    "",
    `Want a quote on a lane you ship regularly? Reply with the origin/destination and equipment, or call ${c.phone}.`,
    "",
    "Thanks,",
    `${c.name} Dispatch`,
    "",
    canSpamFooter(c),
  ].join("\n")
  const sms = `${c.name} — family-run asset carrier, Kent WA. We haul direct for shippers${focus}, live tracking, ${c.statesCovered} states. Want a lane quote? ${c.phone}`
  const callScript = [
    `Hi, this is ___ with ${c.name} — we're an asset-based carrier, not a broker.`,
    `We haul direct for shippers${focus || ""}, which means you skip the broker markup and get live tracking straight from us.`,
    `Do you have regular lanes you'd want a direct quote on? I can turn one around today. ${c.phone}.`,
  ].join(" ")
  return { subject, body, sms, callScript }
}

function driverDraft(p: ProspectInput, c: CompanyFacts): Omit<Draft, "channel"> {
  const years = new Date().getFullYear() - c.founded
  const subject = `${PAY_RATES.ownerOperator.commission} owner-op split, weekly pay — drive for ${c.name}`
  const body = [
    greeting(p),
    "",
    `I'm with ${c.name}, a family-run carrier out of Kent, WA (${years} years, since ${c.founded}). We're hiring CDL-A drivers and owner-operators, and I thought the deal might be worth a look:`,
    "",
    `• Owner-operators keep ${PAY_RATES.ownerOperator.commission} of the gross`,
    `• Company drivers run ${EQUIPMENT.modelYears} ${EQUIPMENT.makes} at ${PAY_RATES.companyDriver.otr.perMile}/mile`,
    "• Weekly pay, no forced dispatch, real dispatch that answers",
    `• ${c.statesCovered} states — you pick the lanes that fit your life`,
    "",
    `We're a family that drives too, so we handle the back office and let you drive. Apply in about 60 seconds at thindtransport.com/apply, or just call/text ${c.phone} and we'll call you right back.`,
    "",
    "Drive safe,",
    `${c.name} Recruiting`,
    "",
    canSpamFooter(c),
  ].join("\n")
  const sms = `${c.name} (Kent WA, family-run): ${PAY_RATES.ownerOperator.commission} O/O split or ${PAY_RATES.companyDriver.otr.perMile}/mi company, weekly pay, no forced dispatch, ${EQUIPMENT.short}. Apply: thindtransport.com/apply or call ${c.phone}`
  const callScript = [
    `Hey, this is ___ with ${c.name} out of Kent, Washington — we're a family-run carrier hiring drivers and owner-ops.`,
    `Owner-operators keep ${PAY_RATES.ownerOperator.commission}, company drivers are at ${PAY_RATES.companyDriver.otr.perMile} a mile on ${EQUIPMENT.short}, weekly pay, no forced dispatch.`,
    `Are you driving right now, or looking? I can walk you through it in five minutes. ${c.phone}.`,
  ].join(" ")
  return { subject, body, sms, callScript }
}

/**
 * Draft an outreach message for a prospect. `channel` picks which field the
 * caller will actually use; email is the default and the only auto-sendable
 * channel (SMS/DM to cold contacts carries TCPA risk — kept as copy).
 */
export function draftOutreach(
  p: ProspectInput,
  c: CompanyFacts,
  channel: Channel = "email"
): Draft {
  const base =
    p.audience === "broker"
      ? brokerDraft(p, c)
      : p.audience === "shipper"
        ? shipperDraft(p, c)
        : driverDraft(p, c)
  return { channel, ...base }
}

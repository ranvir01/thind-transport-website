/**
 * FMCSA ELD output-file parser — the universal hours-of-service fallback.
 *
 * WHY THIS FILE IS THE GUARANTEED FLOOR
 * 49 CFR Part 395, Subpart B, Appendix A defines a standardized output file
 * every ELD registered with FMCSA must be able to produce (it is what a
 * roadside inspector receives during eRODS transfer). Aggregators cover the
 * popular brands; the FMCSA registry lists over a thousand devices, and this
 * file is the one interface ALL of them are legally required to share. A
 * carrier whose ELD no aggregator knows can still export this file from the
 * device menu and upload it — which is exactly the fallback the capability
 * router promises for `hos_provider`.
 *
 * WHAT IT YIELDS — AND HONESTLY DOES NOT
 * Duty-status records (RODS): who was off / sleeper / driving / on-duty and
 * when, mapped straight onto hos.ts's DutyEvent model so computeHos() can
 * answer "can this driver take this load?". It does NOT carry live GPS
 * telemetry — positions in the file are sparse event locations, and the UI
 * must label an eld-file-sourced feed as compliance-grade, not tracking.
 *
 * FILE SHAPE (Appendix A §4.8.2.1)
 * Line-oriented text. Named section headers ("ELD File Header Segment:",
 * "User List:", "CMV List:", "ELD Event List:", …, "End of File:") separate
 * CSV-ish data lines whose LAST field is a per-line data check value. Dates
 * are MMDDYY, times HHMMSS, both in the TIME ZONE OF THE CARRIER'S HOME
 * TERMINAL (App. A §4.4.3) — the header carries a UTC offset indicator this
 * parser applies to emit ISO timestamps.
 *
 * Event records that matter here:
 *   Event Type 1 (duty status): code 1=off, 2=sleeper, 3=driving, 4=on-duty
 *   Event Type 3 (indication):  code 1=personal conveyance → off (hos.ts
 *     doctrine: PC arrives as plain off-duty), 2=yard move → on-duty,
 *     0=cleared → resolved by the NEXT duty-status record, so a cleared
 *     indication emits nothing by itself.
 * Record status 1 = active; 2/3/4 (inactive-changed / change-requested /
 * change-rejected) are edit history and must not shape the computed clocks.
 *
 * PARSE DISCIPLINE
 * Tolerant of formatting noise (blank lines, CRLF, BOM), strict about
 * substance. A file with no recognizable header or no event section fails
 * safe: `ok: false` with a reason — the ingest route turns that into a
 * queued human-action item, never a silently empty log. Individual malformed
 * event lines are skipped and counted, because one corrupt line in a
 * quarter's log must not discard the quarter.
 *
 * Pure module: string in, typed result out. No DB, no I/O, no Date.now().
 */
import type { DutyEvent, DutyStatus } from "./hos"

export interface EldFileDriver {
  /** Order number the event records reference (User List column 1). */
  userOrder: number
  lastName: string
  firstName: string
  /** Duty-status changes in chronological order, ISO timestamps. */
  events: DutyEvent[]
  /** Active event lines that referenced this driver but could not be parsed. */
  skippedLines: number
}

export interface EldFileParseOk {
  ok: true
  /** ELD registration/identifier line details, for the audit trail. */
  header: {
    eldIdentifier: string | null
    carrierName: string | null
    /** Home-terminal UTC offset in hours as signed number (e.g. -8). */
    utcOffsetHours: number
  }
  drivers: EldFileDriver[]
  /** Event lines skipped file-wide (malformed or unattributable). */
  skippedLines: number
}

export interface EldFileParseError {
  ok: false
  reason: string
}

export type EldFileParseResult = EldFileParseOk | EldFileParseError

// Section headers per Appendix A. Matching is prefix-based and
// case-insensitive because vendors vary in spacing and trailing colons.
const SECTION_PATTERNS: Record<string, RegExp> = {
  header: /^ELD File Header Segment/i,
  users: /^User List/i,
  cmvs: /^CMV List/i,
  events: /^ELD Event List/i,
  // Everything after the event list that we deliberately do not consume:
  // annotations, certifications, malfunctions, login/logout, power-up,
  // unidentified-driver, trailing header/data-check segments.
}
const ANY_SECTION = /^(ELD |User List|CMV List|End of File)/i

const DUTY_BY_CODE: Record<string, DutyStatus> = {
  "1": "off",
  "2": "sleeper",
  "3": "driving",
  "4": "on_duty",
}

/** Type-3 indications, per the hos.ts doctrine for PC and yard moves. */
const INDICATION_BY_CODE: Record<string, DutyStatus> = {
  "1": "off", // personal conveyance
  "2": "on_duty", // yard move
}

export function parseEldOutputFile(text: string): EldFileParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/)

  // ---- Walk the file into sections -------------------------------------
  let section: string | null = null
  const sectionLines: Record<string, string[]> = { header: [], users: [], cmvs: [], events: [] }
  for (const raw of lines) {
    const line = raw.trim()
    if (line === "") continue
    const named = Object.entries(SECTION_PATTERNS).find(([, re]) => re.test(line))
    if (named) {
      section = named[0]
      continue
    }
    if (ANY_SECTION.test(line)) {
      // A section we recognize as a boundary but do not consume.
      section = null
      continue
    }
    if (section) sectionLines[section]!.push(line)
  }

  if (sectionLines.header!.length === 0) {
    return { ok: false, reason: "no ELD File Header Segment — not an Appendix A output file" }
  }
  if (sectionLines.events!.length === 0) {
    return { ok: false, reason: "no ELD Event List section — file carries no duty-status records" }
  }

  // ---- Header: identifier, carrier, home-terminal UTC offset -----------
  // The header segment is a handful of comma-separated lines whose exact
  // order varies less than their content; we scan rather than index.
  const headerBlob = sectionLines.header!.join(",")
  const headerFields = headerBlob.split(",").map((f) => f.trim())
  // The offset needs care: bare small integers are everywhere in the header
  // (account types, multiday basis), so an unanchored scan grabs the wrong
  // one. Two accepted shapes, in order:
  //   1. An explicitly SIGNED hour count anywhere in the header ("-8", "+5")
  //      — unambiguous, used as-is.
  //   2. On the line that carries the 24-hour period starting time (the
  //      six-digit HHMMSS field the offset is defined alongside), a bare
  //      4–11 — Appendix A stores US offsets unsigned as hours WEST of UTC,
  //      so it is applied negative. 1–3 stay ambiguous with other header
  //      fields and are deliberately not guessed at.
  const signedField = headerFields.find((f) => /^[+-]\d{1,2}$/.test(f) && Math.abs(Number(f)) <= 12)
  let utcOffsetHours = signedField ? Number(signedField) : 0
  if (!signedField) {
    const periodLine = sectionLines.header!.find((l) => l.split(",").some((f) => /^\d{6}$/.test(f.trim())))
    const west = periodLine?.split(",").map((f) => f.trim()).find((f) => /^([4-9]|1[01])$/.test(f))
    if (west) utcOffsetHours = -Number(west)
  }
  const eldIdentifier = headerFields.find((f) => /^[A-Z0-9]{4,8}$/.test(f)) ?? null
  // Carrier name: first field with letters and spaces that isn't a date/time.
  const carrierName =
    headerFields.find((f) => /[A-Za-z]{3,}/.test(f) && /\s/.test(f) && !/^\d/.test(f)) ?? null

  // ---- User list: order number → driver --------------------------------
  // <User Order>,<Account Type>,<Last Name>,<First Name>,<check>
  const driversByOrder = new Map<number, EldFileDriver>()
  for (const line of sectionLines.users!) {
    const f = line.split(",").map((s) => s.trim())
    const order = Number(f[0])
    if (!Number.isInteger(order) || order < 1 || f.length < 4) continue
    // Account type "D" is a driver; support accounts ("S") never own RODS.
    if ((f[1] ?? "").toUpperCase() !== "D") continue
    driversByOrder.set(order, {
      userOrder: order,
      lastName: f[2] ?? "",
      firstName: f[3] ?? "",
      events: [],
      skippedLines: 0,
    })
  }
  if (driversByOrder.size === 0) {
    return { ok: false, reason: "User List names no driver accounts" }
  }

  // ---- Event list -------------------------------------------------------
  // <Seq>,<RecordStatus>,<RecordOrigin>,<EventType>,<EventCode>,
  // <Date MMDDYY>,<Time HHMMSS>,<VehicleMiles>,<EngineHours>,<Lat>,<Lon>,
  // <CMV Order>,<User Order>,<Malfunction>,<Diagnostic>,<check>
  let skipped = 0
  type Parsed = { order: number; seq: number; at: string; status: DutyStatus; user: number }
  const parsedEvents: Parsed[] = []
  for (const line of sectionLines.events!) {
    const f = line.split(",").map((s) => s.trim())
    if (f.length < 13) {
      skipped++
      continue
    }
    const [seqRaw, recordStatus, , eventType, eventCode, date, time] = f
    const userOrder = Number(f[12])
    if (recordStatus !== "1") continue // edit history, not the active log
    const status =
      eventType === "1" ? DUTY_BY_CODE[eventCode ?? ""] :
      eventType === "3" ? INDICATION_BY_CODE[eventCode ?? ""] :
      undefined
    if (!status) {
      // Type-3 code 0 (indication cleared) and every other event type are
      // deliberately not duty evidence; they are not "skipped", they are
      // out of scope.
      if (eventType === "1" || (eventType === "3" && eventCode !== "0")) skipped++
      continue
    }
    const at = toIso(date ?? "", time ?? "", utcOffsetHours)
    const seq = Number.parseInt(seqRaw ?? "", 16) // sequence ids are hex per App. A
    if (!at || !driversByOrder.has(userOrder)) {
      skipped++
      const d = driversByOrder.get(userOrder)
      if (d) d.skippedLines++
      continue
    }
    parsedEvents.push({ order: parsedEvents.length, seq: Number.isNaN(seq) ? 0 : seq, at, status, user: userOrder })
  }

  if (parsedEvents.length === 0) {
    return { ok: false, reason: "event list contains no active duty-status records" }
  }

  // Chronological per driver; sequence id breaks timestamp ties (two events
  // in the same second happen at midnight rollovers and status corrections).
  parsedEvents.sort((a, b) => a.at.localeCompare(b.at) || a.seq - b.seq || a.order - b.order)
  for (const e of parsedEvents) {
    driversByOrder.get(e.user)!.events.push({ status: e.status, at: e.at })
  }

  return {
    ok: true,
    header: { eldIdentifier, carrierName, utcOffsetHours },
    drivers: [...driversByOrder.values()].filter((d) => d.events.length > 0 || d.skippedLines > 0),
    skippedLines: skipped,
  }
}

/**
 * MMDDYY + HHMMSS in home-terminal local time → ISO-8601 with the header's
 * UTC offset applied. Returns null on anything that does not scan — a bad
 * date must skip one line, not corrupt one clock.
 */
function toIso(date: string, time: string, utcOffsetHours: number): string | null {
  if (!/^\d{6}$/.test(date) || !/^\d{6}$/.test(time)) return null
  const mm = Number(date.slice(0, 2))
  const dd = Number(date.slice(2, 4))
  const yy = Number(date.slice(4, 6))
  const hh = Number(time.slice(0, 2))
  const mi = Number(time.slice(2, 4))
  const ss = Number(time.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59 || ss > 59) return null
  // Appendix A dates are two-digit years in the 2000s by construction (the
  // mandate postdates 2015; a 19xx RODS date is corrupt, not historical).
  const utcMillis = Date.UTC(2000 + yy, mm - 1, dd, hh, mi, ss) - utcOffsetHours * 3_600_000
  const d = new Date(utcMillis)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * One mapping, two entry points: /hub/loads/paste and the Inbox both turn a
 * ParsedRateCon into a prefilled LoadForm through this module. It used to live
 * inline in PasteIntake, so email intake would have needed a second copy of the
 * broker-matching heuristics — the kind of duplication that drifts silently.
 */
import { describe, expect, it } from "vitest"
import { matchBroker, overallConfidence, rateConToLoadForm, toDatetimeLocal } from "../rate-con-to-form"
import type { ParsedRateCon } from "../parser"

const CUSTOMERS = [
  { id: "c-tql", label: "Total Quality Logistics", mc: "MC-123456" },
  { id: "c-crest", label: "Pacific Crest Logistics", mc: "784512" },
  { id: "c-noMc", label: "Kent Freight Co", mc: null },
]

function parsed(over: Partial<ParsedRateCon> = {}): ParsedRateCon {
  return { stops: [], ...over }
}

describe("matchBroker", () => {
  it("matches on MC first, ignoring punctuation in the stored number", () => {
    const p = parsed({
      mcNumber: { value: "123456", confidence: "high" },
      brokerName: { value: "Pacific Crest Logistics", confidence: "high" },
    })
    // MC wins even though the NAME points at a different customer — the MC is
    // the identifier a broker cannot typo their way out of.
    expect(matchBroker(p, CUSTOMERS)).toBe("c-tql")
  })

  it("falls back to a loose two-way name match", () => {
    expect(matchBroker(parsed({ brokerName: { value: "PACIFIC CREST", confidence: "medium" } }), CUSTOMERS))
      .toBe("c-crest")
    // The rate con's full legal name contains the shorter customer label.
    expect(matchBroker(parsed({ brokerName: { value: "Kent Freight Co LLC", confidence: "low" } }), CUSTOMERS))
      .toBe("c-noMc")
  })

  it("returns empty rather than guessing when nothing matches", () => {
    expect(matchBroker(parsed(), CUSTOMERS)).toBe("")
    expect(matchBroker(parsed({ mcNumber: { value: "999999", confidence: "high" } }), CUSTOMERS)).toBe("")
    expect(matchBroker(parsed({ brokerName: { value: "Zeta Freight", confidence: "high" } }), CUSTOMERS)).toBe("")
  })

  it("does not match a customer whose MC is null against a parsed MC", () => {
    expect(matchBroker(parsed({ mcNumber: { value: "", confidence: "low" } }), CUSTOMERS)).toBe("")
  })
})

describe("toDatetimeLocal", () => {
  it("places an 08:00 placeholder because rate cons carry a date, not a time", () => {
    expect(toDatetimeLocal("2026-06-12")).toBe("2026-06-12T08:00")
  })

  it("returns empty for missing and unparseable dates", () => {
    expect(toDatetimeLocal(undefined)).toBe("")
    expect(toDatetimeLocal("next Tuesday")).toBe("")
  })
})

describe("rateConToLoadForm", () => {
  it("prefills money as dollars, weight as a string, and the customer reference", () => {
    const form = rateConToLoadForm(
      parsed({
        reference: { value: "PCL-99120", confidence: "high" },
        linehaulCents: { value: 320000, confidence: "high" },
        fuelSurchargeCents: { value: 35000, confidence: "medium" },
        weightLbs: { value: 42000, confidence: "high" },
        commodity: { value: "paper", confidence: "medium" },
        equipment: { value: "reefer", confidence: "high" },
      }),
      CUSTOMERS
    )
    expect(form.customer_reference).toBe("PCL-99120")
    expect(form.linehaul).toBe("3200.00")
    expect(form.fuel_surcharge).toBe("350.00")
    expect(form.weight_lbs).toBe("42000")
    expect(form.commodity).toBe("paper")
    expect(form.equipment).toBe("reefer")
  })

  it("leaves fields the parser could not read at their empty-form defaults", () => {
    const form = rateConToLoadForm(parsed(), CUSTOMERS)
    // A blank box must always mean "we did not find this", never a guess.
    expect(form.linehaul).toBe("")
    expect(form.fuel_surcharge).toBe("")
    expect(form.weight_lbs).toBe("")
    expect(form.commodity).toBe("")
    expect(form.customer_id).toBe("")
    expect(form.equipment).toBe("dry_van")
  })

  it("maps stops when there are at least two", () => {
    const form = rateConToLoadForm(
      parsed({
        stops: [
          { type: "pickup", city: "Kent", state: "WA", date: "2026-06-12", confidence: "high" },
          { type: "delivery", city: "Fresno", state: "CA", confidence: "medium" },
        ],
      }),
      CUSTOMERS
    )
    expect(form.stops).toHaveLength(2)
    expect(form.stops[0]).toMatchObject({ type: "pickup", city: "Kent", state: "WA", fcfs: false, appt_start: "2026-06-12T08:00" })
    // No date parsed means no appointment — first come, first served, which is
    // the honest default rather than inventing a time.
    expect(form.stops[1]).toMatchObject({ type: "delivery", city: "Fresno", state: "CA", fcfs: true, appt_start: "" })
  })

  it("keeps the empty pickup/delivery pair when fewer than two stops parsed", () => {
    const one = rateConToLoadForm(
      parsed({ stops: [{ type: "pickup", city: "Kent", state: "WA", confidence: "low" }] }),
      CUSTOMERS
    )
    const none = rateConToLoadForm(parsed(), CUSTOMERS)
    // One stop is not a lane; the dispatcher gets a blank pair to fill in.
    expect(one.stops).toEqual(none.stops)
    expect(one.stops).toHaveLength(2)
  })
})

describe("overallConfidence", () => {
  const hi = { value: "x", confidence: "high" as const }
  it("is the weakest of the fields that matter for booking", () => {
    expect(overallConfidence(parsed())).toBe("low")
    expect(
      overallConfidence(parsed({ brokerName: hi, reference: hi, linehaulCents: { value: 1, confidence: "low" } }))
    ).toBe("low")
    expect(
      overallConfidence(parsed({ brokerName: hi, reference: { value: "r", confidence: "medium" } }))
    ).toBe("medium")
  })

  it("only reaches high when a full lane came through as well", () => {
    const fields = { brokerName: hi, reference: hi, linehaulCents: { value: 1, confidence: "high" as const } }
    expect(overallConfidence(parsed(fields))).toBe("medium")
    expect(
      overallConfidence(
        parsed({
          ...fields,
          stops: [
            { type: "pickup", city: "Kent", state: "WA", confidence: "high" },
            { type: "delivery", city: "Fresno", state: "CA", confidence: "high" },
          ],
        })
      )
    ).toBe("high")
  })
})

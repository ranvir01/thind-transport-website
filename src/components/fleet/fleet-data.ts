import { Box, Layers, Snowflake, type LucideIcon } from "lucide-react"
import { COMPANY_INFO, EQUIPMENT, SERVICES, SUPPORT } from "@/lib/constants"

/**
 * The equipment facts /fleet prints, in one place.
 *
 * The page used to carry this inline inside a 919-line `"use client"` file,
 * with the model years, the makes and the support hours typed by hand next to
 * the constants that already published them. Everything derivable now derives:
 * model years and the APU line come from `EQUIPMENT`, the trailer list is
 * keyed off `SERVICES.types` (so a fourth freight type appears here the day it
 * is added to the constant, and a removed one stops rendering), and the
 * dispatch/roadside language comes from `SUPPORT`.
 *
 * Nothing here is a new claim. Every spec below was already on the page before
 * this pass; the marketing adjectives that came with them ("Driver Favorite",
 * "Comfort King", "industry-best sleeper", the MPG figures nobody measured)
 * are gone, because a spec sheet that also flatters itself reads as neither.
 * The two tractors the page's JSON-LD names — Cascadia/DD15 and VNL 860/D13 —
 * keep their published engine, power, transmission and sleeper so the visible
 * page and the structured data in `layout.tsx` still agree.
 */

export interface Tractor {
  /** Make and model, as it reads on the door. */
  name: string
  engine: string
  power: string
  torque: string
  transmission: string
  sleeper: string
  /** The manufacturer's driver-assist suite on that build. */
  safety: string
}

export const TRACTORS: Tractor[] = [
  {
    name: "Freightliner Cascadia",
    engine: "Detroit DD15",
    power: "505 HP",
    torque: "1,850 lb-ft",
    transmission: "DT12 automated",
    sleeper: "77\" mid-roof sleeper",
    safety: "Detroit Assurance",
  },
  {
    name: "Freightliner Cascadia",
    engine: "Detroit DD15",
    power: "455 HP",
    torque: "1,650 lb-ft",
    transmission: "DT12 automated",
    sleeper: "72\" raised roof",
    safety: "Detroit Assurance",
  },
  {
    name: "Volvo VNL 860",
    engine: "Volvo D13",
    power: "500 HP",
    torque: "1,850 lb-ft",
    transmission: "I-Shift automated",
    sleeper: "77\" Globetrotter XL",
    safety: "Volvo Active Driver Assist",
  },
  {
    name: "Volvo VNL 760",
    engine: "Volvo D13",
    power: "455 HP",
    torque: "1,750 lb-ft",
    transmission: "I-Shift 12-speed",
    sleeper: "70\" mid-roof",
    safety: "Volvo Active Driver Assist",
  },
]

/** The two builds the route's Vehicle structured data names, looked up here
 *  rather than retyped in `layout.tsx`, so the machine-readable description of
 *  a truck and the spec sheet a driver reads cannot describe different trucks. */
export const SCHEMA_TRACTORS = {
  cascadia: TRACTORS[0],
  volvo: TRACTORS[2],
} as const

/** The inverter range printed on the spec sheet. Exported because
 *  `layout.tsx` publishes it as part of the Vehicle structured data, and a
 *  per-truck wattage there that the page does not print is a contradiction a
 *  crawler reads and a driver cannot. */
export const INVERTER_RANGE = "1800W-2500W"

/** On every tractor, whichever one you are handed. */
export const STANDARD_EQUIPMENT: string[] = [
  EQUIPMENT.apu,
  `${INVERTER_RANGE} inverter`,
  "Full-size fridge",
  "Collision mitigation",
  "Lane departure warning",
  "Adaptive cruise control",
  "Electronic stability control",
  "ABS with disc brakes",
]

type TrailerType = (typeof SERVICES.types)[number]

interface TrailerDetail {
  icon: LucideIcon
  summary: string
  specs: string[]
}

/** Keyed by `SERVICES.types`, so the freight we say we haul and the trailers
 *  we say we pull cannot drift apart — a new type fails to compile until it
 *  has a spec block here. */
const TRAILER_DETAIL: Record<TrailerType, TrailerDetail> = {
  Flatbed: {
    icon: Layers,
    summary: "Heavy and open-deck freight. Securement equipment comes with the trailer.",
    specs: [
      "48' and 53' decks",
      "Coil package ready",
      "Tarps provided",
      "Chains, binders and winches",
      "Headache racks",
    ],
  },
  Reefer: {
    icon: Snowflake,
    summary: "Temperature-controlled units for perishables, monitored on every load.",
    specs: [
      "Thermo King unit",
      "-20°F to 70°F range",
      "Multi-temp ready",
      "Remote temperature monitoring",
      "GPS tracking",
    ],
  },
  "Dry Van": {
    icon: Box,
    summary: "General freight. Regularly inspected and maintained.",
    specs: [
      "53' standard length",
      "Air-ride suspension",
      "Swing doors",
      "Logistics posts",
      "LED interior lights",
    ],
  },
}

export const TRAILERS = SERVICES.types.map((type) => ({ type, ...TRAILER_DETAIL[type] }))

/** Renders on screen and as the page's one FAQPage entity (FAQAccordion emits
 *  it from this same array — `layout.tsx` deliberately emits none). */
export const FLEET_FAQS: { question: string; answer: string }[] = [
  {
    question: `What year models are in the ${COMPANY_INFO.name} fleet?`,
    answer: `Every tractor is a ${EQUIPMENT.modelYears} model year. We run ${EQUIPMENT.makes} — Cascadias on the Detroit DD15, VNLs on the Volvo D13.`,
  },
  {
    question: "Do all trucks come with APUs and inverters?",
    answer: `${EQUIPMENT.apu}, plus a ${INVERTER_RANGE} inverter. You are not idling for climate control, and you can run your devices off the inverter overnight.`,
  },
  {
    question: "What safety features are included?",
    answer:
      "Detroit Assurance on the Freightliners, Volvo Active Driver Assist on the Volvos. Both cover lane departure warning, collision mitigation, adaptive cruise control, electronic stability control, and ABS with disc brakes.",
  },
  {
    question: "What happens if my truck breaks down on the road?",
    answer:
      "Call dispatch any hour — we arrange the roadside call and, if it can't be fixed on the shoulder, get you to a shop. We tell you what we cover before you sign anything.",
  },
  {
    question: "How often is preventive maintenance performed?",
    answer:
      "Every truck runs a scheduled preventive-maintenance inspection, and we complete DOT inspections ahead of their due dates so trucks stay on the road.",
  },
  {
    question: "Can I personalize my assigned truck?",
    answer: `The truck stays company property, but seat covers, phone mounts and other non-permanent additions are fine. Ask dispatch — someone answers ${SUPPORT.phrase}.`,
  },
]

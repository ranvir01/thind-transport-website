import {
  BadgeCheck, Calculator, DollarSign, FileCheck, Fuel, MapPin, Phone, Route,
  Shield, Smartphone, Timer, Truck, Users,
} from "lucide-react"
import type { RelatedLink } from "@/components/shared/RelatedLinks"

/**
 * The site's useful destinations, in one place.
 *
 * Every marketing page ends with a "where to go next" block, and hand-writing
 * six links per page meant they drifted: /pay-breakdown existed for months
 * without a single page linking to it, and the freight-class calculator was
 * reachable from exactly two. Defining the catalogue once and filtering by the
 * current path means a new tool is one entry away from appearing everywhere it
 * belongs.
 */

const DRIVER: RelatedLink[] = [
  {
    href: "/pay-rates",
    title: "Pay table",
    blurb: "Per-mile rate, typical year, and home time for every lane — one table.",
    icon: Calculator,
    kind: "Tool",
  },
  {
    href: "/pay-breakdown",
    title: "Settlement, line by line",
    blurb: "Gross, fuel surcharge, deductions, and the number that lands in the account.",
    icon: DollarSign,
    kind: "Guide",
  },
  {
    href: "/fuel-program",
    title: "Fuel savings calculator",
    blurb: "What the fuel card takes off your cost per mile, on your own MPG.",
    icon: Fuel,
    kind: "Tool",
  },
  {
    href: "/resources",
    title: "Hours-of-service planner",
    blurb: "Your 11, your 14, the 30-minute break and what's left in your 70 — worked out.",
    icon: Timer,
    kind: "Tool",
  },
  {
    href: "/routes",
    title: "Lanes we actually run",
    blurb: "Corridors, frequency, and the home time each one really means.",
    icon: Route,
    kind: "Page",
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay on one screen — and it works with no signal.",
    icon: Smartphone,
    kind: "Tool",
  },
  {
    href: "/benefits",
    title: "What we offer",
    blurb: "The real list — including a straight answer on what we don't offer yet.",
    icon: Shield,
    kind: "Page",
  },
  {
    href: "/cdl-jobs",
    title: "Jobs by state",
    blurb: "Markets, corridors and the freight we move in the state you live in.",
    icon: MapPin,
    kind: "Page",
  },
  {
    href: "/trust",
    title: "Verify us first",
    blurb: "Authority, insurance and safety record against the FMCSA source.",
    icon: BadgeCheck,
    kind: "Verify",
  },
  {
    href: "/jobs",
    title: "Open jobs",
    blurb: "Local, regional, OTR, and owner-operator — one posting each for Google Jobs.",
    icon: MapPin,
    kind: "Page",
  },
  {
    href: "/refer",
    title: "Send this job",
    blurb: "Copy-paste WhatsApp, Facebook, and QR codes so current drivers can forward it.",
    icon: Users,
    kind: "Tool",
  },
  {
    href: "/apply",
    title: "Apply",
    blurb: "About a minute, and a person calls you back — usually the same day.",
    icon: Users,
    kind: "Form",
  },
]

const FREIGHT: RelatedLink[] = [
  {
    href: "/quote",
    title: "Quote a lane",
    blurb: "Driving miles and a real transit window, then straight through to dispatch.",
    icon: Route,
    kind: "Tool",
  },
  {
    href: "/tools/freight-class-calculator",
    title: "Freight class calculator",
    blurb: "Dimensions and weight in, NMFC class out — before the LTL quote comes back wrong.",
    icon: Calculator,
    kind: "Tool",
  },
  {
    href: "/api/carrier-packet",
    title: "Carrier snapshot PDF",
    blurb: "Authority, insurance and equipment on one page. Instant, no form.",
    icon: FileCheck,
    kind: "Tool",
  },
  {
    href: "/fleet",
    title: "Equipment specs",
    blurb: "Every tractor and trailer we run — what actually shows up at your dock.",
    icon: Truck,
    kind: "Page",
  },
  {
    href: "/routes",
    title: "Lanes and frequency",
    blurb: "Where our trucks already are. Matching your freight to a live lane costs less.",
    icon: Route,
    kind: "Page",
  },
  {
    href: "/trust",
    title: "Verify our authority",
    blurb: "USDOT, MC, liability and safety record, with the FMCSA links to check them.",
    icon: BadgeCheck,
    kind: "Verify",
  },
  {
    href: "/contact",
    title: "Talk to dispatch",
    blurb: "One number, and the desk that books the load answers it.",
    icon: Phone,
    kind: "Form",
  },
]

/** Links for a driver-facing page, minus wherever the visitor already is. */
export function driverLinks(exclude: string[] = [], limit = 6): RelatedLink[] {
  return DRIVER.filter((l) => !exclude.includes(l.href)).slice(0, limit)
}

/** Links for a shipper/broker-facing page, minus the current page. */
export function freightLinks(exclude: string[] = [], limit = 6): RelatedLink[] {
  return FREIGHT.filter((l) => !exclude.includes(l.href)).slice(0, limit)
}

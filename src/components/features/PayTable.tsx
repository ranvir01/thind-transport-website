import Link from "next/link"
import { PAY_RATES } from "@/lib/constants"

/**
 * The site's ONE pay representation. Static and server-rendered: every figure
 * comes from PAY_RATES, so this table cannot drift the way the three
 * interactive calculators it replaced did — two of them shipped invented
 * numbers. A driver on a phone in a yard wants the number, not sliders.
 *
 * No wrapper background: the page places it inside a paper island
 * ("bg-paper text-ink rounded-m-3 border border-ink/15 p-6"), so every colour
 * here is an ink/signal-on-paper pair from DIRECTION.md §1. The "same rate on
 * every lane" footnote is derived from the constants the way HomeTimeLanes
 * derives it, and switches itself off the day the lanes stop paying the same.
 */

const CD = PAY_RATES.companyDriver
const OO = PAY_RATES.ownerOperator

// Widened to string[] on purpose: comparing two distinct `as const` literals is
// a TypeScript error, so the day the rates diverge this would fail to compile
// instead of quietly switching the copy off.
const COMPANY_RATES: string[] = [CD.local.perMile, CD.regional.perMile, CD.otr.perMile]
const SAME_RATE = COMPANY_RATES.every((rate) => rate === COMPANY_RATES[0])

function homeTimeLabel(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === "daily") return "Home daily"
  if (lower === "weekly") return "Home weekly"
  return `${raw} out`
}

const ROWS = [
  {
    lane: "Local",
    pay: `${CD.local.perMile}/mi`,
    year: CD.local.annual,
    home: homeTimeLabel(CD.local.homeTime),
    href: "/apply?type=company&lane=local",
  },
  {
    lane: "Regional",
    pay: `${CD.regional.perMile}/mi`,
    year: CD.regional.annual,
    home: homeTimeLabel(CD.regional.homeTime),
    href: "/apply?type=company&lane=regional",
  },
  {
    lane: "OTR",
    pay: `${CD.otr.perMile}/mi`,
    year: CD.otr.annual,
    home: homeTimeLabel(CD.otr.homeTime),
    href: "/apply?type=company&lane=otr",
  },
  {
    lane: "Owner-op",
    pay: `${OO.commission} + ${OO.fuelSurcharge} FSC`,
    year: `${OO.annualGross} gross`,
    home: "You pick",
    href: "/apply?type=owner",
  },
] as const

const HEAD_CLASS = "py-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2"

export function PayTable() {
  return (
    <div className="mx-auto max-w-3xl">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Pay by lane: per-mile rate, typical annual range, and home time
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className={`${HEAD_CLASS} pr-2`}>
              Lane
            </th>
            <th scope="col" className={`${HEAD_CLASS} pr-2`}>
              Pay
            </th>
            <th scope="col" className={`${HEAD_CLASS} pr-2`}>
              Typical year
            </th>
            <th scope="col" className={HEAD_CLASS}>
              Home
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.lane} className="border-b border-ink/15">
              <th scope="row" className="py-4 pr-2 align-top font-display text-m-body font-bold text-ink">
                {/* text-ink is explicit: globals.css paints every marketing
                    anchor steel by default, which is invisible on paper. */}
                <Link
                  href={r.href}
                  className="text-ink underline-offset-4 hover:text-signal hover:underline"
                >
                  {r.lane}
                </Link>
              </th>
              <td className="py-4 pr-2 align-top font-mono text-m-body font-semibold tabular-nums text-signal">
                {r.pay}
              </td>
              <td className="py-4 pr-2 align-top font-mono text-m-body tabular-nums text-ink">{r.year}</td>
              <td className="py-4 align-top text-m-body text-ink-2">{r.home}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 max-w-measure text-m-micro text-ink-2">
        {SAME_RATE ? (
          <span>{`Same ${CD.local.perMile}/mile on every company lane — picking local is not a pay cut. `}</span>
        ) : null}
        <span>Weekly direct deposit. Annual figures are typical ranges at typical miles; your miles decide. </span>
        <Link href="/pay-breakdown" className="font-semibold text-signal underline-offset-4 hover:underline">
          Where the money goes
        </Link>
      </p>
    </div>
  )
}

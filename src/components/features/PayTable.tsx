import Link from "next/link"
import { PAY_RATES } from "@/lib/constants"

/**
 * The site's ONE pay representation (constraint 12, docs/design/
 * home-rework-2026-08.md). Static and server-rendered: every figure comes
 * from PAY_RATES, so this table cannot drift the way the three interactive
 * calculators it replaced did — two of them shipped invented numbers.
 * A driver on a phone in a yard wants the number, not sliders.
 */

const CD = PAY_RATES.companyDriver
const OO = PAY_RATES.ownerOperator

const ROWS = [
  {
    lane: "Local",
    pay: `${CD.local.perMile}/mi`,
    year: CD.local.annual,
    home: "Home daily",
    href: "/apply?type=company&lane=local",
  },
  {
    lane: "Regional",
    pay: `${CD.regional.perMile}/mi`,
    year: CD.regional.annual,
    home: "Home weekly",
    href: "/apply?type=company&lane=regional",
  },
  {
    lane: "OTR",
    pay: `${CD.otr.perMile}/mi`,
    year: CD.otr.annual,
    home: `${CD.otr.homeTime} out`,
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

export function PayTable() {
  return (
    <div className="mx-auto max-w-3xl">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Pay by lane: per-mile rate, typical annual range, and home time
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="py-3 pr-2 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Lane
            </th>
            <th scope="col" className="py-3 pr-2 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Pay
            </th>
            <th scope="col" className="py-3 pr-2 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Typical year
            </th>
            <th scope="col" className="py-3 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-ink-2">
              Home
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.lane} className="border-b border-[rgba(20,22,24,0.15)]">
              <th scope="row" className="py-4 pr-2 align-top font-display text-m-body font-bold text-ink">
                <Link
                  href={r.href}
                  className="underline-offset-4 hover:text-signal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  {r.lane}
                </Link>
              </th>
              <td className="py-4 pr-2 align-top font-display text-m-body font-bold text-signal">
                {r.pay}
              </td>
              <td className="py-4 pr-2 align-top text-m-body text-ink">{r.year}</td>
              <td className="py-4 align-top text-m-body text-ink-2">{r.home}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 max-w-measure text-m-micro text-ink-2">
        Same {CD.local.perMile}/mile on every company lane — picking local is not a pay
        cut. Weekly direct deposit. Sign-on {CD.signOnBonus.replace(" (First Year)", "")}{" "}
        company (first year), {OO.signOnBonus} owner-operator. Annual figures are typical
        ranges at typical miles; your miles decide.{" "}
        <Link href="/pay-breakdown" className="font-semibold text-signal underline-offset-4 hover:underline">
          Where the money goes
        </Link>
      </p>
    </div>
  )
}

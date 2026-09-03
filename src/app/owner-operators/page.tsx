import { Metadata } from "next"
import Link from "next/link"
import { BENEFITS, COMPANY_INFO, PAY_RATES, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { PersonaRemember } from "@/components/shared/PersonaRemember"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"
import { Reveal } from "@/components/ui/Reveal"

const OO = PAY_RATES.ownerOperator

export const metadata: Metadata = {
  title: `Owner Operators | ${OO.commission} of the Linehaul, ${OO.fuelSurcharge} of the Fuel Surcharge`,
  description:
    `Lease on with ${COMPANY_INFO.name} in ${COMPANY_INFO.location}. ${OO.commission} of the linehaul, ${OO.fuelSurcharge} of the fuel surcharge, and a settlement statement that shows every deduction line by line. No forced dispatch. USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}.`,
  alternates: { canonical: "/owner-operators" },
}

/**
 * The no-forced-dispatch promise, read out of BENEFITS rather than retyped —
 * it is the third fact in the hero and the first answer in the FAQ, and those
 * two drifting apart is how a policy becomes a slogan.
 */
const NO_FORCED_DISPATCH =
  BENEFITS.ownerOperator.find((benefit) => benefit.startsWith("No forced dispatch")) ?? "No forced dispatch"
const NFD_PARTS = NO_FORCED_DISPATCH.split(" - ")
const NFD_TERM = NFD_PARTS[0]
const NFD_DETAIL = NFD_PARTS.slice(1).join(" - ")

/**
 * Owner-operators are buying an arrangement, not a job — so the page leads
 * with the split and the deductions rather than with home time and benefits.
 * Every figure comes from PAY_RATES so this page cannot drift away from
 * /pay-rates the way the site's earnings copy has before.
 */
const TERMS = [
  {
    label: "Your split",
    value: OO.commission,
    detail: "of the linehaul on every load. You see the rate confirmation, so you can check the math on any load you haul.",
  },
  {
    label: "Fuel surcharge",
    value: OO.fuelSurcharge,
    detail: "passes through to you. We don't keep a slice of FSC — it exists to cover your fuel, not to pad ours.",
  },
  {
    label: "Typical gross",
    value: OO.annualGross,
    detail: `a year, working out to roughly ${OO.perMile} a mile depending on the lanes you take.`,
  },
  {
    label: "Sign-on",
    value: OO.signOnBonus,
    detail: "for owner-operators, paid on the schedule we'll put in writing before you sign anything.",
  },
] as const

const DEDUCTIONS = [
  { name: "Insurance", note: "Occupational accident and physical damage, at our fleet rate — usually below what an individual can buy." },
  { name: "Escrow", note: "Held against damage and shortages, refundable when you leave in good standing. The balance shows on every settlement." },
  { name: "Fuel card", note: "Optional. Our discount at the pump, deducted at cost — we do not mark it up." },
  { name: "Trailer rental", note: "Only if you use ours. Bring your own and this line doesn't exist." },
] as const

const FAQ = [
  {
    q: "Is there forced dispatch?",
    a: `No. You see the load, the rate, and the lane before you accept it. Turning one down doesn't cost you your place in line — if it did, the ${OO.commission} split wouldn't mean much.`,
  },
  {
    q: "How often do I get paid, and how fast?",
    a: "Weekly settlements. If you want it faster on a specific load, ask about advances — we'll tell you the fee up front rather than burying it in a deduction.",
  },
  {
    q: "What do I need to lease on?",
    a: `A valid CDL, ${PAY_RATES.requirements.otr}, your own tractor with current registration and inspection, and the insurance we'll walk you through. We run flatbed, reefer, and dry van across ${STATS.statesCovered} states.`,
  },
  {
    q: "Can I see a real settlement statement before I commit?",
    a: "Yes — ask and we'll show you a real one with the numbers changed. Anyone who won't show you the statement before you sign is telling you something.",
  },
  {
    q: "Do you offer lease-purchase?",
    a: "Talk to us directly. We'd rather have that conversation on the phone with real numbers for your situation than publish terms that turn out not to apply to you.",
  },
] as const

export default function OwnerOperatorsPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <PersonaRemember persona="owner-operators" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <AsphaltHero
        breadcrumb={
          /* The trail lives inside the asphalt band; its own bar chrome
             (opaque ground, blur, nav-clearance padding, centred row, second
             gutter) is overridden here rather than stacked above the hero. */
          <PageBreadcrumb
            pageName="Owner Operators"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow={`Lease on · ${COMPANY_INFO.location}`}
        title="The split, and every deduction, before you sign."
        description="You already know what a bad lease looks like — a good percentage on paper and a settlement full of lines nobody will explain. Here is the split, here are every one of the deductions, and here is the statement you'll get every week."
      >
        {/* Three facts, one of them the size of the argument. */}
        <dl className="rounded-m-3 border border-white/10 bg-white/5 p-6">
          <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            Your split
          </dt>
          <dd className="mt-1 font-mono text-m-display font-bold tabular-nums text-paper">{OO.commission}</dd>
          <dd className="text-m-body text-paper/70">of the linehaul on every load</dd>

          <dt className="mt-6 border-t border-white/10 pt-5 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            Fuel surcharge
          </dt>
          <dd className="mt-1 font-mono text-m-h3 font-bold tabular-nums text-paper">{OO.fuelSurcharge}</dd>
          <dd className="text-m-body text-paper/70">passes through to you</dd>

          <dt className="mt-6 border-t border-white/10 pt-5 font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
            {NFD_TERM}
          </dt>
          {NFD_DETAIL ? <dd className="mt-1 text-m-body text-paper/70">{NFD_DETAIL}</dd> : null}
        </dl>
      </AsphaltHero>

      {/* The arrangement — four published numbers as mono rows, not four
          gradient cards. */}
      <section aria-labelledby="arrangement-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2 id="arrangement-heading" className="font-display text-m-h2 font-bold text-white text-balance">
                The arrangement
              </h2>
              <p className="mt-3 max-w-measure text-m-body text-steel-200">
                Four numbers. If a recruiter anywhere else won&apos;t give you all four on the first call,
                that is the answer.
              </p>
            </Reveal>

            <dl className="mt-8 border-t border-white/10">
              {TERMS.map(({ label, value, detail }, i) => (
                <Reveal
                  key={label}
                  index={i}
                  className="grid gap-x-6 gap-y-1 border-b border-white/10 py-5 sm:grid-cols-[8rem_14rem_1fr] sm:items-baseline"
                >
                  <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-steel-300">
                    {label}
                  </dt>
                  <dd className="font-mono text-m-h3 font-bold tabular-nums text-white">{value}</dd>
                  <dd className="max-w-measure text-m-body text-steel-200">{detail}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* The trust lever, on paper: the deductions are the dense data a driver
          actually reads twice. The page's one paper island. */}
      <section aria-labelledby="deductions-heading" className="bg-navy-950 pb-section">
        <div className="container">
          <Reveal className="mx-auto max-w-4xl rounded-m-3 border border-ink/15 bg-paper p-6 text-ink md:p-8">
            <h2 id="deductions-heading" className="font-display text-m-h2 font-bold text-ink text-balance">
              Every deduction, before you sign
            </h2>
            <p className="mt-3 max-w-measure text-m-lede text-ink-2">
              This is the part most carriers make you find out about on your third settlement. There are
              four, and only the ones you actually use appear on your statement.
            </p>

            <dl className="mt-8 border-t border-ink/15">
              {DEDUCTIONS.map((d) => (
                <div key={d.name} className="flex flex-col gap-1 border-b border-ink/15 py-4 sm:flex-row sm:gap-6">
                  <dt className="font-mono text-m-body font-semibold text-ink sm:w-44 sm:shrink-0">{d.name}</dt>
                  <dd className="max-w-measure text-m-body text-ink-2">{d.note}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 rounded-m-2 border border-ink/15 p-5">
              <h3 className="font-display text-m-h4 font-bold text-ink">You get the same screen we do</h3>
              <p className="mt-2 max-w-measure text-m-body text-ink-2">
                Settlements run in our own system, LoadOff. Each one lists the loads, the linehaul, the
                fuel surcharge, and every deduction as its own line — not one lump sum labelled
                &ldquo;expenses.&rdquo; Your escrow balance is on there too, every week, so you always
                know what you&apos;d get back.
              </p>
              <p className="mt-3">
                <Link
                  href="/pay-breakdown"
                  className="inline-flex min-h-[44px] items-center text-m-body font-semibold text-signal underline-offset-4 hover:underline"
                >
                  See how the pay breaks down
                </Link>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-asphalt py-section text-paper">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 id="faq-heading" className="font-display text-m-h2 font-bold text-paper text-balance">
              Straight answers
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {FAQ.map((item, i) => (
                <Reveal key={item.q} index={i % 2}>
                  <h3 className="font-display text-m-h4 font-bold text-paper">{item.q}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-paper/80">{item.a}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The page's ONE closing block. The hero carries the red Apply; this is
          the phone number and the one link out — the second uppercase pill CTA
          band that used to sit here was the same offer a screen later. */}
      <section aria-labelledby="lease-on-heading" className="bg-navy-950 py-section-tight text-white">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2 id="lease-on-heading" className="font-display text-m-h2 font-bold text-white text-balance">
              {`Bring your truck. Keep ${OO.commission}.`}
            </h2>
            <p className="mt-4 text-m-body text-steel-200">
              {`${STATS.trucksInFleet} trucks out of ${COMPANY_INFO.location}, family-owned since ${COMPANY_INFO.founded}. Call and ask us anything — including the questions this page didn't answer.`}
            </p>
            <p className="mt-8">
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[48px] items-center gap-2 text-m-lede font-semibold text-white underline-offset-4 hover:text-signal-up hover:underline"
              >
                <span>Call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </p>
            <p className="mt-2">
              <Link
                href="/drivers"
                className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-steel-200 underline-offset-4 hover:text-white hover:underline"
              >
                Company driver instead? See company driver pay
              </Link>
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        tone="dark"
        title="Run the numbers yourself"
        intro="Nothing on this page is a claim you can't check with a tool on this site."
        links={driverLinks(["/owner-operators"], 9)}
      />
    </div>
  )
}

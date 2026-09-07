import Image from "next/image"
import { Phone, Quote, ShieldCheck } from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

const yearsRunning = new Date().getFullYear() - COMPANY_INFO.founded

export const ThindPromise = () => {
  return (
    <section className="relative overflow-hidden brand-section-panel py-20 md:py-28">
      <div className="accent-orb -top-10 -left-10 h-80 w-80 bg-orange-600/15" />
      <div className="accent-orb bottom-0 right-0 h-72 w-72 bg-gold-600/10" />

      <div className="container relative z-10 px-4">
        <div className="grid items-center gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
          {/* Home-base photo of the operation. Honest real imagery of the fleet/yard.
              PLACEHOLDER: to feature a real photo of the owner, swap the src below
              for a portrait of Sukhdev Thind and update the alt + caption. */}
          <Reveal className="relative mx-auto w-full max-w-sm md:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-fleet-lg border border-steel-700/70 shadow-2xl">
              <Image
                src="/images/generated/yard-morning-kent.webp"
                alt="Sunrise over the Thind Transport yard in Kent, Washington with Mount Rainier on the horizon"
                fill
                sizes="(max-width: 768px) 90vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/25 to-transparent" />

              {/* Nameplate */}
              <div className="absolute bottom-6 left-6 right-6">
                <p className="mb-1 font-display text-xs uppercase tracking-[0.25em] text-orange">
                  Home base
                </p>
                <h3 className="font-display text-2xl font-bold text-white">
                  {COMPANY_INFO.location}
                </h3>
                <p className="text-sm text-steel-300">
                  Family-run since {COMPANY_INFO.founded} · {yearsRunning} years
                  on the road
                </p>
              </div>
            </div>

            {/* Floating credibility chip */}
            <div className="absolute -bottom-5 -right-3 hidden items-center gap-2 rounded-fleet border border-orange/40 bg-navy-800/95 px-4 py-3 shadow-cta backdrop-blur sm:flex">
              <ShieldCheck className="h-5 w-5 text-orange" />
              <div className="leading-tight">
                <p className="font-display text-lg font-bold text-white">
                  {yearsRunning} yrs
                </p>
                <p className="text-[11px] uppercase tracking-wider text-steel-400">
                  family-run
                </p>
              </div>
            </div>

            <div className="absolute -top-5 -left-5 -z-10 h-24 w-24 rounded-full bg-orange-600/20 blur-2xl" />
          </Reveal>

          {/* Story */}
          <Reveal className="space-y-7" index={1}>
            <span className="fleet-badge">A note from the owner</span>

            <h2 className="text-white">
              We&apos;re not a call center.{" "}
              <span className="text-gradient-accent">
                We&apos;re your people.
              </span>
            </h2>

            <div className="relative space-y-5 text-lg leading-relaxed text-steel-300">
              <Quote className="absolute -left-1 -top-3 h-8 w-8 text-orange/20" />
              <p className="pl-5">
                &ldquo;I started {COMPANY_INFO.name} in {COMPANY_INFO.founded}{" "}
                out of {COMPANY_INFO.location}. I know what it&apos;s like
                behind the wheel &mdash; the long hours, the missed dinners, and
                the feeling of being just another truck number to a dispatcher
                who&apos;s never met you.&rdquo;
              </p>
              <p className="pl-5">
                &ldquo;That&apos;s the reason we run this differently.
                Owner-operators keep{" "}
                <strong className="text-white">{PAY_RATES.ownerOperator.commission} of gross</strong>. Company
                drivers run{" "}
                <strong className="text-white">2023-2025 Cascadias and VNLs</strong>. And when
                you call, you get a real person who knows your name &mdash; not
                a queue.&rdquo;
              </p>
              <p className="pl-5">
                &ldquo;When you drive for us, you&apos;re not moving freight for
                strangers. You&apos;re building something with a family
                that&apos;s been doing this for {yearsRunning} years.
                That&apos;s my promise.&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-5 border-t border-steel-700/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl font-bold italic text-white">
                  {COMPANY_INFO.owner}
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-steel-400">
                  Founder, {COMPANY_INFO.name}
                </p>
              </div>

              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="group inline-flex items-center justify-center gap-2 rounded-fleet bg-orange-600 px-6 py-3.5 font-display font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-400 hover:shadow-cta-hover"
              >
                <Phone className="h-5 w-5 transition-transform group-hover:rotate-12" />
                Talk to a real person
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

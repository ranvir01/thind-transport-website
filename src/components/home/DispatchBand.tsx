import Image from "next/image"
import Link from "next/link"
import { Phone, ArrowRight, Headphones } from "lucide-react"
import { COMPANY_INFO, WORKPLACE } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

export function DispatchBand() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[60vh] w-full md:min-h-[70vh]">
        <Image
          src="/images/generated/dispatch-team.png"
          alt="Thind Transport dispatch team supporting drivers on the road"
          fill
          sizes="100vw"
          className="photo-kenburns object-cover"
        />
        {/* Left-to-right scrim only works where the copy sits in a left column.
            At phone width the copy spans the full bleed, so it was landing on
            the bright part of the photo — keep it heavy across the whole band on
            mobile, and let the image open up from md+ where the column exists. */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-900/75 md:via-navy-900/85 md:to-navy-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-navy-900/30" />

        <div className="container relative z-10 flex min-h-[60vh] items-center px-4 py-16 md:min-h-[70vh] md:py-24">
          <Reveal className="max-w-2xl">
            <span className="fleet-badge mb-5">
              <Headphones className="h-3.5 w-3.5" />
              Real dispatch
            </span>
            <h2 className="mb-5 text-white">
              Call dispatch.{" "}
              <span className="text-gradient-accent">
                A real person answers.
              </span>
            </h2>
            <p className="mb-8 max-w-xl text-lg text-steel-200">
              No phone trees, no overseas queue, no being treated like a truck
              number. When you call Thind, you reach people who know your name,
              your lanes, and your loads &mdash; days, nights, and weekends.{" "}
              {WORKPLACE.languages}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="group inline-flex items-center justify-center gap-2 rounded-fleet bg-orange-600 px-7 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-cta transition-all hover:bg-orange-400 hover:shadow-cta-hover md:text-base"
              >
                <Phone className="h-5 w-5 transition-transform group-hover:rotate-12" />
                Talk to dispatch: {COMPANY_INFO.phone}
              </a>
              <Link
                href="/apply"
                className="group inline-flex items-center justify-center gap-2 rounded-fleet border border-steel-500 bg-steel-800/40 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-orange/50 hover:bg-steel-700/60 md:text-base"
              >
                Start your application
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

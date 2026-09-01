import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import {
  LayoutDashboard, Truck, DollarSign, Fuel, ShieldCheck, Smartphone,
  ArrowRight, CheckCircle2, MapPin,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"
import { PersonaTheater } from "@/components/hub/showcase/PersonaTheater"
import { APP_ICONS } from "@/lib/site-icons"
import { STATS } from "@/lib/constants"

export const metadata: Metadata = {
  // absolute: the string already carries the carrier name, and the root
  // template would otherwise append it a second time.
  title: { absolute: "LoadOff TMS | The Software That Runs Thind Transport" },
  description:
    "LoadOff is the transportation management system built in-house at Thind Transport: dispatch, invoicing, driver settlements, fuel + IFTA, compliance, and a driver phone app — one calm place to run a trucking company.",
  alternates: { canonical: "/loadoff" },
  // An install surface, same as /app — see the long note there. Share → Add to
  // Home Screen on the product's own page means the product, and all four
  // pieces have to agree for iOS to deliver it: the manifest (whose scope now
  // reaches this page on iOS), the standalone flag, the name, and the icon.
  manifest: "/api/hub/manifest",
  appleWebApp: { capable: true, title: "LoadOff" },
  icons: APP_ICONS,
}

/**
 * The LoadOff product page.
 *
 * Every /hub href here is a plain <a>, never next/link — a soft navigation
 * leaves the marketing manifest active and iOS then offers to install the
 * website instead of the app (src/lib/cross-app-link.ts, enforced by
 * src/__tests__/cross-app-links.test.ts). <AsphaltHero> already does that for
 * its own actions.
 *
 * The white "honest engineering metrics" band is gone. Two of its four figures
 * ("10 integration providers", "6 user roles served") were hand-typed counts of
 * things that change every release, so they were wrong within weeks of being
 * written. What survives is either derived from an array on this page or is a
 * fact the copy already stands behind.
 */

const MODULES = [
  {
    icon: LayoutDashboard,
    title: "Today command center",
    text: "One screen answers the morning: loads due, drivers who haven't confirmed, PODs missing, money you haven't invoiced yet.",
  },
  {
    icon: Truck,
    title: "Dispatch + live map",
    text: "Drag-and-drop week planner, dispatch board, and live truck positions with HOS clocks when an ELD is connected.",
  },
  {
    icon: DollarSign,
    title: "Money, end to end",
    text: "Rate con to invoice PDF to payment to driver settlement — pay rules, advances, and factoring handled in integer-cent math.",
  },
  {
    icon: Fuel,
    title: "Fuel + IFTA",
    text: "Fuel card feeds or CSV imports become MPG, fraud flags, fuel-to-load costing, and reefer-exempt-correct IFTA quarters.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance wall",
    text: "CDL, medical card, registration, insurance, IFTA filings — expiry alerts land before the DOT notices, with an accident register built in.",
  },
  {
    icon: Smartphone,
    title: "Driver phone app",
    text: "Dispatch confirm, status taps, camera PODs, chat, pay stubs, time off — installable straight from the browser, no app store.",
  },
] as const

/** Derived or already-stated: nothing here is a count somebody has to remember
 *  to update when the product changes. */
const HERO_FACTS = [
  { label: "Automated tests", value: "1,400+" },
  { label: "Modules", value: String(MODULES.length) },
  { label: "Trucks it runs", value: String(STATS.trucksInFleet) },
  { label: "Freight dispatched", value: "Daily" },
] as const

const TOURS = [
  {
    poster: "/videos/poster-money.jpg",
    mp4: "/videos/tour-money.mp4",
    webm: "/videos/tour-money.webm",
    label: "LoadOff money walkthrough: invoices, receivables, and driver settlements",
    caption: "From delivered to paid — invoices and settlements.",
  },
  {
    poster: "/videos/poster-driver.jpg",
    mp4: "/videos/tour-driver.mp4",
    webm: "/videos/tour-driver.webm",
    label: "LoadOff driver app walkthrough: confirm a dispatch, pay stubs, and install from the browser",
    caption: "The driver app — installs from the browser.",
  },
] as const

const PRINCIPLES = [
  {
    icon: MapPin,
    title: "Integrations with a fallback",
    text: "ELD, fuel cards, load boards, QuickBooks — every connection has a CSV or manual path that always works, so nothing ever blocks the day.",
  },
  {
    icon: CheckCircle2,
    title: "Tested like money depends on it",
    text: "1,400+ automated tests cover the math that pays drivers and bills brokers, because it does.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-tenant from day one",
    text: "Thind Transport is tenant #1. Every query is carrier-scoped, every credential encrypted at rest, every change audit-logged.",
  },
] as const

export default function LoadOffPage() {
  return (
    <div className="brand-page-shell overflow-x-hidden">
      {/* iOS keys standalone launch off the apple-prefixed name; Next emits
          only `mobile-web-app-capable`. React hoists this into <head>. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />

      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="LoadOff TMS"
            category="Company"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Built in-house · Runs our fleet every day"
        title={
          <>
            LoadOff<span className="text-signal-up">.</span> Take a load off.
          </>
        }
        description="The transportation management system we built to run Thind Transport — dispatch, invoicing, settlements, fuel, IFTA, and compliance in one calm place, with a phone app drivers actually use."
        applyHref="/hub"
        applyLabel="Open LoadOff"
        extraLinks={[{ href: "/hub/demo", label: "Try the interactive demo" }]}
      >
        <dl className="grid grid-cols-2 gap-3">
          {HERO_FACTS.map((fact) => (
            <div key={fact.label} className="rounded-m-3 border border-white/10 bg-white/5 p-4">
              <dt className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
                {fact.label}
              </dt>
              <dd className="mt-2 font-mono text-m-h4 font-bold tabular-nums text-paper">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </AsphaltHero>

      <section aria-labelledby="screen-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="screen-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              The screen it opens on
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Loads due, drivers who haven&apos;t confirmed, PODs missing, money not yet invoiced —
              the whole morning in one place.
            </p>
          </Reveal>
          <Reveal
            index={1}
            className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-m-3 border border-white/10"
          >
            <Image
              src="/images/loadoff/today.png"
              alt="The LoadOff Today command center — live loads, money owed, and what needs attention this morning"
              width={1440}
              height={900}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="img-authentic h-auto w-full"
            />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="theater-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="theater-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Every seat, live mock data
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Dispatcher, driver, accountant, owner, broker, and shipper — same freight, connected.
              No login required for this walkthrough.
            </p>
          </Reveal>
          <Reveal index={1} className="mt-8">
            <PersonaTheater />
          </Reveal>
        </div>
      </section>

      {/* Watch it run — real screen recordings with captions, no audio needed.
          scripts/e2e-showcase-smoke.mjs pins this heading and all three videos. */}
      <section aria-labelledby="watch-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="watch-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Watch it run
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              Real recordings of the live product with captions — no sound needed.
            </p>
          </Reveal>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
            <Reveal className="overflow-hidden rounded-m-3 border border-white/10 bg-white/5 lg:col-span-2">
              <video
                poster="/videos/poster-office.jpg"
                controls
                muted
                playsInline
                preload="none"
                className="h-auto w-full"
                aria-label="LoadOff office walkthrough: Today, dispatch, loads, money, and integrations in 36 seconds"
              >
                <source src="/videos/tour-office.mp4" type="video/mp4" />
                <source src="/videos/tour-office.webm" type="video/webm" />
              </video>
              <p className="border-t border-white/10 px-5 py-3 text-m-body text-steel-300">
                The whole morning in 36 seconds — Today, dispatch, loads, money, integrations.
              </p>
            </Reveal>

            <div className="space-y-6">
              {TOURS.map((tour, i) => (
                <Reveal
                  key={tour.mp4}
                  index={Math.min(i + 1, 4)}
                  className="overflow-hidden rounded-m-3 border border-white/10 bg-white/5"
                >
                  <video
                    poster={tour.poster}
                    controls
                    muted
                    playsInline
                    preload="none"
                    className="h-auto w-full"
                    aria-label={tour.label}
                  >
                    <source src={tour.mp4} type="video/mp4" />
                    <source src={tour.webm} type="video/webm" />
                  </video>
                  <p className="border-t border-white/10 px-5 py-3 text-m-body text-steel-300">
                    {tour.caption}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2 id="modules-heading" className="font-display text-m-h2 font-bold text-balance text-white">
              Everything a small carrier runs on
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod, i) => (
              <Reveal as="li" key={mod.title} index={Math.min(i, 4)}>
                <div className="h-full rounded-m-3 border border-white/10 bg-white/5 p-5">
                  <mod.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{mod.title}</h3>
                  <p className="mt-2 max-w-measure text-m-body text-steel-300">{mod.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="brand-section-panel py-section">
        <div className="container">
          <Reveal className="mx-auto max-w-measure text-center">
            <h2
              id="principles-heading"
              className="font-display text-m-h2 font-bold text-balance text-white"
            >
              How it is built
            </h2>
          </Reveal>
          <ul className="mx-auto mt-8 grid max-w-5xl list-none gap-x-10 gap-y-8 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal as="li" key={p.title} index={Math.min(i, 4)}>
                <p.icon className="h-5 w-5 text-orange-300" aria-hidden />
                <h3 className="mt-3 font-display text-m-h4 font-bold text-white">{p.title}</h3>
                <p className="mt-2 max-w-measure text-m-body text-steel-300">{p.text}</p>
              </Reveal>
            ))}
          </ul>

          <Reveal className="mx-auto mt-10 max-w-measure text-center">
            <p className="font-display text-m-micro font-bold uppercase tracking-[0.15em] text-orange-300">
              Under the hood
            </p>
            <p className="mt-3 text-m-body text-steel-300">
              Next.js and Postgres, multi-tenant from the first table: every query carrier-scoped,
              money kept in integer cents, credentials encrypted at rest, every change audit-logged.
              Verified continuously by 1,400+ automated tests and browser-driven smoke suites before
              anything reaches the trucks.
            </p>
          </Reveal>
        </div>
      </section>

      {/* The page's ONE closing block. Plain <a> for /hub — see the note above. */}
      <section aria-labelledby="loadoff-cta-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="loadoff-cta-heading"
              className="font-display text-m-h3 font-bold text-balance text-white"
            >
              See it running
            </h2>
            <p className="mt-3 text-m-body text-steel-300">
              LoadOff dispatches our trucks, bills our brokers, and pays our drivers today. Open it,
              or ask us for a walkthrough with demo data.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/hub"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                Open LoadOff
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="/hub/demo"
                className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                Try the interactive demo
              </a>
              {/* /hub/get-app, not /app: Chrome only offers the install sheet
                  on a page inside the narrow /hub manifest scope, so the one
                  install link on this page points straight at it. Pinned by
                  src/lib/hub/__tests__/pwa-manifest-wiring.test.ts. */}
              <a
                href="/hub/get-app"
                className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                Put it on your phone
              </a>
              <Link
                href="/schedule-meeting"
                className="inline-flex min-h-[48px] items-center text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                Schedule a walkthrough
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import { Metadata } from "next"
import Script from "next/script"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle2,
  ChevronRight,
  Compass,
  Home,
  MapPin,
  Phone,
  Route,
  Truck,
} from "lucide-react"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { RouteMapVisualization } from "@/components/features/RouteMapVisualization"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { PageHero } from "@/components/shared/PageHero"
import { MARKET_DATA } from "@/lib/market-data"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { driverLinks } from "@/components/shared/link-sets"

export const metadata: Metadata = {
  title: `Routes & Lanes | ${COMPANY_INFO.name}`,
  description: `Explore the types of lanes ${COMPANY_INFO.name} discusses with company drivers and owner operators, from local and regional work to over-the-road opportunities.`,
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Driver route opportunities",
  description:
    "Route and lane overview for company drivers and owner operators at Thind Transport.",
  provider: {
    "@type": "Organization",
    name: COMPANY_INFO.name,
    telephone: COMPANY_INFO.phoneFormatted,
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
}

const routeTypes = [
  {
    name: "Local",
    icon: Home,
    homeTime: "Home daily when local work is available",
    pay: PAY_RATES.companyDriver.local.annual,
    detail: "Best for drivers who want shorter runs and more predictable time at home.",
  },
  {
    name: "Regional",
    icon: Compass,
    homeTime: "Weekly home time discussions",
    pay: PAY_RATES.companyDriver.regional.annual,
    detail: "A balance of miles and home time across the western lanes we regularly discuss.",
  },
  {
    name: "OTR",
    icon: Truck,
    homeTime: PAY_RATES.companyDriver.otr.homeTime,
    pay: PAY_RATES.companyDriver.otr.annual,
    detail: "Designed for drivers who want broader lane options and more time on the road.",
  },
]

const laneSnapshots = MARKET_DATA.hotLanes.slice(0, 4).map((lane) => ({
  from: lane.from,
  to: lane.to,
  miles: lane.distance.toLocaleString(),
  rate: `$${lane.rate.toFixed(2)}/mi`,
  transit: lane.transitTime,
}))

const routeFAQs = [
  {
    question: "What types of routes do you talk through with drivers?",
    answer:
      "We usually discuss local, regional, and over-the-road options based on experience, trailer type, and current freight needs.",
  },
  {
    question: "Are the lane examples on this page live dispatch offers?",
    answer:
      "No. They are market snapshots to show the kind of freight corridors we commonly discuss, not guaranteed live load postings.",
  },
  {
    question: "How do home-time options work?",
    answer:
      "Home time depends on the type of work you are interested in. Local conversations focus on shorter runs, while regional and OTR roles involve longer scheduling windows.",
  },
  {
    question: "What trailers do these lanes cover?",
    answer:
      "The site focuses on flatbed, reefer, and dry van opportunities, and the right fit depends on your endorsements, experience, and the current mix of freight.",
  },
]

export default function RoutesPage() {
  return (
    <>
      <Script
        id="routes-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="brand-page-shell min-h-screen">
        <PageBreadcrumb pageName="Routes & Lanes" category="Drivers" />

        <PageHero
          image="/images/generated/hero-cascadia-highway.webp"
          imageAlt="Thind Transport truck running a Pacific Northwest highway lane"
          eyebrow="CDL-A Route Overview"
          title={
            <>
              Routes That Match <span className="text-orange">How You Want To Run</span>
            </>
          }
          description="Local, regional, and OTR — the right fit depends on your experience, trailer background, and home-time needs. Here's how each one runs."
          primaryLabel="Find Your Fit"
        >
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium text-white/90">
            <span className="rounded-lg border border-white/15 bg-white/10 px-4 py-2">48-state reach</span>
            <span className="rounded-lg border border-white/15 bg-white/10 px-4 py-2">Flatbed, reefer, dry van</span>
            <span className="rounded-lg border border-white/15 bg-white/10 px-4 py-2">Kent, WA base</span>
          </div>
        </PageHero>

        <section className="bg-[#101926] py-16">
          <div className="container">
            <div className="grid gap-6 md:grid-cols-3">
              {routeTypes.map((route) => {
                const Icon = route.icon
                return (
                  <Card key={route.name} className="h-full border-gray-200 bg-white">
                    <CardContent className="p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10">
                        <Icon className="h-6 w-6 text-navy" />
                      </div>
                      <h2 className="mb-2 text-2xl font-black text-navy">{route.name} Routes</h2>
                      <p className="mb-4 text-gray-600">{route.detail}</p>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>{route.homeTime}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span>Typical annual range: {route.pay}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <div className="mb-10 text-center">
              <Badge className="mb-4 border-0 bg-[#17181B] px-4 py-2 text-xs font-bold text-white">
                Market Snapshot
              </Badge>
              <h2 className="mb-3 text-3xl font-black text-navy md:text-4xl">
                Example Freight Corridors
              </h2>
              <p className="mx-auto max-w-2xl text-gray-600">
                These are sample market snapshots from the data used on the site. They are not presented as guaranteed live loads.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {laneSnapshots.map((lane) => (
                <Card key={`${lane.from}-${lane.to}`} className="border-gray-200">
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                          Lane
                        </p>
                        <h3 className="text-xl font-black text-navy">
                          {lane.from} to {lane.to}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-500">Rate snapshot</p>
                        <p className="text-2xl font-black text-orange">{lane.rate}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                      <span className="rounded-full bg-gray-100 px-3 py-1">{lane.miles} miles</span>
                      <span className="rounded-full bg-gray-100 px-3 py-1">{lane.transit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="container">
            <RouteMapVisualization />
          </div>
        </section>

        <section className="bg-[#101926] py-16">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <Badge className="mb-4 border-0 bg-[#17181B] px-4 py-2 text-xs font-bold text-white">
                  Frequently Asked Questions
                </Badge>
                <h2 className="mb-3 text-3xl font-black text-white md:text-4xl">
                  Route Questions We Hear Most
                </h2>
              </div>
              <FAQAccordion items={routeFAQs} darkBackground={true} gradientColor="#101926" />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-navy py-16 md:py-24">
          <Image
            src="/images/generated/truck-mountain-pass.webp"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/75 to-navy/90" />
          <div className="container relative text-center">
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
              Want To Talk Through Your Best Route Fit?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg font-medium text-white/90">
              Tell us your experience level, trailer background, and home-time preferences. We&apos;ll help you figure out which conversations make sense.
            </p>
            <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-orange-600 font-bold text-base text-white hover:bg-orange-600"
                asChild
              >
                <Link href="/apply">
                  Apply Now
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/40 !bg-white/10 font-bold text-base text-white backdrop-blur-sm hover:!bg-white/20"
                asChild
              >
                <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call {COMPANY_INFO.phone}
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-white/85">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                CDL-A required
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Based in Kent, WA
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Route className="h-4 w-4" />
                Flatbed, reefer, dry van
              </span>
            </div>
          </div>
        </section>
      </div>

      <RelatedLinks
        title="Plan the rest of it"
        intro="The lanes are half the picture — here's the pay, the clock and the equipment."
        links={driverLinks(["/routes"])}
      />
    </>
  )
}

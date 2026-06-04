import { Metadata } from "next"
import Link from "next/link"
import {
  Building2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Truck,
  Shield,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `About ${COMPANY_INFO.name}`,
  description: `Learn about ${COMPANY_INFO.name}, a family-run trucking company based in Kent, Washington.`,
}

const milestones = [
  {
    year: String(COMPANY_INFO.founded),
    title: "Company founded",
    description: "Built around direct communication, straightforward settlements, and respectful driver support.",
  },
  {
    year: "2018",
    title: "Fleet growth",
    description: "Expanded equipment and lanes while keeping a smaller-team feel for dispatch and recruiting.",
  },
  {
    year: "2022",
    title: "Operations upgrades",
    description: "Improved equipment standards and day-to-day support processes for drivers on the road.",
  },
  {
    year: "Today",
    title: "Serving nationwide freight",
    description: "Continuing to support flatbed, reefer, and dry van work with a base in Kent, Washington.",
  },
]

const operatingPrinciples = [
  {
    title: "Keep communication direct",
    description: "Drivers should know who to call and what to expect when something changes on the road.",
    icon: Users,
  },
  {
    title: "Keep equipment ready",
    description: "Clean, road-ready trucks and trailers matter because downtime hurts everyone.",
    icon: Truck,
  },
  {
    title: "Keep the process straightforward",
    description: "Clear expectations, clear settlements, and clear next steps beat flashy marketing.",
    icon: Shield,
  },
]

export default function AboutPage() {
  return (
    <div className="brand-page-shell min-h-screen">
      <PageBreadcrumb pageName="About Us" category="Company" />

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-blue-900 to-navy py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/20 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 border-white/30 bg-white/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-md">
              <Building2 className="mr-1.5 inline h-4 w-4" />
              About {COMPANY_INFO.name}
            </Badge>
            <h1 className="mb-6 text-5xl font-black leading-tight md:text-6xl">
              Family-Run. <span className="text-orange">Built To Stay Practical.</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/90">
              Since {COMPANY_INFO.founded}, {COMPANY_INFO.name} has focused on direct communication, dependable equipment, and a smaller-team approach that keeps drivers from feeling like numbers.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-8 py-8">
        <div className="container">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { value: String(COMPANY_INFO.founded), label: "Founded", icon: Calendar },
              { value: COMPANY_INFO.ownerExperience, label: "Owner Experience", icon: Users },
              { value: String(STATS.trucksInFleet), label: "Trucks In Fleet", icon: Truck },
              { value: String(STATS.statesCovered), label: "States Covered", icon: MapPin },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-lg">
                  <Icon className="mx-auto mb-2 h-6 w-6 text-navy" />
                  <div className="text-2xl font-black text-orange md:text-3xl">{stat.value}</div>
                  <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="mx-auto grid max-w-5xl items-start gap-12 md:grid-cols-2">
            <div>
              <Badge className="mb-4 bg-navy px-4 py-2 text-sm font-bold text-white">Our Story</Badge>
              <h2 className="mb-6 text-3xl font-black text-gray-900 md:text-4xl">
                A Smaller Team With a Clear Approach
              </h2>
              <div className="space-y-4 leading-relaxed text-gray-600">
                <p>
                  {COMPANY_INFO.name} was founded by {COMPANY_INFO.owner}, bringing years of hands-on industry experience into a business built around practical support rather than polished promises.
                </p>
                <p>
                  The goal has stayed simple: answer the phone, keep expectations clear, and build a work environment where drivers know what they are signing up for.
                </p>
                <p>
                  Today the company continues to focus on flatbed, reefer, and dry van work with a base in Kent, Washington and freight that reaches across the lower 48 states.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-navy to-blue-900 p-8 text-white shadow-2xl">
              <h3 className="mb-6 text-2xl font-black">Operating Snapshot</h3>
              <div className="space-y-4 text-sm text-white/85">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
                  <span>Flatbed, reefer, and dry van freight</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
                  <span>Based in Kent, Washington with nationwide coverage</span>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
                  <span>USDOT #{COMPANY_INFO.dot}, MC-{COMPANY_INFO.mc} — active FMCSA authority (registration moving to Motus in 2026)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange" />
                  <span>Direct dispatch and recruiting communication instead of a giant call-center feel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <Badge className="mb-4 bg-orange px-4 py-2 text-sm font-bold text-white">
              <Calendar className="mr-1.5 inline h-4 w-4" />
              Company Timeline
            </Badge>
            <h2 className="mb-4 text-3xl font-black text-gray-900 md:text-4xl">How We&apos;ve Grown</h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              A steady path, a growing fleet, and the same emphasis on practical support.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
            {milestones.map((milestone) => (
              <Card key={milestone.year} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="mb-2 text-3xl font-black text-orange">{milestone.year}</div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900">{milestone.title}</h3>
                  <p className="text-gray-600">{milestone.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <Badge className="mb-4 bg-navy px-4 py-2 text-sm font-bold text-white">How We Operate</Badge>
            <h2 className="mb-4 text-3xl font-black text-gray-900 md:text-4xl">What Matters Day To Day</h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              We replaced generic corporate filler here with the things drivers actually ask about.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {operatingPrinciples.map((principle) => {
              const Icon = principle.icon
              return (
                <Card key={principle.title} className="border-gray-200 hover:border-orange/30 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange/20 bg-gradient-to-br from-orange/10 to-orange/5">
                      <Icon className="h-6 w-6 text-orange" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">{principle.title}</h3>
                    <p className="text-gray-600">{principle.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
            <div>
              <Badge className="mb-4 bg-navy px-4 py-2 text-sm font-bold text-white">
                <MapPin className="mr-1.5 inline h-4 w-4" />
                Kent, Washington
              </Badge>
              <h2 className="mb-6 text-3xl font-black text-gray-900 md:text-4xl">
                Based In the Pacific Northwest
              </h2>
              <p className="mb-6 leading-relaxed text-gray-600">
                Kent gives us a strong base for Pacific Northwest freight while supporting drivers and lanes that reach across the lower 48 states.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-navy" />
                  <span className="text-gray-700">{COMPANY_INFO.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-navy" />
                  <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-orange hover:text-orange-600">
                    {COMPANY_INFO.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-navy" />
                  <a href={`mailto:${COMPANY_INFO.email}`} className="text-orange hover:text-orange-600">
                    {COMPANY_INFO.email}
                  </a>
                </div>
              </div>
            </div>

            <Card className="border-gray-200 bg-white shadow-lg">
              <CardContent className="p-8">
                <h3 className="mb-4 text-2xl font-black text-navy">Service Footprint</h3>
                <p className="mb-6 text-gray-600">
                  We kept this visual simple instead of using a fake map widget. The important part is the operating footprint and how to reach the team.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-3xl font-black text-orange">{STATS.statesCovered}</div>
                    <div className="text-sm font-semibold text-gray-700">States Covered</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-3xl font-black text-orange">{STATS.trucksInFleet}</div>
                    <div className="text-sm font-semibold text-gray-700">Fleet Units</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-navy py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
              Ready to Talk With the Team?
            </h2>
            <p className="mb-8 text-lg text-white/90">
              If the way we operate sounds like a better fit, reach out or start an application.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/apply"
                className="rounded-xl bg-orange px-8 py-4 font-bold text-white transition-colors hover:bg-orange-600"
              >
                Apply Now
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 font-bold text-white transition-colors hover:bg-white/20"
              >
                <Phone className="h-5 w-5" />
                Call {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  DollarSign, Shield, Truck, Calendar, Phone,
  CheckCircle2, Star, Award, TrendingUp,
  Calculator, Fuel, MapPin, Smartphone, BadgeCheck, ClipboardCheck,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { PageHero } from "@/components/shared/PageHero"
import { Reveal } from "@/components/ui/Reveal"
import { CountUp } from "@/components/shared/CountUp"
import { RelatedLinks } from "@/components/shared/RelatedLinks"

export const metadata: Metadata = {
  title: `Driver Benefits & Perks | ${COMPANY_INFO.name}`,
  description: "What Thind Transport actually offers CDL drivers: weekly direct deposit, paid time off and holidays, sign-on and referral bonuses, home time you pick, 2024 equipment, fuel discounts and 24/7 dispatch. Plus a straight answer on what we don't offer yet.",
  keywords: [
    "truck driver benefits",
    "driver sign on bonus",
    "owner operator benefits",
    "truck driver paid time off",
    "trucking company perks",
    "driver home time",
    "fuel discount program",
    "weekly settlement trucking",
    "no forced dispatch carrier",
  ],
  alternates: { canonical: "/benefits" },
}

/**
 * Only what we actually provide today.
 *
 * Health/dental/vision, life, disability and the 401(k) came off this page in
 * July 2026 — we do not carry those plans, and a benefit a driver first hears
 * is missing at orientation costs more than it ever won at the top of the
 * funnel. `NOT_YET` below states that outright instead of leaving a gap. If we
 * ever add a plan, it goes in `BENEFITS` in src/lib/constants.ts first.
 */
const companyDriverBenefits = [
  {
    category: "Compensation",
    icon: DollarSign,
    color: "green",
    items: [
      {
        title: "Competitive Pay",
        description: `${PAY_RATES.companyDriver.otr.perMile} per mile — same rate local, regional or OTR`,
        highlight: true,
      },
      {
        title: "Sign-On Bonus",
        description: `${PAY_RATES.companyDriver.signOnBonus.replace(" (First Year)", "")} paid during your first year`,
        highlight: true,
      },
      {
        title: "Weekly Direct Deposit",
        description: "Get paid every Friday, no exceptions",
      },
      {
        title: "Performance Bonuses",
        description: "Additional rewards for safety and efficiency",
      },
      {
        title: "Referral Bonuses",
        description: "Earn extra for bringing quality drivers",
      },
    ],
  },
  {
    category: "Time Off & Work-Life",
    icon: Calendar,
    color: "purple",
    items: [
      {
        title: "Paid Time Off",
        description: "Vacation days that increase with tenure",
      },
      {
        title: "Paid Holidays",
        description: "Major holidays paid at premium rates",
      },
      {
        title: "Flexible Home Time",
        description: "Local, regional, or OTR - you choose",
        highlight: true,
      },
      {
        title: "Family Leave",
        description: "Time off for important family moments",
      },
    ],
  },
  {
    category: "Equipment & Support",
    icon: Truck,
    color: "orange",
    items: [
      {
        title: "Modern Equipment",
        description: "2024 Freightliner Cascadias with latest tech",
        highlight: true,
      },
      {
        title: "24/7 Dispatch Support",
        description: "Real people available whenever you need help",
      },
      {
        title: "Rider Program",
        description: "Bring a companion on the road",
      },
      {
        title: "Pet Policy",
        description: "Your furry friend can ride along",
      },
    ],
  },
]

const ownerOperatorBenefits = [
  {
    category: "Earnings & Commission",
    icon: TrendingUp,
    color: "green",
    items: [
      {
        title: "90% Gross Commission",
        description: "You keep 90% of the linehaul on every load you haul",
        highlight: true,
      },
      {
        title: "$2,500 Sign-On Bonus",
        description: "Substantial bonus to start your partnership",
        highlight: true,
      },
      {
        title: "100% Fuel Surcharge",
        description: "All fuel surcharge passes directly to you",
        highlight: true,
      },
      {
        title: "Weekly Settlements",
        description: "Transparent pay every Friday, no delays",
      },
      {
        title: "No Hidden Fees",
        description: "What we say is what you get - period",
      },
    ],
  },
  {
    category: "Independence & Freedom",
    icon: Shield,
    color: "blue",
    items: [
      {
        title: "No Forced Dispatch",
        description: "Choose your loads, lanes, and schedule",
        highlight: true,
      },
      {
        title: "Flexible Scheduling",
        description: "Work when you want, rest when you need",
      },
      {
        title: "Lane Selection",
        description: "Pick the routes that work best for you",
      },
      {
        title: "Time Off Freedom",
        description: "Take time off without permission needed",
      },
    ],
  },
  {
    category: "Business Support",
    icon: DollarSign,
    color: "purple",
    items: [
      {
        title: "Fuel Card Programs",
        description: "Discounts at major truck stop chains nationwide",
      },
      {
        title: "Maintenance Discounts",
        description: "Preferred pricing at partner service centers",
      },
      {
        title: "Tire Programs",
        description: "Discounted rates on tires and retreads",
      },
      {
        title: "Insurance Assistance",
        description: "Help navigating occupational accident coverage",
      },
      {
        title: "Back Office Support",
        description: "We handle the paperwork, you focus on driving",
      },
    ],
  },
  {
    category: "Freight & Operations",
    icon: Truck,
    color: "orange",
    items: [
      {
        title: "Consistent Freight",
        description: "Year-round loads from top shippers",
        highlight: true,
      },
      {
        title: "Premium Lanes",
        description: "Access to high-paying dedicated routes",
      },
      {
        title: "Diverse Freight Types",
        description: "Flatbed, reefer, and dry van options",
      },
      {
        title: "Quick Pay Option",
        description: "Access funds faster when you need them",
      },
    ],
  },
]

const comparisonData = [
  { feature: "Commission Rate", thind: "90%", industry: "70-85%" },
  { feature: "Fuel Surcharge", thind: "100% to driver", industry: "Varies, often split" },
  { feature: "Sign-On Bonus (O/O)", thind: "$2,500", industry: "$500-$1,500" },
  { feature: "Forced Dispatch", thind: "Never", industry: "Common" },
  { feature: "Weekly Settlement", thind: "Every Friday", industry: "Varies" },
  { feature: "Hidden Fees", thind: "None", industry: "Often hidden" },
  { feature: "Equipment Age", thind: "2024 Models", industry: "3-5+ years old" },
  { feature: "24/7 Support", thind: "Yes, real people", industry: "Limited hours" },
]

/**
 * The other half of an honest benefits page. A driver comparing carriers is
 * checking for exactly these, and finding out at orientation is how a carrier
 * loses someone in week two.
 */
const NOT_YET = [
  {
    title: "No company medical, dental or vision plan",
    detail:
      "You'd be arranging your own coverage — through the marketplace, a spouse's plan, or an association plan like OOIDA's. Ask us and we'll tell you what other drivers here ended up doing.",
  },
  {
    title: "No 401(k) or company retirement match",
    detail:
      "Nothing stops you opening your own IRA or solo 401(k) — owner-operators here generally do — but there is no company plan and no match today.",
  },
  {
    title: "No company life or disability policy",
    detail:
      "Occupational accident coverage is available to owner-operators through our program, and we'll help you navigate it. That is not the same thing as company-paid life or disability insurance, and we won't call it that.",
  },
] as const

const BENEFIT_LINKS = [
  {
    href: "/pay-rates",
    title: "Pay calculator",
    blurb: "Put your own miles, rate and fuel price in and see what a week actually clears.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/pay-breakdown",
    title: "Where every dollar goes",
    blurb: "A line-by-line settlement: gross, fuel surcharge, deductions, what lands in the account.",
    icon: DollarSign,
    kind: "Guide" as const,
  },
  {
    href: "/fuel-program",
    title: "Fuel savings calculator",
    blurb: "What the fuel card takes off your cost per mile, in your own numbers.",
    icon: Fuel,
    kind: "Tool" as const,
  },
  {
    href: "/routes",
    title: "Lanes we actually run",
    blurb: "The corridors, the frequency, and the home time each one really means.",
    icon: MapPin,
    kind: "Page" as const,
  },
  {
    href: "/app",
    title: "The driver app",
    blurb: "Dispatch, PODs and pay on one screen — and it keeps working in dead zones.",
    icon: Smartphone,
    kind: "Tool" as const,
  },
  {
    href: "/trust",
    title: "Verify us first",
    blurb: `USDOT ${COMPANY_INFO.dot}, MC ${COMPANY_INFO.mc}, insurance and safety record — check before you apply.`,
    icon: BadgeCheck,
    kind: "Verify" as const,
  },
]

const colorClasses = {
  green: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-600",
  red: "from-red-500/10 to-red-600/5 border-red-500/20 text-red-600",
  blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600",
  purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600",
  orange: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-600",
}

export default function BenefitsPage() {
  return (
    <div className="brand-page-shell min-h-screen">
      <PageBreadcrumb pageName="Benefits" category="Drivers" />
      
      {/* Hero Section */}
      <PageHero
        image="/images/generated/driver-cab-interior.webp"
        imageAlt="Inside a Thind Transport sleeper cab — the equipment behind the benefits"
        eyebrow="Driver Benefits"
        title={
          <>
            Benefits That Actually <span className="text-orange">Matter</span>
          </>
        }
        description="Weekly pay, paid time off, home time you choose, and 2024 equipment — plus a straight list of what we don't offer yet, so nothing is a surprise at orientation."
      />

      {/* Quick Stats — the numbers count up once, on first view only */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: 90, suffix: "%", label: "Commission", sublabel: "Owner Operators" },
              { value: 0.63, prefix: "$", decimals: 2, label: "Per Mile", sublabel: "Company Drivers" },
              { value: 100, suffix: "%", label: "Fuel Surcharge", sublabel: "Passed Through" },
              { value: 24, suffix: "/7", label: "Support", sublabel: "Real People" },
            ].map((stat, i) => (
              <Reveal key={stat.label} index={Math.min(i, 4)}>
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 text-center transition-transform duration-fast ease-entrance motion-safe:hover:-translate-y-1">
                  <div className="text-2xl md:text-3xl font-black text-orange">
                    <CountUp
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      decimals={stat.decimals ?? 0}
                    />
                  </div>
                  <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                  <div className="text-xs text-gray-500">{stat.sublabel}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Company Driver Benefits */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
              <Shield className="h-4 w-4 mr-1.5 inline" />
              Company Drivers
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              What You Actually Get
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Every line below is something we provide today. The things we don&apos;t offer are
              listed further down, in their own section, rather than left out.
            </p>
          </div>

          <div className="space-y-12">
            {companyDriverBenefits.map((section) => {
              const Icon = section.icon
              const colorClass = colorClasses[section.color as keyof typeof colorClasses]
              
              return (
                <div key={section.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center border`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{section.category}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((item, i) => (
                      <Reveal key={item.title} index={Math.min(i, 4)}>
                        <div
                          className={`h-full p-4 rounded-xl border transition-[transform,border-color,box-shadow] duration-fast ease-entrance motion-safe:hover:-translate-y-1 ${
                            item.highlight
                              ? 'bg-gradient-to-br from-orange/5 to-orange/10 border-orange/20 hover:border-orange/40'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.highlight ? 'text-orange' : 'text-green-500'}`} />
                            <div>
                              <h4 className="font-bold text-gray-900">{item.title}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* What we don't offer — stated, not omitted */}
      <section className="py-16 bg-gray-50 border-y border-gray-200">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Reveal className="text-center mb-10">
              <Badge className="mb-4 bg-gray-900 text-white px-4 py-2 text-sm font-bold">
                <ClipboardCheck className="h-4 w-4 mr-1.5 inline" />
                Straight answer
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                What we don&apos;t offer
              </h2>
              <p className="text-lg text-gray-600">
                Three things a driver comparing carriers will ask about, and we&apos;d rather you
                heard them here than in your second week.
              </p>
            </Reveal>

            <ul className="grid gap-4 md:grid-cols-3 list-none">
              {NOT_YET.map((item, i) => (
                <Reveal as="li" key={item.title} index={Math.min(i, 4)}>
                  <div className="h-full rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.detail}</p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal className="mt-8 text-center">
              <p className="text-gray-600">
                Everything above is what we can offer instead: a higher take-home rate, weekly pay,
                and no games about it.{" "}
                <Link href="/pay-breakdown" className="font-semibold text-orange-600 hover:underline">
                  See where every dollar goes
                </Link>{" "}
                or{" "}
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="font-semibold text-orange-600 hover:underline"
                >
                  ask us directly at {COMPANY_INFO.phone}
                </a>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Owner Operator Benefits */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-700 text-white px-4 py-2 text-sm font-bold">
              <TrendingUp className="h-4 w-4 mr-1.5 inline" />
              Owner Operators
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Maximum Earnings, Maximum Freedom
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              90% commission, no forced dispatch, complete transparency. Run your business your way.
            </p>
          </div>

          <div className="space-y-12">
            {ownerOperatorBenefits.map((section) => {
              const Icon = section.icon
              const colorClass = colorClasses[section.color as keyof typeof colorClasses]
              
              return (
                <div key={section.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center border`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{section.category}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((item, i) => (
                      <Reveal key={item.title} index={Math.min(i, 4)}>
                        <div
                          className={`h-full p-4 rounded-xl border transition-[transform,border-color,box-shadow] duration-fast ease-entrance motion-safe:hover:-translate-y-1 ${
                            item.highlight
                              ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:border-green-300'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.highlight ? 'text-green-600' : 'text-green-500'}`} />
                            <div>
                              <h4 className="font-bold text-gray-900">{item.title}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
                <Award className="h-4 w-4 mr-1.5 inline" />
                Side-by-Side Comparison
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                See the Thind Difference
              </h2>
              <p className="text-lg text-gray-600">
                Compare our benefits to industry averages and see why drivers switch to us.
              </p>
            </div>

            <Card className="overflow-hidden border-2 border-white/10" data-light>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-navy text-white">
                      <th className="px-6 py-4 text-left font-bold">Feature</th>
                      <th className="px-6 py-4 text-center font-bold bg-orange-600">
                        <div className="flex flex-col items-center">
                          <Star className="h-5 w-5 mb-1" />
                          Thind Transport
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center font-bold">Industry Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparisonData.map((row, idx) => (
                      <tr key={row.feature} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900">{row.feature}</td>
                        <td className="px-6 py-4 text-center font-bold text-green-700 bg-green-50/50">
                          {row.thind}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500">{row.industry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <RelatedLinks
        title="Check the numbers yourself"
        intro="Benefits pages are easy to write. These are the tools and records behind ours."
        links={BENEFIT_LINKS}
      />

      {/* CTA Section */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-navy">
        <Image
          src="/images/generated/yard-morning-kent.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/70 to-navy/90" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Ready to Experience These Benefits?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              $0.63 a mile for company drivers, 90% of the linehaul for owner-operators,
              and a real person on the phone in Kent. Apply today and hear back within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
              >
                Apply Now — Takes 2 Minutes
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
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


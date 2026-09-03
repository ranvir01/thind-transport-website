import { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight, Shield, Fuel, Wrench, AlertTriangle, Phone,
  CheckCircle2, ExternalLink, HeartPulse, Truck,
  Navigation, Calculator, FileCheck, Route, Smartphone,
  type LucideIcon,
} from "lucide-react"
import { HosClockCalculator } from "@/components/features/HosClockCalculator"
import { RelatedLinks } from "@/components/shared/RelatedLinks"
import { COMPANY_INFO, FMCSA_LINKS, SUPPORT } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import { AsphaltHero } from "@/components/shared/AsphaltHero"
import { Reveal } from "@/components/ui/Reveal"

const RESOURCE_LINKS = [
  {
    href: "/pay-rates",
    title: "Pay calculator",
    blurb: "Miles, rate and fuel in — what the week clears, out.",
    icon: Calculator,
    kind: "Tool" as const,
  },
  {
    href: "/fuel-program",
    title: "Fuel savings calculator",
    blurb: "What the card takes off your cost per mile, on your own MPG.",
    icon: Fuel,
    kind: "Tool" as const,
  },
  {
    href: "/tools/freight-class-calculator",
    title: "Freight class calculator",
    blurb: "Density to NMFC class — useful when a broker's class looks wrong.",
    icon: FileCheck,
    kind: "Tool" as const,
  },
  {
    href: "/routes",
    title: "Lanes and corridors",
    blurb: "The runs we actually make, with distances and home time.",
    icon: Route,
    kind: "Page" as const,
  },
  {
    href: "/app",
    title: "Driver app",
    blurb: "Dispatch, PODs and pay on one screen — works with no signal.",
    icon: Smartphone,
    kind: "Tool" as const,
  },
  {
    href: "/benefits",
    title: "What we offer drivers",
    blurb: "Including a straight list of what we don't offer yet.",
    icon: Shield,
    kind: "Page" as const,
  },
]

export const metadata: Metadata = {
  title: "Driver resources & hours-of-service planner",
  description: "FMCSA rules a CDL driver actually gets asked about: hours of service, ELD, CSA scores, cargo securement, hazmat and the DOT physical — plus a free hours-of-service clock planner.",
  keywords: [
    "truck driver resources",
    "FMCSA compliance",
    "ELD regulations",
    "HOS hours of service",
    "CDL driver safety",
    "truck driver training",
    "DOT compliance",
    "fuel card programs",
    "truck maintenance",
    "driver health wellness",
  ],
  alternates: { canonical: "/resources" },
}

interface Resource {
  title: string
  description: string
  details?: readonly string[]
  link?: string
  external?: boolean
}

interface ResourceCategory {
  id: string
  title: string
  icon: LucideIcon
  resources: readonly Resource[]
}

const resourceCategories: ResourceCategory[] = [
  {
    id: "compliance",
    title: "FMCSA compliance and regulations",
    icon: Shield,
    resources: [
      {
        title: "FMCSA Motus registration (2026)",
        description:
          "FMCSA's new Motus system is replacing the URS and FMCSA Portal for motor carrier registration, biennial updates, and operating authority filings.",
        details: [
          "Motus is FMCSA's unified registration platform (phased rollout through 2026)",
          "Existing USDOT numbers and MC authority remain valid during the transition",
          "Carriers—not individual drivers—manage registration in Motus",
          "Keep FMCSA Portal account and company information current before legacy systems sunset",
          `MC docket numbers (e.g. MC-${COMPANY_INFO.mc}) are not being eliminated under current FMCSA plans`,
        ],
        link: FMCSA_LINKS.motusInfo,
        external: true,
      },
      {
        title: "Hours of service (HOS) guide",
        description: "Complete breakdown of driving limits, rest requirements, and exceptions, straight from the FMCSA rule.",
        details: [
          "11-hour driving limit after 10 consecutive hours off duty",
          "14-hour limit on the time you can drive within",
          "60/70-hour limit over 7/8 consecutive days",
          "30-minute break requirement after 8 hours of driving",
          "Sleeper berth provisions explained",
        ],
        link: "https://www.fmcsa.dot.gov/regulations/hours-of-service",
        external: true,
      },
      {
        title: "ELD compliance requirements",
        description: "Electronic Logging Device mandate details, exemptions, and best practices for proper use.",
        details: [
          "ELD mandate compliance requirements",
          "Proper log editing procedures",
          "Data transfer methods (Web, Email, USB)",
          "Malfunction and data diagnostics",
          "Required documentation during ELD failure",
        ],
        link: "https://www.fmcsa.dot.gov/hours-service/elds/electronic-logging-devices",
        external: true,
      },
      {
        title: "CSA safety scores explained",
        description: "Understanding your CSA score, BASICs categories, and how to maintain clean records.",
        details: [
          "7 BASICs categories breakdown",
          "How violations affect your score",
          "DataQs challenge process",
          "Score improvement strategies",
          "Carrier vs. Driver responsibility",
        ],
        link: "https://csa.fmcsa.dot.gov/",
        external: true,
      },
      {
        title: "DOT inspection checklist",
        description: "Pre-trip and during inspection requirements to stay compliant and avoid violations.",
        details: [
          "Level I through Level VI inspection types",
          "Required documents to carry",
          "Vehicle inspection points",
          "Out-of-service criteria",
          "Rights during inspections",
        ],
      },
    ],
  },
  {
    id: "safety",
    title: "Safety and training",
    icon: AlertTriangle,
    resources: [
      {
        title: "Defensive driving techniques",
        description: "Professional driving strategies to avoid accidents and protect your record.",
        details: [
          "Smith System 5 Keys methodology",
          "Space management and following distance",
          "Mirror usage and blind spot awareness",
          "Adverse weather driving tactics",
          "Night driving best practices",
        ],
      },
      {
        title: "Load securement standards",
        description: "FMCSA cargo securement requirements for flatbed, dry van, and reefer loads.",
        details: [
          "General securement requirements",
          "Working load limits calculation",
          "Tie-down requirements by cargo type",
          "Flatbed specific requirements",
          "Documentation requirements",
        ],
        link: "https://www.fmcsa.dot.gov/regulations/cargo-securement/cargo-securement-rules",
        external: true,
      },
      {
        title: "Hazmat endorsement guide",
        description: "Requirements, training, and procedures for hazardous materials endorsement.",
        details: [
          "TSA background check process",
          "Written test preparation",
          "Placarding requirements",
          "Emergency response procedures",
          "Hazmat routing restrictions",
        ],
        link: "https://www.tsa.gov/for-industry/hazmat-endorsement",
        external: true,
      },
      {
        title: "Accident procedures",
        description: "Step-by-step guide for what to do if you're involved in an accident.",
        details: [
          "Immediate safety steps",
          "Required notifications",
          "Documentation requirements",
          "Insurance claim process",
          "Post-accident drug testing rules",
        ],
      },
    ],
  },
  {
    id: "fuel",
    title: "Fuel and efficiency",
    icon: Fuel,
    resources: [
      {
        title: "Fuel card programs",
        description: "Maximize savings with our partner fuel programs and discount networks.",
        details: [
          "Pilot Flying J discount program",
          "Love's fuel rewards",
          "TA/Petro network savings",
          "Fuel tax reporting assistance",
          "IFTA compliance support",
        ],
        link: "/fuel-program",
      },
      {
        title: "Fuel efficiency tips",
        description: "Techniques that move the needle on MPG, and what a cent per gallon is worth on your own miles.",
        link: "/fuel-program",
        details: [
          "Optimal cruise speed (62-65 mph sweet spot)",
          "Progressive shifting techniques",
          "Idle reduction strategies",
          "Tire pressure monitoring",
          "Route planning for fuel efficiency",
        ],
      },
      {
        title: "IFTA reporting guide",
        description: "International Fuel Tax Agreement reporting requirements and deadlines.",
        details: [
          "Quarterly reporting deadlines",
          "Required record keeping",
          "Mileage tracking requirements",
          "Fuel purchase documentation",
          "State-by-state tax rates",
        ],
        link: "https://www.iftach.org/",
        external: true,
      },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance and equipment",
    icon: Wrench,
    resources: [
      {
        title: "Pre-trip inspection guide",
        description: "Complete CDL pre-trip inspection checklist following FMCSA requirements.",
        details: [
          "Engine compartment checks",
          "Cab/cab interior inspection",
          "External lights and reflectors",
          "Coupling system inspection",
          "Trailer inspection requirements",
        ],
      },
      {
        title: "Tire maintenance standards",
        description: "DOT tire requirements, maintenance schedules, and replacement guidelines.",
        details: [
          "Minimum tread depth requirements",
          "Tire pressure specifications",
          "Retreading regulations",
          "Tire rotation schedules",
          "Roadside tire assistance",
        ],
      },
      {
        title: "Preventive maintenance schedule",
        description: "Recommended maintenance intervals to prevent breakdowns and extend equipment life.",
        details: [
          "Oil change intervals",
          "Brake inspection schedule",
          "Air filter replacement",
          "Coolant system maintenance",
          "Electrical system checks",
        ],
      },
    ],
  },
  {
    id: "health",
    title: "Health and wellness",
    icon: HeartPulse,
    resources: [
      {
        title: "DOT physical requirements",
        description: "Medical examination requirements for maintaining your CDL certification.",
        details: [
          "Medical certification timeline",
          "Vision and hearing requirements",
          "Blood pressure guidelines",
          "Diabetes management requirements",
          "Sleep apnea screening",
        ],
        link: "https://www.fmcsa.dot.gov/medical/driver-medical-requirements",
        external: true,
      },
      {
        title: "Healthy eating on the road",
        description: "Nutrition tips for truck drivers to maintain energy and health while traveling.",
        details: [
          "Portable healthy snack ideas",
          "Truck stop meal choices",
          "Hydration strategies",
          "Meal prep for the road",
          "Managing caffeine intake",
        ],
      },
      {
        title: "Exercise and stretching guide",
        description: "Simple exercises and stretches that can be done during breaks and at truck stops.",
        details: [
          "Pre-drive stretching routine",
          "In-cab exercises",
          "Truck stop workout routines",
          "Back pain prevention",
          "Eye strain relief techniques",
        ],
      },
      {
        title: "Mental health resources",
        description: "Support resources for managing stress, isolation, and mental wellness on the road.",
        details: [
          "Truckers Against Trafficking hotline",
          "Mental health support lines",
          "Family connection tips",
          "Stress management techniques",
          "Sleep hygiene improvements",
        ],
        link: "https://988lifeline.org/",
        external: true,
      },
    ],
  },
  {
    id: "business",
    title: "Business tools",
    icon: Calculator,
    resources: [
      {
        title: "Owner operator tax guide",
        description: "Tax deductions, quarterly estimates, and record-keeping for independent drivers.",
        details: [
          "Per diem deduction rules",
          "Equipment depreciation",
          "Home office deductions",
          "Quarterly estimated taxes",
          "Business expense tracking",
        ],
        link: "https://www.irs.gov/businesses/small-businesses-self-employed/trucking-tax-center",
        external: true,
      },
      {
        title: "Load profitability calculator",
        description: "Calculate true profitability of loads including fuel, time, and operational costs.",
        link: "/pay-rates",
      },
      {
        title: "Trip planning resources",
        description: "Tools and resources for efficient route planning and trip management.",
        details: [
          "Truck-specific GPS recommendations",
          "Weigh station bypass programs",
          "Rest area and truck parking apps",
          "Weather monitoring tools",
          "Load board best practices",
        ],
        link: "/routes",
      },
    ],
  },
]

const quickLinks = [
  {
    title: "FMCSA SAFER system",
    description: "Look up carrier safety records",
    url: "https://safer.fmcsa.dot.gov/",
    icon: Shield,
  },
  {
    title: "National Drug Screening",
    description: "Find drug testing locations",
    url: "https://www.nationaldrugscreening.com/",
    icon: FileCheck,
  },
  {
    title: "Trucker Path app",
    description: "Truck stops, parking & fuel",
    url: "https://truckerpath.com/",
    icon: Navigation,
  },
  {
    title: "DAT load board",
    description: "Find available freight",
    url: "https://www.dat.com/",
    icon: Truck,
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-navy-950">
      <AsphaltHero
        breadcrumb={
          <PageBreadcrumb
            pageName="Resources"
            category="Drivers"
            className="!border-b-0 !bg-transparent !pb-0 !pt-4 !backdrop-blur-none [&>div]:px-0 [&_ol]:justify-start"
          />
        }
        eyebrow="Driver resource center"
        title="Driver reference desk"
        description="The FMCSA rules you get asked about at a scale house, the DOT physical standards, and an hours-of-service planner that does the clock arithmetic for you."
      />

      <section aria-labelledby="quick-links-heading" className="bg-navy-950 py-section">
        <div className="container">
          <h2
            id="quick-links-heading"
            className="font-display text-m-h3 font-bold text-white text-balance"
          >
            Look it up yourself
          </h2>
          <ul className="mt-6 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link, i) => (
              <Reveal as="li" key={link.title} index={Math.min(i, 4)}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full flex-col rounded-m-3 border border-white/10 bg-white/5 p-4 transition-colors duration-base ease-entrance hover:border-white/30"
                >
                  <link.icon className="h-5 w-5 text-orange-300" aria-hidden />
                  <span className="mt-3 font-display text-m-h4 font-bold text-white">
                    {link.title}
                  </span>
                  <span className="mt-1 flex-1 text-m-body text-steel-200">{link.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-m-body font-semibold text-steel-300">
                    <span>Opens on their site</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="emergency-heading" className="bg-asphalt py-section-tight text-paper">
        <div className="container">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/10">
                <Phone className="h-5 w-5 text-signal-up" aria-hidden />
              </span>
              <div>
                <h2
                  id="emergency-heading"
                  className="font-display text-m-h4 font-bold text-paper"
                >
                  {`${SUPPORT.hours} emergency dispatch`}
                </h2>
                <p className="mt-1 text-m-body text-paper/80">
                  Roadside assistance, accidents, breakdowns.
                </p>
              </div>
            </div>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex min-h-[48px] items-center gap-2 text-m-lede font-semibold text-paper underline-offset-4 hover:text-signal-up hover:underline"
            >
              <span>Call</span>
              <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
            </a>
          </div>
        </div>
      </section>

      {/* The one thing on this page that does the work for you: the HOS rules
          were already explained here in bullets, which still left the driver
          doing clock arithmetic at a truck stop. The page's paper island. */}
      <section aria-labelledby="clock-heading" className="bg-navy-950 py-section">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 id="clock-heading" className="font-display text-m-h2 font-bold text-white text-balance">
                Work out your clock
              </h2>
              <p className="mt-3 max-w-measure text-m-body text-steel-200">
                Punch in when you came on duty and how much you&apos;ve driven. It gives you the
                window, the break, the reset and what&apos;s left in your 70.
              </p>
            </Reveal>
            <div className="mt-8">
              <HosClockCalculator />
            </div>
          </div>
        </div>
      </section>

      <div className="bg-asphalt py-section text-paper">
        <div className="container">
          {resourceCategories.map((category) => (
            <section
              key={category.id}
              aria-labelledby={`${category.id}-heading`}
              className="mb-12 last:mb-0"
            >
              <h2
                id={`${category.id}-heading`}
                className="flex items-center gap-3 font-display text-m-h2 font-bold text-paper text-balance"
              >
                <category.icon className="h-6 w-6 shrink-0 text-signal-up" aria-hidden />
                <span>{category.title}</span>
              </h2>

              <ul className="mt-6 grid list-none gap-4 md:grid-cols-2">
                {category.resources.map((resource, i) => (
                  <Reveal as="li" key={resource.title} index={Math.min(i, 4)}>
                    <div className="flex h-full flex-col rounded-m-3 border border-white/10 bg-white/5 p-5">
                      <h3 className="flex items-start justify-between gap-3 font-display text-m-h4 font-bold text-paper">
                        <span>{resource.title}</span>
                        {resource.external ? (
                          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-paper/50" aria-hidden />
                        ) : null}
                      </h3>
                      <p className="mt-2 max-w-measure text-m-body text-paper/80">
                        {resource.description}
                      </p>
                      {resource.details ? (
                        <ul className="mt-4 flex-1 list-none space-y-2">
                          {resource.details.map((detail) => (
                            <li
                              key={detail}
                              className="flex items-start gap-2 text-m-body text-paper/80"
                            >
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-paper/50" aria-hidden />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="flex-1" />
                      )}
                      {resource.link ? (
                        <p className="mt-4">
                          {resource.external ? (
                            <a
                              href={resource.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-paper underline-offset-4 hover:text-orange-300 hover:underline"
                            >
                              <span>Read the rule</span>
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          ) : (
                            <Link
                              href={resource.link}
                              className="inline-flex min-h-[44px] items-center gap-2 text-m-body font-semibold text-paper underline-offset-4 hover:text-orange-300 hover:underline"
                            >
                              <span>View resource</span>
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </Reveal>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <RelatedLinks
        tone="dark"
        title="Tools on this site"
        intro="Calculators and pages that do something, not just describe it."
        links={RESOURCE_LINKS}
      />

      {/* The page's ONE closing block. */}
      <section aria-labelledby="resources-apply-heading" className="bg-navy-950 py-section-tight">
        <div className="container">
          <div className="mx-auto max-w-measure text-center">
            <h2
              id="resources-apply-heading"
              className="font-display text-m-h2 font-bold text-white text-balance"
            >
              Need more support?
            </h2>
            <p className="mt-3 text-m-body text-steel-200">
              Call dispatch — the same desk that books the loads answers the phone.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/apply"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-orange-600 px-7 text-m-body font-semibold text-white transition-colors duration-base ease-entrance hover:bg-orange-700 hover:text-white"
              >
                <span>Apply to drive with us</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-white underline-offset-4 hover:text-orange-300 hover:underline"
              >
                <span>or call</span>
                <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

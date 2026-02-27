import { Metadata } from "next"
import Link from "next/link"
import { 
  Shield, FileText, Fuel, Wrench, AlertTriangle, 
  Clock, MapPin, Phone, BookOpen, Download,
  CheckCircle2, ExternalLink, Scale, HeartPulse,
  Truck, Navigation, Calculator, FileCheck
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `Driver Resources & Safety Center | ${COMPANY_INFO.name}`,
  description: "Comprehensive driver resources including FMCSA compliance guides, HOS regulations, ELD requirements, fuel optimization tips, safety training, and maintenance guidelines for CDL truck drivers.",
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
}

const resourceCategories = [
  {
    title: "FMCSA Compliance & Regulations",
    icon: Shield,
    color: "blue",
    resources: [
      {
        title: "Hours of Service (HOS) Guide",
        description: "Complete breakdown of driving limits, rest requirements, and exceptions. Updated for 2024 regulations.",
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
        title: "ELD Compliance Requirements",
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
        title: "CSA Safety Scores Explained",
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
        title: "DOT Inspection Checklist",
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
    title: "Safety & Training",
    icon: AlertTriangle,
    color: "orange",
    resources: [
      {
        title: "Defensive Driving Techniques",
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
        title: "Load Securement Standards",
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
        title: "Hazmat Endorsement Guide",
        description: "Requirements, training, and procedures for hazardous materials endorsement.",
        details: [
          "TSA background check process",
          "Written test preparation",
          "Placarding requirements",
          "Emergency response procedures",
          "Hazmat routing restrictions",
        ],
      },
      {
        title: "Accident Procedures",
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
    title: "Fuel & Efficiency",
    icon: Fuel,
    color: "green",
    resources: [
      {
        title: "Fuel Card Programs",
        description: "Maximize savings with our partner fuel programs and discount networks.",
        details: [
          "Pilot Flying J discount program",
          "Love's fuel rewards",
          "TA/Petro network savings",
          "Fuel tax reporting assistance",
          "IFTA compliance support",
        ],
      },
      {
        title: "Fuel Efficiency Tips",
        description: "Proven techniques to reduce fuel consumption and increase profitability.",
        details: [
          "Optimal cruise speed (62-65 mph sweet spot)",
          "Progressive shifting techniques",
          "Idle reduction strategies",
          "Tire pressure monitoring",
          "Route planning for fuel efficiency",
        ],
      },
      {
        title: "IFTA Reporting Guide",
        description: "International Fuel Tax Agreement reporting requirements and deadlines.",
        details: [
          "Quarterly reporting deadlines",
          "Required record keeping",
          "Mileage tracking requirements",
          "Fuel purchase documentation",
          "State-by-state tax rates",
        ],
      },
    ],
  },
  {
    title: "Maintenance & Equipment",
    icon: Wrench,
    color: "purple",
    resources: [
      {
        title: "Pre-Trip Inspection Guide",
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
        title: "Tire Maintenance Standards",
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
        title: "Preventive Maintenance Schedule",
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
    title: "Health & Wellness",
    icon: HeartPulse,
    color: "red",
    resources: [
      {
        title: "DOT Physical Requirements",
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
        title: "Healthy Eating on the Road",
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
        title: "Exercise & Stretching Guide",
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
        title: "Mental Health Resources",
        description: "Support resources for managing stress, isolation, and mental wellness on the road.",
        details: [
          "Truckers Against Trafficking hotline",
          "Mental health support lines",
          "Family connection tips",
          "Stress management techniques",
          "Sleep hygiene improvements",
        ],
      },
    ],
  },
  {
    title: "Business Tools",
    icon: Calculator,
    color: "indigo",
    resources: [
      {
        title: "Owner Operator Tax Guide",
        description: "Tax deductions, quarterly estimates, and record-keeping for independent drivers.",
        details: [
          "Per diem deduction rules",
          "Equipment depreciation",
          "Home office deductions",
          "Quarterly estimated taxes",
          "Business expense tracking",
        ],
      },
      {
        title: "Load Profitability Calculator",
        description: "Calculate true profitability of loads including fuel, time, and operational costs.",
        link: "/pay-rates",
        internal: true,
      },
      {
        title: "Trip Planning Resources",
        description: "Tools and resources for efficient route planning and trip management.",
        details: [
          "Truck-specific GPS recommendations",
          "Weigh station bypass programs",
          "Rest area and truck parking apps",
          "Weather monitoring tools",
          "Load board best practices",
        ],
      },
    ],
  },
]

const quickLinks = [
  {
    title: "FMCSA SAFER System",
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
    title: "Trucker Path App",
    description: "Truck stops, parking & fuel",
    url: "https://truckerpath.com/",
    icon: Navigation,
  },
  {
    title: "DAT Load Board",
    description: "Find available freight",
    url: "https://www.dat.com/",
    icon: Truck,
  },
]

const colorClasses = {
  blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600",
  orange: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-600",
  green: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-600",
  purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600",
  red: "from-red-500/10 to-red-600/5 border-red-500/20 text-red-600",
  indigo: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-600",
}

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Resources" category="Drivers" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-blue-900 text-white py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-5 py-2.5 text-sm font-bold">
              <BookOpen className="h-4 w-4 mr-1.5 inline" />
              Driver Resource Center
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Everything You Need to <span className="text-orange">Succeed</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Comprehensive resources for FMCSA compliance, safety training, fuel efficiency, 
              health & wellness, and business tools. Stay informed, stay compliant, stay profitable.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <Icon className="h-6 w-6 text-navy mb-2 group-hover:text-orange transition-colors" />
                  <h3 className="font-bold text-sm text-gray-900">{link.title}</h3>
                  <p className="text-xs text-gray-500">{link.description}</p>
                  <ExternalLink className="h-3 w-3 text-gray-400 mt-2" />
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Emergency Contact Banner */}
      <section className="py-6 bg-red-50 border-y border-red-100">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-800">24/7 Emergency Dispatch</p>
                <p className="text-xs text-red-600">Roadside assistance, accidents, breakdowns</p>
              </div>
            </div>
            <a 
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              {COMPANY_INFO.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16">
        <div className="container">
          {resourceCategories.map((category) => {
            const Icon = category.icon
            const colorClass = colorClasses[category.color as keyof typeof colorClasses]
            
            return (
              <div key={category.title} className="mb-16 last:mb-0">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center border`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">{category.title}</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {category.resources.map((resource) => (
                    <Card key={resource.title} className="hover:shadow-lg transition-all border-gray-200 hover:border-gray-300">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
                          {resource.title}
                          {'external' in resource && resource.external && (
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {resource.details && (
                          <ul className="space-y-2 mb-4">
                            {resource.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        )}
                        {resource.link && (
                          ('external' in resource && resource.external) ? (
                            <a
                              href={resource.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Learn More <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Link
                              href={resource.link}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              View Resource →
                            </Link>
                          )
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-navy">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Need More Support?
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Our dispatch team is available 24/7 to help with any questions or concerns.
              We're here to support your success on the road.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
              >
                Apply to Drive With Us
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                Call {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


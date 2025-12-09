import { Metadata } from "next"
import Link from "next/link"
import { 
  Shield, Star, Award, Users, Truck, DollarSign,
  Heart, CheckCircle2, Phone, Calendar, MapPin,
  Medal, Flag, Target, Briefcase, GraduationCap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `Military Veterans CDL Jobs | ${COMPANY_INFO.name}`,
  description: "Thind Transport proudly hires military veterans. We value your service, discipline, and skills. CDL Class A jobs with 91% commission for O/O, $50K-$78K for company drivers. Special veteran benefits and support.",
  keywords: [
    "veteran truck driver jobs",
    "military CDL jobs",
    "veteran trucking careers",
    "military to trucking",
    "veteran owner operator",
    "ex-military truck driver",
    "military skills trucking",
    "veteran driver benefits",
    "trucking jobs for veterans",
  ],
}

const veteranBenefits = [
  {
    icon: DollarSign,
    title: "Competitive Veteran Pay",
    description: "Same great rates for all: 91% commission for O/O, $50K-$78K for company drivers. Your military experience is valued.",
  },
  {
    icon: Shield,
    title: "Skills Translation",
    description: "Military logistics, convoy operations, and discipline translate directly to trucking success. We recognize and value these skills.",
  },
  {
    icon: Calendar,
    title: "Flexible Scheduling",
    description: "We work with reserve/guard commitments and understand military family needs. Your service doesn't end when you leave active duty.",
  },
  {
    icon: Users,
    title: "Veteran Support Network",
    description: "Connect with other veteran drivers in our fleet. We understand the transition and are here to help you succeed.",
  },
  {
    icon: GraduationCap,
    title: "CDL Training Assistance",
    description: "Need your CDL? We can guide you to training programs that accept GI Bill benefits. Start your trucking career the right way.",
  },
  {
    icon: Heart,
    title: "Family-First Culture",
    description: "Military families sacrifice too. We honor home time commitments and understand the importance of family.",
  },
]

const militarySkillsTranslation = [
  {
    military: "Convoy Operations",
    trucking: "Route planning, timing, coordination",
  },
  {
    military: "Vehicle Maintenance",
    trucking: "Pre-trip inspections, equipment care",
  },
  {
    military: "Logistics & Supply Chain",
    trucking: "Load management, delivery scheduling",
  },
  {
    military: "Discipline & Professionalism",
    trucking: "On-time delivery, customer relations",
  },
  {
    military: "Security Clearance",
    trucking: "DOD contracts, sensitive freight",
  },
  {
    military: "Leadership",
    trucking: "Team driving, training new drivers",
  },
  {
    military: "Adaptability",
    trucking: "Weather, routing, schedule changes",
  },
  {
    military: "Safety Protocols",
    trucking: "DOT compliance, accident prevention",
  },
]

const cdlPrograms = [
  {
    name: "GI Bill Approved Schools",
    description: "Many CDL training programs accept GI Bill benefits. We can connect you with approved schools in your area.",
  },
  {
    name: "Workforce Innovation (WIOA)",
    description: "State programs that may cover CDL training costs for veterans transitioning to civilian careers.",
  },
  {
    name: "Helmets to Hardhats",
    description: "Programs that help veterans transition into transportation and construction careers.",
  },
  {
    name: "Military Skills Test Waiver",
    description: "Many states offer CDL skills test waivers for veterans with qualifying military vehicle experience.",
  },
]

const testimonials = [
  {
    name: "Marcus T.",
    branch: "U.S. Army",
    years: "8 years service",
    quote: "After 3 deployments, I needed a career that valued discipline and gave me independence. Thind Transport delivers on both. The 91% commission is real - no games.",
    role: "Owner Operator",
    earnings: "$180K first year",
  },
  {
    name: "Jennifer R.",
    branch: "U.S. Navy",
    years: "6 years service",
    quote: "The transition from military to civilian life is tough. Thind Transport made it easier with honest communication and real support. They actually honor home time.",
    role: "Company Driver",
    earnings: "$78K first year",
  },
  {
    name: "David K.",
    branch: "U.S. Marines",
    years: "4 years service",
    quote: "I've worked for 3 trucking companies. Thind is the only one where the settlement matches what they promised. That military attention to detail? They have it too.",
    role: "Owner Operator",
    earnings: "$210K gross",
  },
]

export default function VeteransPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Veterans" category="Company" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-blue-900 to-navy text-white py-24">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-5 py-2.5 text-sm font-bold">
              <Medal className="h-4 w-4 mr-1.5 inline" />
              Veterans Program
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Thank You for <span className="text-orange">Your Service</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto mb-8">
              Your military service taught you discipline, logistics, and leadership.
              Those skills make you an exceptional driver. We're proud to hire veterans.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
              >
                Apply Now — Veteran Priority
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Talk to a Recruiter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* American Flag Banner */}
      <div className="h-2 bg-gradient-to-r from-red-600 via-white to-blue-700" />

      {/* Quick Stats */}
      <section className="py-8 relative z-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: "91%", label: "Commission", sublabel: "Owner Operators" },
              { value: "$78K", label: "Top Earnings", sublabel: "Company Drivers" },
              { value: "24/7", label: "Support", sublabel: "Real People" },
              { value: "48", label: "States", sublabel: "Nationwide Coverage" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 text-center">
                <div className="text-2xl md:text-3xl font-black text-navy">{stat.value}</div>
                <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                <div className="text-xs text-gray-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Veterans Succeed */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
              <Flag className="h-4 w-4 mr-1.5 inline" />
              Why Veterans Thrive
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Military Skills = Trucking Success
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your military training prepared you for exactly this kind of career.
              Here's why veterans make exceptional truck drivers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {veteranBenefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <Card key={benefit.title} className="hover:shadow-lg transition-all border-gray-200 hover:border-navy/30">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy/10 to-blue-600/5 flex items-center justify-center mb-4 border border-navy/20">
                      <Icon className="h-6 w-6 text-navy" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Skills Translation */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-600 text-white px-4 py-2 text-sm font-bold">
              <Target className="h-4 w-4 mr-1.5 inline" />
              Skills Translation
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Your Military Experience Translates
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The skills you developed in service are exactly what trucking demands.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden border-2 border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-navy text-white">
                      <th className="px-6 py-4 text-left font-bold">Military Skill</th>
                      <th className="px-6 py-4 text-left font-bold">Trucking Application</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {militarySkillsTranslation.map((skill, idx) => (
                      <tr key={skill.military} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {skill.military}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{skill.trucking}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CDL Training Programs */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-orange text-white px-4 py-2 text-sm font-bold">
              <GraduationCap className="h-4 w-4 mr-1.5 inline" />
              CDL Training Resources
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Need Your CDL? We Can Help
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Several programs can help veterans get their CDL at reduced or no cost.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {cdlPrograms.map((program) => (
              <Card key={program.name} className="hover:shadow-lg transition-all border-gray-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{program.name}</h3>
                  <p className="text-gray-600">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">
              Not sure which program is right for you? Call us and we'll help you navigate the options.
            </p>
            <a
              href={`tel:${COMPANY_INFO.phoneFormatted}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call {COMPANY_INFO.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Veteran Testimonials */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-600 text-white px-4 py-2 text-sm font-bold">
              <Star className="h-4 w-4 mr-1.5 inline" />
              Veteran Success Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              From Service to Success
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hear from veterans who made the transition to trucking with Thind Transport.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-blue-800 flex items-center justify-center">
                      <Medal className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-navy font-medium">{testimonial.branch}</p>
                      <p className="text-xs text-gray-500">{testimonial.years}</p>
                    </div>
                  </div>
                  <blockquote className="text-gray-600 italic mb-4">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{testimonial.role}</p>
                    <p className="text-lg font-bold text-green-600">{testimonial.earnings}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-600 text-white px-4 py-2 text-sm font-bold">
              <Briefcase className="h-4 w-4 mr-1.5 inline" />
              Open Positions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Start Your Trucking Career
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-xl transition-all border-2 border-blue-200 hover:border-blue-300">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100/50">
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  Company Driver
                </CardTitle>
                <CardDescription>Stability with great benefits</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">$50K-$78K annually</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">$1,500 sign-on bonus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">Full benefits package</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">Flexible home time</span>
                  </li>
                </ul>
                <Link
                  href="/apply?type=company"
                  className="block w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply as Company Driver
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all border-2 border-green-200 hover:border-green-300">
              <CardHeader className="bg-gradient-to-br from-green-50 to-green-100/50">
                <CardTitle className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-green-600" />
                  Owner Operator
                </CardTitle>
                <CardDescription>Maximum earnings, maximum freedom</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 font-bold">91% commission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">$2,500 sign-on bonus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">No forced dispatch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700">100% fuel surcharge</span>
                  </li>
                </ul>
                <Link
                  href="/apply?type=owner"
                  className="block w-full py-3 bg-green-600 text-white text-center font-bold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Apply as Owner Operator
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-blue-500/10" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Medal className="h-16 w-16 text-orange mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Your Service Matters to Us
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Thank you for your sacrifice and service to our country.
              Let us show you the same respect and commitment in your trucking career.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
              >
                Apply Now — Veteran Priority Processing
              </Link>
              <a
                href={`tel:${COMPANY_INFO.phoneFormatted}`}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


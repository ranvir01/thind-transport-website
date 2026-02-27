import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { 
  Building2, Users, Truck, MapPin, Calendar, Award,
  Shield, Heart, Phone, Mail, Clock, CheckCircle2,
  Star, TrendingUp, Target, HeartHandshake
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO, STATS, TRUST_INDICATORS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `About Us - Family-Owned Trucking Since 2016 | ${COMPANY_INFO.name}`,
  description: `Learn about Thind Transport LLC, a family-owned trucking company based in Kent, WA. Founded in 2016 with 20+ years of industry experience. FMCSA certified, A+ safety rating, hiring nationwide.`,
  keywords: [
    "Thind Transport about us",
    "Kent WA trucking company",
    "family owned trucking",
    "trucking company history",
    "FMCSA certified carrier",
    "Washington state trucking",
  ],
}

const milestones = [
  {
    year: "2016",
    title: "Company Founded",
    description: "Thind Transport LLC established in Kent, Washington with a vision to treat drivers like family.",
  },
  {
    year: "2018",
    title: "Fleet Expansion",
    description: "Grew to 5 trucks and established partnerships with major brokers and shippers.",
  },
  {
    year: "2020",
    title: "Pandemic Resilience",
    description: "Kept all drivers employed and busy throughout the pandemic, proving our commitment to our team.",
  },
  {
    year: "2022",
    title: "Technology Upgrade",
    description: "Invested in modern fleet management systems and upgraded to newer equipment.",
  },
  {
    year: "2024",
    title: "Fleet Modernization",
    description: "Rolled out new 2024 Freightliner Cascadias with the latest safety and comfort features.",
  },
  {
    year: "2025",
    title: "Nationwide Expansion",
    description: "Now hiring drivers from all 48 states with plans to double our fleet size.",
  },
]

const values = [
  {
    icon: Heart,
    title: "Family First",
    description: "We treat every driver like family. Your success is our success, and we're here to support you every step of the way.",
  },
  {
    icon: Shield,
    title: "Integrity Always",
    description: "No hidden fees, no broken promises. What we say is what we do. Transparent settlements, honest communication.",
  },
  {
    icon: TrendingUp,
    title: "Driver Success",
    description: "Our business model is built around maximizing driver earnings. When you succeed, we succeed.",
  },
  {
    icon: Target,
    title: "Excellence",
    description: "From equipment maintenance to customer service, we strive for excellence in everything we do.",
  },
  {
    icon: HeartHandshake,
    title: "Partnership",
    description: "Whether you're a company driver or owner operator, we're your partner, not just a dispatcher.",
  },
  {
    icon: Award,
    title: "Safety",
    description: "A+ safety rating maintained through rigorous standards and continuous improvement.",
  },
]

const teamMembers = [
  {
    name: "Dispatch Team",
    role: "24/7 Driver Support",
    description: "Our experienced dispatch team is available around the clock to help with loads, routing, and any issues on the road.",
  },
  {
    name: "Safety Department",
    role: "Compliance & Training",
    description: "Dedicated to maintaining our A+ safety rating and supporting drivers with compliance and training resources.",
  },
  {
    name: "Recruiting Team",
    role: "Driver Onboarding",
    description: "Fast, respectful hiring process. We respond to every application within 24 hours because your time matters.",
  },
  {
    name: "Accounting",
    role: "Weekly Settlements",
    description: "Transparent, accurate settlements every Friday. Questions answered promptly, no runaround.",
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="About Us" category="Company" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-blue-900 to-navy text-white py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/20 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-5 py-2.5 text-sm font-bold">
              <Building2 className="h-4 w-4 mr-1.5 inline" />
              About Thind Transport
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Family-Owned. <span className="text-orange">Driver-Focused.</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Since 2016, we've been building a trucking company that puts drivers first.
              Not just words on a website - it's in everything we do.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: "2016", label: "Founded", icon: Calendar },
              { value: "20+", label: "Years Experience", icon: Award },
              { value: "15+", label: "Active Trucks", icon: Truck },
              { value: "48", label: "States Covered", icon: MapPin },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-navy" />
                  <div className="text-2xl md:text-3xl font-black text-orange">{stat.value}</div>
                  <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
                  Our Story
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  Built by a Driver, <span className="text-orange">For Drivers</span>
                </h2>
                <div className="space-y-4 text-gray-600 leading-relaxed">
                  <p>
                    Thind Transport was founded in 2016 by someone who spent over two decades behind the wheel.
                    After years of working for large carriers and seeing how drivers were often treated as
                    numbers rather than people, we knew there had to be a better way.
                  </p>
                  <p>
                    We started with a simple idea: What if a trucking company actually kept its promises?
                    What if drivers could trust that their settlement would be accurate, their home time
                    would be honored, and their concerns would be heard?
                  </p>
                  <p>
                    Today, we're proud to offer <strong className="text-gray-900">91% commission</strong> to
                    owner operators - one of the highest rates in the industry. We've maintained an{" "}
                    <strong className="text-gray-900">A+ safety rating</strong> since day one. And most
                    importantly, we've built a team that feels like family.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-navy to-blue-900 overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange/30 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white p-8">
                      <div className="text-6xl font-black text-orange mb-2">20+</div>
                      <div className="text-xl font-bold">Years of Industry Experience</div>
                      <p className="text-white/70 mt-2">
                        Our founder's hands-on experience shapes every decision we make
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-orange text-white px-4 py-2 text-sm font-bold">
              <Calendar className="h-4 w-4 mr-1.5 inline" />
              Our Journey
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Growing Together
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From a single truck to a growing fleet, every milestone reflects our commitment to drivers.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange via-navy to-orange" />
              
              {/* Timeline items */}
              <div className="space-y-8">
                {milestones.map((milestone, idx) => (
                  <div 
                    key={milestone.year}
                    className={`relative flex items-start gap-8 ${
                      idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-4 md:left-1/2 w-8 h-8 -translate-x-1/2 rounded-full bg-orange border-4 border-white shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    
                    {/* Content */}
                    <div className={`ml-16 md:ml-0 md:w-1/2 ${idx % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                      <Card className="inline-block">
                        <CardContent className="p-6">
                          <div className="text-3xl font-black text-orange mb-2">{milestone.year}</div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{milestone.title}</h3>
                          <p className="text-gray-600">{milestone.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
              <Heart className="h-4 w-4 mr-1.5 inline" />
              Our Values
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              What We Stand For
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These aren't just words on a wall - they guide every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <Card key={value.title} className="hover:shadow-lg transition-all border-gray-200 hover:border-orange/30">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange/10 to-orange/5 flex items-center justify-center mb-4 border border-orange/20">
                      <Icon className="h-6 w-6 text-orange" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-600 text-white px-4 py-2 text-sm font-bold">
              <Users className="h-4 w-4 mr-1.5 inline" />
              Our Team
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Real People, Real Support
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              When you call, you talk to a person - not a machine. Our team is here for you 24/7.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {teamMembers.map((member) => (
              <Card key={member.name} className="text-center hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-navy to-blue-800 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-sm font-medium text-orange mb-2">{member.role}</p>
                  <p className="text-sm text-gray-600">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-600 text-white px-4 py-2 text-sm font-bold">
              <Shield className="h-4 w-4 mr-1.5 inline" />
              Credentials & Safety
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Certified & Verified
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We maintain the highest standards of compliance and safety in the industry.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {TRUST_INDICATORS.certifications.map((cert) => (
              <Card key={cert.name} className="text-center hover:shadow-lg transition-all border-green-100 hover:border-green-200">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 mx-auto mb-4 flex items-center justify-center border border-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{cert.name}</h3>
                  <p className="text-sm text-gray-600">{cert.issuer}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Safety Stats */}
          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  {TRUST_INDICATORS.performance.map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl md:text-3xl font-black text-green-700">{stat.value}</div>
                      <div className="text-sm text-green-800 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-navy text-white px-4 py-2 text-sm font-bold">
                  <MapPin className="h-4 w-4 mr-1.5 inline" />
                  Our Location
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  Based in <span className="text-orange">Kent, Washington</span>
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Our headquarters in Kent, WA puts us at the heart of Pacific Northwest logistics.
                  But our network spans all 48 contiguous states - wherever you want to drive, we have freight.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Mailing Address</p>
                      <p className="text-gray-600">{COMPANY_INFO.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Phone</p>
                      <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className="text-orange hover:text-orange-600">
                        {COMPANY_INFO.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Email</p>
                      <a href={`mailto:${COMPANY_INFO.email}`} className="text-orange hover:text-orange-600">
                        {COMPANY_INFO.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Dispatch Hours</p>
                      <p className="text-gray-600">24/7 - Always available</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden shadow-lg">
                  {/* Map placeholder - would integrate real map in production */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-16 w-16 text-navy mx-auto mb-4" />
                      <p className="text-xl font-bold text-navy">Kent, Washington</p>
                      <p className="text-navy/60">Serving All 48 States</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-navy">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Ready to Join Our Family?
            </h2>
                <p className="text-lg text-white/90 mb-8">
                  Experience the difference of working with a company that truly values its drivers.
                  Apply today and start your journey with Thind Transport.
                </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
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


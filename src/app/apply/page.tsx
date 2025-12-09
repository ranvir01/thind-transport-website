import { Metadata } from "next"
import Link from "next/link"
import { ApplicationForm } from "@/components/application/ApplicationForm"
import { COMPANY_INFO, PAY_RATES } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"
import Image from "next/image"
import { 
  Shield, Phone, Clock, CheckCircle2, Users, Star, DollarSign, 
  Headphones, MapPin, Truck, Award, BadgeCheck, Play,
  ChevronRight, Zap, Home, Route, Fuel, Wrench, CreditCard
} from "lucide-react"

// Enhanced SEO Metadata - Competitor Analysis Based
export const metadata: Metadata = {
  title: `Apply Now - 60 Second Application | ${COMPANY_INFO.name}`,
  description: `Quick 60-second application for CDL driver positions at ${COMPANY_INFO.name}. Hiring nationwide. Owner Operators: 91% commission. Company Drivers: ${PAY_RATES.companyDriver.otr.perMile}/mi. No experience required. Start next week. Apply now!`,
  keywords: [
    "CDL truck driver jobs",
    "owner operator jobs",
    "truck driver application",
    "trucking jobs near me",
    "91% commission trucking",
    "CDL Class A jobs",
    "flatbed truck driver jobs",
    "reefer truck driver jobs",
    "dry van truck driver jobs",
    "Kent WA trucking jobs",
    "same day pay trucking",
    "weekly home time trucking",
    "truck driver sign on bonus",
    "OTR truck driver jobs",
    "regional truck driver jobs",
    "local truck driver jobs",
    "Thind Transport careers",
    "apply trucking job online",
  ],
  openGraph: {
    title: `Apply Now - 60 Second Application | ${COMPANY_INFO.name}`,
    description: `Quick 60-second application for CDL driver positions at ${COMPANY_INFO.name}. Hiring nationwide. Owner Operators: 91% commission. Company Drivers: ${PAY_RATES.companyDriver.otr.perMile}/mi.`,
    type: "website",
    url: "https://thindtransport.com/apply",
  },
  twitter: {
    card: "summary_large_image",
    title: `Hiring CDL Drivers NOW | ${COMPANY_INFO.name}`,
    description: "91% Commission for O/O • Competitive Company Pay • Same Day Pay • Apply in 60 Seconds",
  },
  alternates: {
    canonical: "https://thindtransport.com/apply",
  },
}

// JobPosting Schema for Google Jobs
const jobPostingSchema = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "CDL Class A Truck Driver",
  description: "Thind Transport is hiring experienced CDL Class A drivers. Owner Operators earn 91% of gross revenue. Company drivers earn competitive CPM. Same day pay available, new equipment, flexible home time options.",
  identifier: {
    "@type": "PropertyValue",
    name: "Thind Transport LLC",
    value: "CDL-DRIVER-2025-001"
  },
  datePosted: new Date().toISOString().split('T')[0],
  validThrough: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  employmentType: ["FULL_TIME", "CONTRACTOR"],
  hiringOrganization: {
    "@type": "Organization",
    name: COMPANY_INFO.name,
    sameAs: "https://thindtransport.com",
    logo: "https://thindtransport.com/ar-carrier-logo.png"
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kent",
      addressRegion: "WA",
      addressCountry: "US"
    }
  },
  applicantLocationRequirements: {
    "@type": "Country",
    name: "United States"
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 65000,
      maxValue: 250000,
      unitText: "YEAR"
    }
  },
  jobBenefits: `Same day pay, $${PAY_RATES.ownerOperator.signOnBonus} sign-on bonus for owner operators, ${PAY_RATES.companyDriver.signOnBonus} sign-on bonus for company drivers, weekly home time, 24/7 dispatch support, new equipment`,
  qualifications: "Valid CDL Class A license, clean driving record, 1-2 years experience preferred",
  responsibilities: "Safe operation of commercial motor vehicles, timely delivery of freight, compliance with DOT regulations, professional communication with dispatch and customers",
  directApply: true
}

// FAQ Schema for Rich Snippets
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How long does the application process take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our online application takes just 60 seconds to complete. Most applicants receive a response within 2 hours, and qualified drivers can be on the road within 48-72 hours."
      }
    },
    {
      "@type": "Question",
      name: "What is the pay for owner operators at Thind Transport?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Owner operators at Thind Transport earn 91% of gross revenue with no hidden fees. Most owner operators earn between $4,500-$6,000 per week, plus a ${PAY_RATES.ownerOperator.signOnBonus} sign-on bonus.`
      }
    },
    {
      "@type": "Question",
      name: "Do you offer same day pay?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Thind Transport offers same day pay options for all drivers. Standard weekly settlements are processed every Friday via direct deposit."
      }
    },
    {
      "@type": "Question",
      name: "What home time options are available?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer flexible home time options including local routes (home daily), regional routes (home weekly), and OTR routes (home every 2-3 weeks). You choose what works for your lifestyle."
      }
    }
  ]
}

export default function ApplyPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-[#00060D]">
        <div className="scale-90 origin-left opacity-80 mb-[-1rem]">
           <PageBreadcrumb pageName="Apply Now" category="Drivers" />
        </div>
        
        {/* Unified Hero & Form Section */}
        <section className="relative pt-12 pb-16 lg:py-24 overflow-hidden">
          {/* Background Image - Absolute */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/resources/hero-fleet-sunset.jpg"
              alt="Thind Transport semi trucks on highway - CDL driver jobs available"
              fill
              className="object-cover object-center opacity-50"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#00060D] via-[#00060D]/85 to-[#00060D]/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#00060D] via-transparent to-transparent" />
          </div>
          
          <div className="container relative z-10">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left Column - Hero Content (Desktop) / Top (Mobile) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 backdrop-blur-sm text-orange-300 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    <Zap className="h-4 w-4" />
                    Now Hiring – Immediate Openings
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                    Drive For The Best. <br/>
                    <span className="text-orange-500">Earn The Most.</span>
                  </h1>
                  
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Join {COMPANY_INFO.name} – a family-owned carrier where drivers come first. 
                    <span className="block mt-2 font-semibold text-white">
                      Fast approval • 24/7 support • New equipment
                    </span>
                  </p>
                </div>

                {/* Pay Highlights */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#001F3F]/80 backdrop-blur-sm border border-orange-500/30 rounded-xl p-4">
                    <p className="text-xs text-orange-400 uppercase tracking-wider font-bold mb-1">Owner Ops</p>
                    <p className="text-3xl font-black text-orange-400">91%</p>
                    <p className="text-xs text-slate-300">Gross Revenue</p>
                  </div>
                  <div className="bg-[#001F3F]/80 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
                    <p className="text-xs text-blue-400 uppercase tracking-wider font-bold mb-1">Company</p>
                    <p className="text-3xl font-black text-blue-400">{PAY_RATES.companyDriver.otr.perMile}</p>
                    <p className="text-xs text-slate-300">Per Mile</p>
                  </div>
                </div>

                {/* Trust Pills - Hidden on very small mobile to save space */}
                <div className="hidden sm:flex flex-wrap gap-3">
                  {[
                    { icon: DollarSign, text: "Same Day Pay" },
                    { icon: Headphones, text: "24/7 Support" },
                    { icon: Users, text: "Family Owned" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-slate-300 border border-white/10">
                      <item.icon className="h-3.5 w-3.5 text-orange-400" />
                      <span className="font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Social Proof Bar (Compact) */}
                <div className="border-t border-white/10 pt-6 mt-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center gap-4 shadow-lg">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-slate-700 border-2 border-[#00060D] flex items-center justify-center text-xs font-bold text-white overflow-hidden relative">
                           {/* Using initials/placeholders to ensure no broken images */}
                           <span className="z-10 relative">{String.fromCharCode(64 + i)}</span>
                           <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-[#00060D] flex items-center justify-center text-xs font-bold text-white z-10">
                        +44
                      </div>
                    </div>
                    <div>
                       <p className="text-white font-bold text-sm">47 drivers applied this week</p>
                       <p className="text-green-400 text-[10px] font-medium flex items-center gap-1.5 uppercase tracking-wide mt-0.5">
                         <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/> 
                         High Demand
                       </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form (Priority on Mobile) */}
              <div className="lg:col-span-7" id="application-form">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                  <div className="bg-gradient-to-r from-[#001F3F] to-[#003366] px-6 py-4 border-b border-navy-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Start Your Application</h2>
                      <p className="text-blue-200 text-xs">Takes less than 60 seconds</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-300 text-xs font-semibold">Recruiters Online</span>
                    </div>
                  </div>
                  <div className="p-4 md:p-8">
                    <ApplicationForm />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Info Section - Below the Fold */}
        <section className="bg-[#001326] border-t border-white/5 py-12 lg:py-16">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              
              {/* Job Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Job Description Section */}
                <div className="bg-[#00060D] rounded-2xl p-6 md:p-8 border border-white/5">
                  <h2 className="text-2xl font-bold text-white mb-6">About This CDL Driver Position</h2>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Position Overview */}
                    <div>
                      <h3 className="text-lg font-semibold text-orange-400 mb-3">Position Overview</h3>
                      <p className="text-slate-300 text-sm leading-relaxed mb-4">
                        {COMPANY_INFO.name} is seeking professional CDL Class A drivers for our growing fleet. 
                        We offer both Owner Operator and Company Driver positions with industry-leading pay, 
                        modern equipment, and genuine work-life balance.
                      </p>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Haul freight across 48 states</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Flatbed, Reefer, and Dry Van trailers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Local, Regional, and OTR routes available</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>No-touch freight options</span>
                        </li>
                      </ul>
                    </div>

                    {/* Requirements */}
                    <div>
                      <h3 className="text-lg font-semibold text-orange-400 mb-3">Requirements</h3>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Valid CDL Class A license</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>1+ year experience (Company Driver)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>2+ years OTR experience (Owner Operator)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Clean MVR and DAC report</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>Pass DOT physical and drug screen</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <span>No DUI/DWI in last 5 years</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Benefits Grid */}
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Benefits & Perks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: DollarSign, text: "Same Day Pay", color: "text-green-400" },
                        { icon: CreditCard, text: "Weekly Settlements", color: "text-blue-400" },
                        { icon: Home, text: "Flexible Home Time", color: "text-orange-400" },
                        { icon: Headphones, text: "24/7 Dispatch", color: "text-purple-400" },
                        { icon: Fuel, text: "Fuel Discounts", color: "text-yellow-400" },
                        { icon: Wrench, text: "Maintenance Discounts", color: "text-cyan-400" },
                        { icon: Truck, text: "New Equipment", color: "text-green-400" },
                        { icon: Route, text: "Consistent Miles", color: "text-orange-400" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                          <item.icon className={`h-4 w-4 ${item.color} flex-shrink-0`} />
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FAQ Section - SEO Rich Snippets */}
                <div className="mt-8 bg-[#001326] rounded-2xl p-6 md:p-8 border border-white/5">
                  <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                  
                  <div className="space-y-6">
                    {[
                      {
                        q: "How long does the application process take?",
                        a: "Our online application takes just 60 seconds to complete. Most applicants receive a response within 2 hours, and qualified drivers can be on the road within 48-72 hours."
                      },
                      {
                        q: "What is the pay for owner operators at Thind Transport?",
                        a: `Owner operators earn 91% of gross revenue with no hidden fees. Most owner operators earn between $4,500-$6,000 per week, plus a $${PAY_RATES.ownerOperator.signOnBonus} sign-on bonus.`
                      },
                      {
                        q: "Do you offer same day pay?",
                        a: "Yes! We offer same day pay options for all drivers. Standard weekly settlements are processed every Friday via direct deposit."
                      },
                      {
                        q: "What home time options are available?",
                        a: "We offer flexible home time: Local routes (home daily), Regional routes (home weekly), and OTR routes (home every 2-3 weeks). You choose what works for your lifestyle."
                      },
                      {
                        q: "What types of trailers do you haul?",
                        a: "We operate Flatbed, Reefer, and Dry Van trailers. You can specialize in one type or diversify based on your preferences and endorsements."
                      },
                    ].map((item, i) => (
                      <details key={i} className="group bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all hover:bg-white/10 open:bg-white/10 open:border-orange-500/30">
                        <summary className="flex items-center justify-between cursor-pointer list-none p-4">
                          <h3 className="text-white font-semibold pr-4 text-sm md:text-base">{item.q}</h3>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                        </summary>
                        <div className="px-4 pb-4 pt-0">
                           <p className="text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-3">{item.a}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                
                {/* Trust Badges */}
                <div className="bg-[#00060D] rounded-2xl p-6 border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Why Drivers Choose Us</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Shield, title: "Secure Application", desc: "256-bit SSL encryption", color: "bg-green-500/10 text-green-400" },
                      { icon: Clock, title: "2-Hour Response", desc: "Personal recruiter callback", color: "bg-orange-500/10 text-orange-400" },
                      { icon: CheckCircle2, title: "No Obligation", desc: "Review your offer first", color: "bg-blue-500/10 text-blue-400" },
                      { icon: Award, title: "A+ Safety Rating", desc: "FMCSA Certified Carrier", color: "bg-purple-500/10 text-purple-400" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${item.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                          <item.icon className={`h-5 w-5 ${item.color.split(' ')[1]}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{item.title}</p>
                          <p className="text-xs text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-Qualify CTA */}
                <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl p-6 text-white border border-blue-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-blue-400" />
                      </div>
                      <h3 className="font-bold text-lg text-white">Not Ready Yet?</h3>
                    </div>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                      Check if you qualify for our top-tier pay rates in less than 2 minutes. No commitment required.
                    </p>
                    <Link 
                      href="/pre-qualify"
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-blue-500/25"
                    >
                      Check Eligibility <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Testimonials */}
                <div className="bg-gradient-to-br from-[#001F3F] to-[#001326] rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                      ))}
                    </div>
                    <blockquote className="text-slate-300 text-sm leading-relaxed mb-4">
                      "I get paid on time, every time. The dispatch team treats me like family, not just a number. Best decision I ever made."
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <Image
                        src="/images/generated/driver-portrait-1.png"
                        alt="Mike R. - Owner Operator at Thind Transport"
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white font-semibold text-sm">Mike R.</p>
                        <p className="text-xs text-slate-500">Owner Operator • 3 Years</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone CTA */}
                <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-6 text-center shadow-lg shadow-orange-900/30">
                  <Phone className="h-8 w-8 text-white mx-auto mb-3" />
                  <p className="text-white/90 text-sm mb-2">Questions? Talk to a recruiter now</p>
                  <Link
                    href={`tel:${COMPANY_INFO.phoneFormatted}`}
                    className="text-2xl font-black text-white hover:text-orange-200 transition-colors block"
                  >
                    {COMPANY_INFO.phone}
                  </Link>
                  <p className="text-xs text-orange-200 mt-2">Mon-Fri 8AM-6PM PST</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Strip */}
        <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 py-8">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-white">Ready to Start Earning More?</h2>
                <p className="text-orange-100">Join 47+ drivers who applied this month</p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="#application-form"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
                >
                  Apply Now <ChevronRight className="h-5 w-5" />
                </Link>
                <Link
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="inline-flex items-center gap-2 bg-orange-700 text-white px-6 py-4 rounded-xl font-bold hover:bg-orange-800 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  Call
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}


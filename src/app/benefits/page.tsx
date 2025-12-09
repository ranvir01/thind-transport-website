import { Metadata } from "next"
import Link from "next/link"
import { 
  DollarSign, Heart, Shield, Clock, Home, Truck, 
  Fuel, Wrench, Users, Gift, Calendar, Phone,
  CheckCircle2, Star, Award, TrendingUp, Wallet,
  HeartPulse, GraduationCap, Baby, Plane
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { COMPANY_INFO, PAY_RATES, BENEFITS } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `Driver Benefits & Perks | ${COMPANY_INFO.name}`,
  description: "Comprehensive benefits for CDL truck drivers: health insurance, 401k retirement, paid time off, sign-on bonuses, fuel discounts, maintenance programs, and flexible home time. Join our family-owned company.",
  keywords: [
    "truck driver benefits",
    "CDL driver health insurance",
    "trucking 401k retirement",
    "driver sign on bonus",
    "owner operator benefits",
    "truck driver paid time off",
    "trucking company perks",
    "driver home time",
    "fuel discount program",
  ],
}

const companyDriverBenefits = [
  {
    category: "Compensation",
    icon: DollarSign,
    color: "green",
    items: [
      {
        title: "Competitive Pay",
        description: "$0.50-$0.60 per mile, $50K-$78K annually",
        highlight: true,
      },
      {
        title: "Sign-On Bonus",
        description: "$1,500 paid during your first year",
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
    category: "Health & Wellness",
    icon: HeartPulse,
    color: "red",
    items: [
      {
        title: "Medical Insurance",
        description: "Comprehensive health coverage for you and family",
      },
      {
        title: "Dental Insurance",
        description: "Full dental coverage including major procedures",
      },
      {
        title: "Vision Insurance",
        description: "Annual eye exams and eyewear coverage",
      },
      {
        title: "Life Insurance",
        description: "Company-paid life insurance policy",
      },
      {
        title: "Disability Insurance",
        description: "Short and long-term disability coverage",
      },
    ],
  },
  {
    category: "Retirement & Financial",
    icon: Wallet,
    color: "blue",
    items: [
      {
        title: "401(k) Plan",
        description: "Retirement savings with company match",
        highlight: true,
      },
      {
        title: "Tax Advantages",
        description: "Per diem pay options to reduce taxable income",
      },
      {
        title: "Financial Planning",
        description: "Resources for retirement and investment planning",
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
        title: "91% Gross Commission",
        description: "Industry-leading rate - you keep 91% of every load",
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
  { feature: "Commission Rate", thind: "91%", industry: "70-85%" },
  { feature: "Fuel Surcharge", thind: "100% to driver", industry: "Varies, often split" },
  { feature: "Sign-On Bonus (O/O)", thind: "$2,500", industry: "$500-$1,500" },
  { feature: "Forced Dispatch", thind: "Never", industry: "Common" },
  { feature: "Weekly Settlement", thind: "Every Friday", industry: "Varies" },
  { feature: "Hidden Fees", thind: "None", industry: "Often hidden" },
  { feature: "Equipment Age", thind: "2024 Models", industry: "3-5+ years old" },
  { feature: "24/7 Support", thind: "Yes, real people", industry: "Limited hours" },
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PageBreadcrumb pageName="Benefits" category="Drivers" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-blue-900 to-navy text-white py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange/20 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/20 backdrop-blur-md text-white border-white/30 px-5 py-2.5 text-sm font-bold">
              <Gift className="h-4 w-4 mr-1.5 inline" />
              Industry-Leading Benefits
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Benefits That Actually <span className="text-orange">Matter</span>
            </h1>
            <p className="text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              We believe drivers deserve more than just a paycheck. From health coverage to retirement plans,
              from flexible schedules to modern equipment - we invest in your success and wellbeing.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 -mt-8 relative z-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: "91%", label: "Commission", sublabel: "Owner Operators" },
              { value: "$78K", label: "Annual Potential", sublabel: "Company Drivers" },
              { value: "100%", label: "Fuel Surcharge", sublabel: "Passed Through" },
              { value: "24/7", label: "Support", sublabel: "Real People" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 text-center">
                <div className="text-2xl md:text-3xl font-black text-orange">{stat.value}</div>
                <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                <div className="text-xs text-gray-500">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Driver Benefits */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-600 text-white px-4 py-2 text-sm font-bold">
              <Shield className="h-4 w-4 mr-1.5 inline" />
              Company Drivers
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Full Benefits Package
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stability, security, and great pay. Everything you need as a company driver.
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
                    {section.items.map((item) => (
                      <div 
                        key={item.title}
                        className={`p-4 rounded-xl border transition-all ${
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
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Owner Operator Benefits */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-600 text-white px-4 py-2 text-sm font-bold">
              <TrendingUp className="h-4 w-4 mr-1.5 inline" />
              Owner Operators
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Maximum Earnings, Maximum Freedom
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              91% commission, no forced dispatch, complete transparency. Run your business your way.
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
                    {section.items.map((item) => (
                      <div 
                        key={item.title}
                        className={`p-4 rounded-xl border transition-all ${
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

            <Card className="overflow-hidden border-2 border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-navy text-white">
                      <th className="px-6 py-4 text-left font-bold">Feature</th>
                      <th className="px-6 py-4 text-center font-bold bg-orange">
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
                        <td className="px-6 py-4 text-center font-bold text-green-600 bg-green-50/50">
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

      {/* CTA Section */}
      <section className="py-16 bg-navy">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Ready to Experience These Benefits?
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join our team and start enjoying industry-leading pay, benefits, and support.
              Apply today and hear back within 24 hours.
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


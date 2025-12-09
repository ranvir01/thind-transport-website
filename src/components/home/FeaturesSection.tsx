import Link from "next/link"
import { DollarSign, Home, Zap } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Home,
      title: "Flexible Home Time",
      description:
        "Choose your schedule: Local (home daily), Regional (home weekly), or OTR (2-3 weeks out). We work around YOUR life.",
      link: "/apply",
      linkText: "See Schedule Options →",
      gradient: "from-blue-50 to-indigo-50",
      border: "border-blue-100",
      iconColor: "text-blue-600",
      linkColor: "text-blue-700",
    },
    {
      icon: DollarSign,
      title: "Industry-Leading Pay",
      description:
        "Owner Operators earn 91% commission + $2,500 bonus. Company drivers earn $0.50-$0.60/mile + $1,000 bonus. No hidden fees.",
      link: "/pay-rates",
      linkText: "View Pay Details →",
      gradient: "from-orange-50 to-amber-50",
      border: "border-orange-100",
      iconColor: "text-orange-600",
      linkColor: "text-orange-700",
    },
    {
      icon: Zap,
      title: "Multiple Service Options",
      description:
        "Run Flatbed, Reefer, or Dry Van freight. Choose what fits your experience and equipment. Consistent loads across all divisions.",
      link: "/apply",
      linkText: "Apply Now →",
      gradient: "from-slate-50 to-gray-50",
      border: "border-slate-200",
      iconColor: "text-slate-700",
      linkColor: "text-slate-800",
    },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Drivers Choose{" "}
            <span className="text-[#001F3F]">Thind Transport</span>
          </h2>
          <p className="text-xl text-gray-600">
            Real benefits. Real pay. Real opportunities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`bg-gradient-to-br ${feature.gradient} rounded-xl p-6 border-2 ${feature.border}`}
              >
                <div className={`text-4xl mb-4 ${feature.iconColor}`}>
                  <Icon className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-700 mb-4">{feature.description}</p>
                <Link
                  href={feature.link}
                  className={`${feature.linkColor} font-semibold hover:underline`}
                >
                  {feature.linkText}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <Link
            href="/apply"
            className="inline-block bg-gradient-to-r from-[#001F3F] to-[#003366] hover:from-[#003366] hover:to-[#001F3F] text-white px-10 py-4 rounded-lg font-bold text-lg hover:shadow-xl transition-all"
          >
            Apply Now - Experience Rewarded →
          </Link>
        </div>
      </div>
    </section>
  )
}

import { Metadata } from "next"
import { EnhancedShowcase } from "@/components/marketing/EnhancedShowcase"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { COMPANY_INFO } from "@/lib/constants"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

export const metadata: Metadata = {
  title: `Interactive Components Showcase | ${COMPANY_INFO.name}`,
  description: "Explore Thind Transport opportunities with our enhanced interactive components. View FAQs, testimonials, pay rates, and more.",
}

export default function ShowcasePage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <PageBreadcrumb pageName="Showcase" category="Company" />
      
      {/* Hero Section */}
      <section className="gradient-brand text-white py-12">
        <div className="container text-center">
          <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white">
            ✨ Enhanced Interactive Experience
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Explore Your Career Opportunities
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Discover everything you need to know about joining {COMPANY_INFO.name} with our interactive components
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link href="/apply">Apply Now →</Link>
            </Button>
            <Button asChild size="lg" className="bg-green-500 hover:bg-green-600">
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>📞 Call Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container">
          <EnhancedShowcase />
        </div>
      </section>
    </div>
  )
}


import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Phone } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"

export function CTASection() {
  return (
    <section className="gradient-brand py-16 text-white">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Application?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join {COMPANY_INFO.name}. Apply in 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/apply">
                <FileText className="mr-2 h-5 w-5" />
                Start Application
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-green-500 hover:bg-green-600"
            >
              <Link href={`tel:${COMPANY_INFO.phoneFormatted}`}>
                <Phone className="mr-2 h-5 w-5" />
                {COMPANY_INFO.phone}
              </Link>
            </Button>
          </div>

          <p className="text-sm text-blue-200">
            Available 24/7 • Quick response guaranteed
          </p>
        </div>
      </div>
    </section>
  )
}


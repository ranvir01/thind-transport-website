import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { HelpCircle, MessageCircle } from "lucide-react"
import { Reveal } from "@/components/ui/Reveal"
import { COMPANY_INFO } from "@/lib/constants"

export function FAQSection() {
  return (
    <section
      data-light
      className="relative overflow-hidden border-y border-gray-200 bg-white py-section md:py-section-loose"
    >
      <div className="container relative">
        <Reveal className="max-w-5xl mx-auto">
          <div className="mx-auto mb-8 max-w-measure text-center">
            <div className="fleet-badge mb-4 mx-auto w-fit">
              <HelpCircle className="h-3.5 w-3.5" />
              Driver FAQ
            </div>
            <h2 className="text-gray-900 mb-4">Questions drivers ask us</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Straight answers about pay, equipment, and how we run. Don&apos;t
              see yours?{" "}
              <a
                href="/apply"
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Talk with our team
              </a>
              .
            </p>
          </div>

          <div className="rounded-fleet-lg border border-gray-200 bg-white p-3 sm:p-6">
            {/* Eight of the 25: the rest live on the pages they belong to. */}
            <FAQAccordion darkBackground={false} limit={8} />
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-fleet-lg border border-gray-200 bg-white shadow-sm">
              <MessageCircle className="h-5 w-5 text-orange-500 shrink-0" />
              <p className="text-gray-700 text-sm md:text-base">
                Still have questions?{" "}
                <a
                  href={`tel:${COMPANY_INFO.phoneFormatted}`}
                  className="text-orange-600 font-semibold hover:text-orange-700"
                >
                  Call {COMPANY_INFO.phone}
                </a>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

"use client"

import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { HelpCircle, MessageCircle } from "lucide-react"
import { motion } from "framer-motion"

export function FAQSection() {
  return (
    <section className="brand-section-panel py-16 sm:py-24 relative overflow-hidden">
      <div className="container relative px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
          suppressHydrationWarning
        >
          <div className="fleet-section-heading">
            <div className="fleet-badge mb-4 mx-auto w-fit">
              <HelpCircle className="h-3.5 w-3.5" />
              Driver FAQ
            </div>
            <h2 className="text-white mb-4">Questions drivers ask us</h2>
            <p className="text-lg text-steel-300 max-w-2xl mx-auto">
              Straight answers about pay, equipment, and how we run. Don&apos;t see yours?{" "}
              <a href="/apply" className="text-orange hover:text-orange-300 font-semibold">
                Talk with our team
              </a>
              .
            </p>
          </div>

          <div className="fleet-panel fleet-panel-accent p-4 sm:p-6 md:p-8">
            <FAQAccordion />
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 fleet-panel rounded-fleet-lg">
              <MessageCircle className="h-5 w-5 text-orange shrink-0" />
              <p className="text-steel-200 text-sm md:text-base">
                Still have questions?{" "}
                <a href="tel:+12067656300" className="text-orange font-semibold hover:text-orange-300">
                  Call (206) 765-6300
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

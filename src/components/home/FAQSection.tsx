"use client"

import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { Card, CardContent } from "@/components/ui/card"
import { HelpCircle, MessageCircle } from "lucide-react"
import { motion } from "framer-motion"

export function FAQSection() {
  return (
    <section className="relative py-16 sm:py-24 bg-[#020617] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-70" />
      <div className="container relative px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
          suppressHydrationWarning
        >
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/30 px-6 py-2.5 text-sm font-bold text-blue-400 mb-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <HelpCircle className="h-4 w-4" />
              <span>FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-2xl mx-auto font-medium">
              Get answers to common questions about working with us. Can't find what you're looking for? 
              <a href="/apply" className="text-blue-400 hover:text-blue-300 font-semibold ml-1 underline-offset-2 hover:underline">
                Contact us directly
              </a>
              .
            </p>
          </div>

          <div className="border border-white/10 rounded-2xl shadow-2xl bg-white/5 backdrop-blur-md p-2 sm:p-6 md:p-8">
              <FAQAccordion />
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <p className="text-zinc-200 font-medium">
                Still have questions?{" "}
                <a href="/apply" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-2 hover:underline">
                  Get in touch with our team
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}


"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Quote } from "lucide-react"
import Link from "next/link"
import { COMPANY_INFO } from "@/lib/constants"

const stories = [
  {
    name: "Harpreet S.",
    role: "Owner Operator",
    location: "Kent, WA",
    quote:
      "What I appreciate most is how straightforward the communication is. I know who to call, I get answers quickly, and dispatch keeps things moving.",
  },
  {
    name: "Aman G.",
    role: "Company Driver",
    location: "Portland, OR",
    quote:
      "The equipment is clean, the expectations are clear, and home time is discussed honestly. That matters more than flashy promises.",
  },
  {
    name: "Marcus J.",
    role: "Company Driver",
    location: "Boise, ID",
    quote:
      "It feels like a smaller team in the best way. You can actually get someone on the phone, and issues get handled without a bunch of back-and-forth.",
  },
]

export function SuccessStoriesSection() {
  return (
    <section className="py-20 md:py-28 brand-section-panel">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="fleet-section-heading"
        >
          <span className="fleet-badge mb-4">Driver feedback</span>
          <h2 className="text-white mb-4">
            Why drivers stay with <span className="text-orange">{COMPANY_INFO.name}</span>
          </h2>
          <p className="text-lg text-steel-300 max-w-2xl mx-auto">
            We kept this section simple on purpose. Clear communication, clean equipment, and respectful dispatch matter more than inflated numbers.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-8 max-w-6xl mx-auto">
          {stories.map((story, index) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full fleet-panel border-steel-700 hover:border-orange/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-fleet bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white font-display shadow-glow">
                      {story.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-display">{story.name}</h3>
                      <p className="text-sm text-steel-400">
                        {story.role} • {story.location}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <Quote className="absolute -top-1 -left-1 w-6 h-6 text-steel/10" />
                    <p className="pl-4 text-steel-300 leading-relaxed">
                      &ldquo;{story.quote}&rdquo;
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 md:mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="/apply"
              className="px-8 py-4 bg-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-all shadow-cta hover:shadow-cta-hover"
            >
              Start Your Application
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

"use client"

import { useId } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"
import { driverFaqs } from "@/lib/driver-faqs"

interface FAQAccordionProps {
  items?: { question: string; answer: string }[]
  darkBackground?: boolean
  gradientColor?: string
}

export function FAQAccordion({
  items = driverFaqs(),
  darkBackground = true,
}: FAQAccordionProps) {
  // Rendered on the server too — questions, answers, and FAQPage schema all
  // appear in the initial HTML so crawlers and AI assistants can read them.
  const id = useId()

  return (
    <div className="w-full space-y-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <Accordion type="single" collapsible className="w-full">
        {items.map((faq, index) => (
          <AccordionItem
            key={`${id}-${index}`}
            value={`item-${id}-${index}`}
            className={`border rounded-fleet mb-2 px-4 transition-colors ${
              darkBackground
                ? "border-steel-700 bg-navy-700/50 hover:bg-steel-800/40 data-[state=open]:bg-steel-800/60 data-[state=open]:border-orange/50"
                : "border-gray-200 bg-white hover:bg-orange-50/50 data-[state=open]:bg-orange-50/70 data-[state=open]:border-orange-300 shadow-sm"
            }`}
          >
            <AccordionTrigger
              className={`text-left py-5 font-semibold text-base hover:no-underline [&[data-state=open]>svg]:text-orange-500 ${
                darkBackground
                  ? "text-white hover:text-orange-400 [&[data-state=open]]:text-orange-400 [&>svg]:text-zinc-400"
                  : "text-gray-900 hover:text-orange-600 [&[data-state=open]]:text-orange-700 [&>svg]:text-gray-400"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 pr-4">
                <HelpCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-500" />
                <span className="flex-1">{faq.question}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent
              className={`text-base leading-relaxed pb-5 pl-8 ${
                darkBackground ? "text-zinc-300" : "text-gray-600"
              }`}
            >
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

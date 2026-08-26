"use client"

import { useId } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"
import { COMPANY_INFO, FMCSA_LINKS } from "@/lib/constants"

const defaultFaqs = [
  // Pay & Compensation
  {
    question: "What are the experience requirements?",
    answer: "For Owner Operators: Minimum 2 years OTR experience required. For Regional Company Drivers: Minimum 1 year company driver experience required. Both positions require a valid CDL Class A license and a clean driving record. No SAP drivers, no DUI in past 5 years, no felony convictions."
  },
  {
    question: "How much can I realistically earn?",
    answer: "Company Drivers: $78K-$110K annually at $0.60-$0.65 per mile (based on miles and route type), plus $1,000 sign-on bonus first year. Owner Operators: $250K-$300K gross annually with 91% payout (you keep 91% of gross!), plus $2,500 sign-on bonus. Pay is distributed weekly via direct deposit every Friday."
  },
  {
    question: "What's this 91% payout for owner operators?",
    answer: "You keep 91% of the gross revenue from each load - one of the highest rates in the industry! Most companies offer 70-85%. There are NO hidden fees or surprise deductions. Fuel surcharge passes through 100% to you. Your weekly settlement shows exactly where every dollar goes. Transparent accounting, no games."
  },
  {
    question: "How does the 91% payout work exactly?",
    answer: "Simple: If a load pays $3,000 gross, you receive $2,730 (91%). We take 9% to cover our back-office, dispatch, insurance, and administrative costs. NO other deductions. Fuel surcharge? You get 100%. Accessorial charges? You get 91%. Detention, layover, TONU - all 91% to you. Clean, transparent, fair."
  },
  {
    question: "What are the sign-on bonuses?",
    answer: "Company Drivers: $1,000 sign-on bonus paid during your first year (split across first few paychecks). Owner Operators: $2,500 sign-on bonus. Bonuses are paid according to our schedule. Ask for details during your phone interview."
  },
  
  // Freight & Operations
  {
    question: "What types of freight do you haul?",
    answer: "We offer three freight types: Flatbed (building materials, steel, machinery), Reefer (temperature-controlled food and pharmaceutical), and Dry Van (general freight and retail goods). You can choose what fits your experience and equipment. Consistent loads year-round across all divisions. No hazmat required."
  },
  {
    question: "What's the average length of haul?",
    answer: "Our average length of haul is 800-1,200 miles depending on your route preferences. We have both long-haul cross-country lanes and shorter regional runs. Dedicated lanes available for drivers who prefer consistent routes. OTR drivers average 2,500-3,000 miles per week."
  },
  // Both answers below previously named specific shippers and brokers as
  // partners. We can't substantiate those relationships in writing, and naming
  // a third party as a partner is a claim about them as much as about us — so
  // these now describe only what we can stand behind: the freight we actually
  // haul and the boards we actually pay for.
  {
    question: "Do you have dedicated lanes?",
    answer: "Some, and they change with the season. Dedicated work means a consistent route and predictable weeks, so it goes fast. Call dispatch and ask what's open right now — we'll tell you straight rather than promise something that isn't there."
  },
  {
    question: "Where do your loads come from?",
    answer: "A mix: DAT and Truckstop.com load boards, brokers we've hauled for repeatedly, and direct shipper freight we book ourselves. Owner-operators can see what's available and choose — no forced dispatch, so you're never made to take a load that doesn't pay."
  },
  
  // Home Time & Schedule
  {
    question: "What about home time?",
    answer: "We offer flexible schedules: Local routes (home every night), Regional routes (home on weekends - typically 5 days out, 2 days home), or OTR (2-3 weeks out, 3-4 days home). We work around YOUR life and actually honor our home time promises. No broken commitments - we track and guarantee it."
  },
  {
    question: "Is there forced dispatch?",
    answer: "NO forced dispatch for owner operators! You choose your loads, control your schedule, and pick your lanes. We provide quality freight options - you decide what works for your business. For company drivers, we work with you on scheduling and route preferences - no surprise coast-to-coast runs."
  },
  
  // Benefits & Perks
  {
    question: "Do company drivers get benefits?",
    answer: "Here's the honest list of what we offer today: $1,000 sign-on bonus in your first year; weekly direct deposit every Friday; paid time off and paid holidays; performance and referral bonuses; home time you pick (local, regional, or OTR at the same $0.60-$0.65/mile); modern 2020-2022 Freightliner Cascadias; rider and pet policy; and 24/7 dispatch you can actually reach. We do NOT currently offer company medical, dental, vision, life or disability insurance, or a 401(k) — we'd rather tell you now than at orientation. If that changes, this page changes with it."
  },
  {
    question: "What fuel programs are available for owner operators?",
    answer: "We offer fuel card programs with discounts at Pilot Flying J, Love's, TA/Petro, and other major chains - typically $0.40-$0.60 off per gallon. IFTA reporting assistance included. 100% of fuel surcharge always passes to you. We help you optimize fuel routes and costs."
  },
  {
    question: "Do you offer maintenance discounts?",
    answer: "Yes! Owner operators get preferred pricing at our partner service centers nationwide. Discounts on tires, oil changes, brakes, and major repairs. We've negotiated rates that can save you thousands annually. 24/7 roadside assistance connections available."
  },
  
  // Getting Started
  {
    question: "How quickly can I start?",
    answer: "Most drivers start within 1-2 weeks after approval. Process: Phone interview (same day response), Application review (1-2 days), Background check & drug screening (3-5 days), Orientation (1 day in Kent, WA or virtual option), Then you're on the road! We move fast for qualified drivers."
  },
  {
    question: "Do you hire nationwide?",
    answer: "Yes! We hire CDL Class A drivers from all 48 contiguous states. Based in Kent, WA, but our freight network covers the entire country. Whether you're in California, Texas, Florida, New York, or anywhere in between - we want to talk to you. Orientation can be done virtually."
  },
  {
    question: "What if I don't have my own truck yet?",
    answer: "No problem! Start as a company driver ($0.60-$0.65/mile) while you save up and learn our operations. Many of our current owner operators started as company drivers. We can guide you through the transition when you're ready to purchase your own truck. We don't do lease-purchase (those programs often trap drivers)."
  },
  
  // Equipment & Requirements
  {
    question: "What equipment do company drivers use?",
    answer: "Company drivers operate our 2020-2022 Freightliner Cascadias - fully loaded with APU, refrigerator, inverter, and premium sleeper. Automatic transmission available. All trucks maintained to the highest standards. No junk equipment - we invest in quality because it keeps you safe and efficient."
  },
  {
    question: "What are the truck requirements for owner operators?",
    answer: "We accept trucks that are 2015 or newer, in good mechanical condition. All makes and models welcome (Freightliner, Kenworth, Peterbilt, Volvo, International). ELD required (we can help you get set up). Must pass DOT inspection. Older trucks considered on case-by-case basis if well-maintained."
  },
  
  // Safety & Compliance
  {
    question: "What's your safety rating?",
    answer: `We maintain an A+ safety rating with FMCSA. Zero out-of-service violations in our history. Our USDOT number is ${COMPANY_INFO.dot} (MC-${COMPANY_INFO.mc}) — verify our carrier record anytime on SAFER. We take safety seriously because it protects you and keeps our insurance costs down (which means better pay for you).`,
  },
  {
    question: "What is FMCSA Motus and does it change Thind Transport's authority?",
    answer: `FMCSA is modernizing carrier registration with Motus, a new unified system replacing the legacy Unified Registration System (URS) and FMCSA Portal. Thind Transport LLC remains a federally registered motor carrier (USDOT ${COMPANY_INFO.dot}, MC-${COMPANY_INFO.mc}). Existing operating authority and safety records stay valid; carrier registration updates and biennial filings will move through Motus as FMCSA completes rollout in 2026. Individual drivers do not register in Motus — the motor carrier does. Owner operators and company drivers still complete our hiring and DOT application process with us as usual. Official transition details: ${FMCSA_LINKS.motusInfo}`,
  },
  {
    question: "What ELD do you use?",
    answer: "We work with multiple ELD providers including Keep Truckin (Motive), Samsara, and others. Owner operators can use their own compliant ELD. Company trucks come pre-equipped. Full training provided. We understand the system and can help troubleshoot any issues."
  },
  
  // Company Info
  {
    question: "How long has Thind Transport been in business?",
    answer: "Thind Transport was founded in 2014 in Kent, Washington. Our owner has 25+ years of trucking industry experience. We've grown from 1 truck to 15+ and continue to expand. Family-owned and operated - not a faceless corporation. When you call, you talk to real people who care."
  },
  {
    question: "Why should I choose Thind over bigger carriers?",
    answer: "At big carriers, you're a number. At Thind, you're family. We offer: Highest payout in the industry (91%), No forced dispatch, Transparent settlements with no hidden fees, Modern equipment, Real 24/7 support from people who know your name, Home time that's actually honored. Many of our drivers came from mega-carriers and say they wish they'd switched sooner."
  }
]

interface FAQAccordionProps {
  items?: { question: string; answer: string }[];
  darkBackground?: boolean;
  gradientColor?: string;
}

export function FAQAccordion({ items = defaultFaqs, darkBackground = true }: FAQAccordionProps) {
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
            "mainEntity": items.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
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
            <AccordionTrigger className={`text-left py-5 font-semibold text-base hover:no-underline [&[data-state=open]>svg]:text-orange-500 ${
              darkBackground
                ? "text-white hover:text-orange-400 [&[data-state=open]]:text-orange-400 [&>svg]:text-zinc-400"
                : "text-gray-900 hover:text-orange-600 [&[data-state=open]]:text-orange-700 [&>svg]:text-gray-400"
            }`}>
              <div className="flex items-start gap-3 flex-1 pr-4">
                <HelpCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-500" />
                <span className="flex-1">{faq.question}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className={`text-base leading-relaxed pb-5 pl-8 ${
              darkBackground ? "text-zinc-300" : "text-gray-600"
            }`}>
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

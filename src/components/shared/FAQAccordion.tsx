"use client"

import { useState, useEffect, useRef, useId } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"

const defaultFaqs = [
  // ... (default items kept same)
  // Pay & Compensation
  {
    question: "What are the experience requirements?",
    answer: "For Owner Operators: Minimum 2 years OTR experience required. For Regional Company Drivers: Minimum 1 year company driver experience required. Both positions require a valid CDL Class A license and a clean driving record. No SAP drivers, no DUI in past 5 years, no felony convictions."
  },
  {
    question: "How much can I realistically earn?",
    answer: "Company Drivers: $50K-$78K annually at $0.50-0.60 per mile (based on route type), plus $1,500 sign-on bonus first year. Owner Operators: $180K-$280K gross annually with 91% commission (you keep 91% of gross!), plus $2,500 sign-on bonus. Top O/Os gross over $250K. Pay is distributed weekly via direct deposit every Friday."
  },
  {
    question: "What's this 91% commission for owner operators?",
    answer: "You keep 91% of the gross revenue from each load - one of the highest rates in the industry! Most companies offer 70-85%. There are NO hidden fees or surprise deductions. Fuel surcharge passes through 100% to you. Your weekly settlement shows exactly where every dollar goes. Transparent accounting, no games."
  },
  {
    question: "How does the 91% commission work exactly?",
    answer: "Simple: If a load pays $3,000 gross, you receive $2,730 (91%). We take 9% to cover our back-office, dispatch, insurance, and administrative costs. NO other deductions. Fuel surcharge? You get 100%. Accessorial charges? You get 91%. Detention, layover, TONU - all 91% to you. Clean, transparent, fair."
  },
  {
    question: "What are the sign-on bonuses?",
    answer: "Company Drivers: $1,500 sign-on bonus paid during your first year (split across first few paychecks). Owner Operators: $2,500 sign-on bonus. Bonuses are paid according to our schedule. Ask for details during your phone interview."
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
  {
    question: "Do you have dedicated accounts?",
    answer: "Yes! We have dedicated lanes with premium shippers like Amazon, Walmart, Home Depot, and more. Dedicated accounts offer consistent schedules and predictable income. Ask about available dedicated positions during your interview."
  },
  {
    question: "What brokers and load boards do you work with?",
    answer: "We're partnered with top brokers including Landstar, CH Robinson, JB Hunt, Coyote Logistics, and Schneider. We also utilize DAT, Truckstop.com, and direct shipper relationships. Owner operators have access to our entire network - you pick what works for you."
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
    answer: "Yes! Full benefits package includes: Health, dental, and vision insurance (starts after 60 days); 401(k) retirement plan with company match; Paid time off and holiday pay; $1,500 sign-on bonus first year; Weekly direct deposit; Performance bonuses; Referral bonuses ($500+ per driver). Modern, well-maintained 2024 equipment. 24/7 dispatch support."
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
    answer: "No problem! Start as a company driver ($50K-$78K/year) while you save up and learn our operations. Many of our current owner operators started as company drivers. We can guide you through the transition when you're ready to purchase your own truck. We don't do lease-purchase (those programs often trap drivers)."
  },
  
  // Equipment & Requirements
  {
    question: "What equipment do company drivers use?",
    answer: "Company drivers operate our 2024 Freightliner Cascadias - fully loaded with APU, refrigerator, inverter, and premium sleeper. Automatic transmission available. All trucks maintained to the highest standards. No junk equipment - we invest in quality because it keeps you safe and efficient."
  },
  {
    question: "What are the truck requirements for owner operators?",
    answer: "We accept trucks that are 2015 or newer, in good mechanical condition. All makes and models welcome (Freightliner, Kenworth, Peterbilt, Volvo, International). ELD required (we can help you get set up). Must pass DOT inspection. Older trucks considered on case-by-case basis if well-maintained."
  },
  
  // Safety & Compliance
  {
    question: "What's your safety rating?",
    answer: "We maintain an A+ safety rating with FMCSA. Zero out-of-service violations in our history. Our USDOT number is 3154006 - you can verify our record on SAFER. We take safety seriously because it protects you and keeps our insurance costs down (which means better pay for you)."
  },
  {
    question: "What ELD do you use?",
    answer: "We work with multiple ELD providers including Keep Truckin (Motive), Samsara, and others. Owner operators can use their own compliant ELD. Company trucks come pre-equipped. Full training provided. We understand the system and can help troubleshoot any issues."
  },
  
  // Company Info
  {
    question: "How long has Thind Transport been in business?",
    answer: "Thind Transport was founded in 2016 in Kent, Washington. Our owner has 20+ years of trucking industry experience. We've grown from 1 truck to 15+ and continue to expand. Family-owned and operated - not a faceless corporation. When you call, you talk to real people who care."
  },
  {
    question: "Why should I choose Thind over bigger carriers?",
    answer: "At big carriers, you're a number. At Thind, you're family. We offer: Highest commission in the industry (91%), No forced dispatch, Transparent settlements with no hidden fees, Modern equipment, Real 24/7 support from people who know your name, Home time that's actually honored. Many of our drivers came from mega-carriers and say they wish they'd switched sooner."
  }
]

interface FAQAccordionProps {
  items?: { question: string; answer: string }[];
  darkBackground?: boolean;
}

export function FAQAccordion({ items = defaultFaqs, darkBackground = true }: FAQAccordionProps) {
  const [mounted, setMounted] = useState(false)
  const id = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Infinite scroll logic: 
  // We will display 2 sets of items.
  // When we scroll past the first set, we reset to 0.
  // This creates a seamless loop.
  const displayItems = [...items, ...items]

  useEffect(() => {
    if (!mounted) return
    
    let animationFrameId: number
    const scrollSpeed = 0.5 // Pixels per frame
    
    const scroll = () => {
      const container = scrollRef.current;
      if (container && !isPaused) {
        container.scrollLeft += scrollSpeed;
        
        // Loop logic:
        // Calculate the width of one set of items. 
        // A rough approximation is totalScrollWidth / 2.
        // We reset when scrollLeft >= scrollWidth / 2.
        
        if (container.scrollLeft >= container.scrollWidth / 2) {
           container.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scroll)
    }

    animationFrameId = requestAnimationFrame(scroll)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [mounted, isPaused])

  // Show a skeleton/placeholder until hydrated
  if (!mounted) {
    return (
      <div className="w-full flex gap-4 overflow-hidden">
        {items.slice(0, 3).map((_, index) => (
          <div 
            key={index}
            className={`min-w-[300px] border rounded-lg px-4 py-5 animate-pulse ${
              darkBackground 
                ? "border-white/10 bg-white/5" 
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded ${darkBackground ? "bg-blue-500/30" : "bg-blue-200"}`} />
              <div className={`flex-1 h-5 rounded ${darkBackground ? "bg-white/10" : "bg-gray-200"}`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div 
      className="group relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
        {/* Scroll Container */}
        <div 
            ref={scrollRef}
            className="w-full overflow-x-auto no-scrollbar pb-4 cursor-grab active:cursor-grabbing"
            style={{ scrollBehavior: 'auto' }} // Ensure immediate updates for auto-scroll
        >
            <Accordion type="single" collapsible className="flex flex-row gap-4 w-max px-2 items-start">
                {displayItems.map((faq, index) => (
                <AccordionItem 
                    key={`${id}-${index}`} 
                    value={`item-${id}-${index}`}
                    className={`w-[300px] md:w-[350px] flex-shrink-0 border rounded-lg px-4 transition-all duration-300 h-fit ${
                      darkBackground
                        ? "border-white/10 bg-white/5 hover:bg-white/10 data-[state=open]:bg-blue-500/10 data-[state=open]:border-blue-500/30"
                        : "border-gray-200 bg-white hover:bg-gray-50 data-[state=open]:bg-blue-50 data-[state=open]:border-blue-200 data-[state=open]:shadow-md"
                    } ${darkBackground && "data-[state=open]:shadow-[0_0_20px_rgba(59,130,246,0.15)]"}`}
                >
                    <AccordionTrigger className={`text-left py-5 font-semibold text-base hover:no-underline ${
                      darkBackground
                        ? "text-white hover:text-blue-400 [&[data-state=open]]:text-blue-400"
                        : "text-gray-900 hover:text-blue-600 [&[data-state=open]]:text-blue-600"
                    }`}>
                    <div className="flex items-start gap-3 flex-1 pr-2">
                        <HelpCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          darkBackground ? "text-blue-500" : "text-blue-600"
                        }`} />
                        <span className="flex-1 leading-snug">{faq.question}</span>
                    </div>
                    </AccordionTrigger>
                    <AccordionContent className={`text-sm leading-relaxed pb-5 pl-8 pr-2 ${
                      darkBackground ? "text-zinc-300" : "text-gray-600"
                    }`}>
                    <p className="opacity-90">{faq.answer}</p>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        </div>
        
        {/* Gradient fades for scroll indication */}
        {darkBackground ? (
          <>
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[#020617] to-transparent pointer-events-none md:w-24 z-10" />
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#020617] to-transparent pointer-events-none md:w-24 z-10" />
          </>
        ) : (
          <>
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none md:w-24 z-10" />
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none md:w-24 z-10" />
          </>
        )}
    </div>
  )
}

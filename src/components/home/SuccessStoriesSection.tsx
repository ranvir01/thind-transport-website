"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Star, Quote, TrendingUp, DollarSign, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"

const stories = [
  {
    name: "Harpreet S.",
    role: "Owner Operator",
    tenure: "Since 2020",
    location: "Kent, WA",
    quote: "I started with one truck. The 91% commission and consistent freight let me grow to three trucks. My monthly revenue went from $22K to over $68K.",
    metric: "$68K/mo",
    metricLabel: "Current Revenue",
    image: "/images/generated/driver-portrait-1.png",
    icon: TrendingUp
  },
  {
    name: "Jake M.",
    role: "Owner Operator",
    tenure: "3 Years",
    location: "Portland, OR",
    quote: "I was keeping only 75% at my old carrier. Switching to Thind's 91% split means an extra $2,800 in my pocket every single month.",
    metric: "+$2,800",
    metricLabel: "Monthly Increase",
    image: "/images/generated/driver-portrait-2.png",
    icon: DollarSign
  },
  {
    name: "Marcus J.",
    role: "Company Driver",
    tenure: "2 Years OTR",
    location: "Boise, ID",
    quote: "After two mega carriers, Thind is different. Pay is always on time Friday. Dispatch communicates. Equipment is maintained. Home time is honored.",
    metric: "$82K",
    metricLabel: "Last Year",
    image: "/images/generated/driver-portrait-3.png",
    icon: Clock
  }
]

export function SuccessStoriesSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const scrollToCard = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth * 0.85
      scrollContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
      setActiveIndex(index)
    }
  }

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth * 0.85
      const newIndex = Math.round(scrollContainerRef.current.scrollLeft / cardWidth)
      setActiveIndex(Math.min(newIndex, stories.length - 1))
    }
  }

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-4">
            Real Drivers. Real Results.
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-navy mb-4">
            Drivers Who Made the <span className="text-orange">Switch</span>
          </h2>
          <p className="text-lg text-steel max-w-2xl mx-auto">
            These aren't actors. These are real drivers sharing their real earnings with Thind Transport.
          </p>
        </motion.div>

        {/* Mobile Horizontal Carousel */}
        <div className="md:hidden relative">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 pb-4 -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {stories.map((story, index) => {
              const Icon = story.icon
              return (
                <div
                  key={story.name}
                  className="flex-shrink-0 w-[85%] snap-center"
                >
                  <Card className="h-full border border-steel/10 bg-white shadow-brand overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header with Photo */}
                      <div className="relative h-20 bg-navy">
                        <div className="absolute inset-0 bg-gradient-to-r from-navy to-navy/80" />
                        
                        {/* 5 Stars */}
                        <div className="absolute top-3 right-3 flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className="w-3.5 h-3.5 fill-orange text-orange" />
                          ))}
                        </div>

                        {/* Driver Photo */}
                        <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full bg-white shadow-lg overflow-hidden border-4 border-white">
                          <Image 
                            src={story.image} 
                            alt={story.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="pt-12 px-6 pb-6">
                        {/* Name & Role */}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-navy">{story.name}</h3>
                          <p className="text-sm text-gray-600">{story.role} • {story.location}</p>
                          <p className="text-xs text-gray-500">{story.tenure}</p>
                        </div>

                        {/* Quote */}
                        <div className="relative mb-6">
                          <Quote className="absolute -top-1 -left-1 w-6 h-6 text-steel/10" />
                          <p className="text-gray-700 text-sm leading-relaxed pl-4">
                            "{story.quote}"
                          </p>
                        </div>

                        {/* Metric */}
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-green-700">{story.metric}</p>
                            <p className="text-xs text-green-600 font-medium">{story.metricLabel}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
          
          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {stories.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeIndex === index 
                    ? 'bg-orange w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to story ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Grid - Hidden on Mobile */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {stories.map((story, index) => {
            const Icon = story.icon
            return (
              <motion.div
                key={story.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border border-steel/10 bg-white shadow-brand hover:shadow-brand-lg transition-all duration-300 overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Header with Photo */}
                    <div className="relative h-20 bg-navy">
                      <div className="absolute inset-0 bg-gradient-to-r from-navy to-navy/80" />
                      
                      {/* 5 Stars */}
                      <div className="absolute top-3 right-3 flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="w-3.5 h-3.5 fill-orange text-orange" />
                        ))}
                      </div>

                      {/* Driver Photo */}
                      <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full bg-white shadow-lg overflow-hidden border-4 border-white">
                        <Image 
                          src={story.image} 
                          alt={story.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-12 px-6 pb-6">
                      {/* Name & Role */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-navy">{story.name}</h3>
                        <p className="text-sm text-gray-600">{story.role} • {story.location}</p>
                        <p className="text-xs text-gray-500">{story.tenure}</p>
                      </div>

                      {/* Quote */}
                      <div className="relative mb-6">
                        <Quote className="absolute -top-1 -left-1 w-6 h-6 text-steel/10" />
                        <p className="text-gray-700 text-sm leading-relaxed pl-4">
                          "{story.quote}"
                        </p>
                      </div>

                      {/* Metric */}
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xl font-black text-green-700">{story.metric}</p>
                          <p className="text-xs text-green-600 font-medium">{story.metricLabel}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Vertical Video Testimonial Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col items-center"
        >
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold text-navy">See the Real Deal</h3>
            <p className="text-gray-600">Unscripted stories from the road</p>
          </div>
          <div className="relative w-full max-w-[300px] aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 group cursor-pointer transform transition-transform hover:scale-[1.02]">
            {/* Video Placeholder Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <span className="text-white/30 font-bold text-lg">Video Placeholder</span>
            </div>
            
            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 group-hover:scale-110 transition-transform">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
              </div>
            </div>

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-white font-bold text-lg">Harpreet S.</p>
              </div>
              <p className="text-white/90 text-sm leading-snug">
                "I bought my third truck last month. Thind made it possible."
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
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
            <Link
              href="/testimonials"
              className="px-8 py-4 bg-navy/5 hover:bg-navy/10 text-navy font-semibold rounded-lg transition-all"
            >
              Read More Stories
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

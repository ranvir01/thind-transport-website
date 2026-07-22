"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Quote } from "lucide-react"

const testimonials = [
  {
    name: "Harpreet S.",
    role: "Owner Operator",
    years: "5 years",
    text: "Been with Thind since 2020. Started with one truck, now running three. The 90% split and consistent freight made it possible to grow my own business.",
    route: "OTR",
  },
  {
    name: "Jake M.",
    role: "Owner Operator",
    years: "3 years",
    text: "I was keeping 75% at my old company. The difference with a real 90% split shows up in every single settlement. Freight is steady and dispatch actually listens.",
    route: "Regional",
  },
  {
    name: "Marcus J.",
    role: "Company Driver",
    years: "2 years",
    text: "Pay is on time every week, equipment runs great, and they actually care about getting you home when promised. No games with the miles.",
    route: "OTR",
  },
  {
    name: "David W.",
    role: "Regional Driver",
    years: "1 year",
    text: "Home every weekend like they promised. The flexibility is real — I can actually plan my life. Dispatch works with you, not against you.",
    route: "Regional",
  },
  {
    name: "Tommy R.",
    role: "Local Driver",
    years: "4 years",
    text: "Local routes, home every night. I get to tuck my kids in bed every evening. The equipment is newer, pay is fair, and the office actually answers the phone.",
    route: "Local",
  },
  {
    name: "Gurpreet K.",
    role: "Owner Operator",
    years: "2 years",
    text: "As a female owner operator, finding a good company was tough. Thind treats everyone with respect. 90% split, no forced dispatch, no surprises.",
    route: "OTR",
  },
  {
    name: "Robert T.",
    role: "Company Driver — Flatbed",
    years: "3 years",
    text: "Good outfit. Been running flatbed for them for three years. Pay is competitive and consistent, good home time, decent equipment, straight shooters.",
    route: "Regional Flatbed",
  },
]

export function TestimonialsCarousel() {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full max-w-6xl mx-auto"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {testimonials.map((testimonial, index) => (
          <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
            <Card className="h-full border-0 bg-gradient-to-br from-[#17181B] via-[#0B0C0E] to-[#050506] hover:from-[#242629] transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 rounded-2xl overflow-hidden group">
              <CardContent className="p-8 flex flex-col h-full relative">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="h-16 w-16 text-white" />
                </div>

                {/* Header */}
                <div className="mb-5 relative z-10">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-white mb-1">{testimonial.name}</h4>
                      <p className="text-sm text-blue-200 font-medium">{testimonial.role}</p>
                    </div>
                    <Badge className="text-xs font-semibold px-3 py-1 bg-white/10 text-white border border-white/20 backdrop-blur-sm shrink-0">
                      {testimonial.years}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-white/20 text-blue-200 bg-white/5 uppercase tracking-wide">
                    {testimonial.route}
                  </Badge>
                </div>

                {/* Quote */}
                <p className="text-blue-100 flex-grow leading-relaxed text-base relative z-10">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 md:left-4 bg-white/90 hover:bg-white border-2 border-gray-200 shadow-lg text-gray-900 hover:text-gray-900" />
      <CarouselNext className="right-2 md:right-4 bg-white/90 hover:bg-white border-2 border-gray-200 shadow-lg text-gray-900 hover:text-gray-900" />
    </Carousel>
  )
}

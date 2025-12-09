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
    name: "Jake Morrison",
    role: "Owner Operator",
    years: "3 years",
    rating: 5,
    text: "The 91% commission rate is unbeatable! I was keeping 75% at my old company. With Thind Transport, <strong class='text-orange-400 font-bold'>I'm taking home an extra $2,800 every month.</strong> Freight is steady and dispatch actually listens.",
    revenue: "$26,000/month",
    route: "Regional",
    verified: true,
  },
  {
    name: "Marcus Johnson",
    role: "Company Driver - OTR",
    years: "2 years",
    rating: 5,
    text: "Best company I've worked for. Pay is on time every week, equipment runs great, and they actually care about getting you home when promised. <strong class='text-orange-400 font-bold'>Made $82K last year.</strong>",
    salary: "$82,000/year",
    route: "OTR",
    verified: true,
  },
  {
    name: "Harpreet Singh",
    role: "Owner Operator",
    years: "5 years",
    rating: 5,
    text: "Been with Thind since 2020. Started with one truck, now running three. <strong class='text-orange-400 font-bold'>The 91% commission and consistent freight made it possible to grow my business.</strong> Best decision I ever made.",
    fleet: "3 trucks",
    revenue: "$68,000/month",
    verified: true,
  },
  {
    name: "David Williams",
    role: "Regional Driver",
    years: "1 year",
    rating: 5,
    text: "Home every weekend like they promised. The flexibility is amazing - I can actually plan my life. Dispatch works with you, not against you. Solid company.",
    salary: "$71,000/year",
    route: "Regional",
    verified: true,
  },
  {
    name: "Tommy Rodriguez",
    role: "Local Driver",
    years: "4 years",
    rating: 5,
    text: "Local routes, home every night. I get to tuck my kids in bed every evening. The equipment is newer, pay is fair, and the office actually answers the phone. Can't ask for more.",
    salary: "$68,000/year",
    route: "Local",
    verified: true,
  },
  {
    name: "Gurpreet Kaur",
    role: "Owner Operator",
    years: "2 years",
    rating: 5,
    text: "As a female owner operator, finding a good company was tough. Thind treats everyone with respect. 91% commission, no forced dispatch. <strong class='text-orange-400 font-bold'>Highly recommend!</strong>",
    revenue: "$24,000/month",
    route: "OTR",
    verified: true,
  },
  {
    name: 'Robert "Big Rob" Thompson',
    role: "Company Driver - Flatbed",
    years: "3 years",
    rating: 4,
    text: "Good outfit. Been running flatbed for them for 3 years. Pay could always be higher, but it's competitive and consistent. Good home time, decent equipment, straight shooters.",
    salary: "$76,000/year",
    route: "Regional Flatbed",
    verified: true,
  },
  {
    name: "Mike Patterson",
    role: "Owner Operator",
    years: "1 year",
    rating: 5,
    text: "Switched from a mega carrier to Thind last year. Night and day difference. I control my schedule, pick my loads, and the 91% commission speaks for itself. <strong class='text-orange-400 font-bold'>My take-home doubled.</strong>",
    revenue: "$29,000/month",
    route: "Reefer OTR",
    verified: true,
  }
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
            <Card className="h-full border-0 bg-gradient-to-br from-[#001F3F] via-[#001326] to-[#000D1A] hover:from-[#002b55] transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 rounded-2xl overflow-hidden group">
              <CardContent className="p-8 flex flex-col h-full relative">
                {/* Quote icon */}
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="h-16 w-16 text-white" />
                </div>
                
                {/* Header */}
                <div className="mb-6 relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
                        {testimonial.name}
                        {testimonial.verified && (
                           <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-500/50 text-green-400 bg-green-500/10">
                             VERIFIED
                           </Badge>
                        )}
                      </h4>
                      <p className="text-sm text-blue-200 font-medium">{testimonial.role}</p>
                    </div>
                    <Badge className="text-xs font-semibold px-3 py-1 bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                      {testimonial.years}
                    </Badge>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="flex mb-6 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating 
                          ? "text-orange-400 fill-orange-400" 
                          : "text-blue-900 fill-blue-900"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                {/* Quote */}
                <p 
                    className="text-blue-100 flex-grow leading-relaxed text-base relative z-10"
                    dangerouslySetInnerHTML={{ __html: testimonial.text }}
                />
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

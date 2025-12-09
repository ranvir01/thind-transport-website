"use client"

import Image from "next/image"
import { Quote, Phone, Clock, Users } from "lucide-react"

export const DispatcherSpotlight = () => {
  return (
    <section className="py-20 md:py-28 bg-navy text-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Images Grid */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative grid grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-3 md:space-y-4 mt-8">
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-steel/20 rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                  <Image 
                    src="/images/generated/dispatch-team.png" 
                    alt="Dispatch Team Member" 
                    fill 
                    className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy to-transparent">
                    <p className="font-bold text-white text-sm">Sarah M.</p>
                    <p className="text-xs text-orange">Senior Dispatch</p>
                  </div>
                </div>
                <div className="relative h-36 md:h-48 rounded-xl overflow-hidden bg-steel/20 rotate-[2deg] hover:rotate-0 transition-transform duration-500">
                  <Image 
                    src="/images/generated/fleet-manager.png" 
                    alt="Fleet Manager" 
                    fill 
                    className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy to-transparent">
                    <p className="font-bold text-white text-sm">Mike T.</p>
                    <p className="text-xs text-orange">Fleet Manager</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                <div className="relative h-36 md:h-48 rounded-xl overflow-hidden bg-steel/20 rotate-[3deg] hover:rotate-0 transition-transform duration-500">
                  <Image 
                    src="/images/generated/fleet-kent-wa.png" 
                    alt="Kent WA Office" 
                    fill 
                    className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy to-transparent">
                    <p className="font-bold text-white text-sm">Kent, WA</p>
                    <p className="text-xs text-orange">HQ Operations</p>
                  </div>
                </div>
                <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-steel/20 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
                  <Image 
                    src="/images/generated/driver-portrait-1.png" 
                    alt="Owner Relations" 
                    fill 
                    className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy to-transparent">
                    <p className="font-bold text-white text-sm">David R.</p>
                    <p className="text-xs text-orange">Owner Relations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange/20 text-orange font-semibold text-sm mb-6">
              Real People. Real Support.
            </span>
            
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight text-white">
              Dispatch That Actually <span className="text-orange">Listens.</span>
            </h2>
            
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Our dispatchers aren't algorithms. They're experts based in Kent, WA who understand you have a life outside the truck.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <Phone className="w-6 h-6 text-orange mx-auto mb-2" />
                <p className="text-xs text-white/80 font-medium">24/7 Support</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <Clock className="w-6 h-6 text-orange mx-auto mb-2" />
                <p className="text-xs text-white/80 font-medium">Quick Response</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <Users className="w-6 h-6 text-orange mx-auto mb-2" />
                <p className="text-xs text-white/80 font-medium">Dedicated Team</p>
              </div>
            </div>
            
            {/* Quote */}
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <Quote className="w-8 h-8 text-orange mb-4" />
              <p className="text-white/90 italic mb-4 leading-relaxed">
                "I've never had a dispatcher who actually asks me how my family is doing until I came to Thind. They treat me like a person, not a truck number."
              </p>
              <p className="text-sm text-white/70 font-semibold">
                — James K., Owner Operator (3 Years)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

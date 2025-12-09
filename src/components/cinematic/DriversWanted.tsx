"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

const DriverCard = ({ title, description, image, index }: any) => {
  return (
     <motion.div 
        className="group relative min-w-[300px] md:min-w-[400px] h-[400px] md:h-[500px] bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-colors"
        whileHover={{ scale: 0.98, rotateX: 2, rotateY: 2 }}
        transition={{ type: "spring", stiffness: 300 }}
     >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10" />
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" />
        <div className="absolute bottom-0 left-0 p-8 z-20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <div className="w-12 h-1 bg-orange-500 mb-4 w-0 group-hover:w-12 transition-all duration-300 delay-100"></div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 uppercase">{title}</h3>
            <p className="text-zinc-300 text-sm md:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">{description}</p>
        </div>
     </motion.div>
  )
}

export const DriversWanted = () => {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
  })

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-55%"])

  return (
    <section ref={targetRef} className="relative h-[300vh] bg-[#001F3F]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
         <motion.div style={{ x }} className="flex gap-8 md:gap-12 pl-8 md:pl-24 pr-24 items-center">
            <div className="min-w-[300px] md:min-w-[500px] flex flex-col justify-center z-20">
                <h2 className="text-5xl md:text-8xl font-black text-white mb-6 leading-none tracking-tighter">
                    DRIVE WITH
                    <br />
                    <span className="text-transparent stroke-text hover:text-orange-500 transition-colors duration-500">PURPOSE.</span>
                </h2>
                <p className="text-xl text-zinc-300 max-w-md">Your Lane. Your Future. Join the elite fleet of the Pacific Northwest.</p>
                
                <div className="mt-12 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center text-white animate-pulse-dot">
                        <span className="text-2xl">↓</span>
                    </div>
                    <span className="text-sm font-mono text-white/70 uppercase tracking-widest">Scroll to Explore</span>
                </div>
            </div>
            
            {/* Cards */}
            <DriverCard 
                title="Owner Operators" 
                description="Take home 91% of the gross. Total transparency. Complete freedom." 
                image="/images/generated/driver-portrait-1.png" 
                index={1} 
            />
            <DriverCard 
                title="Company Drivers" 
                description="Earn $50k - $78k annually. Full benefits, consistent miles, respect." 
                image="/images/generated/driver-portrait-2.png" 
                index={2} 
            />
            <DriverCard 
                title="Lease Purchase" 
                description="Walk into a 2024 Cascadia with $0 down. Your path to ownership starts here." 
                image="/images/generated/driver-portrait-3.png" 
                index={3} 
            />
            <DriverCard 
                title="Team Operations" 
                description="Maximize your mileage. Priority dispatch for team drivers." 
                image="/images/generated/fleet-kent-wa.png" 
                index={4} 
            />
             <DriverCard 
                title="Regional Routes" 
                description="Stay closer to home with our dedicated I-5 corridor lanes." 
                image="/images/generated/fleet-aerial-view.png" 
                index={5} 
            />
         </motion.div>
      </div>
    </section>
  )
}

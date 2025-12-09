"use client"

import { motion } from "framer-motion"
import { LucideTruck, LucideMap, LucideShieldCheck, LucideWrench, LucideDollarSign, LucideBarChart, LucideArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface BentoCardProps {
    title: string
    subtitle: string
    icon?: any
    size?: "sm" | "md" | "lg"
    delay?: number
    image?: string
    href?: string
    cta?: string
}

const BentoCard = ({ title, subtitle, icon: Icon, size = "md", delay = 0, image, href, cta }: BentoCardProps) => {
    // Mobile: consistent aspect ratio for all cards; Desktop: varied layouts
    const sizes = {
        sm: "col-span-1 md:col-span-1 aspect-[3/2] md:aspect-square",
        md: "col-span-1 md:col-span-2 aspect-[3/2] md:aspect-[2/1]",
        lg: "col-span-1 md:col-span-2 md:row-span-2 aspect-[3/2] md:aspect-square"
    }

    const Content = () => (
        <>
            {image && (
                <>
                    <Image 
                        src={image} 
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 transition-opacity duration-300" />
                </>
            )}

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-2xl transition-colors ${image ? 'bg-white/10 backdrop-blur-md group-hover:bg-orange-500/80' : 'bg-white/5 group-hover:bg-orange-500/20'}`}>
                        {Icon && <Icon className={`w-6 h-6 transition-colors ${image ? 'text-white' : 'text-white group-hover:text-orange-500'}`} />}
                    </div>
                    {href && (
                        <div className="p-2 rounded-full bg-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0">
                            <LucideArrowUpRight className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
                
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 uppercase tracking-tight">{title}</h3>
                    <p className={`text-sm leading-relaxed transition-colors ${image ? 'text-zinc-200' : 'text-zinc-300 group-hover:text-white/90'}`}>{subtitle}</p>
                    {cta && (
                        <div className="mt-4 inline-flex items-center text-sm font-medium text-orange-500 group-hover:text-orange-400">
                            {cta} <LucideArrowUpRight className="ml-1 w-3 h-3" />
                        </div>
                    )}
                </div>
            </div>
            
            {!image && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
        </>
    )

    const containerClasses = `relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm p-8 hover:border-orange-500/50 transition-colors group ${sizes[size as keyof typeof sizes]}`

    if (href) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay }}
                whileHover={{ y: -5 }}
                className={containerClasses}
                suppressHydrationWarning
            >
                <Link href={href} className="block h-full" suppressHydrationWarning>
                    <Content />
                </Link>
            </motion.div>
        )
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            whileHover={{ y: -5 }}
            className={containerClasses}
            suppressHydrationWarning
        >
            <Content />
        </motion.div>
    )
}

export const BentoGrid = () => {
    return (
        <section className="py-16 md:py-32 px-4 md:px-8 max-w-7xl mx-auto relative z-10">
            <div className="mb-12 md:mb-24 flex flex-col md:flex-row justify-between items-end gap-8">
                <div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-8xl font-black text-white mb-6 tracking-tighter"
                    >
                        FLEET <span className="text-transparent stroke-text hover:text-orange-500 transition-colors duration-500">INTEL</span>
                    </motion.h2>
                    <div className="w-24 h-1 bg-orange-500 mb-6" />
                    <p className="text-zinc-300 text-base md:text-lg max-w-xl">
                        Powered by cutting-edge technology and maintained by expert hands. 
                        Experience the difference of a fleet built for performance.
                    </p>
                </div>
                <div className="hidden md:block">
                    <Link 
                        href="/equipment" 
                        className="px-8 py-4 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors backdrop-blur-sm"
                    >
                        View Full Fleet Spec
                    </Link>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 auto-rows-auto">
                {/* Main Feature - Tracking */}
                <div className="md:col-span-2">
                <BentoCard 
                    title="Real-Time Operations" 
                        subtitle="24/7 GPS monitoring & advanced telematics keep your cargo visible and secure." 
                    icon={LucideMap}
                    size="md" 
                    delay={0.1}
                    image="/images/generated/fleet-aerial-view.png"
                    cta="See Coverage Map"
                    href="/routes"
                />
                </div>

                {/* Quick Stat - Safety */}
                <div className="md:col-span-1">
                <BentoCard 
                    title="Elite Safety" 
                        subtitle="Top tier FMCSA ratings. Safety is our culture." 
                    icon={LucideShieldCheck}
                    size="sm" 
                    delay={0.2} 
                    image="/images/generated/fmcsa-compliance-badge.png"
                />
                </div>

                {/* Modern Fleet */}
                <div className="md:col-span-1">
                <BentoCard 
                    title="2024 Cascadia" 
                        subtitle="Average fleet age < 2 years." 
                    icon={LucideTruck}
                    size="sm" 
                    delay={0.3} 
                    image="/images/generated/truck-cascadia.png"
                    href="/equipment"
                />
                </div>

                {/* Large Feature - Network */}
                <div className="md:col-span-2 md:row-span-2">
                <BentoCard 
                    title="National Network" 
                        subtitle="Strategic lanes covering 48 states. From the PNW to the East Coast." 
                    icon={LucideBarChart}
                    size="lg" 
                    delay={0.4} 
                    image="/images/generated/hero-fleet-sunset.png"
                    cta="Explore Routes"
                    href="/routes"
                />
                </div>

                {/* Driver Pay */}
                <div className="md:col-span-1">
                <BentoCard 
                    title="Top Tier Pay" 
                        subtitle="Quick pay options, performance bonuses." 
                    icon={LucideDollarSign}
                    size="sm" 
                    delay={0.5} 
                    href="/pay-rates"
                    cta="View Rates"
                />
                </div>

                {/* Maintenance */}
                <div className="md:col-span-1">
                <BentoCard 
                    title="In-House Shop" 
                        subtitle="Kent, WA facility with 24/7 mechanics." 
                    icon={LucideWrench}
                    size="sm" 
                    delay={0.6} 
                    image="/images/generated/fleet-kent-wa.png"
                />
                </div>
            </div>
        </section>
    )
}

import Image from "next/image"
import Link from "next/link"
import {
  CheckCircle2,
  Truck,
  Wrench,
  ShieldCheck,
  ArrowRight,
} from "lucide-react"
import { Reveal } from "@/components/ui/Reveal"

const trailers = [
  {
    name: "Flatbed",
    detail: "48–53 ft · steel, lumber & building materials",
    image: "/images/generated/trailer-flatbed.png",
  },
  {
    name: "Reefer",
    detail: "Temp-controlled · food-grade produce & freight",
    image: "/images/generated/trailer-reefer.png",
  },
  {
    name: "Dry Van",
    detail: "53 ft · general & palletized freight",
    image: "/images/generated/trailer-dry-van.png",
  },
]

const tractorPoints = [
  "2023-2025 Freightliner Cascadias & Volvo VNLs",
  "APUs, inverters & modern driver comfort",
  "Collision mitigation + lane-keep safety tech",
  "Preventive maintenance on a fixed schedule",
]

const supportPoints = [
  { label: "24/7 roadside assistance", icon: Wrench },
  { label: "In-house mechanical support", icon: Wrench },
  { label: "O/O maintenance & tire discounts", icon: Truck },
  { label: "DOT-compliant, FMCSA safety-rated fleet", icon: ShieldCheck },
]

export function EquipmentSection() {
  return (
    <section className="relative overflow-hidden border-t-0 py-12 brand-section-panel sm:py-16 md:py-24">
      <div className="accent-orb -left-10 top-10 h-72 w-72 bg-orange-600/12" />
      <div className="container relative px-4">
        <Reveal className="mb-10 max-w-3xl md:mb-14">
          <div className="fleet-badge mb-4 w-fit">
            <Truck className="h-3.5 w-3.5" />
            Our fleet
          </div>
          <h2 className="mb-3 text-white">
            Drive a truck that&apos;s{" "}
            <span className="text-gradient-accent">actually new</span>
          </h2>
          <p className="max-w-2xl text-base text-steel-300 md:text-lg">
            15 trucks and growing — multiple trailer types, all DOT-compliant.
            No 10-year-old hand-me-downs.
          </p>
        </Reveal>

        {/* Feature row: big tractor photo + spec list */}
        <div className="mb-10 grid items-center gap-8 md:mb-16 md:grid-cols-2 md:gap-12">
          <Reveal className="relative overflow-hidden rounded-fleet-lg border border-steel-700/70 shadow-2xl">
            <div className="relative aspect-[4/3]">
              <Image
                src="/images/generated/truck-cascadia.png"
                alt="Illustration of a Freightliner Cascadia tractor"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
              <span className="fleet-badge fleet-badge-gold">
                2024 model year
              </span>
            </div>
          </Reveal>

          <Reveal>
            <h3 className="mb-5 text-white">The tractors you&apos;ll run</h3>
            <ul className="space-y-3">
              {tractorPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                  <span className="text-base text-steel-200">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/fleet"
              className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-orange transition-colors hover:text-orange-400"
            >
              See the full fleet
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        {/* Trailer photo band */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3 md:mb-14 md:gap-6">
          {trailers.map((trailer, index) => (
            <Reveal
              key={trailer.name}
              className="group relative overflow-hidden rounded-fleet-lg border border-steel-700/70"
              index={Math.min(index, 4)}
            >
              <div className="relative aspect-[3/2]">
                <Image
                  src={trailer.image}
                  alt={`Illustration of a ${trailer.name.toLowerCase()} trailer`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/30 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="font-display text-lg font-bold uppercase tracking-wide text-white">
                  {trailer.name}
                </h4>
                <p className="text-xs text-steel-300">{trailer.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Cab interior comfort band — full-width photographic break */}
        <Reveal className="relative mb-10 overflow-hidden rounded-fleet-lg border border-steel-700/70 shadow-2xl md:mb-14">
          <div className="relative aspect-[16/9] sm:aspect-[21/9]">
            <Image
              src="/images/generated/driver-cab-interior.webp"
              alt="Inside a Thind Transport Cascadia sleeper cab at golden hour — APU, fridge, and modern dash"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 via-navy-900/30 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.25em] text-orange">
              Your office
            </p>
            <p className="max-w-md text-sm font-semibold text-white md:text-lg">
              APU, inverter, and fridge in every sleeper — comfortable on the
              clock and off it.
            </p>
          </div>
        </Reveal>

        {/* Maintenance + safety — clean inline list, not boxed cards */}
        <Reveal className="border-t border-steel-700/60 pt-8">
          <p className="mb-5 font-display text-sm font-bold uppercase tracking-[0.2em] text-steel-400">
            Maintenance &amp; support, handled
          </p>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {supportPoints.map((point) => {
              const Icon = point.icon
              return (
                <div key={point.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
                  <span className="text-sm font-medium text-steel-200">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

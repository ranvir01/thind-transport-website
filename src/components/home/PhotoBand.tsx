import Image from "next/image"

/**
 * Full-bleed photo divider — the visual palate cleanser between long dark
 * sections. The homepage is ~20k px of navy at phone width; real fleet
 * photography with a single stat line is what stops sections blending into
 * one another. Server component, one next/image, no motion.
 */
export function PhotoBand({
  src,
  alt,
  eyebrow,
  headline,
  priorityHint = false,
}: {
  src: string
  alt: string
  eyebrow: string
  headline: string
  priorityHint?: boolean
}) {
  return (
    <section className="relative h-[320px] md:h-[420px] overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        priority={priorityHint}
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#00060D] via-[#00060D]/45 to-[#00060D]/20" />
      <div className="absolute inset-x-0 bottom-0 pb-8 md:pb-12">
        <div className="container px-4">
          <p className="fleet-badge fleet-badge-gold mb-3">{eyebrow}</p>
          <p className="font-display text-2xl md:text-4xl font-extrabold uppercase tracking-wide text-white max-w-3xl [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">
            {headline}
          </p>
        </div>
      </div>
    </section>
  )
}

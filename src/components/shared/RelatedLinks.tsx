import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Reveal } from "@/components/ui/Reveal"
import { cn } from "@/lib/utils"

/**
 * "Where to go next" — the useful-links block every marketing page ends with.
 *
 * Most pages on this site used to dead-end in a phone number: a visitor who
 * wasn't ready to call had nowhere to go, and the tools that actually answer
 * their question (pay calculator, freight-class calculator, lane estimator,
 * state job pages) were unreachable from the page that raised the question.
 * This is that missing exit — real destinations with a reason to click, not a
 * footer dump.
 *
 * `kind` is the promise the link makes: a Tool does something for you, a Guide
 * explains, a Form starts a conversation. Labelling it stops the grid reading
 * as eight identical blue links.
 */

export interface RelatedLink {
  href: string
  title: string
  blurb: string
  icon?: LucideIcon
  kind?: "Tool" | "Guide" | "Form" | "Page" | "Verify"
  /** External destinations (FMCSA, etc.) open in a new tab and say so. */
  external?: boolean
}

interface RelatedLinksProps {
  title?: string
  intro?: string
  links: RelatedLink[]
  /** `dark` for asphalt/navy sections, `light` (default) for paper/white. */
  tone?: "light" | "dark"
  className?: string
  columns?: 2 | 3
}

export function RelatedLinks({
  title = "Keep going",
  intro,
  links,
  tone = "light",
  className,
  columns = 3,
}: RelatedLinksProps) {
  const dark = tone === "dark"

  return (
    <section
      className={cn(
        "border-t py-14 md:py-20",
        dark ? "border-white/10 bg-asphalt" : "border-ink/10 bg-paper",
        className
      )}
    >
      <div className="container px-4">
        <Reveal className="mx-auto mb-8 max-w-measure text-center md:mb-10">
          <h2
            className={cn(
              "font-display text-m-h3 font-bold",
              dark ? "text-paper" : "text-ink"
            )}
          >
            {title}
          </h2>
          {intro ? (
            <p className={cn("mt-3 text-m-body", dark ? "text-paper/70" : "text-ink-2")}>
              {intro}
            </p>
          ) : null}
        </Reveal>

        <ul
          className={cn(
            "mx-auto grid list-none gap-4 sm:grid-cols-2",
            columns === 3 ? "max-w-5xl lg:grid-cols-3" : "max-w-3xl"
          )}
        >
          {links.map((link, i) => {
            const Icon = link.icon
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-m-2",
                      dark ? "bg-white/10 text-signal-up" : "bg-signal/10 text-signal"
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
                  </span>
                  {link.kind ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-m-micro font-bold uppercase tracking-[0.12em]",
                        // ink-2, not ink-3: the alpha wash (real since the
                        // rgb-triple tokens) drops ink-3 to 4.22:1 on paper.
                        dark ? "bg-white/10 text-paper/70" : "bg-ink/5 text-ink-2"
                      )}
                    >
                      {link.kind}
                    </span>
                  ) : null}
                </div>

                <h3
                  className={cn(
                    "mt-4 flex items-center gap-1.5 font-display text-m-h4 font-bold",
                    dark ? "text-paper" : "text-ink"
                  )}
                >
                  {link.title}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform duration-fast ease-entrance motion-safe:group-hover:translate-x-1"
                    aria-hidden
                  />
                </h3>
                <p className={cn("mt-1.5 text-m-body", dark ? "text-paper/70" : "text-ink-2")}>
                  {link.blurb}
                  {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </p>
              </>
            )

            // Hover lift: translate + shadow only, 150ms, per the motion spec.
            const cardClass = cn(
              "group flex h-full flex-col rounded-m-3 border p-5 transition-[transform,border-color,box-shadow] duration-fast ease-entrance",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              dark
                ? "border-white/12 bg-white/[0.03] hover:border-signal-up/50 focus-visible:ring-signal-up focus-visible:ring-offset-asphalt"
                : "border-ink/10 bg-paper hover:border-signal/40 hover:shadow-m-e3 focus-visible:ring-signal focus-visible:ring-offset-paper",
              "motion-safe:hover:-translate-y-1"
            )

            return (
              <Reveal as="li" key={link.href + link.title} index={Math.min(i, 4)}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    {body}
                  </a>
                ) : (
                  <Link href={link.href} className={cardClass}>
                    {body}
                  </Link>
                )}
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

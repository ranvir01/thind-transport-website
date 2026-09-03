import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { COMPANY_INFO } from "@/lib/constants"
import { Reveal } from "@/components/ui/Reveal"

/**
 * Shared asphalt hero — the one hero every subpage renders.
 *
 * Asphalt ground, paper type, ONE filled red action; Call is a text link,
 * never a second button. No photo band, so no LCP image competes with the
 * headline. Optional right-column `children` for a pay dl or a fact list;
 * without children the copy sits in a max-width column. `breadcrumb` renders
 * the page's <PageBreadcrumb> above the eyebrow so the trail lives inside the
 * band instead of as a bar above it.
 *
 * Driver pages keep Apply as the red. Freight and product pages relabel it
 * (Quote, Download, Open LoadOff) or pass `omitApply` so Call is the only
 * action — and then Call BECOMES the red, so the band never ships without a
 * primary. `/hub` hrefs render as plain `<a>` so iOS re-parses the LoadOff
 * manifest (src/lib/cross-app-link.ts; enforced by cross-app-links.test.ts).
 *
 * Ported from cursor/driver-attraction-kit-3dc5 onto the D0 grammar: sentence
 * case on the button (no display caps), rounded-fleet like every other
 * control, no focus ring classes — globals.css paints one :focus-visible
 * outline for every anchor. Server component: two links need no JavaScript.
 */

// The fill DARKENS on hover, it does not lighten. `hover:bg-signal-up` put
// paper on #EC5A50 at 3.18:1 — below AA for 16px semibold, and WCAG 1.4.3
// applies to hover as displayed. `bg-signal/90` composites the same red over
// the asphalt band underneath it: 6.05:1, better than the 5.33:1 at rest.
// DIRECTION.md §1 lists signal-up as text on asphalt only; it is not a fill.
//
// hover:text-paper is load-bearing: globals.css sets `a:hover { color:
// var(--brand-accent-strong) }` at (0,1,1), which beats a bare `text-paper`
// utility (0,1,0) and would paint signal-up text on the red fill. The
// `hover:` variant is (0,2,0), so it wins.
const primaryClass =
  "inline-flex min-h-[48px] items-center gap-2 rounded-fleet bg-signal px-7 text-m-body font-semibold text-paper transition-colors duration-base hover:bg-signal/90 hover:text-paper"

const textClass =
  "inline-flex min-h-[48px] items-center gap-2 text-m-body font-semibold text-paper underline-offset-4 hover:underline hover:text-orange-300"

function ActionLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: ReactNode
}) {
  // Hash jumps and /api downloads are not App Router pages. /hub must be a
  // real navigation so iOS re-parses the LoadOff manifest (cross-app-link.ts).
  if (
    href.startsWith("#") ||
    href.startsWith("/api") ||
    href.startsWith("/hub") ||
    href.startsWith("http")
  ) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export function AsphaltHero({
  breadcrumb,
  eyebrow,
  title,
  description,
  primary = "apply",
  applyHref = "/apply",
  applyLabel = "Start your application",
  omitApply = false,
  extraLinks,
  children,
}: {
  /** The page's <PageBreadcrumb>, rendered above the eyebrow inside the band. */
  breadcrumb?: ReactNode
  eyebrow: string
  title: ReactNode
  description: ReactNode
  primary?: "apply" | "call"
  applyHref?: string
  applyLabel?: string
  /** Freight pages whose job is Call or a form — do not show driver Apply. */
  omitApply?: boolean
  extraLinks?: readonly { href: string; label: string }[]
  children?: ReactNode
}) {
  const apply = omitApply ? null : (
    <ActionLink href={applyHref} className={primary === "apply" ? primaryClass : textClass}>
      {applyLabel}
      {primary === "apply" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
    </ActionLink>
  )
  // Keyed off the action that actually RENDERS, not off `primary`. With
  // `omitApply` and the default `primary="apply"` the old form left the band
  // with a dangling "or call (206) 765-6300" — an "or" with nothing to be
  // second to, as both the visible copy and the link's accessible name — and
  // no filled red action anywhere in the viewport (/business-card, /privacy).
  const callIsPrimary = primary === "call" || omitApply
  // Digits always mono + tabular so the number reads as a number, and always
  // visible as text beside Apply — drivers in trucks call, they don't type.
  const call = (
    <a href={`tel:${COMPANY_INFO.phoneFormatted}`} className={callIsPrimary ? primaryClass : textClass}>
      <span>{callIsPrimary ? "Call " : "or call "}</span>
      <span className="font-mono tabular-nums">{COMPANY_INFO.phone}</span>
    </a>
  )

  const copy = (
    <>
      {breadcrumb ? <div className="mb-6">{breadcrumb}</div> : null}
      {/* orange-300, not signal-up: the rule for small red text on the dark
          ground, and what OperationSection uses for this exact eyebrow. */}
      <p className="font-display text-m-micro font-bold uppercase tracking-[0.2em] text-orange-300">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-display text-m-h1 font-bold text-balance">{title}</h1>
      <p className="mt-5 max-w-measure text-m-lede text-paper/80">{description}</p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {callIsPrimary ? (
          <>
            {call}
            {apply}
          </>
        ) : (
          <>
            {apply}
            {call}
          </>
        )}
        {extraLinks?.map((link) => (
          <ActionLink key={link.href} href={link.href} className={textClass}>
            {link.label}
          </ActionLink>
        ))}
      </div>
    </>
  )

  return (
    <section className="bg-asphalt py-section text-paper md:py-section-loose">
      <div className="container">
        {/* The copy column is NEVER wrapped in <Reveal>. Reveal is a client
            component whose server-rendered class list is
            `motion-safe:opacity-0 motion-safe:translate-y-3`, so wrapping the
            <h1> would paint the LCP element of every subpage at opacity 0
            until React hydrates and the observer fires — and leave an empty
            asphalt band if hydration fails. `.hero-stagger` (globals.css)
            stages the identical entrance in pure CSS with no JS dependency,
            which is exactly why the homepage hero uses it. Reveal stays on
            the optional second column only, which is never the LCP. */}
        {children ? (
          <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <div className="hero-stagger">{copy}</div>
            <Reveal index={1}>{children}</Reveal>
          </div>
        ) : (
          <div className="max-w-3xl hero-stagger">{copy}</div>
        )}
      </div>
    </section>
  )
}

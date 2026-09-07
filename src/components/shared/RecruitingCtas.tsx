import Link from "next/link"
import { Phone } from "lucide-react"
import { COMPANY_INFO } from "@/lib/constants"
import { smsMeUrl, whatsAppMeUrl } from "@/lib/recruiting-posts"

/**
 * Driver-facing CTAs. Constraints (driver-recruitment-conversion + brand):
 * one orange primary per viewport, Call as the only secondary. Text/WhatsApp
 * stay available as links, never as a third equal-weight button — stacking
 * those next to Apply is how a listing becomes four competing actions.
 * Pages that render this also hide MobileCommandBar so the sticky bar does
 * not pin a second orange Apply over the same screen.
 */
const primaryClass =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-500"
const secondaryClass =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"

export function RecruitingCtas({
  applyHref,
  applyLabel = "Apply now",
  primary = "apply",
  messagePrefill,
}: {
  applyHref: string
  applyLabel?: string
  primary?: "apply" | "call"
  messagePrefill?: string
}) {
  const apply = (
    <Link href={applyHref} className={primary === "apply" ? primaryClass : secondaryClass}>
      {applyLabel}
    </Link>
  )
  const call = (
    <a
      href={`tel:${COMPANY_INFO.phoneFormatted}`}
      className={primary === "call" ? primaryClass : secondaryClass}
    >
      <Phone className="h-4 w-4" aria-hidden />
      {primary === "call" ? `Call ${COMPANY_INFO.phone}` : COMPANY_INFO.phone}
    </a>
  )

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        {primary === "call" ? (
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
      </div>
      {messagePrefill ? (
        <p className="mt-3 text-sm text-slate-400">
          Prefer to message?{" "}
          <a
            href={smsMeUrl(messagePrefill)}
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            Text
          </a>
          {" · "}
          <a
            href={whatsAppMeUrl(messagePrefill)}
            className="font-semibold text-white underline-offset-4 hover:underline"
          >
            WhatsApp
          </a>
        </p>
      ) : null}
    </div>
  )
}

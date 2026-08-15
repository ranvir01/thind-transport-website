import Link from "next/link"
import { Gamepad2, ArrowRight } from "lucide-react"
import { SANDBOX_CARRIER_NAME } from "@/lib/hub/sandbox"

/**
 * The way into the sandbox from a real workspace.
 *
 * Blue Ridge Haulage — a fully seeded practice company you can drive from any
 * seat — has existed at /hub/sandbox all along, but nothing inside the app
 * linked to it. SandboxBanner only renders once you are ALREADY in the sandbox,
 * so the only way in was to know the URL. This is the missing front door, and
 * it belongs on Today because that is where someone sits when they want to try
 * something without risking their own data.
 *
 * The warning is the important part. Picking a seat calls signIn() — it does
 * not open a second session, it REPLACES the one you are using. Someone
 * evaluating the app taps through, lands as Priya at Blue Ridge, and reasonably
 * concludes the app logged them out of their own company. Saying so up front
 * costs one line; not saying it costs a support call and a trust problem.
 */
export function SandboxInvite() {
  return (
    <section className="mt-5 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text"
        >
          <Gamepad2 className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg">Practice on a company that isn&apos;t yours</h2>
          <p className="mt-1 text-body-xs text-fg-2">
            {SANDBOX_CARRIER_NAME} is a full fake carrier — trucks, drivers, brokers, a quarter of
            loads and money already in it. Book a load, run a settlement, file an IFTA quarter, break
            whatever you like. One button puts it all back. Nothing you do there touches your own
            workspace.
          </p>
          <p className="mt-2 text-body-xs text-fg-3">
            Heads up: picking a seat signs you in <span className="font-semibold text-fg-2">as that
            person</span> — it swaps your session rather than opening a second one. Sign back in to
            come back to your own workspace.
          </p>
          <Link
            href="/hub/sandbox"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-control border border-accent bg-accent-soft px-3.5 text-sm font-semibold text-accent-text transition-colors hover:border-accent-hover"
          >
            Open the sandbox <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

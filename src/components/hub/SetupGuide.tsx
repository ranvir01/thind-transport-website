import Link from "next/link"
import { ArrowRight, BookOpen, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HAULDESK_MISSION,
  OPERATIONS_PHASES,
  SETUP_CHECKLIST,
  type GettingStartedKeys,
} from "@/lib/hub/setup-guide"
import { Panel } from "@/components/hub/ui"

type Progress = Partial<Record<GettingStartedKeys, boolean>>

/** In-app setup guide — the full start-to-finish trucking playbook. */
export function SetupGuide({
  progress,
  compact = false,
}: {
  progress?: Progress | null
  compact?: boolean
}) {
  if (compact) {
    return (
      <Panel className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
              <BookOpen className="h-4 w-4 text-accent-text shrink-0" />
              How HaulDesk works
            </p>
            <p className="mt-1 text-sm text-fg-2 max-w-xl">{HAULDESK_MISSION}</p>
          </div>
          <Link
            href="/hub/guide"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-fg hover:bg-hover"
          >
            Full setup guide <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-accent-text">Setup guide</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-fg">
          Run trucking start to finish
        </h1>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{HAULDESK_MISSION}</p>
        <p className="mt-3 text-sm text-fg-3">
          Follow the phases below in order your first week. After that,{" "}
          <strong className="font-medium text-fg-2">Today</strong> on the home screen tells you what
          needs a human — dispatches to confirm, loads to invoice, expiries coming due.
        </p>
      </header>

      {OPERATIONS_PHASES.map((phase) => (
        <section key={phase.number}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">
              {phase.number}
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-fg">{phase.title}</h2>
              <p className="text-sm text-fg-3">{phase.intro}</p>
            </div>
          </div>
          <div className="space-y-2 ml-0 md:ml-10">
            {phase.steps.map((step) => {
              const done = step.progressKey && progress?.[step.progressKey]
              return (
                <Panel key={step.id} className="p-4 transition-colors hover:bg-hover/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {step.progressKey ? (
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                              done
                                ? "border-ok/40 bg-ok-soft text-ok"
                                : "border-border-strong text-fg-3"
                            )}
                          >
                            {done ? <Check className="h-3 w-3" /> : null}
                          </span>
                        ) : null}
                        <h3 className="font-semibold text-fg">{step.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-fg-2">{step.summary}</p>
                      <p className="mt-1 text-xs text-fg-3">Usually: {step.who}</p>
                    </div>
                    <Link
                      href={step.href}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-accent px-3 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                    >
                      {step.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Panel>
              )
            })}
          </div>
        </section>
      ))}

      <Panel className="p-5 bg-surface-2 border-dashed">
        <h2 className="text-[13.5px] font-semibold text-fg">Daily rhythm (after setup)</h2>
        <ol className="mt-3 space-y-2 text-sm text-fg-2 list-decimal list-inside">
          <li>
            Open <Link href="/hub" className="text-accent-text font-medium hover:underline">Today</Link>{" "}
            — handle anything red or amber first.
          </li>
          <li>
            Book new freight on{" "}
            <Link href="/hub/loads/paste" className="text-accent-text font-medium hover:underline">
              Paste rate con
            </Link>{" "}
            or the dispatch board.
          </li>
          <li>
            Drivers run loads on their phones; you bill from{" "}
            <Link href="/hub/money" className="text-accent-text font-medium hover:underline">
              Money
            </Link>{" "}
            when POD is in.
          </li>
          <li>
            Run settlements weekly; glance at{" "}
            <Link href="/hub/compliance" className="text-accent-text font-medium hover:underline">
              Compliance
            </Link>{" "}
            when something expires.
          </li>
        </ol>
      </Panel>
    </div>
  )
}

/** Getting-started checklist for new carriers (Today screen). */
export function SetupChecklist({
  progress,
}: {
  progress: Record<GettingStartedKeys, boolean> | null
}) {
  if (!progress) return null
  const allDone = Object.values(progress).every(Boolean)

  if (allDone) return null

  return (
    <Panel className="p-4 md:p-5 mb-4 border-accent/20">
      <h2 className="text-[13.5px] font-semibold text-fg mb-1">Set up your workspace</h2>
      <p className="text-xs text-fg-3 mb-3">
        About an afternoon for most carriers. Need the full picture?{" "}
        <Link href="/hub/guide" className="text-accent-text font-medium hover:underline">
          Open the setup guide
        </Link>
        .
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {SETUP_CHECKLIST.map((step) => {
          const done =
            step.key === "smart_setup"
              ? progress.trucks && progress.drivers && progress.customers
              : progress[step.key as GettingStartedKeys]
          return (
            <li key={step.label}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 rounded-control px-2.5 py-2 text-sm hover:bg-hover min-h-[40px]",
                  done ? "text-fg-3 line-through" : "text-fg-2 font-medium",
                  step.highlight && !done ? "border border-accent/30 bg-accent-soft/50" : ""
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                    done ? "border-ok/40 bg-ok-soft text-ok" : "border-border-strong text-fg-3"
                  )}
                >
                  {done ? "✓" : ""}
                </span>
                {step.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

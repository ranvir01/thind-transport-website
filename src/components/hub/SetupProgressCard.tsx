"use client"

/**
 * The endowed, collapsible setup card on Today. Replaces the wall of empty
 * radio circles: starts at 1/7 with a real progress bar, expands one step at
 * a time, and is X-dismissible (setup lives on at /hub/guide).
 */
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GettingStarted } from "@/app/hub/_actions/onboarding"
import { nextSetupStep, setupDoneCount, setupSteps } from "@/lib/hub/setup-progress"

const DISMISS_KEY = "hauldesk-setup-dismissed"

export function SetupProgressCard({ progress }: { progress: GettingStarted }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [openStep, setOpenStep] = useState<string | null>(null)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  const steps = setupSteps(progress)
  const done = setupDoneCount(steps)
  const next = nextSetupStep(steps)
  const activeKey = openStep ?? next?.key ?? null

  // null = not hydrated yet; render nothing to avoid a dismiss flash.
  if (dismissed !== false || !next) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* non-persistent dismiss is still a dismiss */
    }
  }

  return (
    <section className="mb-5 rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              Finish setup — {done} of {steps.length}
              <span className="ml-1.5 font-normal text-fg-3">· ~an afternoon</span>
            </p>
            {/* Decorative — "X of 7" in the button label carries the state;
                a progressbar role inside a <button> gets stripped anyway. */}
            <div aria-hidden className="mt-2 h-1.5 w-full max-w-[320px] overflow-hidden rounded-pill bg-surface-2">
              <div
                className="h-full rounded-pill bg-accent transition-all duration-slow"
                style={{ width: `${(done / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-fg-3 transition-transform", expanded && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss setup — it stays available under Setup guide"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-3 hover:bg-hover hover:text-fg-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-border px-2 pb-2 pt-1">
          {steps.map((step) => {
            const isOpen = step.key === activeKey && !step.done
            return (
              <div key={step.key}>
                <button
                  type="button"
                  onClick={() => setOpenStep(step.done ? null : step.key)}
                  disabled={step.done}
                  className={cn(
                    "flex w-full min-h-[44px] items-center gap-2.5 rounded-control px-2.5 text-left text-sm",
                    step.done ? "text-fg-3" : "text-fg-2 hover:bg-hover"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      step.done ? "bg-ok-soft text-ok" : "border border-border-strong text-fg-3"
                    )}
                  >
                    {step.done ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className={cn("min-w-0 truncate", step.done && "line-through")}>{step.label}</span>
                </button>
                {isOpen ? (
                  <div className="mb-1 ml-10 mr-2 rounded-control bg-surface-2 p-3">
                    <p className="text-[13px] text-fg-2">{step.why}</p>
                    <Link
                      href={step.href}
                      className="mt-2.5 inline-flex min-h-[38px] items-center gap-1.5 rounded-control bg-accent px-3.5 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover"
                    >
                      {step.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : null}
              </div>
            )
          })}
          <p className="px-2.5 pb-1.5 pt-2 text-[12px] text-fg-3">
            Fastest path:{" "}
            <Link href="/hub/setup" className="font-medium text-accent-text hover:underline">
              Smart Setup
            </Link>{" "}
            reads your paperwork and fills most of this in.
          </p>
        </div>
      ) : null}
    </section>
  )
}

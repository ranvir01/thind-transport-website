"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { ArrowLeft, Building2, Loader2, RotateCcw, Truck, Users } from "lucide-react"
import { toast } from "sonner"
import { prepareSandboxAction, resetSandboxAction, setSandboxScenarioAction } from "@/app/hub/_actions/sandbox"
import {
  SANDBOX_PASSWORD,
  SANDBOX_SCENARIOS,
  SANDBOX_SEATS,
  type SandboxScenario,
  type SandboxSeat,
} from "@/lib/hub/sandbox"
import { cn } from "@/lib/utils"

const GROUPS: { key: SandboxSeat["group"]; label: string; icon: typeof Users; hint: string }[] = [
  { key: "office", label: "The office", icon: Users, hint: "Five desks, one company" },
  { key: "road", label: "On the road", icon: Truck, hint: "The driver app, forced dark" },
  { key: "outside", label: "Your customers", icon: Building2, hint: "What brokers and shippers see" },
]

export function SeatPicker({
  /**
   * The real carrier this visitor is currently signed into, or null. Taking a
   * seat signs them OUT of it — the one thing they cannot discover by looking
   * at the buttons.
   */
  signedInAs = null,
}: {
  signedInAs?: string | null
} = {}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [scenario, setScenario] = useState<SandboxScenario>("steady")
  const [settingScenario, setSettingScenario] = useState<SandboxScenario | null>(null)

  const applyScenario = async (key: SandboxScenario) => {
    if (settingScenario || busy) return
    setSettingScenario(key)
    try {
      const result = await setSandboxScenarioAction(key)
      if (result.ok) {
        setScenario(key)
        toast.success(key === "crunch" ? "Crunch day is live — pick a seat." : "Back to a steady week.")
      } else {
        toast.error(result.error ?? "Could not set the scenario")
      }
    } finally {
      setSettingScenario(null)
    }
  }

  const enter = async (seat: SandboxSeat) => {
    if (busy) return
    setBusy(seat.key)
    try {
      const prep = await prepareSandboxAction()
      if (!prep.ok) {
        toast.error(prep.error ?? "Sandbox unavailable")
        return
      }
      const result = await signIn("credentials", {
        email: seat.email,
        password: SANDBOX_PASSWORD,
        redirect: false,
      })
      if (result?.error) {
        toast.error("Could not take that seat — try Reset, then pick again.")
        return
      }
      window.location.assign(seat.entry)
    } finally {
      setBusy(null)
    }
  }

  const reset = async () => {
    setResetting(true)
    try {
      const result = await resetSandboxAction()
      if (result.ok) toast.success("Sandbox reset — fresh company, same story.")
      else toast.error(result.error ?? "Reset failed")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="hauldesk-shell min-h-[100dvh] bg-bg text-fg pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link
            href="/loadoff"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-fg-2 hover:bg-hover"
          >
            <ArrowLeft className="h-4 w-4" /> LoadOff
          </Link>
          <button
            onClick={reset}
            disabled={resetting || busy !== null}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 text-sm font-semibold text-fg-2 hover:bg-hover disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reset sandbox
          </button>
        </div>

        {signedInAs ? (
          <div
            className="mb-6 rounded-card border bg-warn-soft p-3.5"
            // A real edge, not soft-on-soft. `border-warn/30` would be the
            // utility, but --amber is a CSS var and Tailwind drops alpha
            // modifiers on var colours silently (AGENTS.md); color-mix it.
            style={{ borderColor: "color-mix(in srgb, var(--amber) 30%, transparent)" }}
          >
            <p className="text-[13px] font-semibold text-warn">
              You are signed in to {signedInAs}.
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-warn">
              Taking a seat below signs you out of it and into the practice company. Your real data is
              untouched — you will just need to log back in.
            </p>
            <Link
              href="/hub"
              className="mt-2.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 text-sm font-semibold text-fg hover:bg-hover"
            >
              <ArrowLeft className="h-4 w-4" /> Back to {signedInAs}
            </Link>
          </div>
        ) : null}

        <div className="hub-route-enter mb-8">
          <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-accent-text">
            Sandbox · Blue Ridge Haulage
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Run the whole company.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-fg-2">
            A real trucking company lives in here — 40 drivers, 30 trucks, 250 loads, a quarter of
            fuel and safety data — and it <span className="font-semibold text-fg">runs in real time</span>{" "}
            while you play: brokers keep calling, trucks roll on the live map, money moves. Every
            staff seat — office and road — can <span className="font-semibold text-fg">clock in</span>{" "}
            and work a scored shift; the broker and shipper seats get a tour of the customer portal
            instead. AI teammates cover every seat you leave empty. Break anything;{" "}
            <span className="font-semibold text-fg">Reset</span> puts it all back.
          </p>
        </div>

        <section className="mb-7">
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-[13.5px] font-semibold text-fg">Scenario</h2>
            <span className="text-[12px] text-fg-3">rebuilds the company into a situation</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {SANDBOX_SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => applyScenario(s.key)}
                disabled={settingScenario !== null || busy !== null}
                aria-pressed={scenario === s.key}
                className={cn(
                  "flex min-h-[64px] flex-col items-start gap-0.5 rounded-card border p-3.5 text-left shadow-card transition-colors duration-fast",
                  "",
                  scenario === s.key
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:border-border-strong hover:bg-hover",
                  "disabled:pointer-events-none",
                  settingScenario !== null && settingScenario !== s.key && "opacity-40"
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={cn("text-[14px] font-semibold", scenario === s.key ? "text-accent-text" : "text-fg")}>
                    {s.label}
                  </span>
                  {settingScenario === s.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden />
                  ) : null}
                </span>
                <span className="text-[12.5px] leading-snug text-fg-2">{s.blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-7">
          {GROUPS.map((group) => (
            <section key={group.key}>
              <div className="mb-2.5 flex items-center gap-2">
                <group.icon className="h-4 w-4 text-accent-text" aria-hidden />
                <h2 className="text-[13.5px] font-semibold text-fg">{group.label}</h2>
                <span className="text-[12px] text-fg-3">{group.hint}</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {SANDBOX_SEATS.filter((seat) => seat.group === group.key).map((seat, i) => (
                  <button
                    key={seat.key}
                    onClick={() => enter(seat)}
                    disabled={busy !== null}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={cn(
                      "hub-pop-enter group relative flex min-h-[92px] flex-col items-start gap-1 rounded-card border border-border bg-surface p-4 text-left shadow-card",
                      "transition-colors duration-fast hover:border-border-strong hover:bg-hover",
                      "",
                      "disabled:pointer-events-none",
                      busy !== null && busy !== seat.key && "opacity-40"
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-[15px] font-semibold text-fg">{seat.title}</span>
                      {busy === seat.key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden />
                      ) : (
                        <span className="rounded-pill border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg-3 opacity-100 transition-colors duration-fast group-hover:border-border-strong group-hover:text-accent-text">
                          Take seat
                        </span>
                      )}
                    </span>
                    <span className="text-[12.5px] font-medium text-fg-3">{seat.name}</span>
                    <span className="text-[13px] leading-snug text-fg-2">{seat.blurb}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-[12.5px] leading-relaxed text-fg-3">
          First entry builds the company (a few seconds). Everything in the sandbox is fabricated;
          it shares nothing with real workspaces. Prefer a guided tour?{" "}
          <Link href="/hub/demo" className="font-semibold text-accent-text hover:underline">
            Watch the 90-second demo
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

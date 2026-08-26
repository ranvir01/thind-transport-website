/**
 * Endowed setup progress — pure logic behind the Today-screen setup card.
 *
 * The checklist starts at 1/7, never 0/7: "Workspace created" is pre-checked
 * the moment a tenant exists (endowed-progress effect — people finish lists
 * they've visibly started). The six remaining steps auto-tick from live data
 * via gettingStartedState(); nothing here is stored.
 */
import type { GettingStarted } from "@/app/hub/_actions/onboarding"

export interface SetupStep {
  key: string
  label: string
  /** One short sentence on why the step matters. */
  why: string
  href: string
  cta: string
  done: boolean
}

export function setupSteps(progress: GettingStarted): SetupStep[] {
  return [
    {
      key: "workspace",
      label: "Workspace created",
      why: "Your company, your logins, your data — done.",
      href: "/hub",
      cta: "Done",
      done: true,
    },
    {
      key: "trucks",
      label: "Add your trucks",
      why: "VINs decode automatically; compliance dates start tracking.",
      href: "/hub/import?kind=trucks",
      cta: "Add trucks",
      done: progress.trucks,
    },
    {
      key: "drivers",
      label: "Add your drivers",
      why: "Each driver gets the phone app — dispatch without phone tag.",
      href: "/hub/import?kind=drivers",
      cta: "Add drivers",
      done: progress.drivers,
    },
    {
      key: "customers",
      label: "Add your brokers",
      why: "Invoices and statements need someone to bill.",
      href: "/hub/import?kind=customers",
      cta: "Add brokers",
      done: progress.customers,
    },
    {
      key: "loads",
      label: "Import load history",
      why: "Lane stats and reports start from day one, not zero.",
      href: "/hub/import?kind=loads",
      cta: "Import loads",
      done: progress.loads,
    },
    {
      key: "fuel",
      label: "Import fuel data",
      why: "Fuel feeds IFTA automatically — no quarterly scramble.",
      href: "/hub/import?kind=fuel",
      cta: "Import fuel",
      done: progress.fuel,
    },
    {
      key: "packet",
      label: "File your carrier packet",
      why: "W-9, COI, authority — one link for every broker who asks.",
      href: "/hub/settings/packet",
      cta: "File packet",
      done: progress.packet,
    },
  ]
}

export function setupDoneCount(steps: SetupStep[]): number {
  return steps.filter((s) => s.done).length
}

/** The first not-done step — the one the card expands by default. */
export function nextSetupStep(steps: SetupStep[]): SetupStep | null {
  return steps.find((s) => !s.done) ?? null
}

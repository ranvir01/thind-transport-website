import { requireOwner } from "@/lib/hub/session"
import { isSimulation, readPlatformState } from "@/lib/hub/mode"
import { PageHeader, Panel } from "@/components/hub/ui"
import { AdvanceSimDayButton } from "@/components/hub/AdvanceSimDayButton"
import { SimulationBadge } from "@/components/hub/SimulationBadge"
import { SimSwitcher } from "@/components/hub/SimSwitcher"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SimulationSettingsPage() {
  const user = await requireOwner()
  const sim = await isSimulation()
  const state = await readPlatformState()

  return (
    <div>
      <PageHeader
        title="Simulation"
        subtitle="HaulDesk's default world is generated. Flip to legit when you are ready to enter real data."
      />
      <Panel className="p-5 space-y-4 max-w-xl">
        <div className="flex items-center gap-2">
          {sim ? <SimulationBadge /> : <span className="text-sm font-semibold text-ok">LEGIT mode</span>}
        </div>
        {sim ? (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-fg-3">Seed</dt>
                <dd className="font-mono text-fg">{state?.sim_seed ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-fg-3">Simulated date</dt>
                <dd className="font-mono text-fg">{state?.sim_clock_date ?? "today"}</dd>
              </div>
            </dl>
            {user.simView ? (
              <div>
                <p className="mb-2 text-sm text-fg-3">Company</p>
                <SimSwitcher current={user.simView} size="comfortable" />
              </div>
            ) : null}
            <AdvanceSimDayButton />
            <p className="text-body-xs text-fg-3">
              Advances in-flight loads, nudges ELD positions, ages AR, and may book a new today load.
              Optional — first open is a simple snapshot.
            </p>
            <p className="text-body-sm text-fg-2">
              When you want real data: run <code className="font-mono">npm run go-legit</code> on your
              machine. It wipes this generated world (after confirming) and drops you into the
              onboarding wizard. Documented in <code className="font-mono">docs/START-HERE.md</code>.
            </p>
            <Link href="/hub/settings/outbox" className="text-sm font-semibold text-accent-text hover:underline">
              Open simulated outbox
            </Link>
          </>
        ) : (
          <p className="text-body-sm text-fg-2">
            Simulation guards are off. Email, integrations, and PDFs follow real credentials as you
            configure them.
          </p>
        )}
      </Panel>
    </div>
  )
}

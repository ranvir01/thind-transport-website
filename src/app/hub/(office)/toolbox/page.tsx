import { PageHeader } from "@/components/hub/ui"
import { WorkbenchPanel } from "@/components/hub/WorkbenchPanel"

export const metadata = { title: "Toolbox" }

/**
 * The stay-inside surface: calculators, regulations, pass reports, lookups —
 * everything that is a page rather than a feed, reachable without leaving
 * LoadOff. Registry in lib/hub/workbench.ts; rationale in
 * docs/decisions/0003-everything-app.md.
 */
export default function ToolboxPage() {
  return (
    <div>
      <PageHeader
        title="Toolbox"
        subtitle="Regulations, pass reports, calculators and lookups — without leaving LoadOff. Live data feeds live under Settings → Integrations."
      />
      <WorkbenchPanel />
    </div>
  )
}

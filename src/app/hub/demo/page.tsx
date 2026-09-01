import type { Metadata } from "next"
import { DemoSimulation } from "@/components/hub/demo/DemoSimulation"

export const metadata: Metadata = {
  title: "Demo",
  description: "LoadOff in 90 seconds — book, dispatch, track, invoice, get paid.",
}

/**
 * The interactive product demo: public (proxy allowlists /hub/demo),
 * fabricated data only, zero network — see lib/hub/demo-script.ts.
 */
export default function DemoPage() {
  return <DemoSimulation />
}

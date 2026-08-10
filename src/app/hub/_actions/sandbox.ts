"use server"

import { getHubUser } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { demoLoginEnabled } from "@/lib/hub/demo"
import { isSandboxCarrier, type SandboxScenario } from "@/lib/hub/sandbox"
import { applySandboxScenario, ensureSandboxSeeded } from "@/lib/hub/sandbox-seed"

/**
 * First-visit seeding for /hub/sandbox. Public by design (the picker page is
 * public); cheap when already seeded; a no-op when demo logins are disabled.
 */
export async function prepareSandboxAction(): Promise<{ ok: boolean; error?: string }> {
  if (!demoLoginEnabled()) return { ok: false, error: "The sandbox is disabled on this deployment." }
  try {
    await ensureSandboxSeeded()
    return { ok: true }
  } catch (error) {
    console.error("sandbox seed failed:", error)
    return { ok: false, error: "Could not prepare the sandbox. Try again in a minute." }
  }
}

/**
 * One-click reset. Deliberately as public as the picker itself — it can only
 * rebuild the fabricated sandbox tenant, never touch a real workspace. A
 * signed-in real-tenant user resetting the sandbox keeps their own session.
 */
export async function resetSandboxAction(): Promise<{ ok: boolean; error?: string }> {
  return setSandboxScenarioAction("steady")
}

/** Rebuild the sandbox into a named scenario. Same trust level as reset. */
export async function setSandboxScenarioAction(
  scenario: SandboxScenario
): Promise<{ ok: boolean; error?: string }> {
  if (!demoLoginEnabled()) return { ok: false, error: "The sandbox is disabled on this deployment." }
  if (scenario !== "steady" && scenario !== "crunch") return { ok: false, error: "Unknown scenario." }
  const user = await getHubUser()
  try {
    await applySandboxScenario(scenario)
    await logAudit({
      carrierId: null,
      actorId: user && isSandboxCarrier(user.carrierId) ? user.id : null,
      actorName: user?.name ?? "sandbox visitor",
      action: `sandbox.scenario.${scenario}`,
      entityType: "carrier",
      entityId: "sandbox",
    })
    return { ok: true }
  } catch (error) {
    console.error("sandbox reset failed:", error)
    return { ok: false, error: "Reset failed — try again." }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { emailPacket, signBrokerAgreement } from "@/lib/hub/packet"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"

interface Result {
  ok: boolean
  error?: string
}

export async function emailPacketAction(to: string, note?: string): Promise<Result & { attached?: number }> {
  try {
    const user = await requireOfficeUser()
    if (!to.includes("@")) return { ok: false, error: "Enter the broker's email" }
    const result = await emailPacket(user.carrierId, to.trim(), note ?? null)
    if (!result.sent) {
      return { ok: false, error: "Nothing to send yet — upload the W-9 and COI first" }
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier", entityId: user.carrierId, action: "packet_emailed",
      newValue: { to, attached: result.attached },
    })
    return { ok: true, attached: result.attached }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send the packet" }
  }
}

export async function requestCoiAction(input: {
  agentEmail: string
  certificateHolder: string
}): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    if (!input.agentEmail.includes("@")) return { ok: false, error: "Enter the agent's email" }
    if (!input.certificateHolder.trim()) return { ok: false, error: "Who is the certificate holder?" }
    const carrier = await getCarrier(user.carrierId)
    const { createMailTransport, mailFrom } = await import("@/lib/mailer")
    const transport = createMailTransport()
    await transport.sendMail({
      from: mailFrom(carrier?.name ?? "Carrier"),
      to: input.agentEmail.trim(),
      subject: `COI request — certificate holder: ${input.certificateHolder.trim()}`,
      text:
        `Please issue a certificate of insurance for ${carrier?.name ?? "our company"} ` +
        `(DOT ${carrier?.dot_number ?? "—"} / MC ${carrier?.mc_number ?? "—"}) with the following certificate holder:\n\n` +
        `${input.certificateHolder.trim()}\n\n` +
        `Reply to this email with the certificate. Thank you!\n— ${user.name}`,
    })
    // Remember the agent for next time.
    await query(
      `UPDATE hub.carrier_settings SET settings = jsonb_set(settings, '{insurance,agentEmail}', to_jsonb($2::text), TRUE), updated_at = NOW()
       WHERE carrier_id = $1`,
      [user.carrierId, input.agentEmail.trim()]
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send the request" }
  }
}

export async function signAgreementAction(
  customerId: string,
  input: { signerName: string; signerTitle: string; signature: string }
): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    if (!input.signature) return { ok: false, error: "Sign first" }
    if (!input.signerName.trim()) return { ok: false, error: "Who is signing?" }
    await signBrokerAgreement(
      user.carrierId,
      customerId,
      {
        signerName: input.signerName.trim(),
        signerTitle: input.signerTitle.trim() || "Authorized representative",
        signatureDataUrl: input.signature,
      },
      { id: user.id, name: user.name }
    )
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "customer", entityId: customerId, action: "agreement_signed",
      newValue: { signerName: input.signerName },
    })
    revalidatePath(`/hub/customers/${customerId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not record the agreement" }
  }
}

export async function savedAgentEmail(): Promise<string> {
  try {
    const user = await requireOfficeUser()
    const settings = (await getCarrierSettings(user.carrierId)) as unknown as {
      insurance?: { agentEmail?: string }
    }
    return settings.insurance?.agentEmail ?? ""
  } catch {
    return ""
  }
}

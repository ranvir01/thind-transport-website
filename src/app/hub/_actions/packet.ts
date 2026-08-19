"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import { emailPacket, signBrokerAgreement } from "@/lib/hub/packet"
import { getCarrier, getCarrierSettings } from "@/lib/hub/settings"
import { isEmailConfigured } from "@/lib/mailer"
import { logAudit } from "@/lib/hub/audit"
import { actionError } from "@/lib/hub/action-error"
import { query } from "@/lib/hub/db"

interface Result {
  ok: boolean
  error?: string
}

export async function emailPacketAction(to: string, note?: string): Promise<Result & { attached?: number }> {
  try {
    // Sends the carrier packet — W-9, COI, authority letter — to an arbitrary
    // address, from the carrier's own name and MC number. That is broker
    // onboarding, so customers:write, the same gate signAgreementAction below
    // already uses. Outbound mail under the MC is not an any-office-role act.
    const user = await requirePermission("customers:write")
    if (!to.includes("@")) return { ok: false, error: "Enter the broker's email" }
    const result = await emailPacket(user.carrierId, to.trim(), note ?? null)
    if (!result.sent) {
      return {
        ok: false,
        error:
          result.reason === "not_configured"
            ? "Email not configured (set SMTP_USER/SMTP_PASS) — download the documents and send them manually."
            : "Nothing to send yet — upload the W-9 and COI first",
      }
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "carrier", entityId: user.carrierId, action: "packet_emailed",
      newValue: { to, attached: result.attached },
    })
    return { ok: true, attached: result.attached }
  } catch (err) {
    return actionError(err, "Could not send the packet")
  }
}

export async function requestCoiAction(input: {
  agentEmail: string
  certificateHolder: string
}): Promise<Result> {
  try {
    // Emails the carrier's own insurance agent for a COI and remembers the
    // address in carrier_settings. Compliance paperwork, so compliance:write
    // — the accountant legitimately holds it; the point is that the matrix
    // decides rather than the guard defaulting to "any office role".
    const user = await requirePermission("compliance:write")
    if (!input.agentEmail.includes("@")) return { ok: false, error: "Enter the agent's email" }
    if (!input.certificateHolder.trim()) return { ok: false, error: "Who is the certificate holder?" }
    if (!isEmailConfigured()) {
      return {
        ok: false,
        error: "Email not configured (set SMTP_USER/SMTP_PASS) — email your agent directly for now.",
      }
    }
    const carrier = await getCarrier(user.carrierId)
    const { createMailTransport, mailFrom } = await import("@/lib/mailer")
    const transport = createMailTransport()
    const agentEmail = input.agentEmail.trim()
    await transport.sendMail({
      from: mailFrom(carrier?.name ?? "Carrier"),
      to: agentEmail,
      subject: `COI request — certificate holder: ${input.certificateHolder.trim()}`,
      text:
        `Please issue a certificate of insurance for ${carrier?.name ?? "our company"} ` +
        `(DOT ${carrier?.dot_number ?? "—"} / MC ${carrier?.mc_number ?? "—"}) with the following certificate holder:\n\n` +
        `${input.certificateHolder.trim()}\n\n` +
        `Reply to this email with the certificate. Thank you!\n— ${user.name}`,
    })
    // Remember the agent for next time.
    // Upsert, not a bare UPDATE: jsonb_set('{insurance,agentEmail}') cannot
    // create the missing insurance parent, and a missing carrier_settings row
    // matched 0 rows — both paths silently forgot the agent. Same INSERT…
    // ON CONFLICT + parent-seed form as updateOfficeEmailAction /
    // setBrandAccentAction / nextInvoiceNumber.
    await query(
      `INSERT INTO hub.carrier_settings (carrier_id, settings)
       VALUES ($1, jsonb_build_object('insurance', jsonb_build_object('agentEmail', $2::text)))
       ON CONFLICT (carrier_id) DO UPDATE SET
         settings = jsonb_set(
           jsonb_set(hub.carrier_settings.settings, '{insurance}',
             COALESCE(hub.carrier_settings.settings->'insurance', '{}'::jsonb), TRUE),
           '{insurance,agentEmail}', to_jsonb($2::text), TRUE),
         updated_at = NOW()`,
      [user.carrierId, agentEmail]
    )
    revalidatePath("/hub/settings/packet")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not send the request")
  }
}

export async function signAgreementAction(
  customerId: string,
  input: { signerName: string; signerTitle: string; signature: string }
): Promise<Result> {
  try {
    // Signing a broker–carrier agreement writes a document + CRM activity on
    // the customer — customers:write, not just any office role (accountant
    // holds no customers:write in the matrix).
    const user = await requirePermission("customers:write")
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
    return actionError(err, "Could not record the agreement")
  }
}

export async function savedAgentEmail(): Promise<string> {
  try {
    const user = await requirePermission("compliance:read")
    const settings = (await getCarrierSettings(user.carrierId)) as unknown as {
      insurance?: { agentEmail?: string }
    }
    return settings.insurance?.agentEmail ?? ""
  } catch {
    return ""
  }
}

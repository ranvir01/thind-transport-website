"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { COMPANY_INFO, STATS } from "@/lib/constants"
import { draftOutreach, type Audience, type Channel, type CompanyFacts } from "@/lib/hub/outreach/draft"
import { parseProspects } from "@/lib/hub/outreach/import"
import {
  importProspects, getProspect, saveDraft, setStatus, markSent, suppressByEmail,
  type ProspectStatus,
} from "@/lib/hub/outreach/prospects"
import { sendOutreachEmail } from "@/lib/hub/outreach/send"
import { saveWebsiteLead } from "@/lib/hub/website-leads"

function companyFacts(): CompanyFacts {
  return {
    name: COMPANY_INFO.name,
    phone: COMPANY_INFO.phone,
    phoneFormatted: COMPANY_INFO.phoneFormatted,
    email: COMPANY_INFO.email,
    address: COMPANY_INFO.address,
    dot: COMPANY_INFO.dot,
    mc: COMPANY_INFO.mc,
    founded: COMPANY_INFO.founded,
    statesCovered: STATS.statesCovered,
    trucks: STATS.trucksInFleet,
  }
}

type Result<T = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: string }

export async function importProspectsAction(
  audience: Audience,
  text: string
): Promise<Result<{ inserted: number; updated: number; skipped: number }>> {
  try {
    const user = await requireOfficeUser()
    const rows = parseProspects(text, audience)
    if (rows.length === 0) return { ok: false, error: "No rows found. Paste one prospect per line, or a CSV." }
    const res = await importProspects(user.carrierId, rows, "csv")
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "outreach_prospect", entityId: "import", action: `outreach_import_${audience}`,
    })
    revalidatePath("/hub/outreach")
    return { ok: true, ...res }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed" }
  }
}

export async function generateDraftAction(
  id: string,
  channel: Channel = "email"
): Promise<Result<{ subject: string; body: string; sms: string; callScript: string }>> {
  try {
    const user = await requireOfficeUser()
    const p = await getProspect(user.carrierId, id)
    if (!p) return { ok: false, error: "Prospect not found." }
    const draft = draftOutreach(
      {
        audience: p.audience, company: p.company, contactName: p.contact_name,
        email: p.email, phone: p.phone, mcNumber: p.mc_number, lane: p.lane,
        equipment: p.equipment, notes: p.notes,
      },
      companyFacts(),
      channel
    )
    await saveDraft(user.carrierId, id, { channel, subject: draft.subject, body: draft.body })
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "outreach_prospect", entityId: id, action: "outreach_draft_generated",
    })
    revalidatePath("/hub/outreach")
    return { ok: true, subject: draft.subject, body: draft.body, sms: draft.sms, callScript: draft.callScript }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not draft" }
  }
}

export async function saveDraftAction(id: string, subject: string, body: string): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await saveDraft(user.carrierId, id, { channel: "email", subject, body })
    revalidatePath("/hub/outreach")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save" }
  }
}

/** Human-gated send: only ever called from an explicit "Approve & send" click. */
export async function approveAndSendAction(id: string): Promise<Result<{ reason?: string }>> {
  try {
    const user = await requireOfficeUser()
    const p = await getProspect(user.carrierId, id)
    if (!p) return { ok: false, error: "Prospect not found." }
    const result = await sendOutreachEmail(p, `${COMPANY_INFO.name}`)
    if (!result.sent) return { ok: false, error: result.reason ?? "Not sent." }
    await markSent(user.carrierId, id)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "outreach_prospect", entityId: id, action: "outreach_sent",
    })
    revalidatePath("/hub/outreach")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}

export async function setProspectStatusAction(id: string, status: ProspectStatus): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    const p = await getProspect(user.carrierId, id)
    if (!p) return { ok: false, error: "Prospect not found." }

    if (status === "unsubscribed" && p.email) {
      await suppressByEmail(user.carrierId, p.email)
    } else {
      await setStatus(user.carrierId, id, status)
    }

    // A driver who replies is a recruiting lead — surface them where recruiters
    // already look (the Driver leads board) so nothing falls through.
    if (status === "converted" && p.audience === "driver" && p.email) {
      await saveWebsiteLead({
        name: p.contact_name, email: p.email, phone: p.phone,
        source: "Outreach — driver reply", driverType: null, experienceYears: null,
        message: p.notes ?? "Converted from outbound outreach.",
      })
    }
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "outreach_prospect", entityId: id, action: `outreach_${status}`,
    })
    revalidatePath("/hub/outreach")
    revalidatePath("/hub/leads")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update" }
  }
}

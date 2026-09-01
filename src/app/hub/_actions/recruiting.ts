"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/hub/session"
import {
  attachReferral, convertApplicantToDriver, createApplicant, createOffer,
  importPublicApplicants, moveApplicantStage, signOffer, toggleOrientationItem,
  type ApplicantStage,
} from "@/lib/hub/recruiting"
import { logAudit } from "@/lib/hub/audit"
import { dollarsToCents } from "@/lib/hub/types"
import { actionError } from "@/lib/hub/action-error"

interface Result {
  ok: boolean
  error?: string
  id?: string
}

export async function addApplicantAction(input: {
  firstName: string
  lastName: string
  phone?: string
  email?: string
  cdlNumber?: string
  cdlState?: string
  yearsExperience?: string
  notes?: string
}): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    if (!input.firstName.trim() || !input.lastName.trim()) {
      return { ok: false, error: "First and last name, at minimum" }
    }
    const applicant = await createApplicant(
      user.carrierId,
      {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        cdlNumber: input.cdlNumber?.trim() || null,
        cdlState: input.cdlState?.trim().toUpperCase() || null,
        yearsExperience: input.yearsExperience ? Number(input.yearsExperience) || null : null,
        notes: input.notes?.trim() || null,
      },
      user.name
    )
    revalidatePath("/hub/recruiting")
    return { ok: true, id: applicant?.id }
  } catch (err) {
    return actionError(err, "Could not add the applicant")
  }
}

export async function moveStageAction(
  applicantId: string,
  toStage: ApplicantStage,
  note?: string
): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    const result = await moveApplicantStage(user.carrierId, applicantId, toStage, user.name, note)
    revalidatePath("/hub/recruiting")
    revalidatePath(`/hub/recruiting/${applicantId}`)
    return result
  } catch (err) {
    return actionError(err, "Could not move the applicant")
  }
}

export async function toggleOrientationAction(
  applicantId: string,
  key: string,
  done: boolean
): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    await toggleOrientationItem(user.carrierId, applicantId, key, done)
    revalidatePath(`/hub/recruiting/${applicantId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not update the checklist")
  }
}

export async function createOfferAction(
  applicantId: string,
  input: { paySummary: string; startDate?: string; body: string }
): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    if (!input.paySummary.trim() || !input.body.trim()) {
      return { ok: false, error: "Pay summary and the letter text are both needed" }
    }
    const paySummary = input.paySummary.trim()
    const startDate = input.startDate || null
    const id = await createOffer(
      user.carrierId,
      applicantId,
      { paySummary, startDate, body: input.body.trim() },
      user.name
    )
    await moveApplicantStage(user.carrierId, applicantId, "offer", user.name, "Offer extended")
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "offer", entityId: id, action: "created",
      newValue: { applicantId, paySummary, startDate },
    })
    revalidatePath(`/hub/recruiting/${applicantId}`)
    revalidatePath("/hub/recruiting")
    return { ok: true, id }
  } catch (err) {
    return actionError(err, "Could not create the offer")
  }
}

export async function signOfferAction(
  applicantId: string,
  offerId: string,
  signature: string,
  signedName: string
): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    if (!signature) return { ok: false, error: "Sign first" }
    const ok = await signOffer(user.carrierId, offerId, signature, signedName)
    if (!ok) return { ok: false, error: "Offer already decided" }
    await moveApplicantStage(user.carrierId, applicantId, "orientation", user.name, "Offer signed")
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "offer", entityId: offerId, action: "signed",
      newValue: { signedName },
    })
    revalidatePath(`/hub/recruiting/${applicantId}`)
    revalidatePath("/hub/recruiting")
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not record the signature")
  }
}

export async function convertApplicantAction(
  applicantId: string,
  input: { payType: "per_mile" | "percentage"; payRate: string; hireDate: string }
): Promise<Result & { driverId?: string }> {
  try {
    const user = await requirePermission("drivers:write")
    const payRate = Number(input.payRate)
    if (!Number.isFinite(payRate) || payRate <= 0) return { ok: false, error: "Set the pay rate" }
    if (!input.hireDate) return { ok: false, error: "Pick the hire date" }
    const result = await convertApplicantToDriver(
      user.carrierId,
      applicantId,
      { payType: input.payType, payRate, hireDate: input.hireDate },
      { id: user.id, name: user.name }
    )
    if (result.ok) {
      await logAudit({
        carrierId: user.carrierId, actorId: user.id, actorName: user.name,
        entityType: "applicant", entityId: applicantId, action: "converted_to_driver",
        newValue: { driverId: result.driverId },
      })
      revalidatePath("/hub/recruiting")
      revalidatePath("/hub/drivers")
    }
    return result
  } catch (err) {
    return actionError(err, "Conversion failed")
  }
}

export async function attachReferralAction(
  applicantId: string,
  referrerDriverId: string,
  bonus: string
): Promise<Result> {
  try {
    const user = await requirePermission("drivers:write")
    const bonusCents = dollarsToCents(bonus)
    if (!referrerDriverId) return { ok: false, error: "Pick the referring driver" }
    if (bonusCents <= 0) return { ok: false, error: "Set the bonus amount" }
    await attachReferral(user.carrierId, applicantId, referrerDriverId, bonusCents)
    await logAudit({
      carrierId: user.carrierId, actorId: user.id, actorName: user.name,
      entityType: "referral", entityId: applicantId, action: "attached",
      newValue: { referrerDriverId, bonusCents },
    })
    revalidatePath(`/hub/recruiting/${applicantId}`)
    return { ok: true }
  } catch (err) {
    return actionError(err, "Could not attach the referral")
  }
}

export async function importPublicApplicantsAction(): Promise<Result & { imported?: number }> {
  try {
    const user = await requirePermission("drivers:write")
    const { imported } = await importPublicApplicants(user.carrierId, user.name)
    revalidatePath("/hub/recruiting")
    return { ok: true, imported }
  } catch (err) {
    return actionError(err, "Import failed")
  }
}

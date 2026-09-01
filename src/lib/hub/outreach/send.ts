/**
 * Outreach send path — CAN-SPAM-aware email delivery for an approved draft.
 *
 * Guardrails baked in (a caller cannot skip them):
 *  - never sends to a suppressed prospect (unsubscribed/bounced) or one with no
 *    email / no draft body;
 *  - the draft already carries a physical address + opt-out footer (draft.ts);
 *  - if SMTP is not configured, returns a clear reason instead of throwing, so
 *    the office UI tells the owner to configure email (or copy the draft) rather
 *    than silently "succeeding".
 *
 * SMS is intentionally NOT sendable here: cold texting contacts who did not opt
 * in is a TCPA risk. The SMS draft is copy-only in the UI.
 */
import { createMailTransport, isEmailConfigured, mailFrom } from "@/lib/mailer"
import type { Prospect } from "./prospects"

export interface SendResult {
  sent: boolean
  reason?: string
}

const SUPPRESSED = new Set(["unsubscribed", "bounced"])

export async function sendOutreachEmail(
  prospect: Prospect,
  fromDisplayName: string
): Promise<SendResult> {
  if (SUPPRESSED.has(prospect.status)) {
    return { sent: false, reason: "Prospect opted out or bounced — suppressed." }
  }
  if (!prospect.email) return { sent: false, reason: "No email address on this prospect." }
  if (prospect.draft_channel && prospect.draft_channel !== "email") {
    return { sent: false, reason: "Only email drafts can be sent from here." }
  }
  if (!prospect.draft_subject || !prospect.draft_body) {
    return { sent: false, reason: "Generate and review a draft first." }
  }
  if (!isEmailConfigured()) {
    return { sent: false, reason: "Email isn't configured (set SMTP_USER/SMTP_PASS). Copy the draft to send manually for now." }
  }
  try {
    const transport = createMailTransport()
    await transport.sendMail({
      from: mailFrom(fromDisplayName),
      to: prospect.email,
      subject: prospect.draft_subject,
      text: prospect.draft_body,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "Send failed." }
  }
}

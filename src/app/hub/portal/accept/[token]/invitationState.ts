/**
 * Pure resolution of which of the four accept/[token] page states applies,
 * pulled out of the page's JSX ternary chain so the branching (especially
 * "used" taking priority over "expired" when both are true) is testable
 * without a session or a live invitation record.
 */
export type InvitationState = "invalid" | "used" | "expired" | "valid"

export function resolveInvitationState(
  invitation: { expires_at: string; accepted_user_id: string | null } | null
): InvitationState {
  if (!invitation) return "invalid"
  if (invitation.accepted_user_id) return "used"
  if (new Date(invitation.expires_at) < new Date()) return "expired"
  return "valid"
}

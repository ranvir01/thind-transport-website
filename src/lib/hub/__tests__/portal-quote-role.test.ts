/**
 * A broker cannot request a quote, and the check lives in the ACTION.
 *
 * OWNER-TEST-DRIVE.md tells the owner, as a stated product decision he is then
 * asked to rule on: "the broker role has zero write permissions — Dana can
 * watch tracking, open PODs and check invoice status, but there is nothing she
 * can do. The shipper has exactly one write: submitting a quote request."
 *
 * That was not true. requirePortalUser() admits BOTH portal roles, and
 * portalQuoteRequestAction did nothing further with the role. The only thing
 * keeping a broker out was `portalRole === "shipper" ? <PortalQuoteForm /> : null`
 * in portal/page.tsx — and a server action is a public endpoint, so a control
 * that lives in the JSX is not a control at all.
 *
 * Same shape as the recruiting-permissions regression this file sits beside:
 * a guard that checks you are SOMEBODY rather than checking you are allowed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const portalUser = vi.fn(async () => ({
  id: "u1",
  name: "Dana Kim",
  carrierId: "carrier-1",
  customerId: "cust-1",
  role: "broker",
  portalRole: "broker",
}))

vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "u1", name: "O", carrierId: "carrier-1", role: "owner" })),
  requirePortalUser: portalUser,
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
const createQuoteRequest = vi.fn(async () => ({ reference: "Q-1" }))
vi.mock("@/lib/hub/portal", () => ({
  createPortalInvitation: vi.fn(async () => ({ token: "tok" })),
  acceptInvitation: vi.fn(async () => ({ ok: true })),
  createQuoteRequest,
}))

const REQUEST = {
  originCity: "Kent",
  originState: "WA",
  destCity: "Portland",
  destState: "OR",
  equipment: "dry_van" as const,
}

describe("portalQuoteRequestAction is shipper-only", () => {
  beforeEach(() => {
    createQuoteRequest.mockClear()
  })

  it("refuses a broker, and writes nothing", async () => {
    portalUser.mockResolvedValueOnce({
      id: "u1", name: "Dana Kim", carrierId: "carrier-1", customerId: "cust-1",
      role: "broker", portalRole: "broker",
    })
    const { portalQuoteRequestAction } = await import("../../../app/hub/_actions/portal")
    const result = await portalQuoteRequestAction(REQUEST)
    expect(result.ok).toBe(false)
    // The row must not exist either — refusing in the return value while still
    // having written would be the worst of both.
    expect(createQuoteRequest).not.toHaveBeenCalled()
  })

  it("still lets the shipper through — the one write they are meant to have", async () => {
    portalUser.mockResolvedValueOnce({
      id: "u2", name: "Alex Chen", carrierId: "carrier-1", customerId: "cust-2",
      role: "shipper", portalRole: "shipper",
    })
    const { portalQuoteRequestAction } = await import("../../../app/hub/_actions/portal")
    const result = await portalQuoteRequestAction(REQUEST)
    expect(result.ok).toBe(true)
    expect(createQuoteRequest).toHaveBeenCalledTimes(1)
  })

  it("checks the role BEFORE the field validation, not after", async () => {
    // Otherwise a broker learns which fields the endpoint wants by probing it
    // with junk, which is a small thing that tells you the guard is in the
    // wrong place.
    portalUser.mockResolvedValueOnce({
      id: "u1", name: "Dana Kim", carrierId: "carrier-1", customerId: "cust-1",
      role: "broker", portalRole: "broker",
    })
    const { portalQuoteRequestAction } = await import("../../../app/hub/_actions/portal")
    const result = await portalQuoteRequestAction({ ...REQUEST, originCity: "", destCity: "" })
    expect(result.error).toMatch(/shipper/i)
  })
})

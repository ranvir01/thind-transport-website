/**
 * Accepting a draft is booking freight, so it is gated on loads:write — not on
 * "any office role" — and the draft is only marked accepted AFTER the load
 * exists. The document re-parent is the other half: the emailed rate con has to
 * end up on the load it turned out to be for, or the factoring packet ships
 * without it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({ id: "user-1", name: "Dana", carrierId: "carrier-1" })),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/intake-drafts", () => ({
  getIntakeDraft: vi.fn(),
  resolveIntakeDraft: vi.fn(async () => true),
}))
// The load id is checked against the carrier before the draft is resolved
// (action-guards-audit.test.ts covers the refusal); here it passes.
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))

import { requirePermission } from "@/lib/hub/session"
import { logAudit } from "@/lib/hub/audit"
import { query } from "@/lib/hub/db"
import { getIntakeDraft, resolveIntakeDraft } from "@/lib/hub/intake-drafts"
import { acceptIntakeDraftAction, dismissIntakeDraftAction } from "@/app/hub/_actions/intake"

const requirePermissionMock = vi.mocked(requirePermission)
const getDraftMock = vi.mocked(getIntakeDraft)
const resolveMock = vi.mocked(resolveIntakeDraft)
const queryMock = vi.mocked(query)
const logAuditMock = vi.mocked(logAudit)

const DRAFT = "33333333-3333-3333-3333-333333333333"
const LOAD = "44444444-4444-4444-4444-444444444444"

function draft(over: Record<string, unknown> = {}) {
  return {
    id: DRAFT, carrier_id: "carrier-1", source: "mailbox", subject: "Rate con",
    from_address: "broker@example.com", raw_text: null, parsed: { stops: [] },
    confidence: "high", document_id: "doc-9", status: "pending",
    created_load_id: null, created_at: "2026-08-30T00:00:00Z", resolved_at: null, resolved_by: null,
    ...over,
  } as never
}

describe("acceptIntakeDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requirePermissionMock.mockResolvedValue({ id: "user-1", name: "Dana", carrierId: "carrier-1" } as never)
    getDraftMock.mockResolvedValue(draft())
    resolveMock.mockResolvedValue(true)
    queryMock.mockResolvedValue([])
  })

  it("gates on loads:write, because accepting a draft books freight", async () => {
    await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
  })

  it("refuses a role without loads:write and touches nothing", async () => {
    requirePermissionMock.mockRejectedValue(new Error("Forbidden"))
    const result = await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(result.ok).toBe(false)
    expect(resolveMock).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("marks the draft accepted against the load it became", async () => {
    const result = await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(result).toEqual({ ok: true })
    expect(resolveMock).toHaveBeenCalledWith({
      carrierId: "carrier-1", id: DRAFT, status: "accepted", createdLoadId: LOAD, resolvedBy: "user-1",
    })
  })

  it("re-parents the emailed document from the carrier vault onto the load", async () => {
    await acceptIntakeDraftAction(DRAFT, LOAD)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    const flat = String(sql).replace(/\s+/g, " ")
    expect(flat).toContain("UPDATE hub.documents SET entity_type = 'load'")
    // Carrier-scoped, and scoped to carrier-owned docs so a re-run can never
    // yank a document off a different load.
    expect(flat).toContain("WHERE carrier_id = $1")
    expect(flat).toContain("entity_type = 'carrier'")
    expect(params).toEqual(["carrier-1", "doc-9", LOAD])
  })

  it("skips the document update when the draft came from a pasted body", async () => {
    getDraftMock.mockResolvedValue(draft({ document_id: null }))
    await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("refuses a draft belonging to another carrier (getIntakeDraft returns null)", async () => {
    getDraftMock.mockResolvedValue(null)
    const result = await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(result.ok).toBe(false)
    expect(resolveMock).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("does not re-parent a document when the draft was already handled", async () => {
    resolveMock.mockResolvedValue(false)
    const result = await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(result.ok).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("audits the accept and revalidates both the queue and the new load", async () => {
    await acceptIntakeDraftAction(DRAFT, LOAD)
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "intake_draft", entityId: DRAFT, action: "accept" })
    )
    expect(revalidatePathMock).toHaveBeenCalledWith("/hub/inbox")
    expect(revalidatePathMock).toHaveBeenCalledWith(`/hub/loads/${LOAD}`)
  })
})

describe("dismissIntakeDraftAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requirePermissionMock.mockResolvedValue({ id: "user-1", name: "Dana", carrierId: "carrier-1" } as never)
    getDraftMock.mockResolvedValue(draft())
    resolveMock.mockResolvedValue(true)
    queryMock.mockResolvedValue([])
  })

  it("is gated the same as accept — deciding not to book is a dispatch call", async () => {
    await dismissIntakeDraftAction(DRAFT)
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
  })

  it("leaves the broker's document in the carrier vault", async () => {
    const result = await dismissIntakeDraftAction(DRAFT)
    expect(result).toEqual({ ok: true })
    // Dismiss means "not a load I'm booking", never "delete the paperwork".
    expect(queryMock).not.toHaveBeenCalled()
    // No load id is passed at all — a dismissed draft never points at freight.
    expect(resolveMock).toHaveBeenCalledWith({
      carrierId: "carrier-1", id: DRAFT, status: "dismissed", resolvedBy: "user-1",
    })
  })

  it("reports a draft someone else already handled instead of silently succeeding", async () => {
    resolveMock.mockResolvedValue(false)
    await expect(dismissIntakeDraftAction(DRAFT)).resolves.toMatchObject({ ok: false })
  })
})

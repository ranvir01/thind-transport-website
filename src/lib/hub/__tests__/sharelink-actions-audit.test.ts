/**
 * Regression (improvement-loop backlog): create/revoke/renew share-link
 * actions minted or rewrote public /track access without a hub.audit_log
 * row, while sibling load mutations (create, update, document delete) all
 * audit. Token is never written into newValue — it is the public secret.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/hub/session", () => ({
  requirePermission: vi.fn(async () => ({
    id: "user-1",
    name: "Dana",
    carrierId: "carrier-1",
    role: "dispatcher",
  })),
}))
vi.mock("@/lib/hub/tenancy", () => ({ assertCarrierRefs: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/documents", () => ({ saveDocument: vi.fn(), deleteDocument: vi.fn() }))
vi.mock("@/lib/hub/db", () => ({ query: vi.fn(async () => []) }))
vi.mock("@/lib/hub/loads", () => ({
  createLoad: vi.fn(),
  updateLoad: vi.fn(),
  changeLoadStatus: vi.fn(),
  replaceStops: vi.fn(),
  setStopTimestamp: vi.fn(),
  getLoad: vi.fn(),
  addLoadEvent: vi.fn(async () => undefined),
  getLoadStops: vi.fn(),
}))
vi.mock("@/lib/hub/drivers", () => ({ getDriver: vi.fn(), dispatchLegality: vi.fn() }))
vi.mock("@/lib/hub/fleet", () => ({ getTruck: vi.fn() }))
vi.mock("@/lib/hub/sharelinks", () => ({
  createShareLink: vi.fn(async () => ({
    id: "link-1",
    load_id: "load-1",
    token: "super-secret-track-token",
    revoked_at: null,
    expires_at: "2026-10-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
  })),
  revokeShareLink: vi.fn(async () => undefined),
  renewShareLink: vi.fn(async () => undefined),
}))
vi.mock("@/lib/hub/audit", () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock("@/lib/hub/geocode", () => ({ geocodeCityState: vi.fn() }))

import { requirePermission } from "@/lib/hub/session"
import { addLoadEvent } from "@/lib/hub/loads"
import { createShareLink, renewShareLink, revokeShareLink } from "@/lib/hub/sharelinks"
import { logAudit } from "@/lib/hub/audit"
import {
  createShareLinkAction,
  renewShareLinkAction,
  revokeShareLinkAction,
} from "@/app/hub/_actions/loads"

const requirePermissionMock = vi.mocked(requirePermission)
const createShareLinkMock = vi.mocked(createShareLink)
const revokeShareLinkMock = vi.mocked(revokeShareLink)
const renewShareLinkMock = vi.mocked(renewShareLink)
const addLoadEventMock = vi.mocked(addLoadEvent)
const logAuditMock = vi.mocked(logAudit)

const USER = {
  id: "user-1",
  name: "Dana",
  email: "dana@example.com",
  carrierId: "carrier-1",
  role: "dispatcher" as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  requirePermissionMock.mockResolvedValue(USER)
})

describe("createShareLinkAction", () => {
  it("requires loads:write and audits the new link without the token", async () => {
    const result = await createShareLinkAction("load-1")
    expect(result).toEqual({ ok: true, id: "link-1", token: "super-secret-track-token" })
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
    expect(createShareLinkMock).toHaveBeenCalledWith("carrier-1", "load-1", "user-1")
    expect(addLoadEventMock).toHaveBeenCalled()
    expect(logAuditMock).toHaveBeenCalledTimes(1)
    expect(logAuditMock).toHaveBeenCalledWith({
      carrierId: "carrier-1",
      actorId: "user-1",
      actorName: "Dana",
      entityType: "share_link",
      entityId: "link-1",
      action: "create",
      newValue: { loadId: "load-1" },
    })
    const payload = JSON.stringify(logAuditMock.mock.calls[0][0])
    expect(payload).not.toContain("super-secret-track-token")
  })

  it("skips the audit log when permission is denied", async () => {
    requirePermissionMock.mockRejectedValueOnce(new Error("Forbidden: viewer cannot loads:write"))
    const result = await createShareLinkAction("load-1")
    expect(result.ok).toBe(false)
    expect(createShareLinkMock).not.toHaveBeenCalled()
    expect(logAuditMock).not.toHaveBeenCalled()
  })

  it("skips the audit log when createShareLink rejects (foreign load)", async () => {
    createShareLinkMock.mockRejectedValueOnce(new Error("Load not found"))
    const result = await createShareLinkAction("foreign-load")
    expect(result.ok).toBe(false)
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

describe("revokeShareLinkAction", () => {
  it("audits a successful revoke", async () => {
    const result = await revokeShareLinkAction("link-1", "load-1")
    expect(result).toEqual({ ok: true })
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
    expect(revokeShareLinkMock).toHaveBeenCalledWith("carrier-1", "link-1")
    expect(logAuditMock).toHaveBeenCalledWith({
      carrierId: "carrier-1",
      actorId: "user-1",
      actorName: "Dana",
      entityType: "share_link",
      entityId: "link-1",
      action: "revoke",
      newValue: { loadId: "load-1" },
    })
  })

  it("skips the audit log when revokeShareLink rejects", async () => {
    revokeShareLinkMock.mockRejectedValueOnce(new Error("connection terminated"))
    const result = await revokeShareLinkAction("link-1", "load-1")
    expect(result.ok).toBe(false)
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

describe("renewShareLinkAction", () => {
  it("audits a successful renew", async () => {
    const result = await renewShareLinkAction("link-1", "load-1")
    expect(result).toEqual({ ok: true })
    expect(requirePermissionMock).toHaveBeenCalledWith("loads:write")
    expect(renewShareLinkMock).toHaveBeenCalledWith("carrier-1", "link-1")
    expect(logAuditMock).toHaveBeenCalledWith({
      carrierId: "carrier-1",
      actorId: "user-1",
      actorName: "Dana",
      entityType: "share_link",
      entityId: "link-1",
      action: "renew",
      newValue: { loadId: "load-1" },
    })
  })

  it("skips the audit log when renewShareLink rejects", async () => {
    renewShareLinkMock.mockRejectedValueOnce(new Error("connection terminated"))
    const result = await renewShareLinkAction("link-1", "load-1")
    expect(result.ok).toBe(false)
    expect(logAuditMock).not.toHaveBeenCalled()
  })
})

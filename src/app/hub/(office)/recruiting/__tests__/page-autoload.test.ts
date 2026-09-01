/**
 * Recruiting page load must pull public-site applications before listing
 * the board — otherwise a finished /apply still depends on a mailbox and
 * a button nobody knows to press.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hub/session", () => ({
  requireOfficeUser: vi.fn(async () => ({
    id: "u1",
    name: "Dispatcher",
    email: "d@example.com",
    role: "dispatcher",
    carrierId: "11111111-1111-1111-1111-111111111111",
  })),
}))
vi.mock("@/lib/hub/recruiting", () => ({
  listApplicants: vi.fn(async () => []),
  syncPublicApplicantsOnRecruitingLoad: vi.fn(async () => ({ imported: 2 })),
}))
vi.mock("@/components/hub/ui", () => ({
  PageHeader: (props: { title: string; subtitle?: string; action?: unknown }) => props.title,
}))
vi.mock("@/components/hub/RecruitingBoard", () => ({
  AddApplicantForm: () => null,
  ImportApplicantsButton: () => null,
  RecruitingBoard: () => null,
}))

import RecruitingPage from "../page"
import { listApplicants, syncPublicApplicantsOnRecruitingLoad } from "@/lib/hub/recruiting"

const syncMock = vi.mocked(syncPublicApplicantsOnRecruitingLoad)
const listMock = vi.mocked(listApplicants)

beforeEach(() => {
  syncMock.mockClear()
  listMock.mockClear()
})

describe("RecruitingPage", () => {
  it("syncs public applicants before listing so new /apply rows appear", async () => {
    await RecruitingPage()
    expect(syncMock).toHaveBeenCalledTimes(1)
    expect(listMock).toHaveBeenCalledTimes(1)
    const syncOrder = syncMock.mock.invocationCallOrder[0]
    const listOrder = listMock.mock.invocationCallOrder[0]
    expect(syncOrder).toBeLessThan(listOrder)
  })
})

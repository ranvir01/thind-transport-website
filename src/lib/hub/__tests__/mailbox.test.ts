import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../credentials", () => ({ getCredentials: vi.fn(async () => null) }))
vi.mock("../documents", () => ({ saveDocument: vi.fn(async () => ({})) }))
vi.mock("../loads", () => ({ addLoadEvent: vi.fn(async () => {}) }))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => {}) }))

const imapClient = {
  connect: vi.fn(async () => {}),
  getMailboxLock: vi.fn(),
  search: vi.fn(async (): Promise<number[] | null> => []),
  fetchOne: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
  messageFlagsAdd: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
}
const imapFlowCtor = vi.fn(() => imapClient)
vi.mock("imapflow", () => ({
  ImapFlow: function (this: unknown, ...args: unknown[]) {
    return imapFlowCtor(...(args as []))
  },
}))
const simpleParserMock = vi.fn(async (): Promise<Record<string, unknown>> => ({}))
vi.mock("mailparser", () => ({
  simpleParser: (...args: unknown[]) => simpleParserMock(...(args as [])),
}))

import { getCredentials } from "../credentials"
import { query, queryOne } from "../db"
import { saveDocument } from "../documents"
import { addLoadEvent } from "../loads"
import { extractReference, pollDocsMailbox } from "../mailbox"
import { notifyRoles } from "../notify"

const getCredentialsMock = vi.mocked(getCredentials)
const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const saveDocumentMock = vi.mocked(saveDocument)
const addLoadEventMock = vi.mocked(addLoadEvent)
const notifyRolesMock = vi.mocked(notifyRoles)

const CARRIER = "11111111-1111-1111-1111-111111111111"
const CREDS = { host: "imap.example.com", user: "docs@example.com", password: "app-pw" }
const releaseMock = vi.fn()

function parsedMessage(overrides: Record<string, unknown> = {}) {
  return {
    subject: "Rate con THD-1042",
    from: { text: "broker@example.com" },
    attachments: [
      {
        content: Buffer.from("pdf bytes"),
        filename: "ratecon.pdf",
        contentType: "application/pdf",
      },
    ],
    ...overrides,
  }
}

describe("docs mailbox — reference extraction", () => {
  const cases: [string, string | null][] = [
    ["Rate con for THD-1042", "THD-1042"],
    ["FW: RE: thd-1042 pod attached", "THD-1042"],
    ["Load LD-23 paperwork", "LD-23"],
    ["CASC-100023 BOL", "CASC-100023"],
    ["Invoice INV-2026-... wait that's not a load", "INV-2026"],
    ["no reference here", null],
    ["", null],
  ]
  for (const [subject, expected] of cases) {
    it(`"${subject || "(empty)"}" → ${expected}`, () => {
      expect(extractReference(subject)).toBe(expected)
    })
  }
})

describe("pollDocsMailbox", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCredentialsMock.mockResolvedValue(CREDS)
    imapClient.getMailboxLock.mockResolvedValue({ release: releaseMock })
    imapClient.search.mockResolvedValue([])
    imapClient.fetchOne.mockResolvedValue(null)
    imapClient.logout.mockResolvedValue(undefined)
    queryOneMock.mockResolvedValue(null)
  })

  it("reports not connected without credentials and never opens IMAP", async () => {
    getCredentialsMock.mockResolvedValue(null)
    await expect(pollDocsMailbox(CARRIER)).resolves.toEqual({ connected: false })
    expect(imapFlowCtor).not.toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("treats a partial credential row (missing password) as not connected", async () => {
    getCredentialsMock.mockResolvedValue({ host: CREDS.host, user: CREDS.user })
    await expect(pollDocsMailbox(CARRIER)).resolves.toEqual({ connected: false })
    expect(imapFlowCtor).not.toHaveBeenCalled()
  })

  it("connects with credential-derived config, defaulting port 993 and INBOX", async () => {
    await pollDocsMailbox(CARRIER)
    expect(imapFlowCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: CREDS.host,
        port: 993,
        secure: true,
        auth: { user: CREDS.user, pass: CREDS.password },
      })
    )
    expect(imapClient.getMailboxLock).toHaveBeenCalledWith("INBOX")
  })

  it("honors explicit port and folder credentials", async () => {
    getCredentialsMock.mockResolvedValue({ ...CREDS, port: "143", folder: "Docs" })
    await pollDocsMailbox(CARRIER)
    expect(imapFlowCtor).toHaveBeenCalledWith(expect.objectContaining({ port: 143 }))
    expect(imapClient.getMailboxLock).toHaveBeenCalledWith("Docs")
  })

  it("files an attachment onto the carrier-scoped matching load and records the sync", async () => {
    imapClient.search.mockResolvedValue([7])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw rfc822") })
    simpleParserMock.mockResolvedValue(parsedMessage())
    queryOneMock.mockResolvedValue({ id: "load-1", reference: "THD-1042" })

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 1, unmatched: 0 })
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("carrier_id = $1"),
      [CARRIER, "THD-1042"]
    )
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    const saved = saveDocumentMock.mock.calls[0][0]
    expect(saved).toMatchObject({
      carrierId: CARRIER,
      entityType: "load",
      entityId: "load-1",
      kind: "rate_confirmation",
    })
    expect(saved.file.name).toBe("ratecon.pdf")
    expect(saved.file.type).toBe("application/pdf")
    expect(addLoadEventMock).toHaveBeenCalledWith(
      CARRIER,
      "load-1",
      "document",
      expect.objectContaining({ via: "docs mailbox", from: "broker@example.com", files: 1 }),
      { id: null, name: "Docs mailbox" }
    )
    expect(notifyRolesMock).not.toHaveBeenCalled()
    expect(imapClient.messageFlagsAdd).toHaveBeenCalledWith("7", ["\\Seen"])
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("hub.integration_syncs"),
      [CARRIER, JSON.stringify({ filed: 1, unmatched: 0 })]
    )
    expect(releaseMock).toHaveBeenCalled()
    expect(imapClient.logout).toHaveBeenCalled()
  })

  it("notifies office roles instead of dropping mail with no reference in the subject", async () => {
    imapClient.search.mockResolvedValue([3])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") })
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "paperwork attached" }))

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1 })
    expect(queryOneMock).not.toHaveBeenCalled()
    expect(saveDocumentMock).not.toHaveBeenCalled()
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner", "dispatcher"],
      expect.objectContaining({
        kind: "mailbox",
        body: expect.stringContaining("No load reference in the subject"),
      })
    )
    expect(imapClient.messageFlagsAdd).toHaveBeenCalledWith("3", ["\\Seen"])
  })

  it("notifies with the unmatched reference when no load matches it", async () => {
    imapClient.search.mockResolvedValue([4])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") })
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "POD THD-9999" }))
    queryOneMock.mockResolvedValue(null)

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1 })
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner", "dispatcher"],
      expect.objectContaining({ body: expect.stringContaining("No load matches THD-9999") })
    )
  })

  it("skips empty and oversized attachments, then flags the mail unmatched", async () => {
    imapClient.search.mockResolvedValue([5])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") })
    simpleParserMock.mockResolvedValue(
      parsedMessage({
        attachments: [
          { content: Buffer.alloc(0), filename: "empty.pdf" },
          { content: Buffer.alloc(15 * 1024 * 1024 + 1), filename: "huge.pdf" },
        ],
      })
    )
    queryOneMock.mockResolvedValue({ id: "load-1", reference: "THD-1042" })

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1 })
    expect(saveDocumentMock).not.toHaveBeenCalled()
    expect(addLoadEventMock).not.toHaveBeenCalled()
    expect(notifyRolesMock).toHaveBeenCalledTimes(1)
  })

  it("caps a run at 25 messages and skips fetches that return no source", async () => {
    imapClient.search.mockResolvedValue(Array.from({ length: 30 }, (_, i) => i + 1))
    imapClient.fetchOne.mockResolvedValue({})

    const result = await pollDocsMailbox(CARRIER)

    expect(imapClient.fetchOne).toHaveBeenCalledTimes(25)
    expect(imapClient.messageFlagsAdd).not.toHaveBeenCalled()
    expect(result).toEqual({ connected: true, filed: 0, unmatched: 0 })
  })

  it("still records an empty sync when the server reports no unseen mail", async () => {
    imapClient.search.mockResolvedValue(null)

    const result = await pollDocsMailbox(CARRIER)

    expect(imapClient.fetchOne).not.toHaveBeenCalled()
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("hub.integration_syncs"),
      [CARRIER, JSON.stringify({ filed: 0, unmatched: 0 })]
    )
    expect(result).toEqual({ connected: true, filed: 0, unmatched: 0 })
  })

  it("releases the mailbox lock and logs out even when the fetch loop throws", async () => {
    imapClient.search.mockRejectedValue(new Error("IMAP timeout"))

    await expect(pollDocsMailbox(CARRIER)).rejects.toThrow("IMAP timeout")
    expect(releaseMock).toHaveBeenCalled()
    expect(imapClient.logout).toHaveBeenCalled()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("swallows a failing logout instead of masking a successful run", async () => {
    imapClient.logout.mockRejectedValue(new Error("connection reset"))

    await expect(pollDocsMailbox(CARRIER)).resolves.toEqual({
      connected: true,
      filed: 0,
      unmatched: 0,
    })
  })
})

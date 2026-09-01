import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}))
vi.mock("../credentials", () => ({ getCredentials: vi.fn(async () => null) }))
vi.mock("../documents", () => ({ saveDocument: vi.fn(async () => ({})) }))
vi.mock("../loads", () => ({ addLoadEvent: vi.fn(async () => {}) }))
vi.mock("../notify", () => ({ notifyRoles: vi.fn(async () => {}) }))
vi.mock("../intake-drafts", () => ({ createIntakeDraft: vi.fn(async () => ({ id: "draft-1" })) }))
// The real extractor drives pdf.js; its own behaviour is covered in
// extract-text-server.test.ts. Here we only care what the mailbox does with
// text, a warning, or a throw.
vi.mock("../doc-intake/extract-text-server", () => ({
  extractTextFromBuffer: vi.fn(async () => ({ text: "", warning: "unreadable" })),
}))

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
import { createIntakeDraft } from "../intake-drafts"
import { extractTextFromBuffer } from "../doc-intake/extract-text-server"

const getCredentialsMock = vi.mocked(getCredentials)
const queryMock = vi.mocked(query)
const queryOneMock = vi.mocked(queryOne)
const saveDocumentMock = vi.mocked(saveDocument)
const addLoadEventMock = vi.mocked(addLoadEvent)
const notifyRolesMock = vi.mocked(notifyRoles)
const createIntakeDraftMock = vi.mocked(createIntakeDraft)
const extractTextMock = vi.mocked(extractTextFromBuffer)

/** A rate con the heuristic parser genuinely recognizes — no LLM key in CI. */
const RATE_CON_TEXT = [
  "RATE CONFIRMATION",
  "PACIFIC CREST LOGISTICS  MC# 784512",
  "Load # PCL-99120",
  "PICKUP: Kent, WA 06/12/2026",
  "DELIVERY: Fresno, CA 06/14/2026",
  "Linehaul: $3,200.00",
  "FSC: $350.00",
].join("\n")

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
    extractTextMock.mockResolvedValue({ text: "", warning: "unreadable" })
    createIntakeDraftMock.mockResolvedValue({ id: "draft-1" } as never)
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

  it("files an attachment onto the carrier-scoped matching load", async () => {
    imapClient.search.mockResolvedValue([7])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw rfc822") })
    simpleParserMock.mockResolvedValue(parsedMessage())
    queryOneMock.mockResolvedValue({ id: "load-1", reference: "THD-1042" })

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 1, unmatched: 0, drafted: 0 })
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
    // The sync ledger row belongs to the caller (cron route / sync-now action),
    // which records failures too — the adapter itself never writes one.
    expect(queryMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalled()
    expect(imapClient.logout).toHaveBeenCalled()
  })

  it("notifies office roles instead of dropping mail with no reference in the subject", async () => {
    imapClient.search.mockResolvedValue([3])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") })
    // No attachment and no rate con in the body: nothing to stage, so this is
    // still the plain "file it by hand" path.
    simpleParserMock.mockResolvedValue(
      parsedMessage({ subject: "paperwork attached", attachments: [], text: "see you Thursday" })
    )

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1, drafted: 0 })
    expect(createIntakeDraftMock).not.toHaveBeenCalled()
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
    simpleParserMock.mockResolvedValue(
      parsedMessage({ subject: "POD THD-9999", attachments: [], text: "pod attached later" })
    )
    queryOneMock.mockResolvedValue(null)

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1, drafted: 0 })
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

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1, drafted: 0 })
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
    expect(result).toEqual({ connected: true, filed: 0, unmatched: 0, drafted: 0 })
  })

  it("still reports an empty sync when the server reports no unseen mail", async () => {
    imapClient.search.mockResolvedValue(null)

    const result = await pollDocsMailbox(CARRIER)

    expect(imapClient.fetchOne).not.toHaveBeenCalled()
    expect(result).toEqual({ connected: true, filed: 0, unmatched: 0, drafted: 0 })
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
      drafted: 0,
    })
  })
})

/**
 * The regression this whole path exists for: mail that matched no load used to
 * hit `if (load)` and have its attachments DISCARDED, with a notification
 * telling the office to file it by hand from an attachment they no longer had.
 * Unmatched rate cons now become Inbox drafts instead. Nothing here creates a
 * load — that is a human tapping Accept in app/hub/_actions/intake.ts.
 */
describe("pollDocsMailbox — unmatched mail becomes an Inbox draft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCredentialsMock.mockResolvedValue(CREDS)
    imapClient.getMailboxLock.mockResolvedValue({ release: releaseMock })
    imapClient.search.mockResolvedValue([11])
    imapClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") })
    imapClient.logout.mockResolvedValue(undefined)
    queryOneMock.mockResolvedValue(null)
    saveDocumentMock.mockResolvedValue({ id: "doc-9" } as never)
    createIntakeDraftMock.mockResolvedValue({ id: "draft-1" } as never)
    extractTextMock.mockResolvedValue({ text: "", warning: "unreadable" })
  })

  it("stages a readable rate-con attachment against the carrier, not a load", async () => {
    extractTextMock.mockResolvedValue({ text: RATE_CON_TEXT })
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "New load Kent to Fresno" }))

    const result = await pollDocsMailbox(CARRIER)

    expect(result).toEqual({ connected: true, filed: 0, unmatched: 1, drafted: 1 })
    // The file is kept on the carrier because no load exists yet; accepting the
    // draft re-parents it onto the load it becomes.
    expect(saveDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: CARRIER, entityType: "carrier", entityId: CARRIER, kind: "rate_confirmation" })
    )
    expect(createIntakeDraftMock).toHaveBeenCalledTimes(1)
    const draft = createIntakeDraftMock.mock.calls[0][0]
    expect(draft).toMatchObject({
      carrierId: CARRIER,
      subject: "New load Kent to Fresno",
      fromAddress: "broker@example.com",
      documentId: "doc-9",
    })
    expect(draft.parsed.reference?.value).toBe("PCL-99120")
    expect(draft.parsed.linehaulCents?.value).toBe(320000)
    expect(draft.confidence).not.toBe("unreadable")
  })

  it("points the notification at the Inbox rather than the integrations page", async () => {
    extractTextMock.mockResolvedValue({ text: RATE_CON_TEXT })
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "New load" }))

    await pollDocsMailbox(CARRIER)

    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner", "dispatcher"],
      expect.objectContaining({ link: "/hub/inbox", title: expect.stringContaining("1 rate con") })
    )
  })

  it("keeps an unreadable scan as a draft instead of losing the attachment", async () => {
    extractTextMock.mockResolvedValue({ text: "", warning: "scanned PDF" })
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "ratecon" }))

    const result = await pollDocsMailbox(CARRIER)

    expect(result.drafted).toBe(1)
    expect(saveDocumentMock).toHaveBeenCalledTimes(1)
    expect(createIntakeDraftMock.mock.calls[0][0]).toMatchObject({ confidence: "unreadable", documentId: "doc-9" })
  })

  it("ignores signature logos and inline images so the queue stays usable", async () => {
    simpleParserMock.mockResolvedValue(
      parsedMessage({
        subject: "quick question",
        text: "what is your rate to Fresno?",
        attachments: [
          { content: Buffer.from("png"), filename: "logo.png", contentType: "image/png", related: true },
          { content: Buffer.from("png"), filename: "sig.png", contentType: "image/png" },
        ],
      })
    )

    const result = await pollDocsMailbox(CARRIER)

    expect(result.drafted).toBe(0)
    expect(extractTextMock).not.toHaveBeenCalled()
    expect(saveDocumentMock).not.toHaveBeenCalled()
    expect(createIntakeDraftMock).not.toHaveBeenCalled()
  })

  it("stages a rate con pasted into the body when there is no attachment", async () => {
    simpleParserMock.mockResolvedValue(
      parsedMessage({ subject: "load offer", attachments: [], text: RATE_CON_TEXT })
    )

    const result = await pollDocsMailbox(CARRIER)

    expect(result.drafted).toBe(1)
    // Nothing was attached, so there is no file to keep — the draft carries the
    // text itself.
    expect(saveDocumentMock).not.toHaveBeenCalled()
    expect(createIntakeDraftMock.mock.calls[0][0]).toMatchObject({ documentId: null, rawText: RATE_CON_TEXT })
  })

  it("falls back to the HTML body when a broker sends no plain-text part", async () => {
    simpleParserMock.mockResolvedValue(
      parsedMessage({
        subject: "load offer",
        attachments: [],
        text: "",
        html: `<div>${RATE_CON_TEXT.split("\n").map((l) => `<p>${l}</p>`).join("")}</div>`,
      })
    )

    expect((await pollDocsMailbox(CARRIER)).drafted).toBe(1)
  })

  it("does not stage an unmatched POD — the Inbox is a booking queue", async () => {
    extractTextMock.mockResolvedValue({ text: "PROOF OF DELIVERY  signed by J. Smith  received in good order" })
    simpleParserMock.mockResolvedValue(
      parsedMessage({
        subject: "POD attached",
        attachments: [{ content: Buffer.from("pdf"), filename: "pod.pdf", contentType: "application/pdf" }],
      })
    )

    const result = await pollDocsMailbox(CARRIER)

    expect(result.drafted).toBe(0)
    expect(saveDocumentMock).not.toHaveBeenCalled()
    expect(notifyRolesMock).toHaveBeenCalledWith(
      CARRIER,
      ["owner", "dispatcher"],
      expect.objectContaining({ link: "/hub/settings/integrations" })
    )
  })

  it("keeps polling when one attachment blows up mid-stage", async () => {
    extractTextMock.mockRejectedValueOnce(new Error("pdf.js exploded"))
    simpleParserMock.mockResolvedValue(parsedMessage({ subject: "ratecon", text: "" }))

    await expect(pollDocsMailbox(CARRIER)).resolves.toMatchObject({ connected: true, drafted: 0 })
    expect(imapClient.messageFlagsAdd).toHaveBeenCalledWith("11", ["\\Seen"])
    expect(releaseMock).toHaveBeenCalled()
  })
})

/**
 * Source guard. With no ANTHROPIC_API_KEY, analyzeDocumentEnhanced and the bare
 * analyzeDocument produce identical output, so no behavioural test can tell
 * them apart in CI — and a refactor could quietly drop the LLM pass with every
 * test still green. This reads the file instead.
 */
describe("mailbox staging uses the AI-capable analyzer", () => {
  it("calls analyzeDocumentEnhanced, not the heuristic-only analyzeDocument", async () => {
    const { readFileSync } = await import("node:fs")
    const src = readFileSync(new URL("../mailbox.ts", import.meta.url), "utf-8")
    expect(src).toContain("analyzeDocumentEnhanced")
    // analyzeDocumentEnhanced falls back to analyzeDocument internally when no
    // key is set; the mailbox must never reach for the heuristic directly.
    expect(src).not.toMatch(/import\("\.\/doc-intake\/index"\)/)
    expect(src).not.toMatch(/\banalyzeDocument\b(?!Enhanced)/)
  })
})

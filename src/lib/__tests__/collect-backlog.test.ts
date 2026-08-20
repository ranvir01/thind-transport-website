import { describe, expect, it } from "vitest"
import { extractBacklog, parseCommits, rankItem, FIELD_SEP, RECORD_SEP } from "../../../scripts/collect-backlog.mjs"

const HASH_A = "0f6739aabbccddeeff00112233445566778899aa"
const HASH_B = "7ad7e16aabbccddeeff00112233445566778899b"

function record(hash: string, subject: string, body: string) {
  return `${hash}${FIELD_SEP}${subject}${FIELD_SEP}${body}${RECORD_SEP}`
}

describe("extractBacklog", () => {
  it("collects bullet lines after a Backlog: header", () => {
    const body = "Some explanation.\n\nBacklog:\n- first item\n- second item\n"
    expect(extractBacklog(body)).toEqual(["first item", "second item"])
  })

  it("stops at the first non-bullet line (e.g. Co-authored-by trailer)", () => {
    const body = "Backlog:\n- only item\n\nCo-authored-by: Someone <x@y.z>\n"
    expect(extractBacklog(body)).toEqual(["only item"])
  })

  it("returns backlog items when the list is the very last thing in the body", () => {
    // Regression: the old regex-based parser dropped trailers that ran into
    // the ---END--- sentinel with no trailing blank line.
    const body = "Backlog:\n- tail item"
    expect(extractBacklog(body)).toEqual(["tail item"])
  })

  it("accepts * bullets and is case-insensitive on the header", () => {
    const body = "backlog:\n* star item\n"
    expect(extractBacklog(body)).toEqual(["star item"])
  })

  it("returns empty for bodies without a Backlog trailer", () => {
    expect(extractBacklog("Just a fix.\n")).toEqual([])
  })
})

describe("parseCommits", () => {
  it("parses real-shaped git log output with separators", () => {
    const raw =
      record(HASH_A, "Fix parser.", "Details here.\n\nBacklog:\n- item one\n- item two\n") +
      "\n" +
      record(HASH_B, "Other work.", "Backlog:\n- item three\n")
    const items = parseCommits(raw)
    expect(items.map((i: { text: string }) => i.text)).toEqual(["item one", "item two", "item three"])
    expect(items[0].hash).toBe(HASH_A.slice(0, 7))
    expect(items[0].subject).toBe("Fix parser.")
  })

  it("survives subjects containing --- (the collision that broke the old format)", () => {
    const raw = record(HASH_A, "Weird --- subject ---END--- style", "Backlog:\n- survives dashes\n")
    expect(parseCommits(raw).map((i: { text: string }) => i.text)).toEqual(["survives dashes"])
  })

  it("dedupes repeated items case-insensitively across commits", () => {
    const raw =
      record(HASH_A, "One.", "Backlog:\n- Same Item\n") +
      "\n" +
      record(HASH_B, "Two.", "Backlog:\n- same item\n- fresh item\n")
    expect(parseCommits(raw).map((i: { text: string }) => i.text)).toEqual(["Same Item", "fresh item"])
  })

  it("skips malformed records without throwing", () => {
    expect(parseCommits("garbage with no separators")).toEqual([])
    expect(parseCommits("")).toEqual([])
  })
})

describe("rankItem", () => {
  it("ranks production-breaking above money above workflow above polish", () => {
    const prod = rankItem("login fail on deploy")
    const money = rankItem("IFTA rates wrong by a cent")
    const flow = rankItem("dispatch board friction")
    const polish = rankItem("tweak button copy")
    expect(prod).toBeLessThan(money)
    expect(money).toBeLessThan(flow)
    expect(flow).toBeLessThan(polish)
  })

  it("does not treat a Vercel environment name as a production outage", () => {
    expect(rankItem("rotate SMTP in Vercel Production")).toBe(rankItem("tweak button copy"))
  })
})

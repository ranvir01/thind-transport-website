import { describe, expect, it } from "vitest"
import { parseBacklogItems } from "../../../scripts/collect-backlog.mjs"

describe("parseBacklogItems", () => {
  it("returns empty for a body with no Backlog: block", () => {
    expect(parseBacklogItems("Fix login spinner.\n\nDetails here.")).toEqual([])
  })

  it("parses a simple bullet list", () => {
    const body = "Subject line.\n\nBacklog:\n- first item\n- second item\n"
    expect(parseBacklogItems(body)).toEqual(["first item", "second item"])
  })

  it("joins wrapped multi-line bullets into one item", () => {
    const body = [
      "Backlog:",
      "- collect-backlog.mjs still splits wrapped multi-line bullets",
      "  into fragments — join continuation lines.",
      "- next item",
    ].join("\n")
    expect(parseBacklogItems(body)).toEqual([
      "collect-backlog.mjs still splits wrapped multi-line bullets into fragments — join continuation lines.",
      "next item",
    ])
  })

  it("joins unindented continuation lines too", () => {
    const body = "Backlog:\n- a long bullet that\nwraps without indentation\n- b\n"
    expect(parseBacklogItems(body)).toEqual(["a long bullet that wraps without indentation", "b"])
  })

  it("stops at a blank line before trailers", () => {
    const body = "Backlog:\n- only item\n\nCo-authored-by: someone <s@example.com>\n"
    expect(parseBacklogItems(body)).toEqual(["only item"])
  })

  it("stops at a trailer line even without a preceding blank line", () => {
    const body = "Backlog:\n- only item\nCo-authored-by: someone <s@example.com>\n"
    expect(parseBacklogItems(body)).toEqual(["only item"])
  })

  it("accepts indented bullets and * markers", () => {
    const body = "Backlog:\n  - indented item\n* starred item\n"
    expect(parseBacklogItems(body)).toEqual(["indented item", "starred item"])
  })

  it("keeps a bare non-bullet first line as its own item (legacy format)", () => {
    const body = "Backlog:\nsingle unbulleted item\n"
    expect(parseBacklogItems(body)).toEqual(["single unbulleted item"])
  })
})

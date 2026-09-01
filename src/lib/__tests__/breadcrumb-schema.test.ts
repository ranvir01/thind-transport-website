/**
 * BreadcrumbList structured data.
 *
 * The visual breadcrumb shipped on every page long before any structured data
 * did, so Google has been inferring the site hierarchy from URLs alone. These
 * pin the two judgement calls in the emitted schema, both of which are easy to
 * "fix" wrongly later: the category label is NOT a breadcrumb item, and the
 * final item carries no URL.
 *
 * The builder is exercised through the rendered component so the test breaks
 * if the script tag is ever dropped from the markup — testing the function in
 * isolation would keep passing while the page emitted nothing.
 */
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb"

function schemaFrom(props: Parameters<typeof PageBreadcrumb>[0]) {
  const html = renderToStaticMarkup(createElement(PageBreadcrumb, props))
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)
  if (!match) throw new Error("PageBreadcrumb emitted no JSON-LD")
  return JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"))
}

describe("PageBreadcrumb structured data", () => {
  it("emits a BreadcrumbList rooted at the homepage", () => {
    const schema = schemaFrom({ pageName: "Verify Us", category: "Company" })
    expect(schema["@context"]).toBe("https://schema.org")
    expect(schema["@type"]).toBe("BreadcrumbList")
    expect(schema.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://thindtransport.com",
    })
  })

  it("does NOT turn the category label into a breadcrumb item", () => {
    // "Company" / "Drivers" are visual groupings, not routes. Emitting them
    // with an invented URL would point Google at pages that don't exist.
    const schema = schemaFrom({ pageName: "Verify Us", category: "Company" })
    const names = schema.itemListElement.map((i: { name: string }) => i.name)
    expect(names).toEqual(["Home", "Verify Us"])
    expect(names).not.toContain("Company")
  })

  it("leaves the current page without a URL, as schema.org allows", () => {
    const schema = schemaFrom({ pageName: "Verify Us", category: "Company" })
    const last = schema.itemListElement.at(-1)
    expect(last.name).toBe("Verify Us")
    expect(last.item).toBeUndefined()
  })

  it("includes a parent page, with an absolute URL, when one is given", () => {
    const schema = schemaFrom({
      pageName: "Washington",
      category: "Drivers",
      parentPage: { name: "CDL Jobs", href: "/cdl-jobs" },
    })
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "CDL Jobs",
      item: "https://thindtransport.com/cdl-jobs",
    })
    expect(schema.itemListElement[2].position).toBe(3)
  })

  it("numbers positions consecutively from 1 in both shapes", () => {
    for (const props of [
      { pageName: "A", category: "Company" as const },
      { pageName: "B", category: "Drivers" as const, parentPage: { name: "P", href: "/p" } },
    ]) {
      const schema = schemaFrom(props)
      const positions = schema.itemListElement.map((i: { position: number }) => i.position)
      expect(positions).toEqual(positions.map((_: number, idx: number) => idx + 1))
    }
  })

  it("still renders the visible trail alongside the schema", () => {
    // The structured data is an addition, not a replacement — a screen reader
    // and a sighted user must still get the breadcrumb.
    const html = renderToStaticMarkup(
      createElement(PageBreadcrumb, { pageName: "Verify Us", category: "Company" })
    )
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain("Verify Us")
    expect(html).toContain("Company")
  })
})

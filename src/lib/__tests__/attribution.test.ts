/**
 * Lead attribution.
 *
 * Every lead used to land with `source` set to whichever form produced it,
 * which says what someone filled in and nothing about what brought them. This
 * is the piece that answers "which page or campaign produces drivers who
 * actually call back."
 *
 * Two things here are security-relevant, not just correctness: the hidden
 * field is attacker-editable, and the referrer can carry someone's search
 * query. Both have their own cases below.
 */
import { describe, expect, it } from "vitest"
import {
  describeAttribution,
  deserializeAttribution,
  isEmptyAttribution,
  parseAttribution,
  serializeAttribution,
} from "../attribution"

describe("parseAttribution", () => {
  it("pulls the five UTM parameters off the landing URL", () => {
    const a = parseAttribution(
      "https://thindtransport.com/drivers?utm_source=google&utm_medium=cpc&utm_campaign=cdl-wa&utm_term=cdl+jobs&utm_content=v2",
      null
    )
    expect(a).toMatchObject({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "cdl-wa",
      utm_term: "cdl jobs",
      utm_content: "v2",
      landing: "/drivers",
    })
  })

  it("captures ad-platform click ids", () => {
    expect(parseAttribution("https://x.test/?gclid=abc123", null).gclid).toBe("abc123")
    expect(parseAttribution("https://x.test/?fbclid=xyz789", null).fbclid).toBe("xyz789")
  })

  it("records the referring HOST, never the full referrer URL", () => {
    // A search-engine referrer can carry the query someone typed. That is
    // theirs, not ours — host only.
    const a = parseAttribution(
      "https://thindtransport.com/drivers",
      "https://www.google.com/search?q=cdl+jobs+kent+wa+family+carrier"
    )
    expect(a.referrer).toBe("www.google.com")
    expect(JSON.stringify(a)).not.toContain("cdl+jobs")
    expect(JSON.stringify(a)).not.toContain("search")
  })

  it("ignores same-host referrers — internal navigation is not a source", () => {
    const a = parseAttribution(
      "https://thindtransport.com/apply",
      "https://thindtransport.com/drivers"
    )
    expect(a.referrer).toBeUndefined()
  })

  it("survives a malformed URL or referrer instead of throwing", () => {
    expect(parseAttribution("not a url", null)).toEqual({})
    expect(() => parseAttribution("https://x.test/", "android-app://com.example")).not.toThrow()
    expect(parseAttribution("https://x.test/?utm_source=a", "garbage").utm_source).toBe("a")
  })

  it("returns nothing for a plain direct visit to the homepage", () => {
    const a = parseAttribution("https://thindtransport.com/", null)
    // Landing path alone on "/" is not attribution worth storing... but a
    // deeper landing path IS, so "/" still records the path and the caller
    // decides. Assert the shape rather than emptiness.
    expect(a.utm_source).toBeUndefined()
    expect(a.referrer).toBeUndefined()
    expect(a.landing).toBe("/")
  })

  it("trims and caps values — these reach a database and an email subject", () => {
    const long = "x".repeat(500)
    const a = parseAttribution(`https://x.test/?utm_campaign=${long}`, null)
    expect(a.utm_campaign!.length).toBe(120)
  })

  it("drops empty and whitespace-only parameters", () => {
    const a = parseAttribution("https://x.test/?utm_source=&utm_medium=%20%20", null)
    expect(a.utm_source).toBeUndefined()
    expect(a.utm_medium).toBeUndefined()
  })
})

describe("serialize / deserialize", () => {
  it("round-trips", () => {
    const a = { utm_source: "google", utm_medium: "cpc", landing: "/drivers" }
    expect(deserializeAttribution(serializeAttribution(a))).toEqual(a)
  })

  it("serializes nothing to an empty string, so direct visits store no row data", () => {
    expect(serializeAttribution({})).toBe("")
    expect(isEmptyAttribution({})).toBe(true)
  })

  it("whitelists keys — the hidden field is attacker-editable", () => {
    // A crafted payload must not be able to stuff arbitrary JSON into a JSONB
    // column that the office UI then renders.
    const hostile = JSON.stringify({
      utm_source: "google",
      __proto__: { polluted: true },
      script: "<script>alert(1)</script>",
      huge: "x".repeat(10_000),
      nested: { a: 1 },
    })
    const parsed = deserializeAttribution(hostile)
    expect(parsed).toEqual({ utm_source: "google" })
    expect(Object.keys(parsed!)).toEqual(["utm_source"])
  })

  it("rejects non-object payloads rather than storing them", () => {
    for (const bad of ["[]", '"string"', "42", "null", "not json", "", null, undefined]) {
      expect(deserializeAttribution(bad as string), String(bad)).toBeNull()
    }
  })

  it("drops non-string values inside an otherwise valid object", () => {
    expect(deserializeAttribution('{"utm_source":123,"utm_medium":"cpc"}')).toEqual({
      utm_medium: "cpc",
    })
  })

  it("returns null when nothing survives the whitelist", () => {
    expect(deserializeAttribution('{"evil":"payload"}')).toBeNull()
  })
})

describe("describeAttribution", () => {
  it("summarizes a paid campaign the way a dispatcher would read it", () => {
    expect(
      describeAttribution({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "cdl-wa",
        gclid: "abc",
        landing: "/drivers",
      })
    ).toBe("google / cpc · campaign: cdl-wa · Google Ads click · landed on /drivers")
  })

  it("falls back to the referring host when there are no UTM tags", () => {
    expect(describeAttribution({ referrer: "indeed.com", landing: "/apply" })).toBe(
      "indeed.com · landed on /apply"
    )
  })

  it("says Direct when there is a landing path but no campaign or referrer", () => {
    // Typed the address, used a bookmark, or came from an app that strips
    // referrers. Without the explicit "Direct" the board reads "landed on
    // /quote" and implies a referral that never happened.
    expect(describeAttribution({ landing: "/quote" })).toBe("Direct · landed on /quote")
  })

  it("says direct rather than nothing", () => {
    expect(describeAttribution(null)).toBe("Direct / unknown")
    expect(describeAttribution({})).toBe("Direct / unknown")
  })
})

import { describe, expect, it } from "vitest"
import {
  freeHiringChannels,
  recruitingPosts,
  recruitingShareTags,
  shareKitLinks,
  taggedApplyUrl,
  whatsAppMeUrl,
} from "@/lib/recruiting-posts"
import { COMPANY_INFO, PAY_RATES, TRUST_INDICATORS, WORKPLACE } from "@/lib/constants"

describe("recruitingPosts", () => {
  const posts = recruitingPosts()
  const blob = posts.map((p) => p.body).join("\n")

  it("ships a post for every free channel we can actually use this week", () => {
    const ids = posts.map((p) => p.id)
    expect(ids).toEqual([
      "whatsapp-card",
      "facebook-group",
      "craigslist",
      "indeed-organic",
      "worksource",
      "google-business",
      "referral-sms",
      "gurdwara-flyer",
      "radio-script",
    ])
  })

  it("pulls pay, phone, and workplace facts from constants — never literals that can drift", () => {
    expect(blob).toContain(PAY_RATES.companyDriver.local.perMile)
    expect(blob).toContain(PAY_RATES.companyDriver.local.annual)
    expect(blob).toContain(PAY_RATES.ownerOperator.commission)
    expect(blob).toContain(COMPANY_INFO.phone)
    expect(blob).toContain(String(COMPANY_INFO.dot))
    expect(blob).toContain(WORKPLACE.languages)
  })

  it("pins the published USDOT and the trust-strip badge", () => {
    expect(COMPANY_INFO.dot).toBe("2523064")
    expect(TRUST_INDICATORS.certifications.some((c) => c.name.includes(COMPANY_INFO.dot))).toBe(true)
  })

  it("does not screen by national origin or waive English proficiency", () => {
    expect(blob.toLowerCase()).not.toContain("punjabi preferred")
    expect(blob.toLowerCase()).not.toContain("punjabi required")
    expect(blob).toContain(WORKPLACE.elp)
  })

  it("keeps dollar figures out of the radio live-read (website posting carries them)", () => {
    const radio = posts.find((p) => p.id === "radio-script")!
    expect(radio.body).not.toContain(PAY_RATES.companyDriver.local.perMile)
    expect(radio.body).toContain(COMPANY_INFO.phone)
  })

  it("Facebook / Craigslist / Indeed posts include the EEO line (they are WA postings)", () => {
    for (const id of ["facebook-group", "craigslist", "indeed-organic"]) {
      const post = posts.find((p) => p.id === id)!
      expect(post.body, id).toContain(WORKPLACE.eeo)
    }
  })
})

describe("share helpers", () => {
  it("tags apply URLs so hub leads show which channel worked", () => {
    const url = taggedApplyUrl("facebook")
    expect(url).toContain("utm_source=facebook")
    expect(url).toContain("utm_campaign=driver_recruit")
    expect(url).toContain("thindtransport.com/apply")
  })

  it("builds a wa.me link on the company number without a plus", () => {
    const href = whatsAppMeUrl("hello")
    expect(href).toMatch(/^https:\/\/wa\.me\/12067656300\?text=/)
    expect(href).not.toContain("+")
  })

  it("share kit points at call, SMS, WhatsApp, and the local job listing", () => {
    const links = shareKitLinks()
    expect(links.call).toBe(`tel:${COMPANY_INFO.phoneFormatted}`)
    expect(links.sms).toContain("sms:")
    expect(links.whatsapp).toContain("wa.me/")
    expect(links.localJob).toContain("/jobs/local")
  })

  it("Facebook/WhatsApp unfurls get a pay-first card instead of the homepage OG", () => {
    const tags = recruitingShareTags({
      title: "Local company driver",
      description: `${PAY_RATES.companyDriver.local.perMile}/mile from ${COMPANY_INFO.location}`,
      path: "/jobs/local",
    })
    expect(tags.openGraph.url).toBe("https://thindtransport.com/jobs/local")
    expect(tags.openGraph.description).toContain(PAY_RATES.companyDriver.local.perMile)
    expect(tags.openGraph.images[0].url).toBe("/og-image.png")
    expect(tags.twitter.card).toBe("summary_large_image")
    expect(tags.alternates.canonical).toBe("/jobs/local")
  })
})

describe("freeHiringChannels", () => {
  it("lists the Facebook groups and WorkSource as free", () => {
    const channels = freeHiringChannels()
    expect(channels.some((c) => c.href?.includes("facebook.com/groups"))).toBe(true)
    expect(channels.some((c) => c.name.includes("WorkSource"))).toBe(true)
    expect(channels.filter((c) => c.cost === "Free").length).toBeGreaterThanOrEqual(5)
  })
})

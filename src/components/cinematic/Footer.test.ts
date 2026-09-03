import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { shouldHideMobileCommandBar } from "./Footer"

describe("shouldHideMobileCommandBar", () => {
  it("hides on the apply page", () => {
    expect(shouldHideMobileCommandBar("/apply")).toBe(true)
  })

  it("hides anywhere in the hub (own bottom navigation)", () => {
    expect(shouldHideMobileCommandBar("/hub")).toBe(true)
    expect(shouldHideMobileCommandBar("/hub/loadboard")).toBe(true)
  })

  it("hides on tracking pages", () => {
    expect(shouldHideMobileCommandBar("/track")).toBe(true)
    expect(shouldHideMobileCommandBar("/track/abc123")).toBe(true)
  })

  it("hides on the legacy driver portal (own submit buttons)", () => {
    expect(shouldHideMobileCommandBar("/driver")).toBe(true)
    expect(shouldHideMobileCommandBar("/driver/register")).toBe(true)
    expect(shouldHideMobileCommandBar("/driver/login")).toBe(true)
  })

  it("hides on pre-qualify, whose form the bar's own CTA would discard", () => {
    // The bar's only CTA is "Apply Now" -> /apply. A driver mid-way through the
    // nine-field pre-qualify form taps it and loses every answer, because the
    // form keeps its state in React and persists nothing. /apply was excluded
    // for this reason on 2026-07-22; /pre-qualify was missed.
    expect(shouldHideMobileCommandBar("/pre-qualify")).toBe(true)
  })

  it("hides on pages whose one primary action is not the driver Apply", () => {
    // A shipper on /shippers, a broker on /brokers, an owner on /loadoff and
    // someone booking on /schedule-meeting each have their own CTA; a fixed red
    // "Apply Now" competed with it (and violated one-primary-per-viewport).
    for (const path of ["/shippers", "/brokers", "/quote", "/trust", "/loadoff", "/schedule-meeting"]) {
      expect(shouldHideMobileCommandBar(path)).toBe(true)
    }
  })

  it("shows on marketing routes", () => {
    expect(shouldHideMobileCommandBar("/")).toBe(false)
    expect(shouldHideMobileCommandBar("/pay-rates")).toBe(false)
    expect(shouldHideMobileCommandBar("/benefits")).toBe(false)
  })

  it("does not treat unrelated routes with matching prefixes as excluded", () => {
    expect(shouldHideMobileCommandBar("/apply-now")).toBe(false)
    expect(shouldHideMobileCommandBar("/pre-qualify-faq")).toBe(false)
    expect(shouldHideMobileCommandBar("/shippers/faq")).toBe(false)
  })
})

describe("MobileCommandBar (source guard)", () => {
  const source = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf-8")

  it("carries two actions — Call and Apply — never a third", () => {
    expect(source).not.toMatch(/sms:/)
    expect(source).not.toContain(">Text<")
  })

  it("mounts only past the hero and never over a form the visitor is filling in", () => {
    expect(source).toContain("pastHero")
    expect(source).toContain("scrollY")
    expect(source).toContain('querySelectorAll<HTMLFormElement>("main form")')
  })
})

describe("CinematicFooter (source guard)", () => {
  const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf-8")

  it("prints the NAP from constants — name, address, phone as digits, email", () => {
    expect(footer).toContain("{COMPANY_INFO.name}")
    expect(footer).toContain("{COMPANY_INFO.address}")
    expect(footer).toContain("mailto:${COMPANY_INFO.email}")
    // The phone is readable as a number, not as a sentence.
    expect(footer).toMatch(/font-mono tabular-nums">\{COMPANY_INFO\.phone\}/)
  })

  it("backs the authority line with the public record instead of a claim", () => {
    expect(footer).toContain("FMCSA_LINKS.safer")
    expect(footer).toContain("COMPANY_INFO.dot")
    expect(footer).toContain("COMPANY_INFO.mc")
    // "Licensed & Insured" asserted cover this repo cannot evidence.
    expect(footer).not.toContain("Licensed & Insured")
  })
})

// The header Apply and the command bar's Apply are both position:fixed and
// both filled red. They used to overlap between sm and md — two reds pinned to
// the viewport at once, whatever the page below did. The breakpoints are now
// complementary, and this is the only place that can see both files at once.
describe("one fixed red Apply at any width (Navbar + command bar)", () => {
  const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf-8")
  const navbar = readFileSync(new URL("./Navbar.tsx", import.meta.url), "utf-8")

  it("hands the fixed Apply over at exactly one breakpoint", () => {
    // The bar carries its own filled red below md...
    expect(footer).toMatch(/z-\[90\][^"]*md:hidden/)
    expect(footer).toMatch(/href="\/apply"[\s\S]{0,200}bg-orange-600/)
    // ...and the header picks it up at md, never at sm.
    expect(navbar).toContain('className="hidden md:flex min-h-[48px] items-center rounded-fleet bg-orange-600')
    expect(navbar).not.toContain("hidden sm:flex min-h-[48px] items-center rounded-fleet bg-orange-600")
  })

  it("keeps the drawer's single filled red on its Apply CTA", () => {
    // The /apply row's icon tile and "Start" chip are tints, not fills; a
    // filled bg-orange-600 inside the drawer belongs to the CTA alone.
    expect(navbar).not.toContain('? "bg-orange-600 text-white"')
    expect(navbar).not.toContain("rounded-full bg-orange-600")
  })

  it("paints solid grounds — no backdrop-blur on either surface", () => {
    expect(footer).not.toContain("backdrop-blur")
    expect(navbar).not.toContain("backdrop-blur")
  })
})

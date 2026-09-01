/**
 * Recruiting copy must stay wired to constants.ts.
 *
 * Competitive pass 2026-08-26: homepage/FAQ/job dialogs had drifted to a 2016
 * founding year, an invented FMCSA "A+" rating, a $1,500 company sign-on
 * (actual is $1,000), and "full benefits package" after medical was removed.
 * Those are the exact claims a Kent driver checks against SAFER / orientation.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { driverFaqs } from "@/lib/driver-faqs"
import { COMPANY_INFO, PAY_RATES, WORKPLACE } from "@/lib/constants"

const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, rel), "utf8")

describe("driverFaqs", () => {
  const faqs = driverFaqs()
  const blob = faqs.map((f) => `${f.question}\n${f.answer}`).join("\n")

  it("uses the real founding year, not a drifted one", () => {
    expect(blob).toContain(String(COMPANY_INFO.founded))
    expect(blob).not.toMatch(/founded in 201[^4]/)
  })

  it("quotes pay from PAY_RATES rather than literals", () => {
    expect(blob).toContain(PAY_RATES.companyDriver.local.perMile)
    expect(blob).toContain(PAY_RATES.ownerOperator.commission)
    expect(blob).toContain(PAY_RATES.companyDriver.signOnBonus)
    expect(blob).toContain(PAY_RATES.ownerOperator.signOnBonus)
  })

  it("states Punjabi + English dispatch as a workplace fact, plus FMCSA ELP", () => {
    expect(blob).toContain(WORKPLACE.languages)
    expect(blob).toContain(WORKPLACE.elp)
  })

  it("does not invent an FMCSA letter grade or an industry-highest slogan", () => {
    expect(blob.toLowerCase()).not.toContain("a+ safety")
    expect(blob.toLowerCase()).not.toContain("highest commission")
    expect(blob.toLowerCase()).not.toContain("industry leading")
  })
})

describe("recruiting surfaces source facts from constants", () => {
  const hero = read("../../components/cinematic/Hero.tsx")
  const home = read("../../app/page.tsx")
  const lanes = read("../../components/home/HomeTimeLanes.tsx")
  const why = read("../../components/features/WhySwitch.tsx")
  const dialog = read("../../components/features/JobDetailsDialog.tsx")
  const veterans = read("../../app/veterans/page.tsx")
  const applyForm = read("../../components/application/ApplicationForm.tsx")
  const applyPage = read("../../app/apply/page.tsx")
  const navbar = read("../../components/cinematic/Navbar.tsx")
  const benefits = read("../../app/benefits/page.tsx")

  it("hero primary CTA is Apply Now and pay comes from PAY_RATES", () => {
    expect(hero).toContain('href="/apply"')
    expect(hero).toContain("PAY_RATES.ownerOperator.commission")
    expect(hero).toContain("PAY_RATES.companyDriver.otr.perMile")
    expect(hero).toContain("COMPANY_INFO.phoneFormatted")
    expect(hero).not.toMatch(/sms:\+1206/)
  })

  it("homepage lane cards and contact links are constants-backed", () => {
    expect(home).toContain("HomeTimeLanes")
    expect(home).toContain("tel:${COMPANY_INFO.phoneFormatted}")
    expect(home).toContain("mailto:${COMPANY_INFO.email}")
    expect(lanes).toContain("/apply?type=company&lane=local")
    expect(lanes).toContain("PAY_RATES.companyDriver.local.perMile")
  })

  it("homepage routes cards no longer mix invented OTR ranges", () => {
    const routes = read("../../components/home/RoutesSection.tsx")
    expect(routes).toContain("PAY_RATES.companyDriver.local")
    expect(routes).toContain("LOCAL.annual")
    expect(routes).toContain("OTR.annual")
    expect(routes).toContain("OO.annualGross")
    expect(routes).not.toContain("$65K-$280K")
    expect(routes).not.toContain("$180K-$280K")
    expect(routes).not.toContain("$0.55-$0.60")
  })

  it("WhySwitch names Punjabi + English dispatch vs a mega-carrier call center", () => {
    expect(why).toContain("mega-carrier call center")
    expect(why).toContain("90% of gross")
  })

  it("job details dialog and veterans page source sign-on from PAY_RATES", () => {
    expect(dialog).toContain("PAY_RATES.companyDriver")
    expect(dialog).toContain("PAY_RATES.companyDriver.signOnBonus")
    expect(dialog).not.toContain("$1,500")
    expect(dialog).not.toContain("$55K-$72K")
    expect(dialog).not.toContain("$180K-$280K")
    expect(veterans).toContain("PAY_RATES.companyDriver.signOnBonus")
    expect(veterans).not.toContain("$1,500")
  })

  it("apply form honors ?type= and ?lane= deep links", () => {
    expect(applyForm).toContain("applyPrefFromSearch")
    expect(applyForm).toContain('"local"')
    expect(applyForm).toContain("PAY_RATES.ownerOperator.commission")
    expect(applyForm).not.toContain("90% Gross")
    expect(applyPage).toContain("buildCompanyDriverJobPosting")
    expect(applyPage).toContain("buildOwnerOperatorJobPosting")
    expect(applyPage).toContain("WORKPLACE.eeo")
    expect(applyPage).toContain("BENEFITS.companyDriver")
  })

  it("ticker, nav, benefits, and pay-breakdown source pay from PAY_RATES", () => {
    expect(navbar).toContain("PAY_RATES.ownerOperator.commission")
    expect(navbar).not.toContain("Full package")
    expect(benefits).toContain("PAY_RATES.companyDriver.otr.perMile")
    expect(benefits).toContain("PAY_RATES.ownerOperator.commission")
  })
})

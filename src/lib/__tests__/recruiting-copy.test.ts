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
  const ticker = read("../../components/cinematic/Ticker.tsx")
  const navbar = read("../../components/cinematic/Navbar.tsx")
  const benefits = read("../../app/benefits/page.tsx")
  const payBreakdown = read("../../app/pay-breakdown/page.tsx")

  it("hero primary CTA is Apply Now and pay comes from PAY_RATES", () => {
    expect(hero).toContain('href="/apply"')
    expect(hero).toContain("Apply Now")
    expect(hero).toContain("PAY_RATES.ownerOperator.commission")
    expect(hero).toContain("PAY_RATES.companyDriver.local.perMile")
    expect(hero).toContain("COMPANY_INFO.phoneFormatted")
    expect(hero).toContain('href="/pay-rates"')
    expect(hero).not.toContain("TrendingUp")
    expect(hero).not.toMatch(/sms:\+1206/)
  })

  it("homepage lane cards and contact links are constants-backed", () => {
    expect(home).toContain("HomeTimeLanes")
    expect(home).toContain("tel:${COMPANY_INFO.phoneFormatted}")
    expect(lanes).toContain("/apply?type=company&lane=local")
    expect(lanes).toContain("const LOCAL = PAY_RATES.companyDriver.local")
    expect(lanes).toContain("LOCAL.perMile")
  })

  it("homepage says each message once — no duplicate lanes, qualify, or CTA band", () => {
    // Constraints-first rework (docs/design/home-rework-2026-08.md): the page
    // had TWO Local/Regional/OTR sections, THREE application entry points, and
    // a mid-page band with its own orange CTA. Ratchet: they stay removed.
    expect(home).toContain("HomeTimeLanes")
    expect(home).not.toContain("RoutesSection")
    expect(home).not.toContain("QuickQualify")
    expect(home).not.toContain("DispatchBand")
    expect(home).not.toContain("mailto:")
    // One PhotoBand (fleet proof), not a second one introducing a dead section.
    expect(home.match(/<PhotoBand/g)).toHaveLength(1)
  })

  it("the one pay representation is the static PayTable, sourced from PAY_RATES", () => {
    // Constraint 12 (docs/design/home-rework-2026-08.md): the interactive
    // calculators are gone — two of the three shipped invented figures.
    // Every earnings link points at /pay-rates, which holds the table.
    const payTable = read("../../components/features/PayTable.tsx")
    const payRates = read("../../app/pay-rates/page.tsx")
    const drivers = read("../../app/drivers/page.tsx")
    expect(payTable).toContain("PAY_RATES")
    expect(payTable).not.toContain("useState")
    expect(payRates).toContain("PayTable")
    expect(drivers).toContain("PayTable")
    expect(home).not.toContain("Calculator")
    expect(why).toContain('href="/pay-rates"')
    expect(why).not.toContain("#calculator")
  })

  it("WhySwitch names Punjabi + English dispatch vs a mega-carrier call center", () => {
    expect(why).toContain("Punjabi and English")
    expect(why).toContain("PAY_RATES.ownerOperator.commission")
  })

  it("job details dialog and veterans page source sign-on from PAY_RATES", () => {
    expect(dialog).toContain("PAY_RATES.companyDriver")
    expect(dialog).toContain("cd.signOnBonus")
    expect(dialog).toContain("BENEFITS.companyDriver")
    expect(dialog).not.toContain("$1,500")
    expect(dialog).not.toContain("$55K-$72K")
    expect(dialog).not.toContain("$180K-$280K")
    expect(veterans).toContain("const CD = PAY_RATES.companyDriver")
    expect(veterans).toContain("CD.signOnBonus")
    expect(veterans).toContain("CD.otr.perMile")
    expect(veterans).toContain("OO.commission")
    expect(veterans).toContain("STATS.statesCovered")
    expect(veterans).not.toContain("$1,500")
  })

  it("apply form honors ?type= and ?lane= deep links", () => {
    // URL prefs merge in apply-draft (pre-qualify handoff + ?type=&lane=).
    const applyDraft = read("../../components/application/apply-draft.ts")
    expect(applyForm).toContain("applyValuesFromDraftAndSearch")
    expect(applyDraft).toContain("applyPrefFromSearch")
    expect(applyForm).toContain('"local"')
    expect(applyForm).toContain("PAY_RATES.ownerOperator.commission")
    expect(applyForm).not.toContain("90% Gross")
    expect(applyPage).toContain("buildCompanyDriverJobPosting")
    expect(applyPage).toContain("buildOwnerOperatorJobPosting")
    expect(applyPage).toContain("WORKPLACE.eeo")
    expect(applyPage).toContain("BENEFITS.companyDriver")
  })

  it("ticker, nav, benefits, and pay-breakdown source pay from PAY_RATES", () => {
    expect(ticker).toContain("PAY_RATES.ownerOperator.commission")
    expect(ticker).toContain("PAY_RATES.companyDriver.local.perMile")
    expect(ticker).toContain("COMPANY_INFO.location")
    expect(navbar).toContain("PAY_RATES.ownerOperator.commission")
    expect(navbar).not.toContain("Full package")
    expect(benefits).toContain("const CD = PAY_RATES.companyDriver")
    expect(benefits).toContain("CD.otr.perMile")
    expect(benefits).toContain("OO.commission")
    expect(payBreakdown).toContain("PAY_RATES.ownerOperator.commission")
  })

  it("driver-cluster leftover pages share AsphaltHero and drop invented stats", () => {
    // Constraint 14–19 (docs/design/shell-rework-2026-08.md): one asphalt
    // shell, no photo heroes, no second lane grid, no invented fuel/industry
    // numbers, JobDetailsDialog on signal tokens.
    const oo = read("../../app/owner-operators/page.tsx")
    const routes = read("../../app/routes/page.tsx")
    const contact = read("../../app/contact/page.tsx")
    const cdl = read("../../app/cdl-jobs/page.tsx")
    const cdlState = read("../../app/cdl-jobs/[state]/page.tsx")
    const about = read("../../app/about/page.tsx")
    const fuel = read("../../app/fuel-program/page.tsx")
    const payRates = read("../../app/pay-rates/page.tsx")
    const drivers = read("../../app/drivers/page.tsx")
    const hero = read("../../components/shared/AsphaltHero.tsx")
    for (const src of [oo, benefits, veterans, routes, contact, cdl, cdlState, payBreakdown, about, fuel, payRates, drivers]) {
      expect(src).toContain("AsphaltHero")
      expect(src).not.toContain("PageHero")
      expect(src).not.toContain("50¢")
      expect(src).not.toContain("15,000")
      expect(src).not.toContain("70-85%")
    }
    expect(hero).toContain('primary = "apply"')
    expect(hero).toContain("or call")
    expect(benefits).not.toContain("CountUp")
    expect(benefits).not.toContain("comparisonData")
    expect(benefits).toContain("BENEFITS.companyDriver")
    expect(benefits).toContain("NOT_YET")
    expect(routes).toContain("HomeTimeLanes")
    expect(routes).not.toContain("routeTypes")
    expect(fuel).not.toContain("Save Big")
    expect(fuel).toContain("FuelSavingsCalculator")
    expect(dialog).not.toContain("blue-600")
    expect(dialog).not.toContain("green-500")
    expect(dialog).not.toContain("purple-600")
    expect(dialog).toContain("bg-signal")
    expect(contact).toContain('primary="call"')
  })

  it("freight leftover pages share AsphaltHero and drop photo/CountUp chrome", () => {
    // Constraints 20–24 (docs/design/freight-shell-rework-2026-08.md).
    const shippers = read("../../app/shippers/page.tsx")
    const quote = read("../../app/quote/page.tsx")
    const trust = read("../../app/trust/page.tsx")
    const estimator = read("../../components/features/LaneTransitEstimator.tsx")
    const form = read("../../components/features/ShipperQuoteForm.tsx")
    for (const src of [shippers, quote, trust]) {
      expect(src).toContain("AsphaltHero")
      expect(src).not.toContain("PageHero")
      expect(src).not.toContain("#060607")
      expect(src).not.toContain("slate-50")
    }
    expect(shippers).toContain('applyHref="#quote"')
    expect(shippers).not.toContain("CountUp")
    expect(shippers).not.toContain("truck-night-highway")
    expect(quote).toContain('primary="call"')
    expect(quote).toContain("omitApply")
    expect(quote).toContain("QuoteFormWithLane")
    expect(trust).toContain('const PACKET_HREF = "/api/carrier-packet"')
    expect(trust).toContain("applyHref={PACKET_HREF}")
    expect(trust).toContain("getAuthoritySnapshot")
    expect(estimator).toContain("bg-signal")
    expect(estimator).not.toContain("orange-600")
    expect(form).toContain("bg-signal")
    expect(form).not.toContain("from-orange-500")
  })

  it("loadoff shares AsphaltHero, keeps videos, and does not soft-nav into /hub", () => {
    // Constraints 25–29 (docs/design/product-shell-rework-2026-08.md).
    const loadoff = read("../../app/loadoff/page.tsx")
    const hero = read("../../components/shared/AsphaltHero.tsx")
    expect(loadoff).toContain("AsphaltHero")
    expect(loadoff).toContain('applyHref="/hub"')
    expect(loadoff).toContain('preload="none"')
    expect(loadoff).toContain("/images/loadoff/today.png")
    expect(loadoff).not.toContain("PageHero")
    expect(loadoff).not.toContain("slate-50")
    expect(loadoff).not.toContain("indigo-")
    expect(loadoff).not.toContain('<Link href="/hub')
    expect(loadoff).toContain('href="/hub"')
    expect(hero).toContain('href.startsWith("/hub")')
  })

  it("jobs listings and the share kit are wired for free-channel hiring", () => {
    const jobs = read("../../app/jobs/page.tsx")
    const jobSlug = read("../../app/jobs/[slug]/page.tsx")
    const refer = read("../../app/refer/page.tsx")
    const apply = read("../../app/apply/page.tsx")
    const ctas = read("../../components/shared/RecruitingCtas.tsx")
    expect(jobs).toContain("/refer")
    expect(jobs).toContain("RecruitingCtas")
    expect(jobs).toContain("taggedApplyPath")
    expect(jobs).toContain("recruitingShareTags")
    expect(jobSlug).toContain("buildJobListingPosting")
    expect(jobSlug).toContain("RecruitingCtas")
    expect(jobSlug).toContain("messagePrefill")
    expect(jobSlug).toContain("recruitingShareTags")
    expect(refer).toContain("recruitingPosts")
    expect(refer).toContain("RecruitingCtas")
    expect(refer).toContain("primary=\"call\"")
    expect(refer).toContain("QrCode")
    expect(refer).toContain("recruitingShareTags")
    expect(apply).toContain("recruitingShareTags")
    expect(apply).toContain("Start Your Application")
    expect(apply).not.toContain("Not Ready Yet")
    expect(apply).not.toContain("Application Notes")
    expect(apply).not.toContain("RelatedLinks")
    expect(jobs).not.toContain("Google, Indeed")
    expect(jobs).not.toContain("RelatedLinks")
    expect(jobSlug).not.toContain("RelatedLinks")
    expect(ctas).toContain("Apply now")
    expect(ctas).toContain("smsMeUrl")
    expect(ctas).toContain("whatsAppMeUrl")
    expect(ctas).not.toContain("Text us")
  })
})

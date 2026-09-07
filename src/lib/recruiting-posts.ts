/**
 * Paste-ready recruiting copy for channels that actually hire CDL drivers
 * in the Kent Punjabi-American pool — without buying Indeed clicks.
 *
 * English masters only. Punjabi is never machine-translated (repo rule);
 * a family translator takes these strings, not a model. Every wage figure
 * comes from constants.ts so a rate change updates Facebook, WhatsApp,
 * Craigslist, the gurdwara flyer, and Google Jobs together.
 *
 * Short-form posts still carry the WA EPOA wage scale + benefits summary
 * because a Facebook group post that lists qualifications is a "posting"
 * under RCW 49.58.110.
 */
import {
  BENEFITS,
  COMPANY_INFO,
  PAY_RATES,
  STATS,
  WORKPLACE,
} from "@/lib/constants"
import { SITE_ORIGIN, jobListingUrl } from "@/lib/job-posting"

export function taggedApplyUrl(source: string, path = "/apply"): string {
  const u = new URL(path, SITE_ORIGIN)
  u.searchParams.set("utm_source", source)
  u.searchParams.set("utm_medium", "organic")
  u.searchParams.set("utm_campaign", "driver_recruit")
  return u.toString()
}

/** Same as taggedApplyUrl but a site-relative path for <Link href>. */
export function taggedApplyPath(source: string, path = "/apply"): string {
  const u = new URL(taggedApplyUrl(source, path))
  return `${u.pathname}${u.search}`
}

export function whatsAppMeUrl(prefill: string): string {
  const digits = COMPANY_INFO.phoneFormatted.replace(/\D/g, "")
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefill)}`
}

export function smsMeUrl(prefill: string): string {
  return `sms:${COMPANY_INFO.phoneFormatted}?body=${encodeURIComponent(prefill)}`
}

/**
 * Facebook groups and WhatsApp unfurl `/jobs` and `/refer`. Without
 * page-level OG they inherit the homepage card — pay and Kent never show.
 * Reuse `/og-image.png` (layout already ships it; do not add a new asset).
 */
export function recruitingShareTags(opts: {
  title: string
  description: string
  path: string
}) {
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`
  const url = `${SITE_ORIGIN}${path}`
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: path },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      type: "website" as const,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${COMPANY_INFO.name} — ${COMPANY_INFO.location}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: opts.title,
      description: opts.description,
      images: ["/og-image.png"],
    },
  }
}

const cd = PAY_RATES.companyDriver
const oo = PAY_RATES.ownerOperator

function companyWageBlock(): string {
  return [
    `Pay (same ${cd.local.perMile}/mile on every lane):`,
    `• Local (home ${cd.local.homeTime.toLowerCase()}): ${cd.local.annual}/year`,
    `• Regional (home ${cd.regional.homeTime.toLowerCase()}): ${cd.regional.annual}/year`,
    `• OTR (${cd.otr.homeTime} out): ${cd.otr.annual}/year`,
    `Sign-on: ${cd.signOnBonus}`,
  ].join("\n")
}

function benefitsLine(): string {
  return `Benefits & other compensation: ${BENEFITS.companyDriver.join(" · ")}.`
}

function eeoBlock(): string {
  return `${WORKPLACE.languages}\n${WORKPLACE.elp}\n${WORKPLACE.eeo}`
}

function identityLine(): string {
  return `${COMPANY_INFO.name} — family-owned since ${COMPANY_INFO.founded}, ${COMPANY_INFO.location}. USDOT ${COMPANY_INFO.dot} · MC ${COMPANY_INFO.mc} · ${STATS.trucksInFleet} trucks · ${STATS.statesCovered} states.`
}

export type RecruitingPost = {
  id: string
  title: string
  channel: string
  cost: string
  how: string
  body: string
}

export function recruitingPosts(): RecruitingPost[] {
  const facebookUrl = taggedApplyUrl("facebook")
  const whatsappUrl = taggedApplyUrl("whatsapp")
  const craigslistUrl = taggedApplyUrl("craigslist")
  const indeedUrl = taggedApplyUrl("indeed")
  const worksourceUrl = taggedApplyUrl("worksource")
  const gbpUrl = taggedApplyUrl("google_business")
  const referUrl = taggedApplyUrl("driver_refer")
  const call = COMPANY_INFO.phone

  const driverInbound = `Hi, I'm a CDL driver interested in ${COMPANY_INFO.name}.`

  return [
    {
      id: "whatsapp-card",
      title: "WhatsApp / text job card",
      channel: "Current drivers' chats — the #1 hire source in this community",
      cost: "Free",
      how: "Text this to our 15 drivers Monday. Ask them to forward it. Do not blast cold numbers (TCPA).",
      body: [
        `${COMPANY_INFO.location} — ${COMPANY_INFO.name} is hiring (family company, since ${COMPANY_INFO.founded}).`,
        `Company drivers: local / regional / OTR — ${cd.local.perMile}/mile, ${cd.local.annual} to ${cd.otr.annual}/year + ${cd.signOnBonus}. Weekly pay.`,
        `Owner-operators: ${oo.commission} of gross, ${oo.fuelSurcharge} FSC, no forced dispatch.`,
        `${WORKPLACE.languages} USDOT ${COMPANY_INFO.dot}.`,
        `Call/text ${call} · ${whatsappUrl}`,
      ].join("\n"),
    },
    {
      id: "facebook-group",
      title: "Facebook group post",
      channel: "PUNJABI TRUCKERS + owner/driver groups — post as yourself, not a page",
      cost: "Free",
      how: "Join as Sukhdev / a current driver. Paste once. Answer comments. Re-post at most weekly.",
      body: [
        `CDL-A Company Driver + Owner Operator | ${COMPANY_INFO.name} — ${COMPANY_INFO.location}`,
        identityLine(),
        "",
        companyWageBlock(),
        benefitsLine(),
        "",
        `Owner-operators: keep ${oo.commission} of gross, ${oo.fuelSurcharge} fuel surcharge pass-through, typical ${oo.annualGross}/year at ${oo.perMile}/mile — your revenue depends on the miles you choose. Sign-on ${oo.signOnBonus}. No forced dispatch.`,
        "",
        `Requirements: valid CDL-A · ${PAY_RATES.requirements.companyDriver} (company) / ${PAY_RATES.requirements.otr} (OTR / lease-on).`,
        eeoBlock(),
        "",
        `Apply: ${facebookUrl}`,
        `Call/text ${call}`,
      ].join("\n"),
    },
    {
      id: "craigslist",
      title: "Craigslist Seattle (transportation)",
      channel: "seattle.craigslist.org — local drivers still check it",
      cost: "$10–$75 / 30 days (metro fee at checkout — not free, cheapest board)",
      how: "Post in transportation jobs. Full wage scale is required. Link the apply URL, don't dump the form in the ad.",
      body: [
        `CDL-A Company Driver (Local / Regional / OTR) and Owner Operator — ${COMPANY_INFO.name}, ${COMPANY_INFO.location}`,
        "",
        identityLine(),
        "",
        companyWageBlock(),
        benefitsLine(),
        "",
        `Owner-operators keep ${oo.commission} of gross with ${oo.fuelSurcharge} fuel surcharge pass-through. Typical gross ${oo.annualGross}/year. Sign-on ${oo.signOnBonus}. Terms match the written lease (49 CFR 376).`,
        "",
        `Requirements: Valid CDL Class A. ${PAY_RATES.requirements.companyDriver}. ${WORKPLACE.elp}`,
        eeoBlock(),
        "",
        `Apply: ${craigslistUrl}`,
        `Call/text ${call}`,
      ].join("\n"),
    },
    {
      id: "indeed-organic",
      title: "Indeed free / organic post",
      channel: "Indeed.com employer — one unpaid post, plus Google Jobs scrape",
      cost: "Free if you skip Sponsored ($25/day minimum if you turn that on)",
      how: `Create an Indeed employer account with USDOT ${COMPANY_INFO.dot}. Paste this. Sponsored is optional later.`,
      body: [
        `CDL-A Company Driver — Local, Regional & OTR | ${COMPANY_INFO.name} — ${COMPANY_INFO.location}`,
        identityLine(),
        "",
        companyWageBlock(),
        benefitsLine(),
        "",
        `Owner-operator seats: ${oo.commission} of gross, ${oo.fuelSurcharge} FSC, no forced dispatch, ${oo.signOnBonus} sign-on. Typical ${oo.annualGross}/year.`,
        "",
        `Requirements: Valid CDL-A. ${PAY_RATES.requirements.companyDriver}. ${WORKPLACE.elp}`,
        eeoBlock(),
        "",
        `Apply on our site (fastest): ${indeedUrl}`,
        `Or call/text ${call}`,
      ].join("\n"),
    },
    {
      id: "worksource",
      title: "WorkSource WA (state job bank)",
      channel: "worksourcewa.com — free employer postings for Washington jobs",
      cost: "Free",
      how: "Employer account at WorkSource WA / ESD. This is the general-audience channel that keeps Punjabi-group posts from being the only placement.",
      body: [
        `CDL-A truck driver, ${COMPANY_INFO.location}. Local (home daily), regional (home weekly), or OTR.`,
        companyWageBlock(),
        benefitsLine(),
        eeoBlock(),
        `Apply: ${worksourceUrl} · ${call}`,
      ].join("\n"),
    },
    {
      id: "google-business",
      title: "Google Business Profile post",
      channel: "Google Maps listing for Thind Transport — people already searching the name",
      cost: "Free",
      how: "Google Business Profile → Posts → What's New. 100–300 words. Add a button to the apply URL.",
      body: [
        `We're hiring CDL-A company drivers and owner-operators out of ${COMPANY_INFO.location}.`,
        `Company: ${cd.local.perMile}/mile, home daily / weekly / OTR. Owner-operators keep ${oo.commission} of gross.`,
        `Family-run since ${COMPANY_INFO.founded}. Dispatch that answers — Punjabi and English.`,
        `Apply: ${gbpUrl} or call ${call}.`,
      ].join("\n"),
    },
    {
      id: "referral-sms",
      title: "Ask our drivers to refer (SMS they can forward)",
      channel: "The 15 people already on the team",
      cost: "Free (+ referral bonus on hire, already in BENEFITS)",
      how: "Send this from the company phone to each current driver. One message, not a group blast if they didn't opt in together.",
      body: [
        `It's ${COMPANY_INFO.owner}. We're hiring. If you know a solid CDL-A who wants home time or a ${oo.commission} lease-on, send them this:`,
        `${referUrl}`,
        `Or have them call me ${call}. Referral bonus is in the pay plan.`,
      ].join("\n"),
    },
    {
      id: "gurdwara-flyer",
      title: "Gurdwara flyer (English master)",
      channel: "Renton GSSWA + Kent 132nd Ave SE — ask the committee first, never pin unasked",
      cost: "~$20 printing. Postcard, English this side; Punjabi only after family translation.",
      how: "Sunday around langar. Business talk in the lobby, not the darbar hall. This is a legal 'posting' — wage scale stays on the card.",
      body: [
        `${COMPANY_INFO.name} is hiring CDL-A drivers`,
        `${COMPANY_INFO.location} · since ${COMPANY_INFO.founded} · USDOT ${COMPANY_INFO.dot}`,
        "",
        `Company ${cd.local.perMile}/mi · home daily, weekly, or OTR`,
        `${cd.local.annual} – ${cd.otr.annual}/year · ${cd.signOnBonus}`,
        `Owner-operators ${oo.commission} of gross · ${oo.fuelSurcharge} FSC`,
        "",
        WORKPLACE.languages,
        `Call/text ${call}`,
        SITE_ORIGIN.replace("https://", ""),
      ].join("\n"),
    },
    {
      id: "radio-script",
      title: "Radio Punjab live-read (English master)",
      channel: "KNTS 1680 / KKDZ 1250 / KZIZ 1560 — studio (206) 497-1313, Kent office",
      cost: "Quote (expect low-hundreds/week). Call before spending. Not free.",
      how: "Ask for a host live-read. Script names no dollar figures — the website posting carries them (WA EPOA + FTC).",
      body: [
        `Drivers — ${COMPANY_INFO.name} in Kent is a family trucking company, on the road since ${COMPANY_INFO.founded}, running flatbed, reefer, and dry van in all ${STATS.statesCovered} states.`,
        `Company driver and owner-operator seats open now. Real rates, weekly pay, no forced dispatch — hear every number before you sign, in Punjabi or English.`,
        `Call ${COMPANY_INFO.name}: ${call}. Or visit thindtransport.com. Full pay details in the online posting.`,
      ].join(" "),
    },
  ]
}

export type FreeChannel = {
  name: string
  cost: string
  href?: string
  note: string
}

export function freeHiringChannels(): FreeChannel[] {
  return [
    {
      name: "Google for Jobs",
      cost: "Free",
      href: `${SITE_ORIGIN}/jobs/local`,
      note: "Already on the site as JobPosting schema. Search 'CDL jobs Kent WA' in a week or two after deploy. No ad spend.",
    },
    {
      name: "This share kit",
      cost: "Free",
      href: `${SITE_ORIGIN}/refer`,
      note: "QR + copy buttons. Current drivers forward the WhatsApp card; that is how this community actually hires.",
    },
    {
      name: "PUNJABI TRUCKERS (Facebook)",
      cost: "Free",
      href: "https://www.facebook.com/groups/881824038533844/",
      note: "Join as a named human. Paste the Facebook post. Answer in-thread.",
    },
    {
      name: "Punjabi Truck Owner/Driver North America",
      cost: "Free",
      href: "https://www.facebook.com/groups/2147717885362017/",
      note: "Owner-operator mix. Use the same Facebook post.",
    },
    {
      name: "Desi Truckers of North America",
      cost: "Free",
      href: "https://www.facebook.com/groups/desitruckers/",
      note: "Broader South Asian trucking. Same post, once a week max.",
    },
    {
      name: "WorkSource WA",
      cost: "Free",
      href: "https://www.worksourcewa.com/",
      note: "State job bank. General-audience placement next to the Punjabi groups (EEOC).",
    },
    {
      name: "Google Business Profile",
      cost: "Free",
      href: "https://business.google.com/",
      note: "A Maps post with the apply button. People already looking you up.",
    },
    {
      name: "Gurudwara Singh Sabha of Washington (Renton)",
      cost: "Print only",
      href: "https://www.gsswa.org/",
      note: "5200 Talbot Rd S, Renton. Ask the office before posting a flyer.",
    },
    {
      name: "Radio Punjab / Desh Punjab Radio (Kent)",
      cost: "Quote",
      href: "tel:+12064971313",
      note: "26461 104th Ave SE, Kent. Studio (206) 497-1313. Highest-trust broadcast if the quote fits — not week-1 required.",
    },
    {
      name: "NAPTA / Punjabi Trucking 360",
      cost: "Fleet dues ~$10 + $5/truck",
      href: "https://gonapta.org/",
      note: "(877) 622-1313. Association network + the weekly Punjabi trucking show. Optional week-1.",
    },
  ]
}

export function inboundDriverPrefill(): string {
  return `Hi, I'm a CDL driver interested in driving for ${COMPANY_INFO.name}.`
}

export function shareKitLinks() {
  const prefill = inboundDriverPrefill()
  return {
    apply: taggedApplyUrl("refer_page"),
    localJob: jobListingUrl("local"),
    ownerJob: jobListingUrl("owner-operator"),
    call: `tel:${COMPANY_INFO.phoneFormatted}`,
    sms: smsMeUrl(prefill),
    whatsapp: whatsAppMeUrl(prefill),
  }
}

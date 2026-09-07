import { COMPANY_INFO, EQUIPMENT, FMCSA_LINKS, PAY_RATES, STATS, WORKPLACE } from "@/lib/constants"

/**
 * Homepage / default driver FAQ. Every figure traces to constants.ts so this
 * cannot drift from /pay-rates the way the previous hardcoded copy did
 * (founded 2016 vs 2014, invented FMCSA "A+" rating, "$0.63" literals).
 */
export function driverFaqs() {
  const cd = PAY_RATES.companyDriver
  const oo = PAY_RATES.ownerOperator
  const years = new Date().getFullYear() - COMPANY_INFO.founded

  return [
    {
      question: "What are the experience requirements?",
      answer: `Owner-operators: ${PAY_RATES.requirements.otr} and a valid CDL Class A. Company drivers: ${PAY_RATES.requirements.companyDriver} and a valid CDL Class A. ${WORKPLACE.elp} No SAP drivers, no DUI in the past 5 years, no felony convictions.`,
    },
    {
      question: "How much can I realistically earn?",
      answer: `Company drivers run ${cd.local.perMile}/mile on every lane: local ${cd.local.annual}/year (${cd.local.homeTime} home), regional ${cd.regional.annual}/year (${cd.regional.homeTime} home), OTR ${cd.otr.annual}/year (${cd.otr.homeTime} out), plus ${cd.signOnBonus} sign-on. Owner-operators keep ${oo.commission} of gross — typical ${oo.annualGross}/year at ${oo.perMile}/mile, plus ${oo.signOnBonus} sign-on. Pay is weekly direct deposit. Your miles decide where you land in the range.`,
    },
    {
      question: `What's the ${oo.commission} commission for owner-operators?`,
      answer: `You keep ${oo.commission} of the gross revenue from each load. Fuel surcharge passes through ${oo.fuelSurcharge}. There are no hidden fees or surprise deductions — the weekly settlement shows every line. Same percentage on accessorials (detention, layover, TONU).`,
    },
    {
      question: `How does the ${oo.commission} commission work exactly?`,
      answer: `If a load pays $3,000 gross, you receive $2,700 (${oo.commission}). We take 10% for dispatch, insurance, and back-office. Fuel surcharge: you get ${oo.fuelSurcharge}. Accessorials: ${oo.commission} to you. The written lease states the same split — we'll walk it line by line before you sign.`,
    },
    {
      question: "What are the sign-on bonuses?",
      answer: `Company drivers: ${cd.signOnBonus}, paid during the first year. Owner-operators: ${oo.signOnBonus}. Ask for the payment schedule on the phone so it's in writing before you start.`,
    },
    {
      question: "What types of freight do you haul?",
      answer:
        "Flatbed (building materials, steel, machinery), reefer (temperature-controlled food and pharmaceutical), and dry van (general freight and retail). You can choose what fits your experience and equipment. No hazmat required.",
    },
    {
      question: "What's the average length of haul?",
      answer:
        "Typically 800–1,200 miles depending on the lane you take. We have shorter regional runs and longer cross-country work. Dedicated lanes exist when they're open — call dispatch for what's available this week rather than a promise we can't keep.",
    },
    {
      question: "Do you have dedicated lanes?",
      answer:
        "Some, and they change with the season. Dedicated work means a consistent route and predictable weeks, so it goes fast. Call dispatch and ask what's open right now — we'll tell you straight rather than promise something that isn't there.",
    },
    {
      question: "Where do your loads come from?",
      answer:
        "A mix: DAT and Truckstop.com load boards, brokers we've hauled for repeatedly, and direct shipper freight we book ourselves. Owner-operators can see what's available and choose — no forced dispatch, so you're never made to take a load that doesn't pay.",
    },
    {
      question: "What about home time?",
      answer: `Local: home ${cd.local.homeTime.toLowerCase()}. Regional: home ${cd.regional.homeTime.toLowerCase()}. OTR: ${cd.otr.homeTime} out. Tell us the home time you need and we build freight around it. Same ${cd.local.perMile}/mile on every lane, so picking local is not a pay cut.`,
    },
    {
      question: "Is there forced dispatch?",
      answer:
        "No forced dispatch for owner-operators. You see the load, the rate, and the lane before you accept it. Company drivers: we work with you on scheduling and route preferences — no surprise coast-to-coast runs.",
    },
    {
      question: "Do company drivers get benefits?",
      answer: `What we offer today: ${cd.signOnBonus} sign-on; weekly direct deposit; performance and referral bonuses; home time you pick (local, regional, or OTR at the same ${cd.local.perMile}/mile); ${EQUIPMENT.short}; 24/7 dispatch. Riders and pets are decided case by case — ask us. We do not currently offer company medical, dental, vision, life or disability insurance, PTO, holiday pay, or a 401(k) — we'd rather tell you now than at orientation.`,
    },
    {
      question: "What fuel programs are available for owner-operators?",
      answer: `Fuel-card discounts at major chains, IFTA reporting help, and ${oo.fuelSurcharge} of the fuel surcharge passed through. We help you pick cheaper fuel stops; we do not mark the card up.`,
    },
    {
      question: "Do you offer maintenance discounts?",
      answer:
        "Owner-operators get preferred pricing at partner service centers for tires, oil, brakes, and larger work. Roadside connections are available 24/7. Ask dispatch for the current shop list — it changes.",
    },
    {
      question: "How quickly can I start?",
      answer: `Most qualified drivers start within 1–2 weeks: phone interview (often same day), application review (1–2 days), background check and drug screen (3–5 days), then a one-day orientation in ${COMPANY_INFO.location} or virtual. Timeline depends on how fast records come back — we don't invent a guaranteed start date.`,
    },
    {
      question: "Do you hire nationwide?",
      answer: `Yes. We hire CDL Class A drivers from all ${STATS.statesCovered} contiguous states. Home yard is ${COMPANY_INFO.location}; freight runs the lower 48. Orientation can be virtual.`,
    },
    {
      question: "What if I don't have my own truck yet?",
      answer: `Start as a company driver at ${cd.local.perMile}/mile. Many of our owner-operators started that way. We don't run a lease-purchase program — those often trap drivers. When you're ready to buy a truck, we'll talk through the lease-on terms with real numbers.`,
    },
    {
      question: "What equipment do company drivers use?",
      answer: `Company drivers operate our ${EQUIPMENT.modelYears} ${EQUIPMENT.makes} — APU, refrigerator, inverter, and a premium sleeper. Automatic transmission available. Company trucks come with a compliant ELD already installed.`,
    },
    {
      question: "What are the truck requirements for owner-operators?",
      answer:
        "2015 or newer, in good mechanical condition. All makes welcome. ELD required (we can help you set one up). Must pass a DOT inspection. Older trucks considered case-by-case if they're well maintained.",
    },
    {
      question: "What's your safety record?",
      answer: `Don't take our word for it — look us up. USDOT ${COMPANY_INFO.dot}, MC-${COMPANY_INFO.mc} on FMCSA SAFER (${FMCSA_LINKS.safer}). We don't publish a letter grade we didn't earn from FMCSA.`,
    },
    {
      question: "What is FMCSA Motus and does it change Thind Transport's authority?",
      answer: `FMCSA is modernizing carrier registration with Motus, replacing the legacy Unified Registration System (URS) and FMCSA Portal. Thind Transport LLC remains a federally registered motor carrier (USDOT ${COMPANY_INFO.dot}, MC-${COMPANY_INFO.mc}). Existing operating authority and safety records stay valid. Individual drivers do not register in Motus — the motor carrier does. Official details: ${FMCSA_LINKS.motusInfo}`,
    },
    {
      question: "What ELD do you use?",
      answer:
        "Company trucks come pre-equipped. Owner-operators can use their own FMCSA-compliant ELD. We work with Motive (KeepTruckin), Samsara, and others. Training is part of orientation.",
    },
    {
      question: "How long has Thind Transport been in business?",
      answer: `${COMPANY_INFO.name} was founded in ${COMPANY_INFO.founded} in ${COMPANY_INFO.location}. The owner, ${COMPANY_INFO.owner}, has ${COMPANY_INFO.ownerExperience} years in trucking. ${years} years, ${STATS.trucksInFleet} trucks — family-run, not a call center. When you call ${COMPANY_INFO.phone}, you reach dispatch.`,
    },
    {
      question: "Do you dispatch in Punjabi?",
      answer: `${WORKPLACE.languages} Interviews work the same way. ${WORKPLACE.elp}`,
    },
    {
      question: "Why should I choose Thind over a bigger carrier?",
      answer: `Mega-carriers run call centers and forced dispatch. Here you get ${oo.commission} of gross (or ${cd.local.perMile}/mile company), no forced dispatch, weekly pay, ${EQUIPMENT.short}, and a dispatcher who knows your name. ${WORKPLACE.languages} Verify us on SAFER before you apply.`,
    },
  ]
}

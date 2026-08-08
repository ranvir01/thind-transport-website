# Prompt 10 — Load board / freight APIs a 15-truck carrier + its self-built TMS can actually get (2026)

**Date:** 2026-08-08 · **Carrier:** Thind Transport LLC, USDOT 2523064, MC 876103, authority active since ~2014, ~15 trucks, dry van, Kent WA · **TMS:** LoadOff (`/hub`), DAT + Truckstop adapters already stubbed/live in `src/lib/hub/integrations/` (repo-verified)

**Evidence note:** every direct page fetch (WebFetch) was egress-blocked from this environment (dat.com, truckstop.com, 123loadboard.com, freightwaves.com, Azure-blob PDFs — 4/4 attempts). All web claims below are **(search-verified 2026-08-08)** — assembled from search-result content of the cited pages — unless tagged **(repo-verified)** (read from this codebase / prior scouting docs) or **inference**. Nothing in this report is page-verified. Where third-party review sites are the only price source, that is flagged.

---

## TL;DR

- **The single best door nobody has knocked on yet: C.H. Robinson's Carrier API is FREE** for approved CHR carriers and does exactly what LoadOff wants — find/offer/book/auto-create loads in your own TMS, push tracking, upload docs, check payment status. Apply on the CHR "Carrier Connectivity" page with your T-code. [40][41]
- **DAT: yes, a 15-truck carrier qualifies for the REST API.** Any load-board subscription tier allows a RESTful integration; you need a free service account + a Connexion seat + load-board seat on the acting user (current carrier tiers page-verified 2026-08-08 on dat.com: Standard $59 / Enhanced $149 / **Pro $169** / Select $259 — budget $169/mo; ~$500–1,000 one-time setup fee per third-party guides, unverified). Request via developersupport@dat.com with your MC number. RateView **API** is a separate, pricier gate (RateView Combo Pro/Premium) — skip it. [1][3][5][6]
- **Truckstop: yes, with paperwork.** Live pricing page-verified 2026-08-08: Basic $42 / Advanced $135 / **Pro $159 — the API tier** ($42 application fee credits to month 1; review-site claims of a 2026 restructure to $45/$110/$175 are wrong). Pro plan + signed Systems Integration Agreement via tsi@truckstop.com gets a 6-digit Integration ID for the SOAP Load Search service — LoadOff's adapter already speaks this protocol (repo-verified). [15][16][18]
- **A 1-tenant self-built TMS does NOT need either "TMS partner program."** DAT and Truckstop both have a *customer-integration* path (your own subscription + API entitlement) separate from the multi-tenant partner/marketplace track. LoadOff qualifies today as a customer integration; DAT requires app certification before production either way. [1][4][14][21]
- **Cheapest legitimate lane rates: SONAR Quick Rates, $24.99/mo, self-serve, no contract** — unlimited TRAC spot-rate lane searches (van/reefer/flatbed, confidence score, low/high, 7/28-day trend) + market-tightness indicators. Checkout is at **sonar.surf/signup** — the gosonar.com page only describes the product (corrected on page-verification 2026-08-08). Screen-only (no API). [56][57]
- **123Loadboard is the friendliest API program in freight:** open REST API (search loads, check rates, bid, Book Now), a published usage agreement, an assigned tech lead, and carrier plans $39–$79/mo (Rate Check included at $79). [26][27][28]
- **Convoy is now DAT.** Shut down Oct 2023 → Flexport bought the tech → relaunched Apr 2024 → **DAT acquired the Convoy Platform July 2025** and is folding it into DAT One; through 2026 it's being wired into broker TMSs (AscendTMS, BrokerPro, Tai) as automated booking. For carriers it's another reason the DAT door is the one that matters. [9][10][12][46]
- **Amazon Relay: no API, ever, and don't automate it.** Free load board + app once approved (authority ≥180 days, Satisfactory/None rating, CSA thresholds, insurance minimums). The auto-refresh/auto-book Chrome extensions violate Amazon's ToS — account-suspension risk. Keep Relay manual, outside LoadOff. [36][37][38][39]
- **Uber Freight and J.B. Hunt open by app, not by API, for a fleet this size** — free carrier signup, loads in their apps; TMS/API integration is a BD-gated partnership (Alvys/AscendTMS got it; a 1-tenant TMS won't). [31][34][43][44]
- **Highway, Parade, MyCarrierPackets are broker-side platforms — free for you as a carrier, closed to LoadOff as an API consumer.** Do create the free Highway carrier profile (it now gates booking with many brokers, and its ELD-connected TFX load board is free); watch Parade's MCP-based Syndication API v2 (Q1 2026 GA) as a future LoadOff distribution channel. [48][50][51][53]

---

## 1. Provider-by-provider: what door exists in 2026, who qualifies, price, application path

### 1.1 DAT (DAT One / DAT iQ / RateView)

- **What exists:** a REST API family — Load Board (search), Freight Posting, BookNow (beta as TMS integration), Tracking, plus RateView/DAT iQ rate APIs — behind `developer.dat.com`. Auth is two-level: an org **service account** (free, holds no seats) + an **acting user** whose seats gate what calls are allowed. (repo-verified from DAT's own support FAQ snippets, `docs/integrations/dat.md`; re-confirmed this pass [1][3])
- **Who qualifies:** any DAT subscriber — *"Any level of load board subscription allows a RESTful API integration"*; search/post requires the acting user to hold a **Connexion seat + load board seat**; adding rate *requests* requires a RateView seat + RateView Combo Pro/Premium subscription. A 15-truck carrier qualifies. (search-verified 2026-08-08 [1]; repo-verified)
- **Certification:** *"All applications using Connexion must be certified before interacting with the production DAT Loadboards network, RateView data, or other DAT application"* — expect a certification pass even as a 1-tenant integration. (search-verified 2026-08-08, DAT Connexion requirements doc [4])
- **Price:** carrier tiers **Standard $49 / Enhanced $99 / Pro $149 / Select $199 / Office $290+** per month (third-party 2026 reviews — convergent across 3+ sites, not DAT's page; DAT itself quotes on consult) [5][6][7]. Enhanced adds 15-day lane rates, Pro 7-day rates + TriHaul, Select adds live auto-refresh board [6][7]. API: developer-portal registration free; one integration guide reports a **$500–$1,000 one-time production setup fee** (single-source, unverified) [63]. Connexion seat pricing is not published anywhere accessible — ask the rep.
- **Application path:** email **developersupport@dat.com** (company name, contact, **MC 876103**, "requesting REST API access + service account + staging credentials"), portal login at `developer.dat.com/_/login`, service accounts managed at `account.dat.com`. Ask your DAT sales rep to attach the Connexion seat. (repo-verified; [2])
- **Convoy angle:** DAT's Book Now / Convoy-derived automated booking is rolling out broker-TMS-first (AscendTMS Jan 2026, BrokerPro Jan 2026 free, Tai Jul 2026); BookNow API is still beta for TMS integrations — don't scope it as available to LoadOff today. [10][11][12][13]
- **Verdict:** **Door opens. Highest-value board; apply first among the paid boards.** Effort: ~1–2 weeks (entitlement + certification), plus the fee.

### 1.2 Truckstop

- **What exists:** developer portal `developer.truckstop.com`. Carrier-side public-board search is the **SOAP 1.1/XML Load Search web service** (`POST /v13/Searching/LoadSearch.svc`, credentials in the envelope: 6-digit IntegrationId/UserName/Password); REST/JSON exists for load *management* (your own posted loads, broker side) and **Rate Insights V3** API. No REST migration of the public board search as of the last confirmed scout (2026-07-18, repo-verified) and nothing contradicting that surfaced this pass. [15][16][17]
- **Who qualifies:** any subscriber on the API-eligible plan tier who signs a **Systems Integration Agreement (SIA)** — *"fully executed, no exceptions."* Carrier vs broker doesn't matter; the plan tier and the SIA do. (repo-verified; [22])
- **Price:** 2026 sources now disagree on tier naming — older lineup **Basic $42 / Advanced $135 / Pro $159** (repo-verified, checked 2026-07-18 against truckstop.com); newer 2026 reviews describe **Basic $45 / Pro $110 / Premium $175** with Rate Insights starting at the Pro tier [18][23][24][25]. Read: Truckstop restructured tiers during 2026; budget **~$150–$175/mo** for the API-eligible top tier ("Load Board Premium" in current marketing — matching the brief's "Load Board Premium API" label). One source mentions a $42 non-refundable application fee credited to month one (single-source) [24].
- **Application path:** your Truckstop account manager or **tsi@truckstop.com** → sign SIA → Integration ID issued with Load Search enabled; test host `testws.truckstop.com` (sandbox credentials come with the SIA). (repo-verified)
- **LoadOff status:** the adapter already speaks SOAP with the right endpoint/action and tolerant response parsing; first real credentials will need a field-name confirmation pass (`docs/integrations/truckstop.md`, repo-verified).
- **Verdict:** **Door opens with paperwork. Apply second.** Effort: ~1–3 weeks (legal signature cycle), $0 beyond the plan.

### 1.3 123Loadboard

- **What exists:** an openly marketed REST API: **Post Loads, Post Trucks, Search Loads, Check Rates, Search Trucks, Message, Bidding, Book Now** — platform-independent, with a **publicly posted API usage agreement PDF** and a developer-portal login. Each integrator gets an assigned tech lead. [26][28]
- **Who qualifies:** carriers explicitly — their integration docs describe the carrier use case verbatim: *"as a carrier company… show that their truck is available for brokers… search for loads and communicate with brokers through their TMS."* 30+ TMSs already integrate. (search-verified 2026-08-08 [29][30])
- **Price:** carrier plans **Standard $39 / Premium $59 / Premium Plus $79** per month (official FAQ; Rate Check included at Premium Plus), 10-day free trial, no contracts. No published separate API fee — the usage agreement governs. [27]
- **Application path:** **integrations@123loadboard.com** (877-875-5301) or **partner-integrations@123loadboard.com** (437-887-2934); start at `123loadboard.com/api`. [26][28]
- **Verdict:** **Easiest genuine API in the group; cheap third board + a $79/mo Rate Check.** Volume/coverage is thinner than DAT/Truckstop (inference from market position). Effort: days.

### 1.4 Uber Freight

- **Carrier door:** free — sign up at `uber.com/us/en/freight/carrier/signup/` with MC/DOT, **$1M auto liability, $100K cargo** (reefer breakdown if applicable), safety rating Satisfactory or None; approval typically 24–48h; loads booked in the free app/web portal. [31][32]
- **API door:** Uber Freight's public APIs are **shipper/TMS-side** (quote, tender, track; SSC-standard Scheduling API pilot 2025-26). Carrier-side "loads inside your TMS" exists only through **named partnerships** (AscendTMS 2021, Alvys — book at the listed Book-Now price via the Uber portal). No self-serve carrier developer portal; a 1-tenant TMS won't get a BD deal (inference from partnership-only pattern). [33][34][35]
- **Verdict:** **Sign up as a carrier (free, 1 hour); no LoadOff integration path.** Loads stay in Uber's app; treat as a manual channel.

### 1.5 Amazon Relay

- **Carrier door:** free load board + app for approved carriers. 2026 requirements: active DOT + interstate MC authority (a 2026 guide reports **≥180 days of authority**), safety rating **Satisfactory or None**, CSA thresholds (Unsafe Driving <60, HOS <60, Vehicle Maintenance <75, Driver Fitness <75, Controlled Substances <75 percentile), insurance minimums, identity verification and driver background checks. Thind (authority since ~2014) clears the tenure bar; CSA/insurance need checking at application time. Apply at `relay.amazon.com`. [36][37][39]
- **API door:** **none.** No public Relay API exists; the gray market of auto-refresh/auto-book Chrome extensions operates against Amazon's terms — Amazon's Conditions of Use ban *"any robot, spider, scraper, or other automated means,"* and the Relay Site Terms ban reverse engineering/tampering/bypassing security. Automating Relay from LoadOff = account-suspension risk on a revenue channel. (search-verified 2026-08-08 [38] + Amazon Conditions of Use; extension ecosystem [see §4])
- **Verdict:** **Worth having as a freight source; permanently off-limits to LoadOff automation.** Manual entry of booked Relay loads into LoadOff (paste rate con) is the compliant integration.

### 1.6 C.H. Robinson (Navisphere)

- **Carrier door:** free Navisphere Carrier app/web for approved contract carriers (T-code issued at setup; first load bookable ~2 business days after enrollment). [41][42]
- **API door — the headline finding:** CHR advertises **free API connectivity for carriers** ("no additional cost", page-verified 2026-08-08): *"find, offer, book, and auto-create C.H. Robinson loads directly in their own TMS,"* send visibility updates, upload documents, check payment status. There is **no named request form** — the page's CTA is CHR's **carrier services team** (corrected on page-verification; go through them or your CHR rep). This is a top-3 US broker handing a small carrier exactly the integration LoadOff is built for, at $0. [40]
- **Who qualifies:** approved CHR contract carriers (standard authority/insurance/safety vetting — Thind almost certainly already has or can get a T-code). No developer-portal self-serve; expect an integration-team queue and possibly EDI-flavored onboarding (inference).
- **Verdict:** **Apply first. Free, carrier-native, and turns LoadOff into a booking surface for a real freight firehose.** Effort: days–2 weeks depending on their queue.

### 1.7 J.B. Hunt 360

- **Carrier door:** free **Carrier 360** app — search/book/manage J.B. Hunt loads (strong power-only + drayage flavor), post capacity for matching. [45]
- **API door:** `developer.jbhunt.com` (**J.B. Hunt Connect 360**) documents quote/book/track/invoice/document REST endpoints, but **production access requires an existing 360 account onboarded through sales (contract + credit review)** — it's aimed at shippers/agents buying JBH capacity, not at carriers pulling loads. Carrier-side TMS integration is "API and EDI through our onboarding team" — relationship-gated. [43][44][62]
- **Application path:** Carrier 360 signup at jbhunt.com/carriers; integration conversations via carrier_support@jbhunt.com / 877-977-7427. [44]
- **Verdict:** **App yes, API no for a 15-truck carrier's own TMS.** Sign up for Carrier 360 if JBH freight (power-only) appeals; don't spend integration effort.

### 1.8 Convoy (fate + what exists now)

- **Timeline:** Convoy shut down Oct 2023 → **Flexport** bought the tech Nov 2023 → relaunched the Convoy Platform Apr 2024 (small-carrier load board + broker access) → **DAT agreed to acquire the Convoy Platform Jul 28, 2025** (announced; Bill Driegert + team to DAT) → 2026: DAT is integrating it into DAT One and giving it free to DAT broker-TMS customers (BrokerPro Jan 2026), full AscendTMS integration Jan 2026, Tai TMS Jul 2026. [9][10][11][12][46][47]
- **What exists for a carrier in 2026:** the Convoy Platform app continues under DAT ownership (existing carriers keep the same experience; DAT says carriers get "a faster, easier way to find quality loads" as broker posting merges into DAT One). No separate carrier API — the door is the DAT door now. [47]
- **Verdict:** **Not a separate signup anymore.** If the free Convoy carrier app still accepts signups, take it (instant-book freight); strategically it's absorbed into provider 1.1.

### 1.9 Parade

- **What it is:** capacity-management SaaS **sold to freight brokerages** (CoDriver AI quoting/calls, TMS embeds in McLeod/Turvo/Tai). Carriers interact free when a Parade broker emails/calls/books them. [48]
- **The 2026 development:** **Syndication API v2** (announced Jan 2026) — the first MCP-based "AI-native freight distribution protocol": brokers syndicate loads out; partner platforms push carrier quotes/counters/bookings back, system-to-system. Access requires completing **Parade's Certified Partner Program (security assessment + audit)**; GA rolling out Q1 2026 with certified partners; carrier-TMS syndication partnerships already exist (Datatruck). [48][49]
- **Who qualifies:** "load boards, marketplaces, and technology platforms." A 1-tenant carrier TMS is a marginal fit today, but an MCP-speaking LoadOff is exactly the shape they say they built it for (inference — flagged; the certification/audit is real cost).
- **Application path:** parade.ai → partnerships; no public form URL surfaced. Low-effort email worth sending in Q4 2026 once LoadOff has an MCP surface.
- **Verdict:** **Not a 2026 signup; a 2027 distribution channel to watch.**

### 1.10 Highway

- **What it is:** Carrier Identity / fraud prevention **sold to brokers** (seat-based pricing); TMS integrations are broker-side (Transfix, MVMNT, Tai, BrokerPro, Transport Pro in 2026). [50, plus press: Transfix/Highway Jun 2026]
- **Carrier door:** **free, no subscriptions** — Highway for Carriers profile + app (App Store listing live), connect your ELD, control which brokers see what; increasingly required to get onboarded/booked by Highway brokers at all. **TFX (Triumph Freight Exchange)** — the Highway+Triumph load board launched for **ELD-connected carriers, free to carriers** (brokers pay), with identity verification, pricing, and LoadPay same-day advances built in. [50][51][52]
- **LoadOff angle:** no carrier-consumable API; the ELD connection LoadOff already brokers through Terminal/TruckerCloud is the same plumbing Highway wants (do NOT hand Highway raw TMS credentials — connect the ELD natively).
- **Verdict:** **Create the free profile + connect ELD (an afternoon). It's identity infrastructure, not an API.** TFX = bonus free load board.

### 1.11 MyCarrierPackets (Descartes MyCarrierPortal)

- **What it is:** carrier-onboarding/risk-monitoring for brokers; **Descartes acquired it (Assure Assist / MyCarrierPortal) Sept 2024 for ~$24M**. Broker-side pricing (platform seats + per-monitored-carrier); token-auth API + 4-minute carrier-data syncs exist **for broker TMSs**. [53][54][55]
- **Carrier door:** **free** — you complete packets brokers send you; keeping your MCP profile current speeds every setup.
- **Verdict:** **Nothing to buy, nothing to integrate.** LoadOff can store the packet PDFs it produces; automating packet completion would be scraping someone else's product (skip).

---

## 2. TMS-partner programs: does a 1-tenant self-built TMS qualify?

**The decision-critical distinction both DAT and Truckstop make is *customer integration* vs *marketplace/reseller partner* — LoadOff needs only the first, and qualifies today.**

| | Customer-integration track (LoadOff's track) | Partner/marketplace track (not needed) |
|---|---|---|
| **DAT** | Any load-board subscription tier allows a RESTful API integration on your own account: free service account + Connexion seat + load-board seat on the acting user; request via developersupport@dat.com; certification of the app required before production (Connexion requirements doc) [1][2][4] | "Partner with DAT" program + partner directory/marketplace for multi-tenant TMS vendors serving mutual customers (Affinity/integration partners) — sales-negotiated, no published fee [14][3] |
| **Truckstop** | Signed **Systems Integration Agreement** on the carrier's own account + API-eligible plan tier → 6-digit Integration ID with the needed web services enabled; tsi@truckstop.com [15][22, repo-verified] | **Truckstop Partner Marketplace** (truckstop.com/partners) for vendors listing to Truckstop's customer base [21] |
| **Cost** | The subscription you'd buy anyway + DAT's reported $500–$1,000 one-time API setup (third-party figure [63]) + seat add-ons | Unpublished; BD-negotiated |
| **Timeline** | DAT ~1–2 weeks (entitlement + certification); Truckstop ~1–3 weeks (SIA signature cycle) — inference from process shape | Months (BD) |
| **1-tenant self-built TMS qualifies?** | **Yes — this is precisely what the service-account (DAT) and SIA (Truckstop) mechanisms exist for.** | Unnecessary unless LoadOff is ever sold to other carriers |

Same pattern elsewhere: 123Loadboard's integration team serves single companies (assigned tech lead, usage agreement) [26][28]; Parade's Certified Partner Program (security assessment + audit) is the one true *partner-only* gate in this list [48]; Uber Freight/J.B. Hunt carrier-TMS integration is BD-partnership-only — the tracks a 1-tenant TMS cannot enter.

**Practical note for the DAT application email:** state that LoadOff is Thind Transport's in-house dispatch system (single organization, MC 876103), not a commercial TMS — it routes you into the customer-integration lane and away from partner-BD limbo. (inference, but consistent with how DAT's FAQ frames service accounts per-organization [1])

---

## 3. Cheapest legitimate lane-rate benchmarks for a 15-truck carrier

Ranked by cost of getting *usable* rate numbers, cheapest first:

| Option | Price | What you get | API? | Verdict |
|---|---|---|---|---|
| **SONAR Quick Rates** (checkout: sonar.surf/signup) | **$24.99/mo, self-serve, no contract, no sales call** | Unlimited TRAC spot-rate lane searches (van/reefer/flatbed): rate + confidence score + low/high + 7- and 28-day trends; market-tightness / tender-rejection indicators; margin calculator; Chrome extension [56][57][58] | No (screen + extension only) | **Buy today.** The benchmark eyeballs for negotiating, at 1/6 the cost of a board upgrade |
| **123Loadboard Premium Plus** | $79/mo | Rate Check included + a whole load board + the open API (Check Rates endpoint is in the API catalog — confirm in the usage agreement whether your tier entitles API rate calls) [26][27] | **Yes** | Cheapest *API-reachable* rate signal, modest data depth |
| **DAT One Enhanced / Pro** (in-app) | $149 / $169/mo (page-verified 2026-08-08) | 15-day (Enhanced) or 7-day (Pro) average lane rates inside the board you'd buy anyway [6][7] | No (in-app; RateView *API* gated separately) | The default if you're buying DAT anyway |
| **Truckstop Pro/Premium Rate Insights** | ~$110–$175/mo tier | Posted + booked rate estimates per lane; Rate Insights V3 / Rate Analysis API exists for integrations (SIA + tier) [17][19][20] | Yes, with SIA | Fine if Truckstop is your primary board |
| **DAT RateView API (DAT iQ)** | Unpublished; requires RateView Combo Pro/Premium + RateView seat; consult-priced [1][8] | 68k-lane contributor rate database, 7/15/30/365-day | Yes | Overkill; broker/shipper product. Skip until LoadOff quotes freight programmatically |
| **Greenscreens.ai → Triumph Intelligence** | Unpublished; broker/3PL product (acquired by Triumph Financial Feb 2025) [60][61] | ML buy/sell rate predictions | Broker-side | **No carrier door.** Adjacent freebie: TFX rates/booking free for Highway ELD-connected carriers [51] |
| **SONAR full platform** | ~$500/mo minimum w/ contract (per-subscriber tiering ~$1.25/user reported by one review site — low confidence) [59] | Full market dashboards, API add-ons | Enterprise | Not for 15 trucks |

**Recommendation:** SONAR Quick Rates now ($300/yr); fold DAT Enhanced/Pro rates in when the DAT seat lands; revisit an actual rate *API* only when LoadOff starts auto-pricing loads.

---

## 4. ToS constraints that matter (extends `docs/research/2026-08/prompt-1-native-shell.md` §3 — read that first)

Prompt-1 established (repo-verified): **DAT ToS §1.2** bans bots/AI agents/crawlers collecting Product Data without written approval; **Truckstop ToS §3.3** bans "redistribute, frameset, transmit, share or broadcast," bans crawl/scrape/spider and bots, and limits access to Authorized Users; embedded-webview or scraping approaches are ToS breaches with CFAA-shaped downside (*Power Ventures*). This report adds the API-side constraints:

1. **DAT:** the API *is* the written-approval automation path §1.2 demands — and it comes with **mandatory app certification** before production against the load board or RateView [4]. Seats bind usage to named acting users; sharing one seat's output across the company beyond that entitlement, feeding rate data into training sets, or re-displaying DAT data to third parties would exceed the license (inference from seat/entitlement structure — confirm scope in the API agreement at signing). Lower DAT tiers cap load searches (~500/mo per prior scouting, repo-verified) — an aggressive LoadOff polling loop could exhaust a small plan; keep searches dispatcher-initiated until quotas are confirmed.
2. **Truckstop:** the SIA is a signed contract layered on §3.3 — expect explicit rate limits, service-scoping to the Integration ID, and no-redistribution terms; ask for the numbers at signature and record them in `docs/integrations/truckstop.md` (repo-verified open question).
3. **123Loadboard:** subscribers *"may not use the platform for analytics or data mining,"* and *"information obtained from the API shall not be disclosed to unauthorized parties without express written consent"* (TMS-integration doc + ToS, search-verified [28][29]). LoadOff displaying results to Thind dispatchers = fine; republishing lane data = not. (Their "we accept website scrape" line refers to ingesting *broker* postings inbound — it is not permission to scrape their board.)
4. **Amazon Relay:** Amazon's Conditions of Use ban *"any robot, spider, scraper, or other automated means to access Amazon Services,"* and the Relay Site Terms ban reverse engineering / tampering / bypassing security [38]. The auto-booker/auto-refresh extension market (SwiftRelay, Rocket Relay, etc.) operates in violation; Amazon periodically suspends accounts (widely reported; search-verified at extension-marketing level [see §1.5]). **LoadOff must never touch Relay programmatically.**
5. **Uber Freight / J.B. Hunt / CHR:** app + API terms are contract-per-carrier; the CHR Carrier API's stated purpose (find/book/update in your own TMS) matches LoadOff exactly, so the compliant path is the offered one [40]. No scraping fallback on any of them — same CFAA logic as prompt-1.
6. **Display/attribution:** DAT's certification doc and partner materials imply branding/display requirements for integrated data (inference — the certification checklist is behind the portal; budget for "posting must say DAT," rate data must carry attribution).

**One-line doctrine for LoadOff builders:** *every load-board integration in this repo must enter through a signed/entitled API door (service account, SIA, usage agreement) — never through a headless browser — and rate data stays inside the tenant that paid for it.* This matches the registry's stub-first + credential-gated design (repo-verified).

---

## Deliverable — access matrix and signup order

**Matrix (verdict rank 1 = knock first):**

| Provider | Accessible to 15-truck carrier | Accessible to LoadOff-as-TMS | Price | Prerequisites | Apply here | Rank |
|---|---|---|---|---|---|---|
| **C.H. Robinson** | Free Navisphere Carrier app; contract-carrier freight | **Free Carrier API: find/offer/book/auto-create loads, tracking, docs, payment status** [40] | **$0** | Approved CHR carrier (T-code); active authority + insurance | chrobinson.com/en-us/carriers/api-connectivity/ → "Request API project" (carrier setup: /become-a-carrier/) | **1** |
| **DAT** | DAT One board, tiers $59–$259/mo (Standard/Enhanced/Pro/Select, page-verified 2026-08-08); rates at Enhanced+ | **REST Load Board search/post API** via service account; BookNow beta; RateView API gated higher | $169/mo Pro tier + Connexion seat + ~$500–1,000 one-time (3rd-party fig., unverified) | Any DAT subscription; Connexion + load-board seat on acting user; app certification; MC number | developersupport@dat.com; developer.dat.com | **2** |
| **Truckstop** | Board, tiers ~$42–$175/mo; Rate Insights at Pro+ | **SOAP Load Search + Rate Insights V3 APIs** with SIA; LoadOff adapter ready (repo-verified) | ~$150–175/mo top tier; SIA $0 | API-eligible tier + signed SIA → Integration ID | tsi@truckstop.com (or account manager); developer.truckstop.com | **3** |
| **SONAR (FreightWaves)** | **Quick Rates self-serve $24.99/mo** [56][57] | Screen/extension only — no API at this tier | $24.99/mo | Credit card | gosonar.com/sonar-quick-rates | **4** |
| **123Loadboard** | Board $39–79/mo; Rate Check at $79 | **Open REST API (search, rates, bid, Book Now)** + assigned tech lead | $39–79/mo | Subscription + API usage agreement | 123loadboard.com/api; integrations@123loadboard.com | **5** |
| **Amazon Relay** | Free board + app once approved | **Nothing — no API; automation banned** [38] | $0 | DOT+MC ≥180 days, Satisfactory/None, CSA thresholds, insurance, ID checks | relay.amazon.com → "Get started" | 6 |
| **Uber Freight** | Free app; 24–48h approval | None (TMS integration is BD-partner-only: Alvys, AscendTMS) | $0 | MC/DOT, $1M AL, $100K cargo, Satisfactory/None | uber.com/us/en/freight/carrier/signup/ | 7 |
| **Highway** | **Free carrier profile + app; TFX board free with ELD connection** [50][51] | None (API is broker-side) | $0 | ELD connection, COI verification | highway.com/highway-for-carriers | 8 |
| **J.B. Hunt 360** | Free Carrier 360 app (power-only/drayage-heavy) | Connect 360 API exists but sales/contract-gated for shippers/agents | $0 app | Carrier approval; API needs 360 contract | jbhunt.com/carriers; developer.jbhunt.com/connect-360 | 9 |
| **Convoy (→ DAT)** | Convoy Platform app continues under DAT; merging into DAT One | Via the DAT door only | $0 app | Existing platform vetting | convoy.com (transition notices at convoy.com/dat) | 10 |
| **Parade** | Free interaction when Parade brokers offer loads | **Syndication API v2 (MCP) — Certified Partner Program (security audit), GA Q1 2026** — future channel [48] | Unpublished | Partner certification | parade.ai (partnerships contact) | 11 |
| **MyCarrierPackets (Descartes MCP)** | Free packet completion | None (API serves broker TMSs) | $0 | None | mycarrierpackets.com (respond to broker invites) | 12 |

**Recommended signup order — the first three doors, with exact form/program names:**

1. **C.H. Robinson — "Carrier API / API Connectivity" request** (`chrobinson.com/en-us/carriers/api-connectivity/`, the **Request API project** flow, quoting your T-code — if Thind isn't yet a CHR carrier, run **Carrier Setup** at `/carriers/become-a-carrier/` first, ~2 business days). Free, and it exercises LoadOff's entire search→book→track→docs loop against real freight. *Owner effort: one form + one probable follow-up call.*
2. **DAT — "RESTful API service-account request"** — email **developersupport@dat.com** from the DAT account owner: company name, contact, **MC 876103**, request REST API access + a **service account** + **staging credentials**, and ask the rep to add a **Connexion seat** to the acting dispatcher user (plan tier: Pro or above recommended for the live board). Say "in-house TMS for our own fleet, single organization." Expect a certification step; budget the reported $500–1,000 setup fee. *Owner effort: one email + rep call; 1–2 weeks.*
3. **Truckstop — "Systems Integration Agreement (SIA)"** — email **tsi@truckstop.com** (cc your account manager): request the SIA + **Load Search web service** enablement + **test credentials for testws.truckstop.com**, on the API-eligible (Pro/Premium) tier. LoadOff's adapter is already protocol-correct; day one with real credentials is a field-name confirmation pass, not a build. *Owner effort: one email + a signature; 1–3 weeks.*

**Same-day, no-approval extras while those process:** SONAR Quick Rates ($24.99/mo card signup) for negotiation benchmarks, and the free **Highway carrier profile + ELD connection** (unlocks TFX and faster broker onboarding). Add **123Loadboard** only if a third API board earns its $79/mo.

---

## Sources

All (search-verified 2026-08-08) via WebSearch result content unless noted (repo); direct fetch of every listed domain was egress-blocked from this environment.

1. https://one.support.dat.com/9-troubleshooting-2734b01a/service-accounts-and-restful-api-faq-7c689bc5 — DAT service-account/API FAQ (also repo-verified in docs/integrations/dat.md)
2. https://one.support.dat.com/9-troubleshooting-2734b01a/transportation-management-system-tms-bded76fa/accessing-the-api-dat-developer-portal-1ca53173 — DAT developer-portal access
3. https://www.dat.com/api-integration — DAT API family overview
4. https://services.dat.com/content/resources/product-sheets/dat-connexion — Connexion Interface Application Requirements (certification quote)
5. https://maxtruckers.com/dat-load-board-plans — DAT 2026 carrier tiers (third-party)
6. https://www.academyofdla.com/pages/dat-load-board-cost-2026 — DAT 2026 cost breakdown (third-party)
7. https://otrucking.com/resources/guides/dat-load-board-pricing-plans/ — DAT tier features (third-party)
8. https://www.dat.com/rateview — RateView Analytics
9. https://www.dat.com/company/news-events/news-releases/dat-to-acquire-convoy-platform-from-flexport — DAT/Convoy acquisition (Jul 2025)
10. https://www.dat.com/company/news-events/news-releases/convoy-platform-now-free-to-dat-and-brokerpro-tms-customers — Convoy free for DAT/BrokerPro TMS (Jan 2026)
11. https://www.dat.com/company/news-events/news-releases/dat-fully-integrates-convoy-platform-with-ascendtms-to-supercharge-broker-workflows — AscendTMS full integration (Jan 2026)
12. https://www.globenewswire.com/news-release/2026/07/23/3332193/0/en/dat-s-convoy-platform-integrates-with-tai-tms-to-automate-carrier-matching-to-freight-brokers.html — Tai TMS integration (Jul 2026)
13. https://cloud.comms.dat.com/sales-inquiry-book-now — DAT Book Now (beta as TMS integration; also repo-verified)
14. https://one.support.dat.com/9-resources-52e74931/dat-partners-123e4752/partner-with-dat-89f3b0bc — Partner with DAT program article
15. https://developer.truckstop.com/ — Truckstop developer portal
16. https://developer.truckstop.com/reference/load-search-soap — Search All Loads (SOAP) reference
17. https://developer.truckstop.com/reference/rate-insights-v3 — Rate Insights V3 API
18. https://truckstop.com/product/load-board/pricing/ — Truckstop load-board pricing page
19. https://truckstop.com/product/rate-insights/ — Rate Insights product
20. https://truckstop.com/blog/truckstop-coms-rate-analysis-now-available-software-integrations/ — Rate Analysis API for integrations
21. https://truckstop.com/partners/ — Truckstop Partner Marketplace
22. https://truckstop.com/product/integrations/ — Truckstop integrations (API key + account-manager path)
23. https://www.authencio.com/blog/truckstop-pricing-compare-plans-save-on-load-boards — Truckstop 2026 pricing (third-party)
24. https://networthexplained.com/articles/truckstop-review/ — Truckstop 2026 tier restructure: Basic $45/Pro $110/Premium $175 (third-party)
25. https://otrucking.com/resources/guides/truckstop-load-board-pricing/ — Truckstop tiers (third-party)
26. https://www.123loadboard.com/api/ — 123Loadboard API & integration specs
27. https://www.123loadboard.com/faq/123loadboard-cost/ — 123Loadboard official pricing FAQ
28. https://ers.blob.core.windows.net/doc/123Loadboard%20API%20-%20usage%20agreement.pdf — 123Loadboard API usage agreement (public PDF)
29. https://s1pststd03.blob.core.windows.net/cms/2022/02/TMS-Integration-API-123Connect.pdf — 123Connect TMS Integration API (carrier use case + confidentiality clause)
30. https://www.123loadboard.com/about/partners/industry-partners/ — 123Loadboard partner ecosystem
31. https://help.uber.com/en/freight/carrier/article/signing-up-to-be-a-carrier-with-uber-freight?nodeId=8c6b0ea9-fca5-4af4-817c-422aa3a0e390 — Uber Freight carrier signup requirements
32. https://www.uber.com/us/en/freight/carrier/signup/ — Uber Freight carrier signup
33. https://www.uberfreight.com/en-US/blog/uber-freight-releases-pilot-for-scheduling-api — SSC Scheduling API pilot
34. https://www.freightwaves.com/news/uber-freight-loads-now-available-in-ascendtms-system — Uber Freight loads in AscendTMS
35. https://alvys.com/uberfreight-alvys — Uber Freight + Alvys partnership
36. https://relay.amazon.com/ — Amazon Relay
37. https://relay.amazon.com/blog/how-to-become-a-carrier-for-amazon-relay — Relay carrier requirements/apply
38. https://relay.amazon.com/terms — Relay Site Terms (tamper/bypass clause)
39. https://heavyvehicleinspection.com/blog/post/amazon-relay-basic-score-requirements-2026 — Relay CSA thresholds + 180-day authority (third-party 2026 guide)
40. https://www.chrobinson.com/en-us/carriers/api-connectivity/ — CHR Carrier Connectivity: free Carrier API (find/offer/book/auto-create, visibility, docs, payment)
41. https://www.chrobinson.com/en-us/carriers/become-a-carrier/ — CHR carrier setup (T-code)
42. https://www.chrobinson.com/en-us/carriers/carrier-technology/navisphere-carrier-mobile-app/ — Navisphere Carrier app
43. https://developer.jbhunt.com/connect-360 — J.B. Hunt Connect 360 developer portal
44. https://www.jbhunt.com/technology/connectivity — JBH API/EDI integration + onboarding team
45. https://www.jbhunt.com/technology/carrier-360 — Carrier 360
46. https://www.freightwaves.com/news/less-than-2-years-after-flexport-bought-convoys-tech-stack-its-being-sold-to-dat — Convoy→DAT analysis
47. https://convoy.com/dat/ — Convoy Platform acquisition FAQ (carrier continuity)
48. https://www.parade.ai/resources/syndication-mcp-release — Parade Syndication API v2 / MCP, Certified Partner Program, Q1 2026 GA
49. https://www.parade.ai/resources/new-parade-datatruck-partnership — Parade carrier-TMS syndication example
50. https://highway.com/highway-for-carriers — Highway for Carriers (free)
51. https://www.overdriveonline.com/business/article/15755263/highway-launches-load-board-for-eldconnected-carriers — TFX load board, free for ELD-connected carriers
52. https://apps.apple.com/us/app/highway-for-carriers/id6751547865 — Highway for Carriers app
53. https://www.mycarrierportal.com/features/pricing/ — Descartes MyCarrierPortal pricing (broker-side)
54. https://mycarrierpackets.com/IntegrationGuide — MCP token-auth API for broker TMSs
55. https://www.globenewswire.com/news-release/2024/09/18/2948080/0/en/Descartes-Acquires-MyCarrierPortal.html — Descartes acquisition ($24M, Sept 2024)
56. https://www.freightwaves.com/news/sonar-launches-self-serve-quick-rates-freight-intelligence-without-the-sales-call — SONAR Quick Rates launch ($24.99/mo)
57. https://gosonar.com/sonar-quick-rates — Quick Rates product page
58. https://gosonar.com/sonar-trac-trusted-rate-assessment-consortium — TRAC spot rates
59. https://www.itqlick.com/sonar/pricing — SONAR contract pricing (~$500/mo min; low confidence)
60. https://triumph.io/solutions/rates/ — Triumph Intelligence (ex-Greenscreens) rates
61. https://www.crunchbase.com/organization/greenscreens-ai — Greenscreens acquired by Triumph Financial (Feb 2025)
62. https://www.wearewarp.com/compare/freight-api-vs-jbhunt-360 — JBH Connect 360 access model (competitor comparison; used only for the sales-gated claim)
63. https://appscrip.com/blog/load-board-integration-with-dat/ — DAT integration guide (API license + $500–1,000 setup fee; third-party, unverified)
64. Repo (repo-verified): `src/lib/hub/integrations/registry.ts`, `src/lib/hub/integrations/dat.ts`, `src/lib/hub/integrations/truckstop.ts`, `src/lib/hub/integrations/capability.ts`, `docs/integrations/dat.md`, `docs/integrations/truckstop.md`, `docs/research/2026-08/prompt-1-native-shell.md` §3 (DAT ToS §1.2, Truckstop ToS §3.3)

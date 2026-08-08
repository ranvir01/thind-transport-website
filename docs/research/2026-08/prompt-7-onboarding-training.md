# LoadOff "Dummy-Proof" Onboarding & Short-Video Training — Research Report

**Date:** 2026-08-07 · Prepared for the LoadOff owner (solo, non-technical; AI build agents execute against this report)
**Grounded in the actual codebase** (`/tmp/ttw-probe`, read-only): driver PWA (`/hub/driver/*` — forced-dark, phone-first, offline queue, status taps, camera PODs, pay, DVIR, time-off, incident), office surface (Today + setup guide + `help.ts` tours), customer portal, `/hub/get-app` PWA install page, `driver-invite/[token]` links, seeded demo data, `docs/driver-onboarding.md`, `docs/demo-script.md`.

---

## TL;DR

- **Short video works, but only when it's optional and chosen.** Peer-reviewed data: engagement collapses past ~6 minutes (Guo/Kim/Rubin, 6.9M sessions); a 2025 meta-analysis (42 studies, 15,673 participants) finds microlearning nearly doubles odds of retention (OR 1.87). But Chameleon's 550M-interaction dataset shows **forced** video in onboarding modals *halves* completion (21% vs 44% text-only). Verdict: reels as a tappable layer, never a gate.
- **Trucking already trains this way.** ELD vendors (Motive, Samsara) run public driver-app video libraries; trucking LMS vendors (Infinit-I, Luma, CarriersEdge) sell 5–7-minute micro-videos and claim 17–50% CSA improvements (vendor claims, no methodology). LoadOff copying this pattern is industry-standard, not experimental.
- **The best "zero-reading" mechanics aren't video at all:** user-triggered ≤4-step spotlight tours (auto-delayed tours complete 2–3× worse), checklists with pre-checked first items (endowed progress: 34% vs 19% completion), do-it-for-me buttons (LoadOff's Smart Setup + paste-rate-con already are this), and embedded empty-state actions (1.5× more action than popups).
- **Demographics are confirmed:** ~150,000 Sikh/Punjabi Americans work in trucking (≈40% of California truckers per NAPTA); 23.7% of US truck drivers are Hispanic (2024 ACS/Data USA). The 2025 FMCSA English-proficiency out-of-service enforcement (~6,000 drivers OOS by Oct 2025) makes low-English UI + Punjabi/Spanish training a retention weapon for carriers like Thind.
- **Punjabi production has one hard rule:** auto-transcribing spoken Punjabi fails (Whisper zero-shot WER ≈55%). Never caption Punjabi from speech — translate the English *script*, burn captions from text, and have a native speaker (the Thind family — free) review every video. Spanish auto-pipeline is fine with a light check (Whisper Spanish WER 4–6%).
- **Cheapest credible pipeline:** phone/OBS screen-record the demo-seeded app → CapCut (free) or Descript ($16–24/mo) auto-captions → 3 language variants. Realistic cost: **2–4 hours and $0–60 cash per 30–60s reel in 3 languages**; the whole 7-reel library below is ~25–30 hours.
- **Where drivers watch:** YouTube beats TikTok decisively for this audience (84% of US adults vs 37%; truckers surveyed: Facebook 63%, YouTube 54%). Host reels as YouTube Shorts + share via WhatsApp (54% of Hispanic adults; Punjabi Radio USA has ~288k Facebook followers with truckers ≈⅓ of its audience (corrected on verification) and offers *dial-in* listening because drivers avoid data use).
- **Bandwidth argues text-first, video-optional in-app:** rural corridors are chronically underserved (DOT), truck-stop wifi throttles; a 30s 720p vertical reel ≈ 5–10MB. In-app: poster frame + captions + "watch (uses ~8MB)" tap; preload on wifi; never block a workflow on video.
- **Top 3 ticket-killing moments** (full ranked 10 below): driver PWA install/first login, status-tap + detention clock education, and the multilingual "understand your settlement" reel — pay confusion is the most emotionally charged call a small carrier gets.
- **Bottom line:** build the mechanics first (spotlights, endowed-progress checklist, do-it-for-me), then layer 7 reels × 3 languages on YouTube Shorts, embedded behind taps. Total program ≈ 40–60 solo-founder hours, < $150 cash.

---

## 1. Microlearning evidence: 15–60s vertical video vs docs for low-tech-comfort workforces

### Peer-reviewed core

- **Video length is the strongest lever.** Guo, Kim & Rubin (2014), the landmark study of 862 MOOC videos / 128,000 learners / 6.9M viewing sessions: engagement maxes out around **6 minutes regardless of total length**; for videos >12 minutes, students watched ~3 minutes (<25% of content). Shorter, informally produced videos beat studio productions. ([ACM Learning@Scale paper](https://learningatscale.acm.org/las2014/talks/paper_philip_guo2.pdf), verified 2026-08-07; exact medians also in [Guo's edX blog](https://eddl.tru.ca/wp-content/uploads/2019/08/EDDL5101_W5_Guo_2013.pdf) and [OSCQR SUNY summary](https://oscqr.suny.edu/how-long-should-instructional-videos-be/)). Implication: 30–60s reels sit comfortably inside the maximum-engagement zone; the "informal beats studio" finding means the owner's own screen recordings are *the right* production value, not a compromise.
- **Microlearning measurably improves retention and outcomes.** 2025 systematic review + meta-analysis (MATHEMA journal): 42 studies, 15,673 participants, 18 countries — pooled **odds ratio 1.87 for retention** (95% CI 1.45–2.41) and **standardized mean difference 0.74 for learning outcomes** (a large effect), strongest when combined with mobile delivery. ([journal page](https://publikasi.teknokrat.ac.id/index.php/jurnalmathema/article/view/517), verified 2026-08-07). A second meta-analysis reaches the same direction ([JMTR 2024](https://jmtr.sljol.info/articles/10.4038/jmtr.v9i1.2)).
- **Design principles for the reels themselves:** Brame (2016), *CBE—Life Sciences Education* — segmenting (one idea per video), signaling (highlight where to look; i.e., spotlight the button on screen), weeding (cut everything decorative), and conversational narration all increase learning from video. ([lifescied.org](https://www.lifescied.org/doi/10.1187/cbe.16-03-0125), source dated 2016.)
- **Beware the famous fake stats.** "Microlearning improves retention by 20%" / "transfer is 17% more efficient (Journal of Applied Psychology)" circulate in vendor decks with no traceable primary source. Do not cite them; the meta-analysis above is the defensible number. *(Labeled inference from source-tracing during this research.)*

### Engagement benchmarks for sub-60s video

- Wistia's dataset (13M+ hosted videos): videos **under 1 minute average ~52% engagement** (percent of video actually watched), with product videos at ~50% — far above what long docs achieve and above longer videos' engagement. ([Wistia optimal-length guide, 2026 State of Video data](https://wistia.com/learn/marketing/optimal-video-length), verified 2026-08-07.)

### Frontline / low-tech-comfort workforces

- **Axonify** (frontline microlearning platform; dataset of 360,000 employees across 78 North American orgs, ~4M microlearning sessions): 3–5-minute daily sessions; employees engaging with its game layer show **+52% participation and +27% knowledge levels**; cites independent research that test-enhanced (quiz) learning improves retention **up to 41%**. Vendor-published but from real deployments. ([axonify.com method page](https://axonify.com/why-axonify/our-method/), verified 2026-08-07.)

### Trucking / logistics-specific training

- **Infinit-I Workforce Solutions** (trucking LMS used by fleets and CDL schools): sells **5–7-minute micro-videos** on monthly/quarterly cadence; claims client **CSA score improvements of 17–50%** and "reduce accident costs by 50.7%/year," with named fleets (Miller Truck Lines, Truck One, Lone Star Milk) but **no published methodology — treat as vendor claims**. ([infinitifleetsafety.com](https://infinitifleetsafety.com/improve-csa-scores-17-50-percent/), verified 2026-08-07.)
- **Luma Brighter Learning** — trucking-specific eLearning built by a learning scientist (Dr. Gina Anderson), distributed via Platform Science in-cab devices; its existence and marketplace placement confirm micro-video-to-the-cab is an established category. ([lumabrighterlearning.com](https://lumabrighterlearning.com/), [Platform Science marketplace](https://www.platformscience.com/marketplace/luma), verified 2026-08-07.)
- **CDL schools already run video-first theory:** FMCSA Entry-Level Driver Training (ELDT) theory is widely delivered as online video course modules (e.g., [J.J. Keller ELDT online courses](https://www.jjkeller.com/shop/entry-level-driver-training-online-courses), verified 2026-08-07). New drivers entering the industry since Feb 2022 have literally been trained by short videos — LoadOff's audience is pre-conditioned to this format.
- **ELD vendor onboarding is video-library based:** Motive maintains a public ["Motive Onboarding: Driver App training" YouTube playlist](https://www.youtube.com/playlist?list=PLku95dwqjWZtwN_U62Zd56M63dEMwWeDL); Samsara runs a [Driver App Video Library](https://kb.samsara.com/hc/en-us/articles/115004507334-Samsara-Driver-App-Video-Library) plus in-portal driver training videos ([help center](https://kb.samsara.com/hc/en-us/articles/20247785699981-Access-Training-in-the-Driver-Portal)) (verified 2026-08-07). I found no published *retention statistics* from ELD vendors — that data isn't public (labeled: absence of evidence, not evidence of absence).

**Net for LoadOff:** 15–60s vertical reels are evidence-aligned (length, informality, mobile, one-task-per-video) and industry-normal in trucking. The retention upside is real but comes from *segmentation + doing + quizzes/repetition*, not from video as a magic medium — so pair every reel with the in-product action it teaches.

---

## 2. In-product patterns that work without video

### Hard numbers from the big benchmark datasets

**Chameleon Benchmark Report 2025** — 550M+ user interactions ([report](https://www.chameleon.io/benchmark-report), verified 2026-08-07):

| Pattern | Finding |
|---|---|
| Product tours | Completion "nosedives" past **5 steps**; 4-step tours complete best; top-1% tours are ≤5 steps and **user-triggered only** |
| Trigger type | Click/smart-delay triggers complete **2–3× better** than auto set-delay popups (i.e., skippable, user-invoked spotlights beat forced overlays) |
| Progress indicators | **+12% tour completion** |
| Modals | 37.5% dismissed; 38% closed within 4 seconds; **text-only 44% completion vs text+video 21%** — do not force video into interruptions |
| Embedded (inline/empty-state) elements | Users **1.5× more likely to act** on embedded experiences than popups; embedded cards with images beat all tour metrics; ≤26 words of copy |
| Launchers/checklists | 23% of users open them; **launcher-driven tours complete at 67%** (vs low completion when pushed); ~5 checklist items completed per session |

**Userpilot 2024 checklist benchmark** — 188 SaaS companies: onboarding checklist completion averages **19.2% (median 10.1%)** ([Userpilot benchmark](https://userpilot.medium.com/customer-onboarding-checklist-completion-rate-2024-benchmark-report-8ebabebefb1f), verified 2026-08-07). Checklists work but only when short, pre-progressed, and tied to real value — most are ignored.

**Navattic State of the Interactive Product Demo 2026** — 40,000+ demos: top-1% demos hit **56% engagement / 48% completion**, best flows are **1–6 steps**, multi-flow demos complete 48% better than one long flow, and interactive demos convert **~12% better than product videos** (Wistia 2025 data cited therein) ([Navattic report](https://www.navattic.com/report/state-of-the-interactive-product-demo-2026), verified 2026-08-07). Implication: a tap-through "try it on fake data" beats a watch-only video for conversion moments.

### Behavioral-science mechanics with published data

- **Endowed progress:** Nunes & Drèze (2006) — a 10-stamp card with 2 pre-stamped completed at **34% vs 19%** for an 8-stamp card (same real effort) ([Coglode summary](https://www.coglode.com/nuggets/endowed-progress-effect), source dated 2006). Build agents: LoadOff's Today checklist (`setup-guide.ts`, keys trucks/drivers/customers/loads) should render with "Create your account ✓" and "Workspace ready ✓" pre-checked.
- **Duolingo's published A/B results** (First Round Review interview with growth lead Gina Gotthilf, [article](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/), verified 2026-08-07): **delaying signup until after the first lesson +20% DAU** (value before commitment — LoadOff analog: let a new carrier paste a rate con into the seeded demo before any setup); streak/notification copy +5% DAU; badges +2.4% DAU; red-dot notification +6% DAU with ~20 minutes of code. The transferable principle is **progressive disclosure: one action per screen, do the thing immediately, ask for commitment after value.**

### What Duolingo/TikTok-style progressive disclosure looks like in real B2B tools

- **Samsara & Motive (direct competitors' category):** driver-app training lives as short videos *inside* the driver portal's training tab and on YouTube — swipe-adjacent, per-task, watch-one-do-one (links above). This is the closest real-world template for LoadOff's driver PWA.
- **Trucking-vertical micro-video in-cab:** Luma "eNuggets" delivered on Platform Science in-cab hardware (above).
- **Interactive-demo layer as the B2B "scrollable":** per Navattic, thousands of B2B teams now ship tap-through demos with TikTok-like step cards (25–30 words/step) instead of docs; conversion beats video (above).
- **Chameleon's data on "spotlight vs forced":** user-invoked spotlight tours and embedded empty-state cards are the B2B translation of "pull-based scrolling" — the user summons the next bite; nothing autoplays over their work (above).

**Do-it-for-me buttons:** no cross-industry benchmark dataset exists (labeled: research gap). But LoadOff already owns the two strongest instances — **Smart Setup** (upload documents → fields extracted) and **paste-a-rate-con** (email text → structured load). The evidence-backed move is to *front-load them in onboarding* (Duolingo's value-first principle + Navattic's interactive-do > watch) and instrument their completion.

---

## 3. Production reality for a solo founder

### Cheapest credible pipeline (verified pricing)

| Step | Tool | Cost | Notes |
|---|---|---|---|
| Record screen (office surface) | OBS Studio | $0 | Record the **demo-seeded** workspace (`npm run seed:demo`) so no real data leaks |
| Record phone screen (driver PWA) | iOS/Android built-in screen record | $0 | 390px forced-dark driver app records natively vertical — no reframing needed |
| Edit + auto-captions + reframe | CapCut (free; Pro ~$10/mo) | $0–10/mo | Auto-captions claimed 100+ languages ([CapCut](https://www.capcut.com/tools/auto-caption-app), [third-party list](https://caption-x.com/capcut-auto-captions), verified 2026-08-07) |
| Alternative all-in-one | Descript | Hobbyist **$16/mo**, Creator **$24/mo** (unlimited captions; caption translation in 61 languages; AI dubbing 30 languages on Creator; Business $50/mo adds proofread translation) ([descript.com/pricing](https://www.descript.com/pricing), verified 2026-08-07) |
| Quick internal how-tos | Loom | Free tier: 25 videos × 5 min; paid from ~$15–20/user/mo ([Atlassian Loom pricing](https://www.atlassian.com/software/loom/pricing), verified 2026-08-07 via listings) | Fine for office-staff answers; not for polished reels |
| Punjabi/Spanish voice (optional) | ElevenLabs Dubbing v2 — **supports Punjabi and Spanish** ([docs](https://elevenlabs.io/docs/help-center/product/content-production/dubbing/which-languages-are-supported-in-dubbing-v-2), verified 2026-08-07) | from ~$5–22/mo | HeyGen video translate supports Spanish but **NOT Punjabi** ([HeyGen language list](https://help.heygen.com/en/articles/11391941-video-translation-languages-we-support), verified 2026-08-07) |

**Recommended stack:** OBS + phone screen-record → CapCut free → YouTube Shorts hosting (free, auto-CDN, works in PWA embeds). Cash cost can be **$0/mo**; $24/mo Descript if the owner prefers one tool.

### Multilingual quality — the critical findings

- **Spanish: auto-pipeline is acceptable.** Whisper-class ASR hits **4–6% WER on real-world Spanish** (near-English quality) ([VexaScribe benchmark roundup](https://vexascribe.com/how-accurate-is-whisper), verified 2026-08-07). Auto-caption Spanish narration, or auto-translate English captions; a native Spanish speaker should spot-check trucking terms (lumper, detention, rate con — MT mangles industry jargon; labeled inference) at ~5 min/video.
- **Punjabi: never caption from speech.** Peer-reviewed 2025 benchmark: **Whisper zero-shot Punjabi WER 54.7%** (still 38% after fine-tuning) ([ACL Anthology, CHiPSAL 2025](https://aclanthology.org/2025.chipsal-1.20/), verified 2026-08-07). Every consumer captioning tool is Whisper-class or worse for Punjabi. **Correct workflow:** write the English script → machine-translate to Punjabi (Gurmukhi) → **native-speaker review (the Thind family — $0)** → burn captions from the reviewed *text* (CapCut manual captions or subtitle file). If voiced Punjabi is wanted, record the owner/family reading the reviewed script (most authentic; drivers know the voice) or use ElevenLabs Punjabi dubbing *with native review of output*.
- **What needs native review, exactly:** all Punjabi text (MT for low-resource Punjabi is unreliable for anything beyond simple sentences — labeled inference consistent with the ASR evidence); Spanish only needs jargon spot-checks; UI strings shown in videos should stay English (matches the actual app and the 2025 English-proficiency enforcement reality — see §4 context).

### Per-video time budget (owner-realistic estimates — labeled estimates, from the pipeline above)

For one 30–60s reel: script one action in ≤80 words (20 min) → record in demo workspace, 2–3 takes (20–30 min) → CapCut trim + auto-captions + title card (30–40 min) → export/upload/embed (10 min) = **~1.5–2 h English master**. Spanish variant (auto-translate captions + spot-check, optional dub): **+30–45 min**. Punjabi variant (translate script, family review, burn text captions, optional VO): **+45–60 min**. **Total ≈ 2.5–4 h and $0–60 cash per moment in 3 languages.** A 7-reel library (below) ≈ **20–30 hours spread over 3–4 weekends**.

---

## 4. Where drivers actually watch — and what bandwidth says about in-app video

### Platform reach (best available data)

- **US adults (Pew Research 2025, n=5,022):** YouTube **84%**, Facebook 71%, Instagram 50%, TikTok 37%, WhatsApp 32% ([Pew 2025](https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/), verified 2026-08-07). Facebook daily use peaks in the 30–49 bracket (58%) — the median driver is 45–46.
- **Hispanic adults (Pew 2024/2025):** WhatsApp **54%**, TikTok **49%**, Instagram 62% — all far above white adults ([Pew 2024](https://www.pewresearch.org/internet/2024/01/31/americans-social-media-use/), verified 2026-08-07).
- **Truckers specifically (Truckers News survey, 2019 — old but the only direct measure found):** Facebook **63%**, YouTube **54%**, Instagram 15%; 65% access via smartphone, **70% Android** ([truckersnews.com](https://www.truckersnews.com/home/article/15060866/data-shows-truck-drivers-favor-facebook-in-social-media), source dated 2019-02). Android-first PWA testing is therefore mandatory.
- **Punjabi drivers:** Punjabi Radio USA (San Jose) — truckers are **~⅓ of its audience**; it has **288,000 Facebook followers** (the profile does not break out how many are truckers; 200,000 was the viewership of one 2017 protest livestream — corrected on verification); it deliberately offers **dial-in phone listening that uses no wifi/data** because that's how drivers consume on the road ([CUNY Immigrant Media Report profile](https://immigrantmediareport.journalism.cuny.edu/punjabi-radio/), verified 2026-08-07). TruckTok exists (trucker influencers on TikTok are a documented recruiting channel — [Favikon list](https://www.favikon.com/blog/top-truck-influencers), verified 2026-08-07) but skews younger than LoadOff's user base.

**Distribution verdict:** host the canonical library as **YouTube Shorts** (84% reach; Shorts run tens of billions of daily views — [Statista](https://statista.com/statistics/1364763/youtube-shorts-total-daily-views)); syndicate to **Facebook Reels** (truckers' #1 platform) and share links through **WhatsApp** (dominant in both Hispanic and Punjabi immigrant communities — Punjabi-specific WhatsApp share is inference supported by Punjabi Radio USA's multi-channel strategy). TikTok is optional marketing, not training.

### Bandwidth in the cab → text-first, video-optional in-app

- Rural corridors are "chronically underserved" by cellular (US DOT, via [EpicVue dead-zones analysis](https://epicvue.com/dead-zones-in-trucking-how-poor-connectivity-kills-fleet-productivity/), verified 2026-08-07); truck-stop wifi throttles at peak; drivers manage hotspot data caps ([BroadbandSearch trucker-internet guide](https://www.broadbandsearch.net/blog/best-internet-for-truckers), verified 2026-08-07). Punjabi Radio USA's no-data dial-in option is direct evidence drivers ration data.
- A 30s vertical 720p reel ≈ **5–10MB** (my calculation at ~1.5–2.5Mbps H.264 — labeled estimate). Fine on wifi; hostile on a rationed hotspot at 2 bars.
- And the product data agrees: **forced video in modals completes at 21% vs 44% text-only** (Chameleon, §2). LoadOff's offline queue already implies the design philosophy.

**In-app video rules for build agents:** (1) every teaching moment works as **captioned text + spotlight first**; (2) video appears as a poster-frame card labeled "Watch — 30 sec (~8MB)", tap-to-play, never autoplay, never blocking; (3) cache/preload reels via the PWA service worker when on wifi (extend the existing offline shell); (4) always burned-in captions — cabs are loud, phones are muted; (5) a "ਪੰਜਾਬੀ / Español" toggle on the video card, remembered per user.

### Demographic evidence (why Punjabi + Spanish specifically)

- **~150,000 Sikh Americans work in trucking** (Sikhs Political Action Committee estimate); NAPTA puts Sikhs at **~40% of California truckers**; Indian-Americans control nearly half of Asian-owned US trucking firms ([FreightWaves](https://www.freightwaves.com/news/punjabis-and-their-rise-as-an-indian-origin-trucking-community-in-the-us), source dated 2018-09, still the standard citation; see also [Asian American Education Project](https://asianamericanedu.org/sikh-truckers.html)).
- **23.7% of US driver/sales workers & truck drivers are Hispanic/Latino** (3.52M workers, avg age 45.1 — 2024 ACS via [Data USA](https://datausa.io/profile/soc/driversales-workers-truck-drivers), verified 2026-08-07).
- **Regulatory context that raises the stakes:** FMCSA English-language-proficiency violations became out-of-service offenses June 25, 2025 ([CVSA](https://cvsa.org/news/elp-oosc-06252025/)); **~6,000 drivers placed OOS by Oct 2025**, with Punjabi and Latino driver communities among the most affected ([FreightWaves](https://www.freightwaves.com/news/speaking-english-is-no-longer-optional-over-6000-drivers-have-found-out-the-hard-way), source dated 2025-10; congressional codification: [CDLLife 2026](https://cdllife.com/2026/congress-mandates-fmcsa-regulation-change-so-english-proficiency-failure-triggers-out-of-service-order-for-cdl-drivers/)). Implication: keep the **app UI in English** (drivers must demonstrate English at roadside; the app can quietly reinforce operational English) while the **training layer speaks Punjabi/Spanish** — training in the native language, operating surface in English. This dual-track is a differentiator Thind is uniquely credible to ship.

---

## Deliverable: Ranked implementation plan — the 10 moments where a reel/tour/checklist prevents a support ticket

Format key: **Reel** = 30–60s vertical captioned video (EN + ES + PA), hosted on YouTube Shorts, embedded behind a tap. **Tour** = user-triggered spotlight, ≤4 steps (extend `help.ts` tours). **Checklist** = extend `setup-guide.ts` / Today checklist. Costs use §3 rates (owner hours; cash assumes CapCut free + existing tools; add $24/mo only if choosing Descript). Ranked by (tickets prevented × frequency × who's blocked).

**1. Driver's first 60 seconds — install the PWA and log in** (`/hub/get-app`, `driver-invite/[token]`, "Add to Home Screen")
   The single biggest drop-off: an ESL driver in a cab taps an invite link and must install a home-screen app — a concept most have never met (Android ≠ iOS steps). Every failure here is a phone call to the owner and a driver who reverts to texting PODs.
   **Format:** Reel ×2 platform variants (Android 30s, iOS 30s), auto-detected on `/hub/get-app`, playing *above* the existing InstallAppButton; plus SMS invite text rewritten to "tap → install → you're in (3 taps)."
   **Why:** phone-recorded install walkthroughs are exactly what Motive/Samsara publish; 70% of drivers are on Android; forced-text instructions fail non-readers.
   **Cost:** 2 reels × 3 languages ≈ **5–6 h, $0**.

**2. First load card — status taps and the detention clock** ("I'm here" / "Leaving now" / "Delivered")
   The core daily action. Drivers who don't tap "I'm here" kill the detention clock → lost detention revenue → owner-driver disputes → support calls ("why wasn't detention billed?").
   **Format:** Tour (3-step spotlight on the first-ever load card: arrive tap → clock starts → leave tap) + optional 25s Reel "Why the taps pay you" (frames it as money, not compliance).
   **Why:** Chameleon: ≤4-step user/contextually-triggered spotlights are the top-performing pattern; the money framing drives adoption where policy framing fails (inference).
   **Cost:** tour = build-agent work only (~0 owner hours); reel ≈ **3 h, $0**.

**3. Snap & send POD** (camera upload; auto-clears the office's request)
   Missing PODs are the #1 cash-flow blocker (invoice can't go out). Drivers who text photos instead create manual re-upload work — a daily internal "ticket."
   **Format:** Reel 25s (photo → send → office cleared, shot on a phone in a truck) + first-use spotlight on the camera button.
   **Why:** camera flows are inherently visual — the one case where video beats any text; matches Guo's "informal beats studio."
   **Cost:** ≈ **3 h, $0**.

**4. "Why is my pay this number?" — the settlement explainer** (`/hub/driver/pay`, pay-rules engine)
   Pay confusion is the most emotionally charged call a small carrier gets, weekly, and it erodes driver trust. A Punjabi/Spanish reel walking one settlement statement line-by-line (miles × rate, bonus lines, advances deducted) prevents the recurring call.
   **Format:** Reel 60s ×3 languages, linked from a "?" on the settlement screen + auto-attached to the first settlement notification. Punjabi version voiced by the owner/family if possible — trust is the product here.
   **Why:** highest emotional stakes + ESL-critical; native-language explanation of money is where translation matters most (Axonify-style repetition optional: re-surface each quarter).
   **Cost:** ≈ **4 h** (script needs care), $0.

**5. Paste a rate con → load created** (`/hub/loads/paste`, office)
   The product's "aha" and the top mis-entry source. New dispatchers who hand-type loads make stop/rate errors that cascade into invoicing tickets.
   **Format:** Do-it-for-me + Reel: empty Loads state shows an embedded card (not popup — 1.5× better) with "Paste this example rate con" one-click demo (seeded data) + 40s reel beside it.
   **Why:** Navattic: interactive-do converts ~12% better than watch-only; Duolingo: value before setup (+20% DAU when lesson precedes signup — analog: let them paste before configuring trucks).
   **Cost:** reel ≈ **3 h**; demo-button is build-agent work. $0.

**6. Getting-started checklist upgrade — endowed progress + one next action** (Today screen, `setup-guide.ts`)
   Mechanic, not media. Current checklist starts at 0/6. Render as 2/8 with "Account created ✓, Workspace ready ✓" pre-checked; show only ONE next action expanded (progressive disclosure); add a progress bar.
   **Format:** Checklist (pure build-agent change).
   **Why:** Nunes & Drèze 34% vs 19% completion from endowed progress; Chameleon +12% from progress indicators; Userpilot's 19.2% average completion shows default checklists underperform without these mechanics.
   **Cost:** **0 owner hours, $0** — highest ROI item in the plan.

**7. Invoice in one click (POD attached) + factoring path** (office/accountant)
   "How do I bill this / where's the POD / it went to the factor?" tickets cluster in week one. The one-click invoice with attached POD+BOL is LoadOff's wow moment — show it.
   **Format:** Reel 40s + checklist item "Send your first invoice" deep-linked to a ready-to-bill seeded load; spotlight on the factoring remit-to line.
   **Cost:** ≈ **3 h, $0**.

**8. DVIR defect → truck to shop → repair certified → released** (driver `/hub/driver/dvir` + office loop)
   Compliance-critical and cross-role: drivers fear "park it" answers; offices forget the release sign-off, leaving trucks stuck in `shop` (a guaranteed panicked call).
   **Format:** Reel 45s driver-side ("answer honestly — here's what happens next") ×3 languages + 2-step office Tour on the work-order release.
   **Why:** the loop spans two people who each see half of it; video shows the whole circle once — the thing docs are worst at.
   **Cost:** ≈ **4 h, $0**.

**9. IFTA quarter + reefer-exemption reclassification** (office, quarterly)
   Low frequency, high panic: one bad quarter-compute or a mis-classified reefer pump product generates the most complex support conversation LoadOff will ever have.
   **Format:** Reel 60s ("compute the quarter, spot the REEFER badge, one-tap reclassify") + keep the existing `help.ts` IFTA doc as the deep layer; surface both via an embedded card on the IFTA screen every quarter-end week.
   **Why:** just-in-time > onboarding-time for quarterly tasks (Axonify's just-in-time principle); text deep-dive stays for the audit-minded.
   **Cost:** ≈ **3.5 h, $0**.

**10. Offline moment — "your tap is queued, don't re-tap"** (driver PWA offline shell)
   In a dead zone, a driver taps "Delivered," sees nothing "happen," taps five more times or calls dispatch. This moment must NOT be video (they're offline).
   **Format:** Contextual tip only: the existing honest banner + first-occurrence one-time card (≤26 words, per Chameleon): "No signal. Saved on your phone — sends itself when bars return. Nothing else to do." ×3 languages as static text.
   **Why:** bandwidth reality (§4); text-only completes 2× better than video in interruptions; the PWA already queues — this is pure reassurance copy.
   **Cost:** **0 owner hours, $0** (build-agent copy change, pre-translated strings reviewed by family).

**Program totals:** 7 reel-moments ≈ 25–30 finished videos (EN/ES/PA variants) ≈ **28–35 owner-hours**; mechanics (tours, checklist upgrade, offline copy, demo buttons) are AI-build-agent work ≈ 0 owner hours; cash **$0–150 total** (optional Descript month + optional ElevenLabs month). Sequence: ship #6 and #10 this week (free), then reels in ranked order, English first, Spanish auto+check, Punjabi family-reviewed — publish each to YouTube Shorts + Facebook page + WhatsApp broadcast as it's done.

---

## Sources

**Microlearning & video learning**
- Guo, Kim & Rubin 2014, ACM Learning@Scale — https://learningatscale.acm.org/las2014/talks/paper_philip_guo2.pdf (verified 2026-08-07); Guo edX blog — https://eddl.tru.ca/wp-content/uploads/2019/08/EDDL5101_W5_Guo_2013.pdf; OSCQR summary — https://oscqr.suny.edu/how-long-should-instructional-videos-be/
- Microlearning meta-analysis 2025 (42 studies) — https://publikasi.teknokrat.ac.id/index.php/jurnalmathema/article/view/517 (verified 2026-08-07); JMTR meta-analysis — https://jmtr.sljol.info/articles/10.4038/jmtr.v9i1.2
- Brame 2016, CBE—Life Sciences Education — https://www.lifescied.org/doi/10.1187/cbe.16-03-0125 (source dated 2016)
- Wistia optimal video length / State of Video — https://wistia.com/learn/marketing/optimal-video-length (verified 2026-08-07)
- Axonify method & dataset — https://axonify.com/why-axonify/our-method/ (verified 2026-08-07)

**Trucking-specific training**
- Infinit-I CSA claims — https://infinitifleetsafety.com/improve-csa-scores-17-50-percent/ (verified 2026-08-07, vendor claims)
- Luma Brighter Learning — https://lumabrighterlearning.com/ ; Platform Science marketplace — https://www.platformscience.com/marketplace/luma
- J.J. Keller ELDT online video courses — https://www.jjkeller.com/shop/entry-level-driver-training-online-courses
- Motive driver-app training playlist — https://www.youtube.com/playlist?list=PLku95dwqjWZtwN_U62Zd56M63dEMwWeDL ; Samsara Driver App Video Library — https://kb.samsara.com/hc/en-us/articles/115004507334-Samsara-Driver-App-Video-Library ; in-portal training — https://kb.samsara.com/hc/en-us/articles/20247785699981-Access-Training-in-the-Driver-Portal

**Onboarding patterns**
- Chameleon Benchmark Report 2025 (550M interactions) — https://www.chameleon.io/benchmark-report (verified 2026-08-07)
- Userpilot checklist benchmark 2024 — https://userpilot.medium.com/customer-onboarding-checklist-completion-rate-2024-benchmark-report-8ebabebefb1f (verified 2026-08-07)
- Navattic State of the Interactive Product Demo 2026 — https://www.navattic.com/report/state-of-the-interactive-product-demo-2026 (verified 2026-08-07)
- Duolingo A/B data, First Round Review — https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/ (verified 2026-08-07)
- Nunes & Drèze endowed progress (Coglode) — https://www.coglode.com/nuggets/endowed-progress-effect (source dated 2006)

**Production & language**
- Descript pricing — https://www.descript.com/pricing (verified 2026-08-07)
- CapCut auto-captions — https://www.capcut.com/tools/auto-caption-app ; language claims — https://caption-x.com/capcut-auto-captions
- Loom pricing — https://www.atlassian.com/software/loom/pricing (verified 2026-08-07 via listings)
- Whisper Punjabi WER (CHiPSAL/ACL 2025) — https://aclanthology.org/2025.chipsal-1.20/ (verified 2026-08-07)
- Whisper Spanish/real-world WER — https://vexascribe.com/how-accurate-is-whisper (verified 2026-08-07)
- ElevenLabs Dubbing v2 languages (Punjabi ✓) — https://elevenlabs.io/docs/help-center/product/content-production/dubbing/which-languages-are-supported-in-dubbing-v-2 (verified 2026-08-07)
- HeyGen video-translation languages (Punjabi ✗) — https://help.heygen.com/en/articles/11391941-video-translation-languages-we-support (verified 2026-08-07)

**Demographics, media habits, regulation**
- FreightWaves, Punjabi trucking community — https://www.freightwaves.com/news/punjabis-and-their-rise-as-an-indian-origin-trucking-community-in-the-us (source dated 2018-09); Asian American Education Project — https://asianamericanedu.org/sikh-truckers.html
- Data USA, driver demographics (2024 ACS) — https://datausa.io/profile/soc/driversales-workers-truck-drivers (verified 2026-08-07)
- CVSA ELP out-of-service criteria — https://cvsa.org/news/elp-oosc-06252025/ ; FreightWaves ~6,000 OOS — https://www.freightwaves.com/news/speaking-english-is-no-longer-optional-over-6000-drivers-have-found-out-the-hard-way (source dated 2025-10); CDLLife codification — https://cdllife.com/2026/congress-mandates-fmcsa-regulation-change-so-english-proficiency-failure-triggers-out-of-service-order-for-cdl-drivers/
- Pew social media 2025 — https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/ ; Pew 2024 (Hispanic WhatsApp/TikTok) — https://www.pewresearch.org/internet/2024/01/31/americans-social-media-use/
- Truckers News driver social survey — https://www.truckersnews.com/home/article/15060866/data-shows-truck-drivers-favor-facebook-in-social-media (source dated 2019-02)
- Punjabi Radio USA profile (CUNY) — https://immigrantmediareport.journalism.cuny.edu/punjabi-radio/ (verified 2026-08-07)
- Trucker connectivity — https://epicvue.com/dead-zones-in-trucking-how-poor-connectivity-kills-fleet-productivity/ ; https://www.broadbandsearch.net/blog/best-internet-for-truckers
- YouTube Shorts daily views — https://statista.com/statistics/1364763/youtube-shorts-total-daily-views ; trucker influencers — https://www.favikon.com/blog/top-truck-influencers

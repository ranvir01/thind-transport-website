# Native shell research: Capacitor, embedded browsers, and the "everything app" — build vs. wait

**Date:** 2026-08-07 · Prepared for the LoadOff owner · Answers the question deliberately left open by decision memo `docs/decisions/0003-everything-app.md` (accepted 2026-08-04): *"Go native when justified — Capacitor research queued, not assumed."*

---

## TL;DR

- **Verdict: WAIT on the native shell. Stay PWA + APIs + sheets (option a) now.** Queue a scoped Capacitor build behind three concrete triggers listed in the Deliverable section.
- Capacitor itself is mature and healthy in 2026 (v8, released Dec 8 2025, ~1M downloads/week) — the framework is not the problem. What LoadOff would put inside it is.
- The one thing a native shell uniquely buys — an embedded webview showing DAT/Truckstop with the user logged in — is the one thing you **shouldn't** point it at: Truckstop's ToS explicitly prohibits "frameset"-ing the service (§3.3, eff. 2026-03-13); DAT's ToS bans plug-in/automated access to Product Data without written approval (§1.2, eff. 2026-07-30); and *Facebook v. Power Ventures* (9th Cir. 2016) makes continued access after a cease-and-desist a federal CFAA violation even when users supply their own passwords.
- "Sign in with Google" is **hard-blocked inside raw webviews** by Google since Sept 2021 (`disallowed_useragent`) — any third-party site using Google SSO breaks inside the embedded-browser everything-app.
- Apps that watched users inside their in-app browsers (TikTok, Meta) drew wiretapping class actions (TikTok in-app-browser MDL still advancing in 2024–2026). WeChat's mini-programs are a *contractual partner platform*, not webviews of unwilling sites — that's the legal difference, and Apple's guideline 4.7 blesses exactly that model.
- The privacy-safe embedded browsers (SFSafariViewController / Chrome Custom Tabs) are what LoadOff's PWA sheets **already use today**: Android sheets are Custom Tabs sharing the user's Chrome logins (DAT session persists); iOS sheets are Safari-backed with Keychain AutoFill. A Capacitor app would use the *same components* for third-party sites — near-zero UX gain.
- Wrapping the current app is not a packaging step: no service workers in the iOS webview by default (offline shell dead), Web Push/VAPID doesn't exist there (driver alerts silently gone — must rebuild on APNs/FCM), NextAuth cookies break on the `capacitor://localhost` origin, and Next.js App Router SSR can't run in the shell (static export = major refactor; remote-URL mode = officially "not intended for production").
- App Store guideline 4.2 ("elevate it beyond a repackaged website") is survivable — wrapped apps ship constantly when they add native push, offline, native navigation — but it costs real work plus a permanent second build pipeline (annual Xcode/SDK bumps, review cycles).
- No trucking TMS competitor embeds third-party pages. Alvys, Rose Rocket, and Truckbase all integrate load boards via API into their own UI — exactly LoadOff's strategy 1 (DAT adapter built, awaiting seat). Truckbase actively markets *not* having a required native app as a feature for small carriers.
- Realistic solo-founder cost if triggered later: **option b ≈ 4–8 weeks to first approved iOS+Android release, then ~2–5 hrs/week forever**. Full native (option c) ≈ 6–12 months and kills the 2,600-test web asset's velocity. Neither is justified by anything a webview can legally do that the DAT API can't do better.

---

## 1. Capacitor around the existing Next.js PWA in 2026

### Maturity

- **Current version: Capacitor 8**, released Dec 8, 2025 — Swift Package Manager default on iOS, edge-to-edge on Android, "nearing one million downloads per week." Actively maintained by Ionic, docs current to v8.4.0. ([ionic.io/blog/announcing-capacitor-8](https://ionic.io/blog/announcing-capacitor-8), source dated 2025-12; [capacitorjs.com/docs/config](https://capacitorjs.com/docs/config), verified 2026-08-07)
- The framework is production-grade. The friction is entirely in *how LoadOff's specific stack* (Next.js 16 App Router + SSR + NextAuth v5 + Web Push + service-worker offline) maps into a webview shell.

### The architecture fork: static export vs. remote URL (both hurt)

A Capacitor shell has **no Node server at runtime**. Two ways to get LoadOff inside it:

| Path | What it means for LoadOff | Verdict |
|---|---|---|
| **Static export** (`output: 'export'`, `webDir: 'out'`) | App Router server components, API routes, and SSR do not run. LoadOff is server-rendered against Vercel Postgres throughout — this is a rewrite of the client into an SPA that calls the existing APIs, not a packaging step. A March 2026 field report converting a Next.js app documents dynamic routes breaking outright ("static file explosion") and the fix being a rearchitecture to query-param client-side fetching: "Treat your Capacitor app more like a client-only PWA." | Only viable for a *scoped* app (e.g., driver-only), not the whole hub. ([capgo.app Next.js+Capacitor guide](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/), updated 2026-06-23; [Medium field report](https://medium.com/@shailendraparihar3630/i-built-a-mobile-app-the-wrong-way-so-you-dont-have-to-d7a46956d71a), dated 2026-03-23) |
| **Remote URL** (`server.url` → app.loadoff domain) | The shell is a webview of the live site. Capacitor docs: *"not intended for use in production."* Community thread (2021–2022): some apps got approved, but offline = blank/splash screen with no recovery, plugins misreport platform, and the Ionic maintainer flags Apple 4.7.1 ("only use capabilities available in a standard WebKit view") as "a grey area." Maintainers recommend bundled assets + OTA updaters instead. | Fastest to ship, most fragile; carries the review-risk and offline-dead-app profile. ([capacitorjs.com/docs/config](https://capacitorjs.com/docs/config), verified 2026-08-07; [capacitor discussion #4080](https://github.com/ionic-team/capacitor/discussions/4080), comments dated 2021–2022) |

### What breaks — mapped to the exact driver PWA that exists today

I verified each feature against the code in the repo (read-only probe):

| Existing feature (file) | In a Capacitor shell | Fix + effort |
|---|---|---|
| **Offline shell** — `public/hub-sw.js` (network-first `/hub` navigations, cached fallback, "No signal" page) | **Silently dead on iOS.** WKWebView only runs service workers when the app opts into **App-Bound Domains** (`WKAppBoundDomains`, max 10 domains, iOS 14+, `limitsNavigationsToAppBoundDomains`) — and that mode *"blocks navigation outside the domains in the list,"* which is directly hostile to an everything-app webview that browses anywhere. Long-standing Capacitor issue thread confirms the constraint. | Rebuild offline as bundled native assets (static-export path) or accept online-only iOS. 3–5 days if scoped; inference: the App-Bound-Domains route is a trap for this product — don't take it. ([capacitor issue #4122](https://github.com/ionic-team/capacitor/issues/4122), opened 2021-01, closed; [capacitorjs.com/docs/config](https://capacitorjs.com/docs/config), verified 2026-08-07) |
| **Push alerts + badge** — `PushManager.tsx` (VAPID Web Push via `/api/hub/push`), `hub-sw.js` push/badge handlers | **Silently gone.** No `PushManager` in the shell webview → the component's guard renders nothing; the SW push handler never fires. Capacitor push is native-only: APNs token on iOS, FCM token on Android. | Add `@capacitor/push-notifications`, an APNs/FCM sender service alongside the existing VAPID sender, per-device token storage, iOS push entitlement + `AppDelegate` changes, Firebase config on Android. **1–2 weeks**, the single largest forced migration. Upside: iOS native push is more reliable than iOS web push. ([capacitorjs.com/docs/apis/push-notifications](https://capacitorjs.com/docs/apis/push-notifications), verified 2026-08-07) |
| **Camera PODs** — `<input capture="environment">` in `DriverLoadCard.tsx:338`, `DocRequestCard.tsx:84` | **Works as-is** (file-input capture invokes the native camera in WKWebView; `getUserMedia` has been available in WKWebView since iOS 14.3 — widely documented). | Optional upgrade to `@capacitor/camera` for nicer UX. 0–2 days. |
| **Status taps / dispatch board** (server-rendered React) | Work only after the auth + rendering problems below are solved. | — |
| **Session/auth** — NextAuth v5 beta, `__Secure-`/`__Host-` cookies | **Breaks.** The shell serves from `capacitor://localhost` (iOS) / `https://localhost` (Android): cross-origin to the API, so secure-prefix + SameSite cookies don't set/clear properly. Developers document sign-out/re-auth failures on real devices; the canonical NextAuth+Capacitor discussion (Nov 2023) has **zero answers**; no official recipe exists in NextAuth v5. Workarounds: run remote-URL mode (fragile, above), proxy through the shell's origin, or add a bearer-token path for the shell. | **~1 week** of auth rework + regression risk across 288 test files' assumptions. ([next-auth discussion #9199](https://github.com/nextauthjs/next-auth/discussions/9199), dated 2023-11-20; [capacitor discussion #7085](https://github.com/ionic-team/capacitor/discussions/7085), verified 2026-08-07) |
| **Deep links** (magic-link emails, `notificationclick` → `/hub/...`) | Browser URL handling is gone; the OS must route links into the app. Requires `apple-app-site-association` + Associated Domains entitlement, `assetlinks.json` + Android intent filters, and an `appUrlOpen` listener in the app shell. Boilerplate-heavy, well-documented. | **2–4 days.** ([capacitorjs.com/docs/guides/deep-links](https://capacitorjs.com/docs/guides/deep-links), verified 2026-08-07) |
| **`StandaloneScopeGuard.tsx`** (`display-mode: standalone` check; retargets out-of-scope links) | Inert — the Capacitor webview doesn't report standalone display mode. Out-of-scope links need rerouting through `@capacitor/browser` / InAppBrowser instead. | 1–2 days of small churn. |

### App Store review risk for a "website in a shell" — and how apps pass

Apple's rule, verbatim: **4.2 Minimum Functionality** — *"Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."* And **4.2.2**: apps shouldn't primarily be *"web clippings, content aggregators, or a collection of links."* ([developer.apple.com review guidelines](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), verified 2026-08-07)

- In practice Apple rejects *low-effort* wrappers (browser-ish UI, no push, generic offline errors), while "thousands of major brands successfully use webviews" (Amazon, Instagram, Basecamp). The accepted formula: native push, real offline handling, native-feeling navigation, splash/polish, in-app browser for external links. ([mobiloud.com webview guidelines analysis](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper), verified 2026-08-07)
- LoadOff clears 4.2 *if* it does the forced migrations above (native push, camera, offline) — i.e., passing review is the same work as making the shell not-worse than the PWA. Note the irony: an app whose pitch is "browse DAT/Google/regulations inside" walks straight into **4.2.2 "collection of links."**
- **4.7 (Mini apps)** explicitly permits HTML5/JS mini-apps inside a native shell — this is the App-Store-legal basis of the WeChat model — but you are "responsible for all such software offered in your app," and remote-URL shells sit in the 4.7.1 grey area the Capacitor maintainer flagged.
- **Update latency is mitigable:** OTA JS/asset updates without re-review are permitted within limits (no purpose change, no new native code/permissions) via Capgo/Appflow-style tooling. ([capgo.app OTA explainer](https://capgo.app/blog/how-to-bypass-app-store-review/), verified 2026-08-07)

### Realistic effort for a solo founder (with AI build agents)

Estimate (labeled as such), for a first approved iOS + Android release of a **driver-scoped** shell: **4–8 calendar weeks** — native projects + signing + store accounts (2–4 d), push migration (1–2 wk), auth rework (1 wk), offline rebuild or acceptance (3–5 d), deep links (2–4 d), store listings/screenshots/privacy labels + 1–2 review round-trips (1–2 wk). Then a **permanent second pipeline**: annual Xcode/target-SDK bumps mandated by both stores, plugin upgrades, review delays on native changes — ~2–5 hrs/week steady-state. Wrapping the *entire* hub (office + driver) via static export is a multi-month rearchitecture; via remote URL it's faster but production-discouraged and offline-dead.

---

## 2. The embedded in-app-browser patterns, natively

Three tiers exist, and they trade control against trust in exactly opposite directions:

### SFSafariViewController (iOS) — private-by-design, app is blind

- iOS 9–10 shared cookies with Safari; **since iOS 11 Apple severed it**: *"SFSafariViewController no longer shares cookies with the standalone Safari browser."* The host app cannot read, inject into, or observe the page — that's the entire point. ([Okta mobile-SSO history](https://developer.okta.com/blog/2022/01/13/mobile-sso), dated 2022-01-13)
- **Can a user stay logged into DAT inside it?** Not reliably by session cookie: persistence between presentations is at Safari's mercy and developers report session cookies not retained (e.g., iOS 16.0.2 thread). If DAT issues long-lived persistent cookies, the login can stick; LoadOff can neither guarantee nor even inspect it. In practice, iCloud Keychain AutoFill inside the Safari sheet makes re-login a one-tap affair — good enough, not seamless. ([Apple dev forums thread 717670](https://developer.apple.com/forums/thread/717670), dated 2022-10; [thread 66566](https://developer.apple.com/forums/thread/66566), verified 2026-08-07)
- `ASWebAuthenticationSession` is the OAuth-blessed variant that *does* share Safari's cookies (non-ephemeral mode) — relevant only if DAT ever offers OAuth-style delegated login. ([Okta](https://developer.okta.com/blog/2022/01/13/mobile-sso), dated 2022-01)

### Chrome Custom Tabs (Android) — shares the user's real Chrome session

- Chromium's security FAQ, verbatim: Custom Tabs *"share the same browser state (such as cookies) with the browser app"* while the host app is denied *"full DOM access,"* *"arbitrary script injection,"* cookies and passwords — *"a strict boundary between the embedding app and the browsing engine."* ([Chromium Custom Tabs Security FAQ](https://chromium.googlesource.com/chromium/src/+/refs/tags/125.0.6422.16/docs/security/custom-tabs-faq.md), verified 2026-08-07)
- **Consequence for LoadOff today:** the installed Android PWA's `window.open` sheet already *is* a Custom Tab (`StandaloneScopeGuard.tsx` comment, confirmed by Android behavior) — so an Android driver who has ever logged into DAT in Chrome opens the sheet **already signed in**. The native shell adds nothing here.

### Raw WKWebView / Android WebView (`@capacitor/inappbrowser` "Web View" mode) — full control, full liability

- The official Ionic/OutSystems plugin (v8) offers three modes — external browser, system browser (SFSafariViewController / Custom Tabs), and embedded Web View — and its webview **"storage is isolated by default"**, running in a separate process on Android API 28+. So even the raw-webview mode starts logged-out-by-default; persistent DAT login means persisting third-party session state inside storage you control. ([capacitorjs.com/docs/apis/inappbrowser](https://capacitorjs.com/docs/apis/inappbrowser), verified 2026-08-07)
- **Google actively breaks this pattern:** since Sept 30, 2021, Google's OAuth endpoint rejects embedded webviews with `disallowed_useragent`, because embedded user-agents let developers "intercept communications, insert malicious scripts, or record user data." Any third-party site offering "Sign in with Google" fails inside your webview; Google's prescribed fix is Custom Tabs / SFSafariViewController — the isolated tier. ([developers.googleblog.com](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/), dated 2021-06-29)
- **Trust/ToS implications of "the app can see credentials":** Felix Krause's Aug 2022 InAppBrowser.com research showed TikTok's and Meta's in-app browsers injecting JavaScript capable of monitoring keystrokes/taps — which produced federal wiretapping (ECPA/CIPA) class actions that are *still being litigated in 2024–2026* (§3 below). A webview you control that hosts DAT or bank logins puts LoadOff one subpoena away from having to prove it never looked. ([krausefx.com](https://krausefx.com/blog/announcing-inappbrowsercom-see-what-javascript-commands-get-executed-in-an-in-app-browser), dated 2022-08)

**Net:** the compliant, trusted embedded browsers impose the same isolation the PWA sheets already have; the only tier that delivers "truly seamless logged-in DAT inside LoadOff" is the tier that breaks Google SSO, violates ToS (§3), and carries wiretap-suit surface.

---

## 3. ToS and legal: can you embed DAT, Truckstop, Google, banks?

### The actual clauses

**DAT Terms & Conditions** (effective **2026-07-30**; [dat.com/terms-and-conditions](https://www.dat.com/terms-and-conditions), verified 2026-08-07):
- **§1.2 (Automation):** *"You are prohibited from using, or enabling others to use, any automated means including but not limited to implementing a bot, AI agent, spider, a browser extension or plug-in, or web crawler to access, query, or otherwise generate traffic to collect, copy, obtain, or extract any Product Data … without prior written approval from Us."*
- **§5.2.1 (License):** *"royalty-free, term-limited, non-exclusive, non-transferable, non-assignable, non-sublicensable, revocable license"* — Authorized Users are *"Your employees … who have obtained usernames and passwords initially issued by Us."*
- Reading (inference, not legal advice): a *passive* webview where the carrier logs into their own DAT account isn't literally "automated collection" — but the moment LoadOff scripts, scrapes, auto-fills, or extracts anything from that webview into the TMS, it's squarely inside §1.2; and the license's "revocable" plus non-sublicensable scope means DAT can shut the pattern down at will. The sanctioned path is explicit: DAT's Developer Portal APIs for "Load Board, BookNow, DAT Tracking, Freight Posting, and more" ([dat.com/api-integration](https://www.dat.com/api-integration), verified 2026-08-07) — the adapter LoadOff already built.

**Truckstop Terms & Conditions** (effective **2026-03-13**; [truckstop.com/terms-conditions](https://truckstop.com/terms-conditions/), verified 2026-08-07):
- **§3.3 (Use Restrictions):** prohibits *"redistribute, **frameset**, transmit, share or broadcast any part of Services"*; *"'crawl', 'scrape', 'spider'"*; *"Truckstop expressly prohibits the use of bots and analogous automated methods"*; and *"except for Authorized Users, provide anyone with access to the Services."*
- **§3.1:** *"limited, revocable, non-exclusive, non-transferable right"* for the "Permitted Purpose."
- Reading: **"frameset" is an on-its-face prohibition on framing/embedding the service inside another product.** Embedding Truckstop in a LoadOff-controlled webview as a product feature is a direct ToS violation, not a grey area.

**Google:** the operative rule is the 2021 embedded-webview OAuth ban above — Google pages and Google-SSO logins inside an app-controlled webview are blocked/broken by policy, with Custom Tabs/SFSafariViewController as the sanctioned alternative. ([developers.googleblog.com](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/), dated 2021-06-29)

**Banks:** capturing bank credentials in an app-controlled webview is the screen-scraping anti-pattern the industry spent a decade replacing with tokenized aggregation — which is literally why LoadOff's Plaid adapter exists. Never point an owned webview at a bank login. (Industry-standard; inference flagged as such.)

### What the everything-app pattern actually got companies sued/banned for

- ***Facebook, Inc. v. Power Ventures, Inc.*, 844 F.3d 1058 (9th Cir. 2016), cert. denied 2017** — the canonical precedent. Power.com aggregated Facebook inside its own service **using users' own credentials with their consent**. Holding: initial user consent gave authorization, but *"authorization … was revoked by Facebook itself, when it sent the cease and desist letter"* — continued access after that was a **federal CFAA violation**. Practical lesson quoted by counsel: user consent alone is insufficient; the platform can revoke at any time. This maps one-to-one onto "log into DAT inside LoadOff's webview." ([Mintz analysis](https://www.mintz.com/insights-center/viewpoints/2016-07-19-facebook-v-vachani-user-authorization-can-be-revoked-service), dated 2016-07)
- **In re TikTok In-App Browser Privacy Litigation (N.D. Ill., MDL consolidated 2024)** — wiretapping claims over the in-app browser's JS injection survived motions and were still advancing through 2024–2026, *despite* TikTok's prior $92M privacy settlement. ([Bloomberg Law](https://news.bloomberglaw.com/litigation/tiktok-users-advance-suit-over-in-app-browsers-data-collection), verified 2026-08-07; [classaction.org](https://www.classaction.org/blog/tiktoks-in-app-web-browser-secretly-tracks-users-class-action-claims), dated 2022)
- ***Mitchell v. Meta Platforms* (N.D. Cal. 2022)** — CIPA/wiretap class action over Meta's in-app browser JS injection; some claims were later thrown out (reported May 2026), but Meta litigated for years — the defense-cost lesson stands regardless of outcome. ([TechCrunch](https://techcrunch.com/2022/09/22/meta-lawsuit-ios-privacy/), dated 2022-09; [MediaPost on dismissal](https://www.mediapost.com/publications/article/388369/judge-throws-out-privacy-claims-over-metas-in-app.html), verified 2026-08-07)
- **Why WeChat/X don't get sued for their mini-apps:** WeChat mini-programs (and Apple's 4.7 carve-out) are an **opt-in partner platform** — third parties build *for* the super-app under contract. No super-app succeeds by webview-embedding unwilling third parties; the ones that watched users inside browsers got sued, and the aggregator that used members' passwords (Power) lost under the CFAA. (WeChat's India ban was 2020 geopolitics, unrelated to embedding.)

**Legal bottom line:** OS-isolated sheets (what LoadOff ships) = the user browsing their own accounts in a browser — clean. App-controlled webview pointed at DAT/Truckstop as a product feature = explicit ToS breach (Truckstop), license/automation exposure (DAT), revocable-at-will with CFAA teeth (*Power Ventures*), broken Google SSO, and wiretap-suit surface. For banks: never.

---

## 4. What Alvys, Rose Rocket, and Truckbase actually do

**None of them embed third-party surfaces. All of them integrate APIs into their own UI** — the memo's strategy 1.

- **Alvys** — "Freight Marketplace": *"Find, book, and manage spot market freight — without leaving Alvys"*; *"Bid on DAT loads from within the freight marketplace. Uber Freight bidding is coming soon!"* DAT, Truckstop, Uber Freight via API into Alvys's native UI; separate help-center flows for DAT posting and Truckstop integration. ([alvys.com/features/freight-marketplace](https://alvys.com/features/freight-marketplace), verified 2026-08-07; [help.alvys.com DAT posting](https://help.alvys.com/en/articles/11668794-post-loads-to-dat-load-board), verified 2026-08-07)
  - Users (G2, 4.7/5, 18 reviews): driver-app communication is the praised surface (*"The driver app is a game changer"*), while the critical note is API data quality (*"Some valuable data points … are either missing from the API or inconsistently structured,"* Aug 2025) — i.e., even for the segment leader, **integration depth, not embedding, is where the product is won or lost**. ([g2.com/products/alvys/reviews](https://www.g2.com/products/alvys/reviews), verified 2026-08-07)
- **Rose Rocket** — DAT load-board posting integration (shipped in the June 27, 2024 release) and Truckstop posting *and* load import, all documented as in-product API integrations. ([help.roserocket.com DAT integration](https://help.roserocket.com/platform/dat-loadboard-integration); [Truckstop integration](https://help.roserocket.com/platform/truckstop-loadboard-integration); [release notes 2024-06-27](https://help.roserocket.com/platform/6/27/2024/release-notes), verified 2026-08-07)
- **Truckbase** — the closest competitor to LoadOff's small-carrier segment — is the strongest evidence for staying web-first. Its own marketing: *"No! Our text-based dispatch makes it easy to instantly communicate with your drivers **without the hassle and glitches of apps that drivers have trouble using**"*; drivers get a *"mobile-friendly app"* (web login), optional by design. Truckbase sells *the absence of a required native app* as the feature. ([truckbase.com](https://www.truckbase.com/), verified 2026-08-07)

**Takeaway:** the competitive bar in this market is "DAT results and posting inside my TMS via API" — which LoadOff's built adapter delivers the moment a seat exists — plus a driver surface with zero install friction. Nobody is winning deals with an embedded DAT webview; no vendor even attempts it (consistent with §3's ToS reality).

---

## Deliverable: build-vs-wait recommendation

### Option (a) — Stay PWA + APIs + in-app sheets. **← DO THIS NOW**

- **Effort: ~0–1 week** of polish on what exists. The moment the DAT seat lands, light up the built adapter (strategy 1) and measure whether in-app search kills the "embed DAT" want — the memo's own predicted outcome ("expected: yes"), now corroborated by every competitor doing exactly that (§4).
- Cheap wins available immediately: (1) on Android the sheet is a Custom Tab sharing Chrome's DAT login — already persistent; consider labeling the sheet "opens with your Chrome login" on Android. (2) Run a 10-minute on-device test of DAT login persistence in the iOS PWA sheet across days (unverifiable from documentation; empirics beat docs here). (3) iOS web push + badging is real and shipping since iOS 16.4 and LoadOff already uses both — keep hardening it. ([webkit.org web push post](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), dated 2023-02)
- What you give up vs. a shell: App Store presence, marginally more reliable iOS push, background native APIs. None currently blocks a sale you've documented.

### Option (b) — Capacitor shell with webview. **Queue behind triggers; scope it to the driver app when triggered.**

- **Effort: 4–8 weeks** solo-founder calendar time to first approved iOS+Android release of a **driver-scoped, static-export shell** (push migration 1–2 wk, auth rework ~1 wk, deep links 2–4 d, offline rebuild 3–5 d, store setup + review 1–2 wk), **then ~2–5 hrs/week forever** (second pipeline, annual store-mandated SDK bumps). Wrapping the whole hub: months (static export rearchitecture) or fragile (remote-URL mode, "not intended for production").
- **Build it for native capabilities — not for the embedded-DAT webview.** For third-party sites, the shell must still open the *system* browser tier (SFSafariViewController/Custom Tabs — same isolation as today's sheets); pointing an owned webview at DAT/Truckstop is a ToS breach with CFAA-shaped downside (§3). The webview's legitimate everything-app use is **4.7-style mini-apps of content you own or license** — which the same-origin Toolbox already delivers without a shell.
- **Concrete revisit triggers** (any one flips this to "build"):
  1. **DAT/Truckstop API access is denied, priced out, or functionally dead-ends** — the shell + system-browser-tier becomes the least-bad DAT story (still never the raw webview).
  2. **Measured driver-adoption loss attributable to "no App Store app"** (e.g., carriers citing it in churn/onboarding notes) or iOS web-push reliability complaints exceeding a threshold you set.
  3. **A roadmap feature that is native-only**: background geolocation/tracking, offline-first uploads with OS background sync, CarPlay/Android Auto — none of which a webview provides anyway.
- Update-latency cost is mitigable via OTA web-asset updates (Capgo/Appflow) within Apple's limits; review risk is manageable because the forced migrations (native push, offline, camera) are exactly what satisfies guideline 4.2.

### Option (c) — Full native (Swift/Kotlin). **No.**

- **Effort: 6–12+ months**, two additional codebases, duplicated logic against a 2,600-test web asset, and it forfeits the solo-founder + AI-agent velocity that produced LoadOff. Nothing in the everything-app goal requires it; even the super-apps it emulates are webview/mini-app hybrids. Reconsider only on a product pivot to hardware-adjacent driver workflows (background ELD-grade tracking, CarPlay) at a fleet count that funds it.

### Bottom line

**Wait.** The native shell is a real, bounded project (b: 4–8 weeks) that buys native push and store presence — but its headline promise, "DAT logged in inside LoadOff," is the one configuration that is contractually prohibited (Truckstop "frameset," DAT §1.2), legally precedent-hostile (*Power Ventures*), and technically self-sabotaging (Google SSO blocked in webviews). The strongest version of the everything-app is the one already accepted in memo 0003 and validated by every competitor: **integrate the data (DAT API, awaiting seat), embed what you own, sheet the rest** — and let the three triggers above, not ambition, schedule the Capacitor build.

---

## Sources

1. Internal: `/tmp/ttw-probe/docs/decisions/0003-everything-app.md` (accepted 2026-08-04); code: `public/hub-sw.js`, `public/hub.webmanifest`, `src/components/hub/PushManager.tsx`, `src/components/hub/StandaloneScopeGuard.tsx`, `src/components/hub/driver/DriverLoadCard.tsx:338`, `src/components/hub/driver/DocRequestCard.tsx:84` (read 2026-08-07)
2. https://ionic.io/blog/announcing-capacitor-8 (dated 2025-12-08)
3. https://capacitorjs.com/docs/config (verified 2026-08-07)
4. https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/ (last modified 2026-06-23)
5. https://medium.com/@shailendraparihar3630/i-built-a-mobile-app-the-wrong-way-so-you-dont-have-to-d7a46956d71a (dated 2026-03-23)
6. https://github.com/ionic-team/capacitor/issues/4122 (opened 2021-01-27; verified 2026-08-07)
7. https://github.com/ionic-team/capacitor/discussions/4080 (comments 2021–2022; verified 2026-08-07)
8. https://github.com/nextauthjs/next-auth/discussions/9199 (dated 2023-11-20)
9. https://github.com/ionic-team/capacitor/discussions/7085 (verified 2026-08-07)
10. https://capacitorjs.com/docs/apis/push-notifications (verified 2026-08-07)
11. https://capacitorjs.com/docs/guides/deep-links (verified 2026-08-07)
12. https://capacitorjs.com/docs/apis/inappbrowser (plugin v8; verified 2026-08-07)
13. https://developer.apple.com/app-store/review/guidelines/#minimum-functionality (4.2, 4.2.2, 4.7; verified 2026-08-07)
14. https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper (verified 2026-08-07)
15. https://capgo.app/blog/how-to-bypass-app-store-review/ (verified 2026-08-07)
16. https://developer.okta.com/blog/2022/01/13/mobile-sso (dated 2022-01-13)
17. https://developer.apple.com/forums/thread/717670 (dated 2022-10); https://developer.apple.com/forums/thread/66566
18. https://chromium.googlesource.com/chromium/src/+/refs/tags/125.0.6422.16/docs/security/custom-tabs-faq.md (verified 2026-08-07)
19. https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/ (dated 2021-06-29; enforcement 2021-09-30)
20. https://krausefx.com/blog/announcing-inappbrowsercom-see-what-javascript-commands-get-executed-in-an-in-app-browser (dated 2022-08)
21. https://www.dat.com/terms-and-conditions (effective 2026-07-30; fetched 2026-08-07)
22. https://truckstop.com/terms-conditions/ (effective 2026-03-13; fetched 2026-08-07)
23. https://www.dat.com/api-integration (verified 2026-08-07)
24. https://www.mintz.com/insights-center/viewpoints/2016-07-19-facebook-v-vachani-user-authorization-can-be-revoked-service (dated 2016-07; *Facebook v. Power Ventures*, 844 F.3d 1058 (9th Cir. 2016))
25. https://news.bloomberglaw.com/litigation/tiktok-users-advance-suit-over-in-app-browsers-data-collection (verified 2026-08-07)
26. https://www.classaction.org/blog/tiktoks-in-app-web-browser-secretly-tracks-users-class-action-claims (dated 2022-08)
27. https://techcrunch.com/2022/09/22/meta-lawsuit-ios-privacy/ (dated 2022-09-22, *Mitchell v. Meta*)
28. https://www.mediapost.com/publications/article/388369/judge-throws-out-privacy-claims-over-metas-in-app.html (verified 2026-08-07)
29. https://alvys.com/features/freight-marketplace (verified 2026-08-07)
30. https://help.alvys.com/en/articles/11668794-post-loads-to-dat-load-board (verified 2026-08-07)
31. https://help.roserocket.com/platform/dat-loadboard-integration; https://help.roserocket.com/platform/truckstop-loadboard-integration; https://help.roserocket.com/platform/6/27/2024/release-notes (verified 2026-08-07)
32. https://www.truckbase.com/ (verified 2026-08-07)
33. https://www.g2.com/products/alvys/reviews (4.7/5, 18 reviews; verified 2026-08-07)
34. https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (dated 2023-02)

# LoadOff Mini-App Platform — Research Report (Prompt 2)

**Date:** 2026-08-07 · **Prepared for:** LoadOff owner (solo, non-technical; AI build agents execute)
**Question:** How does LoadOff let factoring companies, insurance agents, fuel networks, compliance services, and repair shops ship "mini-apps" inside LoadOff — without LoadOff writing each integration?

---

## TL;DR

- **The winning pattern for a solo founder is boring and proven: manifest + scoped REST API + sandboxed iframe + postMessage bridge + short-lived signed JWT context.** Atlassian Connect ran a decade-long marketplace on exactly this; Zendesk, Pipedrive, Trello, and Geotab all ship variants today. [10][12][15][11][24]
- **Do NOT build a WeChat/Stripe-style sandboxed JS runtime** (no-DOM, serialized UI tree). It is the gold standard for host safety but is a platform-team-sized project. The iframe gets you 90% of the isolation for 5% of the work. [6][14]
- **LoadOff is already half-built for this.** The provider registry (`registry.ts`), capability chains, per-tenant encrypted credentials, HMAC webhook receiver, permission checks, and the tenant-isolation harness are the exact substrate a mini-app layer needs — the mini-app registry is "PROVIDERS, but with a UI surface and scopes."
- **Copy Shopify's two-token split:** a 60-second JWT "session/context token" that only proves *who is looking at what*, and a separate scoped API credential for data access. Never let the iframe hold a long-lived secret. [1]
- **Copy Slack's review doctrine, not its infrastructure:** manifest-declared granular scopes, least-privilege enforcement ("scopes intended for future, unimplemented functionality will not be approved"), and re-review when scopes change. [3][5]
- **The #1 real-world failure mode is stolen/over-scoped OAuth tokens held by the *partner*, not iframe escapes:** GitHub–Heroku/Travis (2022), Salesloft Drift → mass Salesforce exfiltration (Aug 2025), Cyberhaven Chrome-extension hijack (Dec 2024). Your contract must assume a partner *will* be popped: audience-scoped short-TTL tokens, per-tenant install grants, rate/volume anomaly alerts, one-click kill switch. [19][20][21]
- **Trucking has zero true "mini-apps inside a TMS" platform today.** Geotab Add-Ins is the closest real thing (HTML/JS pages inside MyGeotab, JSON config) — but on the telematics side. McLeod/Trimble run partner-gated certification programs, not open specs. That's the gap LoadOff can own at small-fleet scale. [24][29][34]
- **Design-partner candidates exist and already build into other people's UIs:** Loadsure ships per-load cargo insurance *inside* McLeod and BrokerPro; OTR-style factors expose APIs (your registry already anticipates OTR's APIM subscription key); AtoB is API-first fuel; SambaSafety/Drivewyze are API-first compliance. [30][32][31]
- **Phasing (Section 5): v0 = internal mini-apps on the contract (~3–5 weeks of agent work), v1 = one design partner on external hosting (+3–4 weeks), v2 = self-serve portal with automated checks + manual review (only when ≥3 partners are waiting).** The security contract is spelled out as a MUST-list your build agents can implement verbatim.

---

## 1. Three plugin architectures, dissected

### 1.1 Shopify apps — embedded iframes + OAuth + a two-token system

**How UI embedding works.** Third-party apps render inside the Shopify admin as iframes managed by App Bridge (Shopify's host-side JS). The app is a normal web app hosted by the developer; Shopify frames it and provides navigation/modals/toasts through the App Bridge API so the app feels native.

**How tenant data stays safe.** Two separate credentials with different jobs (this is the load-bearing idea):

1. **Session token (JWT), 60-second lifetime.** When the embedded app loads, "your app calls a Shopify App Bridge action to get the session token," and the frontend "includes the session token in an authorization header when it makes any HTTPS requests to its backend." Claims: `aud` = "the client ID of the receiving app," `dest` = the shop's domain, `iss` = the shop's admin domain, plus `sub` (user), `exp`, `nbf`, `iat`, `jti`, `sid`. "The lifetime of a session token is one minute." Crucially, "session tokens can't be used to make authenticated requests to Shopify APIs" — they only authenticate the app's own frontend↔backend hop and identify shop+user. [1] (verified 2026-08-07)
2. **OAuth access token, scoped.** Obtained at install with merchant-approved scopes; this is what actually reads/writes shop data. Review requires "your app should immediately authorize using OAuth before any other steps occur." Apps must request only necessary scopes; "protected customer data" (PII) has an extra access-request regime. [2] (verified 2026-08-07)

So a stolen iframe context is worth ~60 seconds and no API access; a stolen API token is scoped and revocable per shop. That separation is the thing to copy.

**How review works.** App Store listing requires OAuth-first behavior, scope minimization, privacy policy, mandatory privacy webhooks, performance budgets (an app "cannot reduce [Lighthouse] performance scores by more than 10 points"), and a submission package with screencasts and test credentials. [2] Community reports put initial review at days-to-weeks with iterations [37] — the point for LoadOff: review is a *checklist + human pass*, not magic.

**Copy from Shopify:** the two-token split; OAuth-at-install; scope grant screen shown to the tenant; protected-data tiering (PII scopes are special).

### 1.2 Slack apps — manifest + granular scopes + server-rendered UI (Block Kit)

**How the manifest works.** A Slack app is defined by a JSON/YAML manifest — "manifests are reusable configurations; they are designed to make an app's configuration 'portable'" — declaring features, OAuth scopes, event subscriptions, and endpoints; manageable via UI or API, version-controllable. [3] (verified 2026-08-07)

**How tenant data stays safe.** Granular OAuth v2 scopes, split by identity: bot scopes (app's own identity, `xoxb` tokens) vs user scopes (`xoxp`). "Your app can act with its own identity… without requesting excessive permissions." Workspace admins see and approve the requested scopes at install; scopes accumulate only through re-consent; token rotation exists ("exchange your access token for a refresh token and an expiring access token"). [4] (verified 2026-08-07)

**How UI embedding works.** Slack's trick is that third parties mostly *don't run code in Slack's UI at all*: Block Kit is a JSON UI language — the app sends declarative blocks, Slack renders them natively. Zero XSS/iframe risk because no third-party markup executes. The cost: expressiveness is capped at what Block Kit offers.

**How review works.** Marketplace review enforces TLS 1.2+, request signing ("signed secrets or mutual TLS"), the OAuth `state` parameter, and hard least-privilege: developers must "adhere to the 'principle of least privilege'"; "scopes intended for future, unimplemented functionality will not be approved"; sensitive scopes (message history, files) need a demonstrated use case. Ongoing: support replies "within 2 business days," delisting for unmaintained apps, and "substantial changes or updates to the features, purpose or functionality" require re-review. [5] (verified 2026-08-07)

**Copy from Slack:** manifest-as-data (matches your registry doctrine exactly); granular scope naming (`loads:read`, `invoices:write`); scope-justification review; re-review on scope change. Also steal the *idea* of Block Kit for v0 dashboard tiles: a JSON-defined card the LoadOff shell renders natively is even safer than an iframe for simple read-only widgets.

### 1.3 WeChat mini-programs — sandboxed JS runtime, no DOM

**How it works.** Mini-programs split execution into two threads: a logic layer ("runs JavaScript code using a dedicated JsCore thread") and a rendering layer (WebViews rendering WXML/WXSS), communicating asynchronously through the native client. The design "necessitates removing direct DOM and BOM APIs" — app code literally cannot touch the page; it can only `setData` across the bridge, and all device/platform capability flows through mediated `wx.*` APIs ("all native capabilities flow through WeChat's controlled API layer, enabling permission management"). [6] (verified 2026-08-07) [7]

**How tenant/user data stays safe.** No DOM → no DOM-based XSS surface, no arbitrary `fetch` to anywhere (network requests are restricted to a developer-declared server-domain allowlist configured in the WeChat console — platform behavior documented in ecosystem guides [8]); every capability call is mediated and permission-gated by the host.

**How review works.** Every mini-program version passes Tencent review before release; operating in China additionally requires ICP filing/licensing tied to the operator [8][9]. Review + verified-entity registration + code upload through WeChat DevTools = strong supply-chain control (the host serves the code; developers can't silently swap it — contrast with Cyberhaven below).

**The 2024+ echo of this model in the West is Stripe Apps:** UI extensions are React code executed in a "secure sandboxed iframe" with a **null origin** ("sandboxed iframes have a `null` origin"; "top-level APIs like localStorage… are unavailable"), no arbitrary HTML — "they exclusively use UI components provided by Stripe," and "the Dashboard proxies and serializes all data to the app." A `stripe-app.json` manifest "defines your app's ID, views, permissions"; code is uploaded and served from Stripe's CDN. [14] (verified 2026-08-07)

**Copy from WeChat/Stripe:** *concepts only* — host-served code (later), mediated capability APIs, network egress allowlists, host-controlled versioning. **Do not copy the runtime.** Building a serialized-UI sandbox is a multi-engineer-year platform project (Stripe's serialization constraints — no refs, async-only event handlers, serializable props only — show how deep it goes [14]). Inference: for a solo founder this is a v3+ possibility at best, and probably never necessary at 15–500-truck-carrier scale.

### 1.4 Side-by-side

| Dimension | Shopify | Slack | WeChat / Stripe Apps | What LoadOff should do |
|---|---|---|---|---|
| Third-party UI | Developer-hosted iframe + App Bridge | None (JSON Block Kit, host-rendered) | Host-served code in sandboxed runtime | v0–v1: iframe + bridge; JSON "tiles" for trivial widgets |
| Identity to plugin | 60s JWT session token (`aud`,`dest`,`sub`) [1] | Signed requests + OAuth tokens [4][5] | Runtime-injected session, mediated APIs [6] | 60s context JWT, per-app `aud`, per-tenant claims |
| Data access | Scoped OAuth token per shop [2] | Granular bot/user scopes per workspace [4] | Mediated `wx.*` / Stripe API with app permissions [6][14] | Scoped REST keyed to install grant (carrier_id from token, never from params) |
| Manifest | App config + protected-data declarations [2] | JSON/YAML manifest, portable [3] | `app.json` / `stripe-app.json` [14] | TS/JSON registry entry (extends `ProviderSpec` house pattern) |
| Review | Checklist + human review, perf budget [2] | Least-privilege scope review, re-review on change [5] | Tencent review + ICP; Stripe review + CDN serving [8][14] | v1: written checklist, founder-reviewed; v2: automated checks + human pass |
| Kill switch | Uninstall/revoke per shop | Revoke tokens per workspace; delisting [5] | Host stops serving code | Per-tenant flag row + global registry flag (already the house pattern) |

---

## 2. The minimum viable mini-app contract — and who shipped exactly it

### 2.1 The smallest contract that actually works

Four artifacts. Nothing else is required to run a real third-party mini-app safely:

1. **Manifest** — data, not code: app id, version, UI surfaces it mounts into, scopes it needs, its hosting origin, webhook URL, support contact.
2. **Scoped REST API** — a small, versioned surface (`/api/apps/v1/...`) where tenant identity comes *only* from the validated token, and every scope maps to a field-allowlisted read or an audited mutation.
3. **Iframe + postMessage bridge** — host renders the app's URL in a sandboxed iframe; a tiny JS protocol handles ready/init/resize/navigate/toast; strict origin checks both directions.
4. **Signed JWT context** — short-lived token delivered to the iframe at mount carrying `{aud: app_id, carrier_id, user, surface, ref, scopes, exp≈60s}`; the app's backend verifies it and may exchange it for a slightly longer-lived scoped API token.

### 2.2 Prior art — this exact contract, shipped by real companies

- **Atlassian Connect (2013→) — the canonical proof.** A JSON descriptor (`"authentication": {"type": "jwt"}`, `"lifecycle": {"installed": "/callback"}`, `"scopes": ["read","write"]`), a shared secret exchanged at install ("an installation secret will be exchanged every time your app is installed or updated"), JWTs on every request so "the Atlassian host product can verify it is talking to the app, and vice versa," plus a **query-string-hash (`qsh`) claim** proving "none of the query parameters… nor the path… nor the HTTP method were altered in transit," and developer-hosted iframes for UI. This powered the entire Jira/Confluence cloud marketplace for a decade. Its sunset ("You can no longer publish Connect apps on the Atlassian Marketplace. All new extensibility features will be delivered only on Forge") is about Atlassian's enterprise needs — data residency, egress control, hosted compute — not because the contract failed at small scale. [10] (verified 2026-08-07)
- **Zendesk Apps Framework (ZAF).** Each app runs "in its own isolated iframe"; the SDK "provides a `ZAFClient` global object that allows cross-frame communication… every interaction between your iframe and the framework happens asynchronously"; `manifest.json` declares locations/parameters; adding `"signed": true` to a location makes Zendesk POST a **RS256 JWT** to the app so its server can verify the request came from a real Zendesk instance; secure-settings proxying keeps API secrets out of the client. Zendesk's engineering team also published *why* iframes: they "don't share the global scope or the DOM with the parent page," with third-party assets on a separate-origin CDN; Workers and Caja were evaluated and rejected. [12][13] (verified 2026-08-07)
- **Pipedrive Custom UI extensions — the best small-SaaS-scale template for LoadOff.** A custom UI extension is "an area in Pipedrive's UI that extends an app's functionality by loading any contextual web content within an embedded iframe." Pipedrive passes `userId`, `companyId`, and a **JWT `token` that "has to be validated server-side"** (signed with a per-app secret from their Developer Hub, defaulting to the client secret), plus context (`resource`, `view`, `selectedIds`). A ~small SDK (`@pipedrive/app-extensions-sdk` [16]) speaks postMessage: snackbar, confirm dialog, resize (panels capped 100–750px), get-signed-token (5-minute JWT), open/close modal, redirect. Ruthless pragmatism: "if the iframe takes more than 10 seconds to initialize via our SDK, the iframe won't be displayed." Surfaces: panel, modal, floating window, settings page. [15] (verified 2026-08-07)
- **Trello Power-Ups — proof the manifest can live in an admin console, not a file.** A Power-Up is registered in an admin portal with a **connector URL** ("the iframe connector URL is… required for Power-Ups") and a checklist of capabilities toggled on; public listing requires a privacy policy and data-storage disclosure. A Power-Up can run with no vendor backend at all (static connector page + client library, storage via the host). [11] (verified 2026-08-07)
- **Geotab MyGeotab Add-Ins — the trucking-adjacent one.** "The configuration file is a JSON file of keys and values which describes the Add-In, who is responsible for it, what source code it contains, and a digital security signature." A Page Add-In is "a complete web application inside your Geotab account"; lifecycle hooks `initialize(api, state, callback)` hand the add-in "a signed-in Geotab API object." Hosting rules: "referenced files must be publicly accessible via HTTPS… TLS 1.2 or higher"; marketplace distribution via a Geotab-assigned `key`. [24] (verified 2026-08-07)
- **Salesforce Canvas (2012→)** — the ancestor: HMAC-signed request POSTed into a partner iframe. (Background knowledge; listed for lineage, not load-bearing.)

**Conclusion (task 2):** The 4-artifact contract is not experimental — it is the *default* mid-2010s-to-now answer, shipped by companies at every size from Trello-scale to Atlassian-scale, and it maps 1:1 onto LoadOff's existing house pattern ("features as data"). The only genuinely new engineering for LoadOff is the bridge component, the token issuer/verifier, and the scoped API layer — everything else (registry, per-tenant flags, encrypted credentials, HMAC webhooks, audit) already exists in the codebase.

---

## 3. Security specifics for a multi-tenant host

### 3.1 Token audience scoping

- **Audience-restrict everything.** RFC 9700 (OAuth 2.0 Security BCP, published January 2025): "access tokens SHOULD be audience-restricted to a specific resource server," and receivers must "refuse requests using tokens meant for other destinations." Refresh tokens "for public clients MUST be sender-constrained or use refresh token rotation." [18] (verified 2026-08-07)
- Applied to LoadOff: every context JWT carries `aud = <app_id>` and `carrier_id = <tenant>`; the API layer rejects any token whose `aud` doesn't match the calling app's install row, and **derives `carrier_id` exclusively from the token** — never from a query param or body (this is the token-layer twin of the codebase's cross-tenant harness).
- **Keep the Shopify split**: context token (≈60s, proves who/where, cannot read data [1]) ≠ API token (scoped, minutes-to-hours, revocable per install). A leaked iframe URL or logged header then leaks nothing durable.
- **Prove request integrity if the app relays requests**: Atlassian's `qsh` claim exists because a valid JWT for endpoint A must not be replayable against endpoint B. [10] Cheap LoadOff version: bind the API token to `(app_id, carrier_id, scope set)` and keep TTL ≤10 min; skip qsh in v0/v1.

### 3.2 Iframe sandboxing — the exact attributes

- Baseline for mini-app frames: `sandbox="allow-scripts allow-forms"` (add `allow-popups allow-popups-to-escape-sandbox` only for apps that legitimately open external pages; add `allow-downloads` only for document apps). Never grant `allow-top-navigation`.
- **The one rule that bites people:** MDN — "When the embedded document has the same origin as the embedding page, it is strongly discouraged to use both `allow-scripts` and `allow-same-origin`, as that lets the embedded document remove the `sandbox` attribute." [17] (verified 2026-08-07) Consequence for v0 (LoadOff-authored mini-apps served from the same Vercel app): either (a) serve mini-app pages from a **separate origin** (`apps.loadoff.*` or `*.loadoff-apps.*`) — Zendesk's approach ("third-party assets are hosted on a different domain" [13]) — or (b) omit `allow-same-origin` entirely, accepting a null-origin frame (no cookies — fine, because the bridge+JWT is the only channel; this is precisely Stripe's model [14]).
- Add `allow=""` (empty Permissions-Policy) to deny camera/mic/geolocation by default; extend per app via manifest if ever needed. Keep default `referrerpolicy` (`strict-origin-when-cross-origin`). [17]
- Host page CSP: `frame-src` allowlisted to registered app origins only; LoadOff's own pages keep `frame-ancestors 'self'` so mini-apps can't re-frame the TMS (ADR 0003 already documents the frame-ancestors reality).

### 3.3 postMessage — origin validation rules

The postMessage bug class is well documented by bounty platforms: missing/weak `event.origin` checks let any window that can obtain a reference to yours inject messages (→ DOM XSS, token theft), and `postMessage(data, '*')` leaks data to whoever framed/opened you. [22][23] Concrete rules for the bridge:

1. Host handler: `if (event.origin !== expectedAppOrigin || event.source !== frameRef.contentWindow) return;` — exact-match string compare against the **manifest-declared origin** (no `startsWith`/regex — classic bypass: `evil.com/?loadoff.com`).
2. Every host send: explicit `targetOrigin` = app origin. Every app send: `targetOrigin` = LoadOff origin. **Never `'*'`** in either direction.
3. Better still: after one validated hello, hand the app a **`MessagePort`** (MessageChannel) and do all further traffic over the port — ports are unforgeable capabilities, ending origin-spoofing concerns for the session.
4. Treat every inbound payload as untrusted input: JSON-schema-validate the envelope `{v, type, id, payload}`; never `eval`/`innerHTML` anything from it; cap message size and rate.
5. Deliver the context JWT *into* the frame via the bridge (after handshake) — not in the iframe URL query string, which leaks via history/logs/referrer. (Pipedrive puts the JWT in the URL [15]; you can do one better.)

### 3.4 What actually went wrong in real plugin ecosystems

| Incident | What happened | Lesson encoded into LoadOff's contract |
|---|---|---|
| **GitHub ← Heroku/Travis CI OAuth theft (Apr 2022)** | "The attacker authenticated to the GitHub API using the stolen OAuth tokens issued to Heroku and Travis CI," listed orgs, cloned private repos of dozens of orgs incl. npm; a secret found in a repo then unlocked npm production AWS. [19] (source dated 2022-04) | The *integrator's* stored tokens are your blast radius. Keep partner API tokens short-TTL and re-derivable (not warehoused long-lived); per-tenant install grants so one partner compromise ≠ all tenants; advise/require partners not to store LoadOff tokens at rest beyond refresh material. |
| **Salesloft Drift → Salesforce mass exfiltration (Aug 8–18, 2025, UNC6395)** | Compromised OAuth tokens of a chat-widget vendor's Salesforce integration; "the actor systematically exported large volumes of data from numerous corporate Salesforce instances… to harvest credentials" (AWS keys, Snowflake tokens, passwords) via bulk SOQL; Salesloft+Salesforce revoked all tokens and pulled Drift from AppExchange Aug 20. Mandiant's hardening advice: "enforce minimum necessary permissions on connected apps," IP restrictions, monitor query events. [20] (source dated 2025-08) Cross-industry postmortems: hundreds of orgs affected. [44] | The marquee lesson for a TMS holding rates, bank/factoring data: (1) volume anomaly detection per app+tenant (a factoring widget has no business paging through every load in history), (2) revocation must be one action, platform-wide, (3) scopes small enough that "export everything" is impossible, (4) partner tokens are credential-harvesting targets — never let API responses include secrets (your field-allowlist pattern). |
| **Cyberhaven Chrome extension hijack (Dec 2024)** | Phished developer OAuth consent → attacker pushed a malicious extension version to all users through the official store; part of a broader multi-extension campaign. [21] (source dated 2024-12/2025-01) | Publisher-account compromise = supply chain. For v2: 2FA on the dev portal, re-review on update (Slack: "substantial changes… require re-review" [5]), version pinning + host-side rollback, and (later) host-served bundles like Stripe/WeChat so a partner's hijacked web server can't silently swap code for *new* logic beyond its frame. |
| **postMessage bug class (ongoing bounty staple)** | Missing origin validation and wildcard targetOrigin repeatedly yield token leakage and DOM XSS on major properties. [22][23] | The five bridge rules in 3.3; ship them as a tested host component + a tiny published SDK so partners never hand-roll listeners. |
| **Atlassian Connect's own hardening history** | Connect added `qsh` because signed-but-unbound JWTs could be replayed across endpoints. [10] | Bind tokens to app+tenant+scopes and keep TTLs tiny from day one; don't wait for the incident. |

**Net security doctrine (task 3):** the iframe/DOM side is a solved problem if you apply the exact attribute set and bridge rules above; the *real* multi-tenant risk is the token/API side — audience scoping, tiny scopes, short TTLs, per-tenant grants, anomaly monitoring, instant revocation. That is where the spec in Section 5 spends its rigor.

---

## 4. Trucking-specific candidates and prior "TMS app store" attempts

### 4.1 Who could realistically ship a LoadOff mini-app

Ordered by likelihood of saying yes to a design partnership (assessment labeled: partner-fit judgments are inference from verified public behavior).

| Category | Company | Verified signal | Mini-app they'd ship in LoadOff |
|---|---|---|---|
| **Insurtech (top pick)** | **Loadsure** | Ships per-load shipper's-interest insurance *inside* McLeod's TMS UI ("per-load shipper's interest insurance now available in McLeod TMS," FreightWaves [30], source dated 2023-10 — an integration delivered together with Reliance Partners (corrected on verification)) and inside BrokerPro "directly within the TMS workflow" [32]; maintains a public freight-platform partner program [31]. They already build embedded per-load quote flows for TMSs — LoadOff is one more surface. | "Insure this load" panel on the load detail: quote → bind → certificate filed to load docs. |
| Insurtech | **Redkik** | Publicly courts TMS integrations with an insurance API for transactional per-shipment cover [33]. | Same panel, alternate carrier. |
| Insurtech | **Reliance Partners** | Cargo insurance experience embedded via McLeod partnership [30-adjacent, source dated 2023-11]. | Commercial-lines quote/COI panel. |
| **Factoring** | **OTR Solutions** | API-forward factor — LoadOff's own registry already models OTR's Azure-APIM `subscriptionKey`; acquired TruckSmarter's factoring/banking arm (source dated 2025-11) [45], signaling tech-first strategy. | "Factor this invoice" panel: submit invoice+POD, show advance/reserve status inline (your `factor.ts` stub + webhook contract is 80% of the plumbing). |
| Factoring | **RTS Financial** | Carrier-facing RTS Pro software/app for invoice submission and status [39]. | Same pattern. |
| Factoring rails | **Triumph / TriumphPay** | Payments+audit network integrated into TMSs (e.g., Revenova partnership [41]); NextGen Audit productizes invoice/POD matching [40]. | Payment-status + audit-exceptions widget for carriers paid through TriumphPay brokers. |
| **Fuel** | **AtoB** | API-era fuel card (already a stub in your registry); fits an offers/transactions widget. | Card controls + fuel-discount finder panel. |
| Fuel | **Mudflap** | Fuel-discount network with fleet card products and a partner program [38]. | "Cheapest diesel on this route" panel using the load's lane. |
| Fuel (incumbent) | WEX/EFS, Comdata | Feed-based (your registry ships them today); embedded UI less likely near-term. | Keep as data integrations, not mini-apps. |
| **Compliance** | **SambaSafety** | Driver-risk APIs (registry stub exists). | MVR alerts panel on driver detail. |
| Compliance/bypass | **Drivewyze** | Public VMAPI developer program (registry stub). | Bypass/safety-events tile. |
| Carrier identity | **Highway** | Expanded *certified* McLeod partnership incl. digital freight matching (source dated 2025-09) [43] — proof compliance vendors invest in TMS-embedded distribution. | Broker-vetting/identity panel (broker-side later). |
| **ELD/telematics** | Samsara, Motive, Geotab | They run their *own* marketplaces (below); they consume/expose APIs rather than embedding into third-party TMSs. | Data integrations via your aggregator-first chains (already built); don't expect them to author LoadOff mini-apps. |
| **Local repair shops** | (no APIs exist) | — | Exactly who v2's **form-based mini-app template** serves: a shop "app" = manifest + hosted form + status webhook, no engineering staff required. (Speculation, but this is the underserved niche no incumbent touches.) |

### 4.2 Existing "TMS app store" attempts — right and wrong

- **Geotab Marketplace + Add-Ins — the only real mini-app system in trucking-adjacent software.** Right: a true low-friction contract (JSON config + hosted HTML/JS page rendered inside MyGeotab; lifecycle hooks; marketplace `key`; TLS/WCAG requirements) that produced a large solutions catalog. [24][25] Wrong (for LoadOff to avoid): the add-in receives "a signed-in Geotab API object" — i.e., it operates with the *viewing user's* session-level access, scoped by user clearances (`securityIds`) rather than app-scoped tokens [24]; that violates the two-token doctrine (a malicious add-in can do whatever the logged-in admin can). LoadOff's contract fixes this with `aud`-scoped tokens + per-app scopes.
- **Samsara App Marketplace.** Right: real OAuth 2.0 marketplace-app program with developer docs and webhooks [26][27][28] — clean consent and revocation. Wrong-for-your-goal: it's a *data-out* marketplace (partners pull Samsara data into their own products); there is no embedded third-party UI inside Samsara's dashboard, so it doesn't solve "mini-apps inside the host." Motive runs a comparable marketplace (same shape; background knowledge, not deep-verified today).
- **McLeod Certified Partners.** Right: certification creates trust and real co-selling (Loadsure, Highway wins above prove vendors will invest [30][43]). Wrong: partner-gated, bespoke, per-deal integration work — "certified integration," not an open spec anyone can build to; no self-serve path, which is why only funded vendors appear. [29] (verified 2026-08-07)
- **Trimble / Transporeon "Integrated App Program" (launched 2025).** Right: explicit ISV program with "a robust, documented API framework," test environment, and implementation guide; partners like Qargo and Mandata connect their TMSs [34][35] (source dated 2025). Wrong: it's API federation between big systems — no embedded UI contract, no small-vendor path; European shipper-network centric.
- **project44.** Partner-gated visibility network; your own capability router already notes "project44/FourKites/MacroPoint are partner-gated; they enter the registry when a broker relationship supplies credentials" (`capability.ts`). Not an app store; a network you join when a broker demands it.
- **Rose Rocket.** Closest US TMS to a *platform* narrative — "buy or build my TMS platform" positioning and the Feb 2025 TMS.ai launch [42] — but the extensibility is their own low-code/AI configuration, not a third-party mini-app contract with an open spec.

**Gap statement (task 4):** Every incumbent either (a) runs a data-API marketplace with no embedded UI (Samsara/Motive), (b) runs a paid, partner-gated certification program (McLeod, Trimble), or (c) embeds third-party code with too much trust (Geotab). **Nobody in trucking offers an open, self-servable, least-privilege "mini-app inside the TMS" spec.** At LoadOff's small-carrier segment, the vendors who want distribution (factors, insurtechs, fuel networks) currently pay McLeod-class gatekeepers for it — an open spec with a real security story is a differentiator *and* a sales channel, not just architecture.

---

## Deliverable: LoadOff Mini-App Platform — phased spec (v0 → v1 → v2)

**Design principles (locked to the house pattern):** mini-apps are *data* (a registry row + per-tenant flag), never forks; every surface has a no-app fallback; tenant identity flows only through validated tokens; everything money-adjacent is audited; each phase is shippable alone and implementable by AI build agents in small, testable increments. Effort units = **agent-days** (one focused AI-agent work session ≈ a task your build agents complete with tests; sizes S=~0.5–1, M=~1–2, L=~3–5).

### v0 — Internal mini-apps only (LoadOff-authored; proves the contract). Total ≈ 18–25 agent-days.

**Scope:** the full contract — manifest registry, sandboxed iframe host, postMessage bridge, context JWT, scoped API — but every app is written by LoadOff and served from a LoadOff-controlled origin. No external parties, no install flow, no review. Ship 3 apps on it: (1) port one Toolbox calculator (pure UI, no data), (2) "Fuel price on this lane" tile (read-only, uses context), (3) "Factor this invoice" panel (mutation, uses `factor.ts` stub + audit).

**v0.1 Mini-app registry** (`src/lib/platform/miniapps.ts`, mirroring `ProviderSpec`) — S/M

```ts
export interface MiniAppSpec {
  id: string                    // "fuel-lane-prices"
  label: string
  version: string               // semver; host busts caches on change
  origin: string                // exact origin the iframe loads from & the ONLY valid postMessage peer
  entryPath: string             // path template, e.g. "/panel"
  surfaces: Surface[]           // where it may mount (see v0.2)
  scopes: Scope[]               // e.g. ["loads:read", "invoices:read", "invoices:factor"]
  status: "internal" | "partner" | "listed" | "disabled"
  fallback: string              // what the user does when the app is off — house doctrine
  support: { email: string }
}
```

`Scope` is a closed union defined next to the spec; each scope maps to (a) an existing `requirePermission` key and (b) a **response field allowlist** (same derived-allowlist trick as `allowedFields()` in the provider registry). Per-tenant enablement = a `platform.miniapp_installs` table row `(carrier_id, app_id, scopes_granted, status, secret_enc, created_by)` — flags as data, kill switch = status flip.

**v0.2 Surfaces** — S. Start with exactly three mount points; more later is cheap: `load.detail.panel`, `dashboard.tile`, `hub.tools.page` (full-page, the Toolbox pattern). Each surface defines the context `ref` it passes (`load_id` for load panels, none for tools).

**v0.3 Host component** `<MiniAppFrame appId surface refId/>` — M

- Renders `<iframe src={origin+entryPath} sandbox="allow-scripts allow-forms" allow="" referrerpolicy="strict-origin-when-cross-origin">`. **No `allow-same-origin`** (null-origin frame; Stripe model [14]) *or* serve apps from a dedicated apps subdomain — either satisfies the MDN rule [17]. Height managed by bridge `resize` messages within surface min/max (Pipedrive caps panels at 100–750px [15] — copy that).
- Page CSP: `frame-src` = exact registered origins.

**v0.4 Bridge protocol** (`src/lib/platform/bridge.ts` host side + a ~150-line embeddable `loadoff-app-sdk` snippet) — M/L

Envelope `{v:1, id, type, payload}`. Handshake: app → `app:ready`; host validates `event.origin === spec.origin && event.source === frame.contentWindow`, then replies `host:init` with `{context: <JWT>, surface, theme, locale}` and **transfers a MessagePort**; all further traffic rides the port. Message types v1: `app:ready`, `host:init`, `app:resize`, `app:toast`, `app:navigate` (allowlisted internal routes only), `app:refresh-context` (host returns a fresh JWT), `host:context-updated`. Every send uses explicit `targetOrigin`; payloads schema-validated; size-capped. Contract tests: spoofed-origin message ignored; wildcard send never occurs (lint rule: forbid `postMessage(*, "*")` in repo).

**v0.5 Context token issuer + verifier** (`src/lib/platform/context-token.ts`) — M

JWT, HS256 per-app secret (v0: derived from a server env master + app id; v1: per-install exchanged secret). Claims — the Shopify table [1] adapted:

| Claim | Value | Rule |
|---|---|---|
| `iss` | `https://<loadoff-host>` | pinned |
| `aud` | app id | **verifier rejects mismatch** (RFC 9700 audience restriction [18]) |
| `sub` | user id | |
| `cid` | carrier_id | **the only tenant source of truth downstream** |
| `srf` / `ref` | surface + entity ref (`load:123`) | app may only ask about this ref's tenant |
| `scp` | granted scopes (intersection of manifest scopes ∩ install grant ∩ user's own permissions) | never wider than the *viewing user* |
| `exp` | `iat + 60s` | Shopify precedent [1]; bridge re-issues on demand |
| `jti` | uuid | replay logging |

**v0.6 Scoped app API** (`/api/apps/v1/*`) — L

Thin REST over existing service logic (never duplicate queries — call the same modules server actions use, so the cross-tenant harness keeps covering them). v0 endpoints: `GET /context` (echo of validated claims), `GET /loads/:id` (allowlisted fields per scope), `GET /lane-fuel?load=:id`, `POST /invoices/:id/factor-submit` (audited, idempotency-key required, reuses `factor.ts` contract). Auth: `Authorization: Bearer <context JWT>` in v0 (60s is fine for panel reads/writes); token-exchange endpoint arrives in v1. Every handler: verify sig → check `aud`+`exp` → scope check → **carrier_id from `cid` only** → field-allowlist response → audit row on mutation. Add these routes to the tenant-isolation harness exemption/coverage list deliberately (docs/decisions/0002 discipline).

**v0.7 Three internal apps + kill-switch UI in settings** — M each app, S for settings toggle.

**v0 acceptance:** an internal app disabled for tenant A renders fallback text; a context JWT minted for app X fails against app Y's verifier; a message from a wrong origin is dropped (test); harness still green; audit rows exist for the factor submission.

### v1 — One design partner (first external code). Total ≈ +12–18 agent-days + partner-side work.

**Pick the partner:** a Loadsure/Redkik-style per-load insurance quote panel or an OTR-style factoring panel (Section 4.1). Both already build TMS-embedded flows [30][32]; your registry stubs (`factor.ts`) mean the data plumbing half-exists.

Adds on top of v0:

1. **Install flow with consent screen** — M. Owner/admin sees app name, publisher, requested scopes in plain English (Slack's grant-page pattern [4]); approval writes the install row with `scopes_granted`. Uninstall = one click → tokens dead (status checked on every verify).
2. **Per-install shared secret** — M. On install, POST a signed lifecycle event to the partner's `installedUrl` with a fresh secret (Atlassian Connect lifecycle [10]); context JWTs for that tenant+app now sign with it. Store encrypted like provider credentials (existing pattern).
3. **Token exchange for server-to-server** — M. `POST /api/apps/v1/token` : context JWT → access token (`aud`=app, `cid` bound, TTL 10 min, scopes ⊆ grant). Partner backend uses it for reads/writes outside the 60s window. No refresh tokens in v1 — re-exchange from a fresh context or a signed app-JWT (client-credentials style with the install secret). RFC 9700 alignment [18].
4. **Outbound webhooks** — S. Reuse the existing HMAC receiver contract in reverse: sign with install secret, `X-Loadoff-Signature` + event id headers (`webhooks.ts` already defines the math); events: `install.revoked`, `load.updated` (scoped), `invoice.status_changed`.
5. **Rate limits + anomaly floor** — M. Per app+tenant token-bucket on `/api/apps/*`; daily volume counters with alert at N× trailing average (the Drift lesson [20]); log every `jti` and scope use.
6. **Manual review checklist (one page, founder-executed)** — S to write. Borrow verbatim: OAuth/consent-first (Shopify [2]); least-privilege with per-scope justification, "future functionality" scopes rejected (Slack [5]); TLS 1.2+ hosting (Slack [5], Geotab [24]); no LoadOff tokens in client code/logs; a working uninstall; support contact + 2-business-day expectation [5]; DPA + security-contact exchanged.
7. **Sandbox tenant** — S/M. A seeded demo carrier (mock adapters already exist — `mock.ts`) the partner develops against; never production data.

**v1 acceptance:** partner app runs from partner origin; revoking the install kills API access in <60s; volume alert fires in a rehearsed drill; the checklist file lives in `docs/platform/review-checklist.md`.

### v2 — Self-serve (only when ≥3 vendors are waiting; don't build speculatively). Total ≈ +20–30 agent-days.

1. **Developer portal**: register app, edit manifest (JSON upload validated against the `MiniAppSpec` schema), rotate secrets, invite teammates, mandatory 2FA (Cyberhaven lesson [21]).
2. **Automated submission checks**: manifest schema; scope linter (unknown/overbroad scopes rejected); HTTPS/TLS probe of origin; header probe that the entry URL is frameable *by LoadOff only* (mirror of the Toolbox frameable test); secret-in-URL scan; SDK-handshake smoke test in headless browser.
3. **Human review + re-review on scope/version change** (Slack rule [5]); versioned manifests, staged rollout, host-side "pin previous version" rollback.
4. **Directory in-app** (`/hub/apps`): listed apps installable by any tenant admin; per-tenant scope grants recorded; publisher page with privacy policy + data-storage disclosure required (Trello's listing minimum [11]).
5. **Operations**: per-app dashboards (installs, API volume, error rate), delisting policy for abandoned apps [5], security-contact registry, platform-wide revocation runbook (rehearsed — Salesforce/Salesloft executed theirs in days [20]; yours should take minutes).
6. **The repair-shop template**: a LoadOff-hosted generic mini-app ("request service / status board") that a non-technical local vendor configures with a form — no code, manifest generated for them. This is the long-tail unlock no incumbent has.
7. **Explicit non-goals for v2**: billing/rev-share (defer until apps have proven demand); sandboxed no-DOM runtime (Stripe/WeChat model [14][6] — revisit only at 100+ apps); GraphQL gateway; hosted partner compute (Forge-shaped [10]).

### The security contract (normative — build agents implement this verbatim)

1. Every mini-app request to LoadOff carries a JWT; verifier MUST check signature, `iss`, `exp`, `aud`==app id, and install status before anything else.
2. `carrier_id` MUST derive from the token's `cid` claim only; any handler reading tenant from params/body is a build failure (extend the cross-tenant harness to `/api/apps/*`).
3. Context JWT TTL MUST be ≤60s [1]; exchanged access tokens ≤10min; no refresh tokens without rotation + sender constraint [18].
4. Effective scopes MUST be `manifest ∩ install grant ∩ current user's permissions` — an app can never see what the viewing user couldn't.
5. Every scope maps to a response **field allowlist**; secrets/credentials fields are unreachable by any scope (Drift credential-harvest lesson [20]).
6. Iframes MUST carry `sandbox` without `allow-same-origin`+`allow-scripts` on a LoadOff origin [17], empty `allow=""` by default, and load only manifest-registered exact origins (CSP `frame-src`).
7. postMessage: exact-string origin check + `event.source` check on receive; explicit `targetOrigin` on send; `'*'` forbidden by lint; MessagePort handoff after handshake; schema-validated envelopes; JWT delivered via bridge, never in the URL.
8. All mutations: idempotency key + audit row (existing money-mutation doctrine); all webhooks HMAC-signed with per-install secrets (existing `webhooks.ts` math).
9. Per app+tenant rate limits and volume anomaly alerts MUST exist before any external app runs [20].
10. Kill switches at three levels — per install (tenant admin), per app (LoadOff, all tenants), platform (all apps) — each effective within one token TTL.
11. Partner obligations (contractual): TLS 1.2+ [5][24], no LoadOff tokens at rest beyond refresh material, no tokens in client code/logs [5], breach notice ≤72h, re-review on scope change [5].
12. Publisher accounts (v2): 2FA mandatory; version updates re-checked; rollback capability host-side [21].

**Bottom line:** v0 is ~3–5 weeks of incremental agent work that doubles as internal UI modularization; v1 turns an existing registry stub (factoring/insurance) into LoadOff's first external mini-app with a real security contract; v2 is gated on demand. The architecture is the proven Connect/ZAF/Pipedrive shape, hardened with the post-2022 token-security lessons the incumbents learned in public.

---

## Sources

1. https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens (verified 2026-08-07)
2. https://shopify.dev/docs/apps/launch/app-requirements-checklist (verified 2026-08-07)
3. https://docs.slack.dev/app-manifests/ (verified 2026-08-07)
4. https://docs.slack.dev/authentication/installing-with-oauth (verified 2026-08-07)
5. https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/ (verified 2026-08-07)
6. https://developers.weixin.qq.com/miniprogram/en/dev/framework/quickstart/framework.html (verified 2026-08-07)
7. https://dev.to/ai_superapp/mini-program-container-architecture-how-dual-thread-rendering-works-3if7 (verified via search 2026-08-07)
8. https://appinchina.co/blog/the-complete-guide-to-wechat-mini-program-development/ (verified via search 2026-08-07)
9. https://digitalcreative.cn/blog/wechat-mini-programs-icp-registration (verified via search 2026-08-07)
10. https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/ (verified 2026-08-07)
11. https://developer.atlassian.com/cloud/trello/guides/power-ups/managing-power-ups/ (verified 2026-08-07)
12. https://developer.zendesk.com/documentation/apps/app-developer-guide/using-the-apps-framework/ (verified 2026-08-07)
13. https://medium.com/zendesk-engineering/sandboxing-javascript-e4def55e855e (verified 2026-08-07; article undated)
14. https://docs.stripe.com/stripe-apps/how-ui-extensions-work (verified 2026-08-07)
15. https://pipedrive.readme.io/docs/custom-ui-extensions (verified 2026-08-07)
16. https://github.com/pipedrive/app-extensions-sdk (verified via search 2026-08-07)
17. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe (verified 2026-08-07)
18. https://www.rfc-editor.org/rfc/rfc9700.html (published 2025-01; verified 2026-08-07)
19. https://github.blog/news-insights/company-news/security-alert-stolen-oauth-user-tokens/ (source dated 2022-04)
20. https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift (source dated 2025-08)
21. https://blog.sekoia.io/targeted-supply-chain-attack-against-chrome-browser-extensions/ (source dated 2025-01)
22. https://www.intigriti.com/researchers/blog/hacking-tools/exploiting-postmessage-vulnerabilities (verified via search 2026-08-07)
23. https://www.yeswehack.com/learn-bug-bounty/introduction-postmessage-vulnerabilities (verified via search 2026-08-07)
24. https://developers.geotab.com/myGeotab/addIns/developingAddIns/ (verified 2026-08-07)
25. https://developers.geotab.com/myGeotab/apiReference/objects/AddIn/ (verified via search 2026-08-07)
26. https://developers.samsara.com/docs/marketplace-apps (verified via search 2026-08-07)
27. https://developers.samsara.com/docs/oauth-20 (verified via search 2026-08-07)
28. https://www.samsara.com/products/app-marketplace (verified via search 2026-08-07)
29. https://www.mcleodsoftware.com/certified-partners/ (verified via search 2026-08-07)
30. https://www.freightwaves.com/news/per-load-shippers-interest-insurance-now-available-in-mcleod-tms (source dated 2023-10; Reliance Partners/Loadsure/McLeod integration) (corrected on verification)
31. https://www.loadsure.net/freight-platform-partners (verified via search 2026-08-07)
32. https://www.brokerpro.com/posts/loadsure-brokerpro-integration-announcement/ (verified via search 2026-08-07)
33. https://redkik.com/work-with-us/transport-management-systems/ (verified via search 2026-08-07)
34. https://www.transporeon.com/en/platform/carrier/transporeon-integrated-app-program (verified 2026-08-07)
35. https://news.trimble.com/Transporeon-launches-integrated-app-program-2025 (source dated 2025)
36. https://slack.com/intl/en-gb/blog/developers/slack-marketplace-review-process (verified via search 2026-08-07)
37. https://community.shopify.com/t/review-process-timeline/399738 and https://www.growave.io/blog/how-long-does-shopify-app-review-take (community/secondary; verified via search 2026-08-07)
38. https://www.mudflapinc.com/truck-stop-partners (verified via search 2026-08-07)
39. https://www.rtsinc.com/product/factoring-software (verified via search 2026-08-07)
40. https://triumph.io/solutions/nextgen-audit/ (verified via search 2026-08-07)
41. https://revenova.com/news/triumphpay-revenova-tms-payment-system-accounting/ (verified via search 2026-08-07)
42. https://www.businesswire.com/news/home/20250210026704/en/Rose-Rocket-Launches-TMS.ai-Ushering-in-the-AI-Native-Era-of-Transportation-Management (source dated 2025-02) and https://marketing.roserocket.com/blog/should-i-buy-or-build-my-tms-platform
43. https://markets.financialcontent.com/concordmonitor/article/gnwcq-2025-9-10-highway-expands-certified-partnership-with-mcleod-software-to-include-digital-freight-matching (source dated 2025-09)
44. https://cloudsecurityalliance.org/blog/2025/09/25/the-salesloft-drift-oauth-supply-chain-attack-cross-industry-lessons-in-third-party-access-visibility (source dated 2025-09)
45. https://markets.financialcontent.com/clarkebroadcasting.mymotherlode/article/gnwcq-2025-11-18-otr-solutions-acquires-trucksmarter-factoring-and-banking-division-expanding-its-leadership-in-freight-finance-and-technology (source dated 2025-11)

**Codebase references (read-only probe, /tmp/ttw-probe):** `src/lib/hub/integrations/registry.ts` (ProviderSpec, allowlist derivation), `capability.ts` (chains + fallbacks, project44 note), `webhooks.ts` (HMAC + idempotent event ids), `docs/decisions/0002-application-level-tenant-isolation.md` (harness), `docs/decisions/0003-everything-app.md` (iframe/frame-ancestors reality, Toolbox frameable test, this research's mandate).

# The Customization Engine: flags, roles, and preferences without forking LoadOff
**Research date: 2026-08-07 · Prompt 3 of 8 · For the LoadOff owner and the AI build agents executing against this report**

Grounded against the live codebase at `/tmp/ttw-probe` (Next.js 16 App Router, Vercel Postgres, `hub.*` schema, 25 hub migrations, `carrier_id` tenancy, roles `owner/dispatcher/accountant/driver/broker/shipper`) and the accepted decision memo `docs/decisions/0003-everything-app.md` ("features as data, per-tenant flags, never forks").

## TL;DR

- **Build the flags table yourself; don't adopt a flag server.** Every credible OSS option (Unleash, Flagsmith, GrowthBook, FeatBit) is a separate service to run; the convergent schema is small enough to own. Homegrown Postgres + Vercel's MIT-licensed Flags SDK (flag keys in code, values from your DB) is the right fit for a solo founder on Vercel. [S1][S2][S3]
- **License gate clears:** OpenFeature JS SDK Apache-2.0, Vercel Flags SDK MIT, Unleash Apache-2.0, GrowthBook/PostHog/FeatBit MIT, Flagsmith BSD-3. **Flipt is excluded — v1 is GPL-3.0, and current Flipt v2 uses the non-open Fair Core License (FCL; each version becomes MIT only 2 years after release) (corrected on verification).** No AGPL landmines found among the majors. [S1][S5]
- **Critical codebase finding:** "small-carrier mode" is a **global env var** (`SMALL_CARRIER_MODE` in `src/lib/hub/navigation.ts:121`) — it applies to every tenant at once. The moment carrier #2 signs, it breaks. Migrating it into a per-tenant flag row is the natural first flag and a ~1-day job.
- **Convergent schema:** flag key + scope (global/tenant/role/user) + JSONB value + enabled + expiry + audit. One overrides table; flag *definitions live in code* (typed registry — the same house pattern as `navigation.ts` and `workbench.ts`). Resolution: user > role > tenant > global > code default. Full SQL in the Deliverable.
- **Per-driver app language is the highest-evidence preference in trucking:** ~150,000 Punjabi/Sikh truckers in the US (~40% of California drivers per NAPTA), Hispanic drivers 23% of the workforce and rising (ATRI 2025). Competitors already ship it: TruckX in English/Punjabi/Spanish/Hindi (2024), Samsara per-user EN/FR/ES since 2018, Motive EN/FR/ES. [S13][S15][S16][S17][S18]
- **ELP nuance:** since 2025-06-25, failing roadside *English* proficiency is an out-of-service violation (49 CFR 391.11(b)(2)). That governs roadside interaction, not app UI — a Punjabi/Spanish app remains legal, valuable, and is exactly what competitors sell. Don't let anyone talk you out of it citing ELP. [S19][S20]
- **Role-based UI:** the industry pattern is admin-assigns + user-fine-tunes: Salesforce Lightning App Builder assigns pages per app/profile; users personally pin/reorder nav (admin can disable personal nav). LoadOff's nav + workbench registries are already 80% of a tile registry — extend, don't rebuild. [S9][S10]
- **What small-fleet TMS users actually want to customize** (from reviews): invoice/document templates and reports — the two recurring Tailwind TMS complaints. What they ignore: deep workflow config; Truckbase wins reviews precisely for *not* having it. [S11][S12]
- **The trap is real and well-documented:** 37signals "Avoid Preferences" (every preference has a price), Hadlow's Configuration Complexity Clock (rules engines/DSLs circle back to "hard-coding in a crappier language" — a direct warning for pay-rules-as-data), Hodgson/Fowler (flags are inventory with carrying cost; expire them), Knight Capital ($460M in 45 min from a *reused* flag). [S21][S22][S23][S24]
- **Bottom line:** ship the flags table + per-tenant small-carrier mode first (days, not weeks), then driver language, per-role dashboard tiles, and notification granularity. Say no to custom workflow states and formula builders — rename labels, never add states.

---

## Task 1 — Feature-flag / entitlement systems for multi-tenant SaaS in 2026

### The three options for a solo founder

**Option A — Paid SaaS (LaunchDarkly, ConfigCat, Statsig, DevCycle).**
LaunchDarkly's paid tiers start around **$10–12/seat/month** (Developer plan; free tier exists but is limited) [S6][S7]. PostHog bundles ~**1M free flag requests/month** into its free tier [S8]. These earn their keep when you need experimentation, percentage rollouts across many services, and a non-engineer flag console on day one. For a single Next.js app with one developer (you + AI agents), they add: an external dependency in the request path, a second place where truth lives, per-seat cost, and a vendor's user/context model you must map `carrier_id` into (ConfigCat's own guidance: pass `Tenant_ID` as a custom attribute on every evaluation — i.e., even paid tools reduce to "tenant id + rules," and they explicitly warn flags are *not* a security/tenancy boundary) [S4]. **Verdict: not now.**

**Option B — Self-hosted OSS flag server (Unleash, Flagsmith, GrowthBook, FeatBit, Flipt, FeatureHub).**
License check (all verified against the 2026 GrowthBook comparison and project repos, 2026-08-07) [S1]:

| Tool | License | CI license gate (MIT/Apache only) | Runs as |
|---|---|---|---|
| Unleash | Apache-2.0 | PASS | Node server + Postgres (free self-host: 1 project / 2 envs) |
| GrowthBook | MIT | PASS | Docker service (+ data warehouse for experiments) |
| PostHog | MIT (core) | PASS | Heavy Docker/K8s stack, or their cloud |
| FeatBit | MIT | PASS | Docker + Postgres |
| FeatureHub | Apache-2.0 | PASS | Docker/K8s |
| Flagsmith | BSD-3-Clause | *Permissive but not MIT/Apache — needs an explicit gate exception* | Docker |
| **Flipt** | **GPL-3.0 (v1); FCL-1.0 with 2-yr delayed MIT (v2) (corrected on verification)** | **FAIL — excluded** | single binary |

The pattern: every one of these is **another service to deploy, patch, back up, and pay hosting for** — to serve reads out of a table you already run (Vercel Postgres). For one app + one database + one developer, an OSS flag *server* is pure operational overhead. **Verdict: no.**

**Option C — Homegrown Postgres table behind a thin, standard interface. RECOMMENDED.**
Two MIT/Apache building blocks make homegrown *not* a dead end:

- **Vercel Flags SDK** (`flags` package) — **MIT** [S2], built for Next.js App Router (also Pages Router and middleware) [S3]. Flags are **declared in code** (`flag({ key, decide() })`); `decide()` is yours — it reads `hub.feature_flags` with the session's `carrier_id`/`user_id`/`role`. Server-only evaluation (no client loading flicker), works "with any flag provider, custom setups or no flag provider at all" [S2]. Adapters exist for LaunchDarkly/Statsig/etc. if you ever outgrow the table — the call sites don't change [S3].
- **OpenFeature** — the CNCF-incubating vendor-neutral spec; JS SDK is **Apache-2.0** [S5]. Its whole design is that a "provider" resolves flags and can "call a bespoke flag evaluation REST API, or even parse some locally stored file" — writing a custom provider over your own DB is a documented, first-class path [S5a]. For a one-app stack, OpenFeature adds an abstraction layer you don't need yet; adopt the *shape* (flag key + evaluation context + typed default), skip the dependency until a second consumer (mobile shell, external service) appears.

**Where teams converge on schema** (synthesis of Hodgson's reference article, ConfigCat's tenant-targeting guidance, and the OSS tools' data models [S4][S5a][S23]): flag definitions with **key, type, description**; per-target **overrides** with **scope (global / tenant / role / user), value (boolean or JSONB variant), enabled**; **created_by / timestamps / audit trail**; and — the discipline most teams bolt on too late — **expiry** for release-type flags. Hodgson's hierarchy puts "application database with an admin UI" as the standard once you outgrow static config [S23]; you are already there, because the audience for the admin UI is *you and each carrier's owner-admin*.

**Entitlements vs flags** (worth keeping distinct in your head): *flags* are operator-owned switches (rollout, kill, per-tenant enablement); *entitlements* are what a tenant's plan permits (seat counts, module access tied to billing). At LoadOff's stage they can share the same table with `flag_type='permission'` rows; split into a `plan_entitlements` table only when pricing tiers exist. (Inference from standard practice; the flags/entitlements split is the model paid tools like Stigg/Schematic sell.)

---

## Task 2 — Role-based UI composition: how the best B2B apps do it

### The named patterns worth copying

1. **Admin assigns layouts by role; the assignment is data.** Salesforce Lightning App Builder is the canonical version: admins build Home/Record pages from a component palette, then activate a page as org default, **app default, or per app + record type + profile** (their word for role) — most-specific assignment wins [S9]. That's exactly LoadOff's "per-role dashboard tiles" backlog item: a tile registry + an assignment table, not a page builder.
2. **Users personalize navigation; admins can turn personalization off.** Salesforce lets end users **rename, reorder, and pin tabs** in the nav bar, with documented admin controls to disable personal nav when standardization matters [S10]. Pattern: nav registry (LoadOff has this — `src/lib/hub/navigation.ts`) + a per-user `pinned[]/order[]` preference that *filters/reorders* the registry, never invents entries.
3. **Dashboard = registry of tiles + per-role default set + per-user tweaks.** Jira dashboards/gadgets and HubSpot custom views follow the same three-layer model. The 2026 multi-role B2B UX literature converges on designing **per-role home screens** ("the dispatcher's first screen is not the accountant's") rather than one dense dashboard with permissions sprinkled on [S25].
4. **Composition, never authorization.** Hiding a tile or nav item is UX; route-group access control stays server-side. (ConfigCat states this plainly for flags: targeting "is a configuration mechanism, not a security boundary" [S4].) LoadOff already has separate route groups per surface — keep enforcement there.

### What small-fleet TMS users actually customize vs ignore

Review evidence is thin but consistent (this is the weakest-evidence section; treat directionally):

- **They want to customize documents and reports.** Recurring verified Tailwind TMS complaints: "the software lacks the ability of end-user customization of documents," "definite reporting limitations as well" (Operations Manager, 4/5) — invoice/document templating and report shaping are the customization gaps users actually name [S11].
- **They ignore deep configuration.** Truckbase — the small-fleet darling — is praised for "focus[ing] on core, essential tools, helping you avoid paying for extras that don't add value"; the same review notes its customization/report options "might feel somewhat limited" *without treating that as disqualifying* [S12]. Small fleets buy speed-to-value, not config surface.
- **Inference (labeled):** for a 1–10-truck carrier, the customization that gets used is: invoice/doc branding and terms, which columns/tiles they see, who gets which alert, and language. Workflow customization (custom statuses, custom fields, approval chains) is enterprise-TMS territory (McLeod/TMW) and goes unused or becomes consultant-ware at this fleet size.

---

## Task 3 — Per-user preferences that matter in trucking (evidence, not vibes)

### Language — the big one

- **Punjabi:** ~**150,000** Sikh/Punjabi truck drivers in the US (Sikhs Political Action Committee, via FreightWaves), and NAPTA's claim that **~40% of California truckers are Sikh** [S13]. India's Tribune (2025) uses the same 1.5-lakh (150k) figure in coverage of federal scrutiny of Punjabi drivers [S14]. The community skews owner-operator/small-fleet — precisely LoadOff's tenant profile.
- **Spanish:** Hispanic drivers grew from **19% to 23%** of the driver workforce 2014→2023 (ATRI, July 2025 report) [S15]; TruckX cites 17.9% and foreign-born drivers **doubling to ~720,000** by 2021 [S16]. (BLS CPS table 11 is the canonical annual source; page live as of 2026-08-07 [S26].)
- **Competitors treat driver-app language as table stakes:** TruckX ships its ELD/driver app in **English, Punjabi, Spanish, Hindi** and markets it explicitly as an onboarding/compliance win (June 2024) [S16]; **Samsara has offered per-user language choice (EN/FR/ES) across dashboard and driver app since October 2018** — "Every Samsara user now has the ability to choose the language their account uses" [S17]; Motive supports EN/FR/ES in the driver app (per-device setting) [S18]. Samsara's per-*user* model is the right one; Motive's per-device model is the cautionary one.
- **The ELP caveat, stated precisely:** effective **2025-06-25**, a driver who can't demonstrate English sufficiently (signs, official inquiries, records — 49 CFR 391.11(b)(2)) is placed **out of service**; it enters the printed OOS criteria 2026-04-01 [S19], and Congress has since mandated FMCSA codify it [S20]. This regulates the *roadside interaction*, not your app's UI language. Practical product read: Punjabi/Spanish UI lowers errors and training time (TruckX's exact pitch [S16]), while an English-first *glossary* of inspection/HOS terms inside the driver app is a genuinely differentiating compliance-help feature in the current enforcement climate. No rule prevents multilingual UI. (Verified against CVSA notice; the "app language is unregulated" conclusion is inference from the rule's text.)

### The rest of the preference set

- **Default landing screen:** no trucking-specific public data; strong analog evidence from Salesforce-class products where role-based home pages + personal defaults are standard admin practice [S9][S10]. Cheap to ship; pairs with roles (driver lands on today's load; accountant on invoices aging).
- **Notification granularity:** driver apps and fleet dashboards uniformly expose per-alert-type routing (Samsara/Motive settings surfaces [S17][S18]); alert fatigue is the stated rationale in fleet-software materials. For LoadOff: a per-user matrix of event-type × channel (push/SMS/email) with role-sensible defaults. (Pattern evidence, not adoption data — labeled inference.)
- **Units/formats:** for US interstate carriers, miles/gallons are universal; the preferences that actually vary are **time zone** (dispatch across zones), date format, and currency display for Canada-crossing carriers. Low priority; make them *tenant*-level defaults with no user override until someone asks. (Inference.)
- **Theme/appearance:** already shipped (HubAppearanceMenu) — the memo's own "shipped and easy to miss" list confirms demand was satisfied cheaply. Extend nothing here.

---

## Task 4 — The trap: customization debt

The literature is unusually unanimous. Four load-bearing sources and one synthesis:

1. **37signals, *Getting Real*, "Avoid Preferences":** "Preferences are a way to avoid making tough decisions" — each one carries code, testing, and design cost ("each one has a price"), and untested preference *combinations* breed bugs. Their alternative: pick opinionated defaults and adjust only on real feedback [S21]. LoadOff's shipped choices (three palettes, not a theme builder; one small-carrier mode, not per-item nav config) already follow this.
2. **Mike Hadlow, "The Configuration Complexity Clock" (2012):** hard-coded → config values → rules engine → DSL → "we're back where we started… hard coding everything, except now in a much crappier language" [S22]. **Direct relevance:** pay-programs-as-JSONB is at "rules engine o'clock." That's the right stop — the essay's warning is against the *next* click (a pay-rule DSL, a formula builder, per-carrier scripting). Do not build a language.
3. **Pete Hodgson on martinfowler.com, "Feature Toggles":** flags fall into four types (release / experiment / ops / **permissioning**) with different lifespans; "savvy teams view their Feature Toggles… as inventory which comes with a carrying cost" — put expiration dates on release flags, add removal tasks when creating them, cap the number in flight [S23]. Only permissioning flags (your per-tenant module switches) are allowed to live for years.
4. **Knight Capital (2012):** $460M lost in 45 minutes, root-caused to **repurposing an old feature flag** whose dead code path was still live on one unpatched server [S24]; the incident is the standard citation for "stale flags are ticking time bombs" [S24a]. House rule: never reuse a flag key; delete flag + dead code together.

**Heuristics — configurable vs opinionated (the decision filter for every future "can we make this an option?"):**
- **Configure only where tenants demonstrably differ** (pay programs, invoice terms, language, fleet size). If you can't name two real carriers who need different values, hard-code it.
- **Prefer data > flag > preference > fork.** A new column-mapping row beats a flag; a per-tenant flag beats a per-user preference; nothing ever forks (house pattern, memo 0003).
- **Defaults are the product.** Every preference must be ignorable — the app fully works if nobody opens Settings (37signals) [S21].
- **Every non-permission flag gets an owner and an expiry** enforced by the schema below (Hodgson) [S23].
- **Labels, not logic.** Let tenants rename ("Settlement" vs "Pay Statement"), never let them add workflow states or write expressions (Hadlow) [S22].
- **Instrument options; delete unused ones.** An option nobody has flipped in 6 months is debt with zero interest income.
- **Never reuse a flag key** (Knight) [S24].

---

## Deliverable — ranked customization features + the flags-table schema

### Ranked list (impact × effort, scoped)

Effort assumes AI build agents against the existing codebase: **S** ≈ ≤1 agent-day, **M** ≈ 2–4 days, **L** ≈ 1–2+ weeks. Ranked by impact-per-effort.

| # | Feature | Scope | Impact | Effort | Why / evidence |
|---|---|---|---|---|---|
| 1 | **`hub.feature_flags` table + shell reads it** (via Vercel Flags SDK `flag()` wrappers); migrate `SMALL_CARRIER_MODE` from env var to a per-tenant `permission` flag | tenant | **High** — unblocks every row below; fixes the multi-tenant bug where one env var trims *every* carrier's nav | **S** | Env var found at `src/lib/hub/navigation.ts:121`; memo 0003 names this backlog item; schema below [S2][S3][S23] |
| 2 | **Per-driver app language — English, Punjabi, Spanish** (driver surface first, not the whole office UI) | user | **High** — 150k Punjabi truckers / 40% of CA; Hispanic 23% and rising; competitors ship it and sell on it | **M–L** (string extraction is the cost; driver surface is the smallest route group — start there) | [S13][S15][S16][S17]; ELP caveat handled — UI language is unregulated [S19] |
| 3 | **Per-role dashboard tiles** — tile registry + per-role default set, owner-admin can toggle/reorder per role | role | **High** — dispatcher/accountant/driver see different first screens; the #1 named backlog item | **M** — KPI tiles exist (`src/lib/hub/kpi.ts`); pattern = Lightning page-per-profile as data [S9][S25] |
| 4 | **Notification granularity** — per-user event-type × channel matrix with role-sensible defaults | user | **High** — alert fatigue is the top reason drivers ignore apps; standard in Samsara/Motive | **M** | [S17][S18] (pattern evidence, labeled) |
| 5 | **Invoice/document template options** — remit-to, footer/terms text, logo placement, column toggles on PDFs (extends existing `carrier_settings.invoice`) | tenant | **High** — the single most-named customization gap in small-TMS reviews | **M** | Tailwind complaints [S11]; `carrier_settings` JSONB already seeds `invoice.prefix/terms` |
| 6 | **Default landing screen** — per-user pick from allowed-per-role list; role default otherwise | user | **Med** — small daily time-save, big perceived-polish win | **S** | Salesforce home-page-per-profile analog [S9][S10] |
| 7 | **Nav pinning + per-tenant module hiding** — user pins/reorders within the nav registry; owner-admin hides whole modules per tenant (supersedes binary small-carrier mode) | user + tenant | **Med** — turns small-carrier mode from a switch into a dial | **S–M** — registry exists; add per-user `pinned[]` + per-tenant hidden set (flag rows) | Salesforce personal nav pattern [S10] |
| 8 | **Saved views/filters per user** on dispatch board and loads list (columns, filters, sort as named views) | user | **Med** — HubSpot/Jira's most-used personalization; addresses "reporting limitations" complaints cheaply | **M** | [S11][S25] |
| 9 | **Terminology labels** — tenant renames a bounded set of nouns ("Settlement"/"Pay Statement", "Load"/"Trip") via a label map; **explicitly not** custom statuses | tenant | **Low–Med** — delights Punjabi-community carriers with familiar vocabulary; cheap because it's labels-only | **S–M** | Bounded by Hadlow's warning [S22] |
| 10 | **Time zone + date-format defaults** per tenant (user override deferred) | tenant | **Low** — matters for multi-zone dispatch; near-zero until carrier #2 in another zone | **S** | Inference; ship inside `carrier_settings` |

**Deliberate anti-features (refuse politely, cite this report):** custom workflow states, per-tenant formula/DSL builders for pay or rating, per-user theme *builders*, embedding third-party pages per tenant (memo 0003 already settled that). Each is the Complexity Clock's next click [S22] and the fork the house pattern forbids.

### The flags-table schema recommendation (SQL, house conventions)

Matches the codebase: `hub` schema, `carrier_id` tenancy, role CHECK list from `hub.users`, audit via existing `hub.audit_log` (entity_type `'feature_flag'`, old/new JSONB), Postgres 15+ (`NULLS NOT DISTINCT` is available on Vercel Postgres/Neon). Flag **definitions stay in code** (a typed registry module like `navigation.ts`, wrapped in Vercel Flags SDK `flag()` calls whose `decide()` reads this table); the table stores only **overrides**, so an empty table means "code defaults everywhere" and the app never breaks on a missing row.

```sql
-- migrations/hub/025_feature_flags.sql
CREATE TABLE IF NOT EXISTS hub.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    TEXT NOT NULL,            -- dot-namespaced, defined in code: 'nav.small_carrier_mode'
  flag_type   TEXT NOT NULL DEFAULT 'permission'
              CHECK (flag_type IN ('release','ops','permission','experiment')),
  scope       TEXT NOT NULL CHECK (scope IN ('global','carrier','role','user')),
  carrier_id  UUID REFERENCES hub.carriers(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('owner','dispatcher','accountant','driver','broker','shipper')),
  user_id     UUID REFERENCES hub.users(id) ON DELETE CASCADE,
  value       JSONB NOT NULL DEFAULT 'true'::jsonb,  -- boolean flags: true/false; variants: any JSON
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,          -- kill row without deleting history
  note        TEXT NOT NULL DEFAULT '',               -- why this override exists (owner-facing)
  expires_at  TIMESTAMPTZ,                            -- REQUIRED in app code for 'release'/'experiment'
  created_by  UUID,                                   -- hub.users.id of the admin who set it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_flags_target_shape CHECK (
    (scope = 'global'  AND carrier_id IS NULL     AND role IS NULL     AND user_id IS NULL) OR
    (scope = 'carrier' AND carrier_id IS NOT NULL AND role IS NULL     AND user_id IS NULL) OR
    (scope = 'role'    AND role IS NOT NULL       AND user_id IS NULL) OR  -- carrier_id NULL = all tenants' role
    (scope = 'user'    AND user_id IS NOT NULL    AND role IS NULL)        -- carrier_id optional guard
  )
);

-- one override per key per exact target (Postgres 15+)
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_target_uq
  ON hub.feature_flags (flag_key, scope, carrier_id, role, user_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS feature_flags_carrier_idx ON hub.feature_flags (carrier_id) WHERE carrier_id IS NOT NULL;
```

**Resolution order (implement in the `decide()` helper, most specific wins):**
`user` → `carrier`+`role` → `role` (all-tenant) → `carrier` → `global` → **code default**. Skip rows where `enabled = false` or `expires_at < NOW()`. Evaluate server-side only (App Router server components/route handlers) so values are consistent per request [S3]; cache per-request, not per-process.

**Companion table — user preferences are not flags** (flags are operator-owned; preferences are user-owned; mixing them is how audit trails rot). Mirror of the existing `carrier_settings` pattern:

```sql
CREATE TABLE IF NOT EXISTS hub.user_preferences (
  user_id    UUID PRIMARY KEY REFERENCES hub.users(id) ON DELETE CASCADE,
  prefs      JSONB NOT NULL DEFAULT '{}',   -- { "language": "pa", "landing": "/hub/dispatch",
                                            --   "nav_pinned": [...], "notifications": { ... } }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Audit:** on every flags write, append to `hub.audit_log` (`entity_type = 'feature_flag'`, `entity_id = flag_key`, old/new JSONB) — the table and index already exist (`migrations/hub/001_foundation.sql:232`). **Hygiene rules enforced in CI:** a Vitest check that every `flag_key` in the DB exists in the code registry (kills zombie flags), and that `release`/`experiment` definitions carry an expiry — Hodgson's "inventory with carrying cost" made mechanical [S23]; never reuse a retired key [S24].

---

## Sources

1. [S1] GrowthBook — "8 Best Open-Source Feature Flagging Tools Compared [2026]" (licenses: GrowthBook MIT, Unleash Apache-2.0, Flagsmith BSD-3, PostHog MIT, Flipt GPL-3.0, FeatureHub Apache-2.0, FeatBit MIT) — https://www.growthbook.io/blog/best-open-source-feature-flagging-tools-compared (verified 2026-08-07)
2. [S2] vercel/flags GitHub repo — MIT license; "works with any flag provider, custom setups or no flag provider at all" — https://github.com/vercel/flags (verified 2026-08-07)
3. [S3] Flags SDK docs — flags-as-code, `decide()`, App Router support, server-only evaluation — https://flags-sdk.dev/ (verified 2026-08-07)
4. [S4] ConfigCat — "Multi-Tenant Feature Flags: How to Target Features by Tenant" (stable `Tenant_ID` in evaluation context; flags are not a security boundary) — https://configcat.com/blog/how-to-target-features-by-tenants/ (verified 2026-08-07)
5. [S5] OpenFeature JS SDK — Apache-2.0; server/web/React packages — https://github.com/open-feature/js-sdk (verified 2026-08-07); [S5a] custom provider concept ("bespoke flag evaluation REST API… locally stored file"), CNCF incubating — https://openfeature.dev/docs/reference/concepts/provider/ (verified 2026-08-07)
6. [S6] LaunchDarkly pricing overview — ~$12/seat paid entry — https://launchdarklypricing.com/ (verified 2026-08-07)
7. [S7] GrowthBook — "LaunchDarkly Pricing 2026" — https://www.growthbook.io/insights/launchdarkly-pricing (source dated 2026)
8. [S8] BuildMVPFast — "Feature Flag Pricing Comparison (July 2026)" (PostHog free flag-request tier) — https://www.buildmvpfast.com/api-costs/feature-flags (source dated 2026-07)
9. [S9] Salesforce Trailhead — Lightning App Builder: record-page activation as org/app/app+record-type+**profile** default — https://trailhead.salesforce.com/content/learn/modules/lightning_app_builder/lightning_app_builder_recordpage (verified 2026-08-07)
10. [S10] Salesforce Help — "Personalized Navigation Considerations" (users rename/reorder/pin nav items; admin can disable) — https://help.salesforce.com/s/articleView?id=sf.user_userdisplay_tabs_lex_considerations.htm (verified 2026-08-07)
11. [S11] Capterra UK — Tailwind TMS verified reviews ("lacks the ability of end-user customization of documents… definite reporting limitations") — https://www.capterra.co.uk/reviews/23260/tailwind-tms (verified 2026-08-07)
12. [S12] EMPWR Trucking — Truckbase TMS review ("focuses on core, essential tools… customization options might feel somewhat limited") — https://www.empwrtrucking.com/freight-technology/truckbase-tms-review-simplifying-small-fleet-management/ (verified 2026-08-07)
13. [S13] FreightWaves — "Punjabis and their rise as an Indian-origin trucking community in the US" (~150,000 Sikh truckers per SPAC; NAPTA: 40% of California truckers) — https://www.freightwaves.com/news/punjabis-and-their-rise-as-an-indian-origin-trucking-community-in-the-us (source dated 2018-09; figures still the community-standard citation)
14. [S14] The Tribune (India) — "Punjabi truckers, 1.5 lakh in US, face intense federal scrutiny…" — https://www.tribuneindia.com/news/diaspora/punjabi-truckers-1-5-lakh-in-us-face-intense-federal-scrutiny-as-44-pc-driving-schools-fail-rules/ (source dated 2025)
15. [S15] FreightWaves — ATRI "Evolving Truck Driver Demographics" (Hispanic drivers 19%→23%, 2014→2023; report released 2025-07-15) — https://www.freightwaves.com/news/atri-report-examines-evolving-truck-driver-demographics (source dated 2025-07)
16. [S16] TruckX — "ELD and Fleet Management App in Punjabi & Spanish" (EN/PA/ES/HI app; 17.9% Hispanic workforce; foreign-born drivers 315,981→~720,000, 2000→2021) — https://truckx.com/eld-in-two-new-languages/ (source dated 2024-06)
17. [S17] Samsara — "Now Available: Samsara Dashboard in Spanish and French" ("Every Samsara user now has the ability to choose the language their account uses") — https://www.samsara.com/ca/blog/now-available-samsara-dashboard-in-spanish-and-french (source dated 2018-10)
18. [S18] Motive Help Center — "Switch Languages in the Driver App" (EN/FR/ES; per-device) — https://helpcenter.gomotive.com/hc/en-us/articles/6176810133661-Switch-Languages-in-the-Driver-App-for-Android (verified 2026-08-07)
19. [S19] CVSA — ELP non-compliance becomes an out-of-service violation, effective 2025-06-25; printed OOS criteria 2026-04-01; 49 CFR 391.11(b)(2) — https://cvsa.org/news/elp-oosc-06252025/ (verified 2026-08-07)
20. [S20] CDLLife — Congress mandates FMCSA codify ELP-failure OOS — https://cdllife.com/2026/congress-mandates-fmcsa-regulation-change-so-english-proficiency-failure-triggers-out-of-service-order-for-cdl-drivers/ (source dated 2026)
21. [S21] 37signals, *Getting Real* — "Avoid Preferences" ("Preferences are a way to avoid making tough decisions"; "each one has a price") — https://basecamp.com/gettingreal/06.4-avoid-preferences (verified 2026-08-07)
22. [S22] Mike Hadlow — "The Configuration Complexity Clock" ("hard coding everything, except now in a much crappier language") — https://mikehadlow.blogspot.com/2012/05/configuration-complexity-clock.html (source dated 2012-05)
23. [S23] Pete Hodgson, martinfowler.com — "Feature Toggles" (four toggle types; toggles as inventory; expiration/removal discipline) — https://martinfowler.com/articles/feature-toggles.html (source dated 2017-10)
24. [S24] Doug Seven — "Knightmare: A DevOps Cautionary Tale" (repurposed flag, $460M/45 min) — https://dougseven.com/2014/04/17/knightmare-a-devops-cautionary-tale/ (source dated 2014-04); [S24a] FlagShark — "The $460M Feature Flag: Stale Flags Are Ticking Time Bombs" — https://flagshark.com/blog/460-million-dollar-feature-flag-knight-capital/ (verified 2026-08-07)
25. [S25] DAR Design — "Multi-Role B2B Product UX in 2026: roles, flows, permissions" (role-first home screens) — https://dardesign.io/blog/multi-role-b2b-saas-ux-roles-permissions-flows (source dated 2026)
26. [S26] BLS Current Population Survey, Table 11 (occupation by sex/race/ethnicity; canonical source for "Driver/sales workers and truck drivers" demographics; 2025 annual-averages page live) — https://www.bls.gov/cps/cpsaat11.htm (verified 2026-08-07)

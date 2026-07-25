# thindtransport.com — design direction

**Status:** awaiting approval. No component code until this is signed off.
**Branch:** `redesign/landing-soul` · **Scope:** public marketing only. `/hub`, the driver PWA, `src/lib/**` and `migrations/**` are untouched.

---

## 0. Corrections to the brief — read first

I audited every claim before designing. Most hold. Four don't, and one is materially worse
than described. Flagging rather than shipping around them.

| Brief says | Reality | Consequence |
|---|---|---|
| "No display typeface. Everything is one sans." | **Barlow Condensed is loaded** as `--font-display` and used on headings (`src/app/layout.tsx:14`). | The problem isn't a missing display face — it's that the type *scale* is hand-set (nine arbitrary values in `tailwind.config.ts`), so nothing relates. Fixing the scale, keeping the face. |
| "Shippers only exist as a footer link." | `/shippers` **is** in the nav (`Navbar.tsx:40`) — buried in the *Company* dropdown. | Recommendation stands: promote to top level. A revenue door doesn't belong under "Company". |
| "The logo marquee shows Amazon, Walmart…" | Not a marquee. `FreightYouKnow.tsx` renders **twelve trademark SVG logos**, and there are two *further* claim sets the brief didn't catch. | See below — this is the biggest liability on the site. |
| "Four contradicting earnings claims." | **Six+**: `$57K–$63K`, `$63K–$73K`, `$69K–$82K`, `$55K–$72K`, `$65K–$280K`, `$150K–$250K`, `$180K–$280K`, plus the calculator. | Same fix, larger surface. |

**The escalation.** Beyond the logos, two things assert relationships as fact:

- `PREMIER_BROKERS` (`constants.ts:124`) assigns **invented status tiers** to real companies —
  "Landstar Inway · *Premier Partner*", "C.H. Robinson · *Diamond Carrier*", "Schneider National ·
  *Elite Partner*". These are fabricated designations attributed to named third parties.
- `MAJOR_CLIENTS` (`constants.ts:136`), rendered **in the footer of every page**, claims tenure:
  "Amazon Logistics — 4+ years", "Walmart Supply Chain — 3+ years", "Target Corporation — 2+ years".
- The FAQ states it in prose too: *"dedicated lanes with premium shippers like Amazon, Walmart, Home
  Depot"* and *"partnered with top brokers including Landstar, CH Robinson, JB Hunt…"*

I cannot verify any of it, and a false statement of a commercial relationship is a bigger problem
than a logo. **Recommendation: remove all three sets.** If any relationship is real and
documentable, tell me which and I'll reinstate it in plain text with the substantiation. Default is
removal. Nothing here should ship on the assumption that it's probably fine.

---

## 1. Palette

The brief's challenge: near-black + one bright accent is an AI default — justify it or replace it.
**I'm replacing it.** That's the one real aesthetic risk in this direction, and it's argued below.

### The move: invert to a paper ground

Every driver-recruiting site in this category is a dark page with a hero photo and a hot accent.
Going light is the single most differentiating decision available, and four business reasons back it:

1. **Where it's actually read.** Drivers open this on a phone, outdoors, in a cab, in daylight.
   Light grounds win in sunlight; dark UI is the worse choice for the actual reading condition.
2. **The page's job is numbers.** The earnings calculator is the signature. Financial instruments
   read as credible on paper, not on black — think a settlement statement, not a gaming site.
3. **It lets photography be the dark.** A real golden-hour shot of the Kent yard *pops* against
   paper. On a near-black page, a dark photo disappears into the background — which is exactly what
   is happening now, and why the site reads flat.
4. **It solves the flagged default** without touching the brand red, which the owner has explicitly
   and repeatedly endorsed.

Dark is retained deliberately — as full-bleed inverted bands (hero photo, founder's note). Dark
becomes *punctuation* instead of the paper. That's rhythm, which is the actual diagnosis.

**Alternatives considered and rejected:** (a) *keep near-black, change only the accent* — leaves the
flagged default in place and keeps photography buried; (b) *cream + serif + terracotta* — the brief
names this as an AI default, and warm editorial cream is wrong for a freight company in the Pacific
Northwest.

### Tokens

Defined in OKLCH, emitted as hex. Named for the business, not for their values.

| Token | Hex | What it is |
|---|---|---|
| `paper` | `#F6F7F7` | The ground. Cool-neutral off-white — a printed rate confirmation, not cream. |
| `ink` | `#141618` | Body and headings. Graphite, no blue cast (an explicit prior owner decision). |
| `ink-2` | `#4E5257` | Secondary copy. |
| `ink-3` | `#6B7075` | Meta, captions, rules. |
| `signal` | `#C42820` | The brand red on paper. One accent, kept. |
| `signal-up` | `#EC5A50` | The same red lifted for inverted bands. |
| `asphalt` | `#1C1F22` | Inverted band ground — wet asphalt, distinct from `ink` so bands read as a surface. |
| `cedar` | `#1E6B4F` | **Data only.** Positive figures in the calculator. Never brand chrome. |

### Computed contrast — every pair, measured not eyeballed

| Pair | Ratio | AA 4.5 | AA large 3.0 |
|---|---:|---|---|
| `ink` on `paper` | 16.90 | pass | pass |
| `ink-2` on `paper` | 7.33 | pass | pass |
| `ink-3` on `paper` | 4.66 | pass | pass |
| `signal` on `paper` | 5.33 | pass | pass |
| `cedar` on `paper` | 5.98 | pass | pass |
| `paper` on `signal` (button) | 5.33 | pass | pass |
| `paper` on `asphalt` | 15.42 | pass | pass |
| `signal-up` on `asphalt` | 4.84 | pass | pass |

UI boundaries (3:1): red border on paper 5.33 · hairline rule 4.66 · input border 7.33 — all pass.

> `ink-3` was `#6E7378` in my first pass and computed to **4.46** — it failed by 0.04 and I changed
> it rather than ship a token that fails. Every value above is the corrected set.

---

## 2. Type

**Correcting the brief:** the display face exists and is well chosen. Barlow Condensed is the
industrial-vernacular voice — DOT signage, truck door lettering, freight bills. It is *native* to
this business. Keeping it and stating why is the right call; replacing it would be change for its
own sake.

| Role | Face | Why |
|---|---|---|
| Display | **Barlow Condensed** (kept) | Freight vernacular. Already loaded — zero added bytes. |
| Body | **Source Sans 3** (kept) | Humanist, different family from the display grotesque, strong at small sizes. |
| Data | **Geist Mono** (reused) | Already a dependency via `geist`. The calculator is an instrument; instruments use tabular figures. |

Zero new font downloads — which matters, because we are 62% over the JS budget (§6).

### The scale — one ratio, no hand-set sizes

**Major third, 1.250, from a 16px base.** Chosen over 1.333 because the page is already far too
tall (§3); a perfect fourth would make it taller. Every step fluid via `clamp()` between 375px and
1440px.

| Step | rem | px | Use |
|---|---|---|---|
| −1 | 0.800 | 12.8 | legal, disclaimers |
| 0 | 1.000 | 16 | body |
| 1 | 1.250 | 20 | lede |
| 2 | 1.563 | 25 | h4 |
| 3 | 1.953 | 31 | h3 |
| 4 | 2.441 | 39 | h2 |
| 5 | 3.052 | 49 | h1 |
| 6 | 3.815 | 61 | display |
| 7 | 4.768 | 76 | hero display, ≥1024px only |

Line height inverse to size: 1.05 at step 7 → 1.15 at step 4 → 1.55 body → 1.65 long-form.
Measure enforced at `max-inline-size: 68ch` on prose.

---

## 3. Layout — breaking the twelve-beat repetition

The current homepage runs **17 sections, 21,142px tall at 390px — 25 phone screens** — in one
unvarying cadence (eyebrow → H2 → gray subhead → card grid). That repetition *is* the templated
feeling.

Four archetypes, deliberately alternated. (The brief asked for three; its own diagnosis names four
— full-bleed, asymmetric, dense data, quiet single-column — so I'm delivering four.)

```
A — FULL-BLEED EVIDENCE            B — ASYMMETRIC SPLIT (7/5)
┌────────────────────────────┐     ┌──────────────────┬─────────┐
│                            │     │ h2               │ ▓▓▓▓▓▓▓ │
│      photograph, edge      │     │ short prose,     │ ▓ inst- │
│      to edge, dark         │     │ 68ch measure     │ ▓ rument│
│                            │     │                  │ ▓ /media│
│  one line of type, bottom  │     │ → one link       │ ▓▓▓▓▓▓▓ │
└────────────────────────────┘     └──────────────────┴─────────┘
   the yard · the fleet              calculator · fleet · lanes

C — DENSE DATA                     D — QUIET SINGLE COLUMN
┌────────────────────────────┐     ┌────────────────────────────┐
│ label    label    label    │     │        (generous air)      │
│ ─────────────────────────  │     │   68ch of prose, centred   │
│ 1,234    $0.63     48      │     │   no card, no border,      │
│ ─────────────────────────  │     │   no eyebrow label         │
│ 1,180    $0.61     46      │     │        — Sukhdev           │
└────────────────────────────┘     └────────────────────────────┘
   comparison · IFTA · proof         founder's note · FAQ
```

**Mapping (17 sections → 9):**

| Current | Becomes |
|---|---|
| Hero + TrustStrip + ProfitCalculator | **One hero**: archetype B, calculator in the right pane |
| PhotoBand ×2 | **One** archetype A (the real yard, once we have it) |
| WhySwitch + RoutesSection + EquipmentSection | **One** archetype C comparison, single table |
| OperationSection + DispatchBand | **One** archetype B — "who answers the phone" |
| ThindPromise | Archetype D — founder's note, no card |
| SuccessStoriesSection | **deleted** (§0) |
| FreightYouKnow | **deleted** (§0) |
| FAQSection | Archetype D |
| QuickQualify + ApplicationForm | One conversion block, end of page |

Target: **9 sections, ≤ 12 phone screens.**

---

## 4. Signature — the calculator as an instrument

Agreeing with your instinct, and going further than "move it up": **the calculator becomes the
hero's right pane.** Not a section further down the page — the first thing on the site, beside the
headline.

It resolves four separate problems at once:

- **Three competing CTAs → one.** The hero's action becomes the calculator itself; "Apply" follows
  from a number the driver just watched compute for their own miles.
- **Template-y stat blocks disappear.** 90% / $0.63 / 2024 / 48 stop being static chips and become
  *live outputs* of the driver's own inputs.
- **It makes the earnings contradictions structurally impossible** (§0) — every figure on the site
  derives from this one methodology, because there is nowhere else for a number to come from.
- **It's the one thing no competitor has.** Leading with it is the whole argument.

Treatment: mono tabular figures, a hairline instrument frame, a single bar that moves, `cedar` for
the take-home figure. Reads like a settlement statement, not a lead-gen form.

---

## 5. Motion — one moment

**The moment:** hero load. The frame draws, the headline rises, then the calculator *boots* — its
figures roll from zero to the computed value on a staggered delay. One orchestrated sequence, then
the page is still.

Everywhere else, strictly: `IntersectionObserver`, ≤12px travel, 200ms, fires once, never re-runs on
scroll-up. The calculator is the one exception that keeps animating, because there the motion
carries meaning — numbers changing *is* the information.

`prefers-reduced-motion: reduce` disables all of it, including the count-up (figures render at final
value). Nothing animates above the fold before LCP.

**This also removes framer-motion from marketing entirely** (§6).

Tokens: durations `120 / 200 / 320ms`; easings `entrance cubic-bezier(.16,1,.3,1)`,
`exit cubic-bezier(.4,0,1,1)`, `emphasis cubic-bezier(.34,1.56,.64,1)`. Nothing uses bare `ease`.

---

## 6. The numbers — measured baseline

| Metric | Now | Budget | Gap |
|---|---:|---:|---|
| First-load JS (`/`, over the wire) | **291 KB** | 180 KB | **−111 KB** |
| CSS | 28 KB | — | |
| Page height @390px | 21,142px (25 screens) | ≤12 screens | −13 screens |
| Hardcoded hex in marketing components | **125** | 0 | |
| Arbitrary `[Npx]` values | **69** | 0 | |
| Marketing components marked `"use client"` | 28 | as few as possible | |

**How the 111 KB comes out** — framer-motion is used in **15 marketing files**, almost entirely for
fade-and-rise-on-scroll, which §5 replaces with ~1 KB of `IntersectionObserver` + CSS. Removing it
also lets most of those 15 become **server components** (they were only client-side for the
animation), which cuts JS again and helps LCP. Lenis smooth-scroll and the carousel go with the
sections that used them.

Full budgets from brief §11 (Lighthouse ≥95/100/95/100, LCP <2.0s, CLS <0.05, INP <200ms, 320→1920px,
200% zoom, iOS Safari + Chrome Android, safe-area insets) are the acceptance gate, reported
before → after in the PR.

I already own the tooling to enforce part of this: `npm run design-qa` (built earlier this month)
audits contrast, overflow and 44px targets across every route at three viewports, and currently
reports **0 hard failures** — that must stay 0 through the redesign.

---

## 7. Media plan

Deliverable `docs/design/SHOT_LIST.md` on approval. One afternoon, a phone, in this order:

1. **Fifteen trucks in the Kent yard, wide, golden hour.** The hero. Highest value single asset.
2. Rainier on the horizon from the yard — the geography nobody else can claim.
3. The dispatch desk, with the person who actually answers, mid-call.
4. Driver's-eye cab interior, one of the real Cascadias.
5. Details: rate con on the desk, hands on the wheel, mud flaps, trailer door, the yard gate.
6. 20–40s B-roll: trucks rolling, the phone being answered, a settlement printing.

Implementation: `next/image` with real `sizes`, AVIF/WebP, blur placeholder, explicit dimensions
(zero CLS); art-directed crops per breakpoint, not one image scaled; hero video `preload="none"`,
poster-first, lazy-attached, muted, `playsInline`, **swapped for the still under reduced-motion**;
real `alt` describing the frame.

**Until real photography exists, ship fewer images — not generated ones.** Honest space beats a fake
photo, and every current image is from `/images/generated/`.

---

## 8. Kill list

**Liabilities (§0):** `SuccessStoriesSection` (3 AI portraits, invented names/quotes) ·
`TestimonialsCarousel` (same fabricated names again) · `FreightYouKnow` (12 trademark SVGs) ·
`PREMIER_BROKERS` (invented partner tiers) · `MAJOR_CLIENTS` (invented client tenure, in the footer)
· the two FAQ answers asserting shipper and broker relationships.

**Duplicated DOM:** `WhySwitch` ships the comparison table **twice** (`md:hidden` at :95 and
`hidden md:block` at :140) · duplicate footer nav lists · marquee duplicate markup.

**Slop:** emoji in headings (`RoutesSection` "Home Weekly ⭐", "Highest Earnings 💰") · Title Case
"Choose Your Schedule, Choose Your Life" and the nav's "Ship With Us" → sentence case · redundant
hero CTAs (4 actions → 1) · static stat chips (absorbed into the calculator) · 8 sections merged
away (§3).

**Dependencies:** framer-motion, Lenis, embla-carousel from the marketing bundle.

**Token debt:** 125 hardcoded hex + 69 arbitrary px, replaced by the scale. A raw hex or px in a
component becomes a build-time bug — proven with a grep in the PR.

---

## 9. Architecture — four audiences, no persona gate

No "who are you?" modal, no four-way hero tabs, per the brief.

| Page | Audience | Their question | Action | State |
|---|---|---|---|---|
| `/` | Drivers + owner-ops | "What do I take home, and who answers?" | Apply / call | rebuild |
| `/shippers` | Shippers | "Capacity on my lane? Insured? On time?" | Request a quote | exists — rework + **promote to top-level nav** |
| `/brokers` | Brokers | "Can I onboard you fast?" | Download carrier packet | **new** |
| `/loadoff` | Carrier owners | "Will this run my fleet, what's it cost?" | Book a demo | exists — rework |
| `/fleet` `/routes` `/about` | Everyone | Proof and specificity | feed the four above | rework |

Homepage stays driver-first — seated trucks are the growth constraint. Each page ends with **one**
contextual link to the next most relevant page, not a footer dump. Light personalization only: a
shipper/broker UTM or `/shippers` referrer swaps the homepage subhead and primary CTA, server-rendered
by param — no layout shift, no flash. That is the ceiling.

---

## 10. Build order

1. Tokens in `tailwind.config.ts` + CSS custom properties (§1, §2, §5) — nothing visual yet.
2. `src/components/ui/` primitives: Button (4×3, all states, 1px active translate), Surface (3 tiers,
   **border-led** — decided, not mixed), Badge, Input (one field shared by calculator, pre-check and
   application), focus ring token. Existing primitives are extended, not duplicated: `button.tsx`,
   `card.tsx`, `input.tsx`, `badge.tsx`, `label.tsx` already exist.
3. Kill list §8 — deletions before additions, so the rebuild happens on a clean page.
4. Hero + calculator instrument (the signature).
5. Remaining sections into the four archetypes.
6. `/brokers`, then `/shippers` and `/loadoff` rework, then nav promotion + cross-links.
7. Budgets, Lighthouse, screenshots at 375/1440 + reduced-motion.

---

## 11. Open questions — I need answers before step 3

1. **The relationship claims (§0).** Are *any* of the Amazon / Walmart / Home Depot / Lowe's /
   Target / PepsiCo / JB Hunt / C.H. Robinson / Landstar / Schneider / Coyote / DAT / TQL / XPO /
   Uber Freight claims real and documentable? Default is remove-all.
2. **Testimonials.** Can you get three real drivers to give a quote + photo with written consent
   (best), or do I cut the section until you can (my recommendation for now)?
3. **The earnings methodology.** The calculator becomes the single source of truth — I need the
   inputs you'll stand behind: average loaded miles/week, deadhead %, fuel assumption, and which
   deductions come out. Everything displayed derives from those.
4. **The light-ground inversion (§1).** This is the aesthetic risk. Say yes and I build it; say no
   and I'll keep the dark ground and take the risk somewhere else — but the near-black default
   stays flagged.

---

## Output contract

```
PLAN:     docs/design/DIRECTION.md  (this file — awaiting approval)
KILLED:   6 liability components/data sets · duplicate table + footer nav ·
          framer-motion, Lenis, embla from marketing · 8 sections merged ·
          125 hex + 69 px literals            [KB confirmed at implementation]
BUILT:    pending approval
NUMBERS:  first-load JS 291 KB → target <180 KB · height 25 → ≤12 screens ·
          design-qa 0 hard failures (must hold) · Lighthouse pending
RISKS:    §0 — trademark logos, invented partner tiers, invented client tenure,
          fabricated testimonials, 6+ contradicting earnings figures.
          All flagged, none shipped around. Recommendation: remove; reinstate
          only what you can substantiate.
NEXT:     Answer §11 (esp. Q4, the light-ground call) → I start at build order step 1.
```

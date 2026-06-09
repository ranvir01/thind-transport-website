---
name: motion-and-animation
description: Animation and motion standards for the Thind Transport website using Framer Motion, Lenis smooth scroll, and Tailwind keyframes. Use when adding or editing animations, transitions, scroll effects, hover states, hero sections, or any moving UI element.
---

# Motion & Animation Standards

Stack (already installed — do not add new animation libraries): `framer-motion` v12, `lenis` (smooth scroll, wired in `src/components/cinematic/SmoothScroll.tsx`), Tailwind keyframes in `tailwind.config.ts` (`fade-in`, `slide-up`, `float`, `pulse-glow`, `marquee`), `tailwindcss-animate`.

## Core Rule: Motion Must Earn Its Place

Every animation must do one of these jobs, or it gets cut:
1. **Direct attention** to the conversion action (CTA, pay number, form step).
2. **Communicate hierarchy** (sections revealing in reading order).
3. **Give feedback** (button press, form submit, validation).
4. **Express the brand** (momentum/forward-motion = trucks rolling).

If a reviewer would call it a gimmick, it is one. No spinning logos, no parallax soup, no animation on body text.

## House Patterns

**Scroll reveal (default for sections):**
```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
>
```
- `once: true` always — re-triggering reveals on scroll-up feels broken.
- Stagger children with `delayChildren`/`staggerChildren` (0.08–0.12s), max ~5 staggered items.

**Hover (cards, buttons):** scale 1.02 max, 150–200ms, plus shadow token (`shadow-cta-hover`, `shadow-glow`). Translate, don't rotate.

**Numbers/stats:** count-up on first view only, ≤1.2s. Pairs with `gold` token.

**Marquees/tickers** (`Ticker.tsx`, freight logos): CSS `marquee` keyframe, pause on hover, duplicate content for seamless loop.

## Hard Constraints

- Animate only `transform` and `opacity` (GPU-composited). Never animate `width`, `height`, `top`, `left`, or `box-shadow` directly on scroll.
- Durations: micro-interactions 150–250ms, section reveals 500–700ms, nothing over 1.2s.
- Respect `prefers-reduced-motion`: use framer-motion's `useReducedMotion()` or the CSS media query — reveals become instant, marquees stop, video heroes show poster frame.
- Lenis: never nest a second smooth-scroll instance; anchor links must use Lenis's `scrollTo`.
- Scroll-linked effects must not cause layout shift (reserve space; CLS budget is 0.02).
- Mobile: halve stagger counts, prefer simple fades; test on a throttled CPU (4x) — dropped frames on scroll are a release blocker.

## Definition of "Up to Date, Not Gimmick"

Good: video hero with overlay fade-in, bento-grid hover lifts, scramble-text on one hero word (`ScrambleText.tsx`), sticky section transitions, count-up stats.
Bad: cursor-following blobs, tilt-on-hover everywhere, scroll-jacking, preloaders longer than 1s (`Preloader.tsx` must never block content beyond that), confetti.

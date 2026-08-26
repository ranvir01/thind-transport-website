# Open-source TMS landscape + dashboard/sidebar UX — what's worth taking

**2026-08-14.** Companion to the Datatruck teardown. Two questions: what do the
open-source TMS projects do that LoadOff doesn't, and what should the shell
(sidebar, dashboard, density) look like by current standards.

---

## 1. The licensing finding that governs everything else

Nearly every open-source TMS is copyleft or source-available. Against this
repo's standing rule — **MIT / Apache-2.0 / BSD only, never AGPL/GPL/SSPL** —
that decides how they can be used:

| Project | License | What that means here |
|---|---|---|
| **Fleetbase** (modular logistics OS, driver + storefront apps, extension framework) | **AGPL-3.0** (commercial license sold separately) | **Ideas only.** AGPL's network clause would force LoadOff's source open the moment it's served to a customer. Never vendor a line. |
| **LoadPartner TMS** (freight-broker TMS, Laravel) | **Fair Core License** — source-available, *not* OSI open source | Ideas only; FCL carries commercial-use restrictions. |
| **OpenTMS** (`fossabot/open-tms`, Node + React) | Alpha, small | Little to take; not a going concern. |
| **OpenWMS TMS** | Warehouse transport orders | Different problem domain (in-warehouse), not carrier ops. |
| **Traccar** (GPS/telematics server) | **Apache-2.0** | The one that *is* license-compatible — but LoadOff already has telematics via Terminal/TruckerCloud/Axle, so there's nothing to gain. |

Two consequences worth stating plainly:

- **"Just fork an open-source TMS" is not available to LoadOff.** The good
  ones are AGPL, and LoadOff is a commercial multi-tenant product. This is a
  strategic finding, not a technical one.
- Studying their *design* — what screens exist, how a workflow is arranged,
  what a module boundary looks like — is unrestricted. Interface concepts and
  feature ideas are not what copyright protects. Copying code, schema DDL, or
  UI copy is. Keep to the former.

## 2. Feature concepts worth taking

**From Fleetbase — the extension/module framework.** Their strongest
architectural idea: a documented extension boundary so internal or third-party
modules plug into a running instance. LoadOff's backlog already carries
"mini-app platform v0"; this is independent validation that the shape is
right, and that the boundary (not the modules) is the thing to build first.

**From Fleetbase — a separate consumer-facing tracking surface.** Their
Storefront app is e-commerce delivery, which LoadOff doesn't need. But the
underlying pattern — a *branded* public surface distinct from the office app —
is already half-built here as `/track/[token]` and the broker portal. Worth
recognizing as a product surface with its own polish budget, not an afterthought.

**From LoadPartner — load-level fraud detection.** Their "Truck Verify"
(SMS + geolocation + image capture to confirm the truck that showed up is the
truck that was booked) targets double-brokering and identity fraud, the
industry's fastest-growing loss. LoadOff already has `vetting.ts` with a
double-broker checklist on the *customer* side. The mirror — verifying the
carrier/driver at pickup — is a genuine gap and a strong differentiator for a
carrier that wants to prove legitimacy to brokers.

**Not worth taking:** warehouse/WMS modules (wrong domain), e-commerce
fulfillment (wrong customer), and anything requiring a marketplace of
third-party integrations LoadOff can't staff.

---

## 3. The shell: sidebar, density, dashboard

Current state, read from the code:

- `HubNav.tsx` — a fixed **212px** sidebar, sticky, scrollable, **no collapse**.
- `navigation.ts` — **6 primary sections** with sub-links, plus **~13 utility
  links in one flat list** (Driver leads, Outreach, Compliance, Safety,
  Reports, Messages, Tasks, Setup guide, Toolbox, Help, Smart Setup, Import,
  Carrier packet).
- `CommandPalette.tsx` — ⌘K exists and covers every route.
- Today page — already panel-based and action-oriented (due today, unbilled,
  etc.), which is the pattern the 2026 write-ups are asking for.

Against current convention (Linear, Stripe, Grafana, Vercel all converge on a
~256px collapsible sidebar; a command palette is table stakes past ~10
features; collapsed rails exist to give density back to power users):

**LoadOff is already right about the two things that matter most** — it has a
command palette, and its dashboard leads with actions rather than vanity
charts. The gaps are narrower than the trend pieces imply:

1. **No collapse.** 212px is permanently spent. On a 1280px laptop — a
   dispatcher's actual screen — that's 17% of the width gone while reading a
   dense load board. A collapsed 56px icon rail, persisted per user in
   `hub.user_preferences` (the table already exists), returns ~156px to the
   board. This is the single highest-value shell change.
2. **The 13-link flat utility list is the real IA problem**, not the width.
   It mixes daily work (Messages, Tasks, Compliance, Safety, Reports) with
   one-time setup (Smart Setup, Setup guide, Import, Carrier packet) and
   reference (Toolbox, Help). Grouping into "Work" / "Reference" / "Setup" —
   with Setup collapsing once onboarding is complete — shortens the scan
   without hiding anything. Small-carrier mode already trims this list; this
   is the complementary fix for full mode.
3. **Density is otherwise fine.** 212px is *narrower* than the 256px
   convention, which is a deliberate density win, not a defect. Do not widen
   it to match a trend piece.

**Deliberately not recommended:**

- Widening to 256px. It would cost density for conformity.
- A top nav. It scales worse for a product with this many sections, which is
  exactly why the industry moved back to sidebars.
- Dashboard chart-widget sprawl. The Today page's "here is what needs you"
  framing is better than a wall of sparklines, and swapping it for one would
  be a regression dressed as a redesign.

## 4. Queued work

Added to `docs/ops/AGENT_TASKS.md`:

- **Collapsible sidebar rail** with per-user persistence (`hub.user_preferences`).
- **Utility-link grouping** into Work / Reference / Setup, with Setup
  auto-collapsing once the setup guide is complete.
- **Pickup verification** (the LoadPartner mirror): confirm at pickup that the
  driver and truck match the dispatch, using the driver PWA's existing photo
  capture and geolocation. Sized as a real feature, not a shell tweak.

## Sources

1. https://fleetbase.io/ · https://github.com/fleetbase/fleetbase · https://fleetbase.io/docs/community/licensing
2. https://github.com/loadpartner/tms · https://tms.loadpartner.io/
3. https://github.com/fossabot/open-tms · https://github.com/openwms/org.openwms.tms.transportation
4. https://github.com/topics/transport-management-system · https://github.com/topics/fleet-management
5. https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns
6. https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns · https://www.saasui.design/blog/7-saas-ui-design-trends-2026

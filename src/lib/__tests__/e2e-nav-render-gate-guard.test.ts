/**
 * Guard: after a soft-nav landing gate, an e2e script must wait for the
 * destination to RENDER before reading its content.
 *
 * Regression (nightly full-cycle rig, 2026-08-17): e2e-nightly-cycle clicked
 * "Invoice this load", waited only for `location.pathname` to start with
 * `/hub/money/invoices/`, then immediately read the invoice's Summary values
 * and "Invoice PDF" link. But the pathname flips the instant router.push()
 * fires — before the invoice detail's server component has streamed in — so
 * the page was still the loading skeleton (no Summary <dt>s, no PDF link).
 * summaryValue()/fetchLinkBytes() read null, and the drive failed two checks
 * ("invoice amount parses (null cents)", "invoice PDF is a real %PDF") plus
 * crashed on `document.querySelector("#pay_amount").value` a few lines later.
 *
 * It only bit on the FIRST cold serve after a build (widest first-serve
 * window: cold route compile, cold DB pool, cold PDF lib) and passed on every
 * warm re-run, so it read as a flake rather than the timing bug it was. The
 * three sibling money smokes (invoices / business-cycle / accounting-drive)
 * never flake here because each gates on `waitForSelector("#pay_amount")` —
 * the payment form mounts only once the detail has rendered — before reading.
 * The nightly drive simply omitted that gate.
 *
 * This test enforces the rule statically, in seconds, instead of paying for a
 * ~13-minute Playwright drive against a cold rig to surface it: every
 * `waitForFunction(() => location.pathname …)` LANDING gate (a "we arrived"
 * check, not a "we left" `!== ` / `!location.pathname` check) must be followed
 * by a real render gate before the first read of destination content.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SCRIPTS_DIR = path.join(ROOT, "scripts")

/**
 * Nav-bar labels are always in the DOM (they render in the app chrome, not the
 * page body), so `waitForText(page, "<nav label>")` proves nothing about the
 * destination content having arrived — it is NOT a render gate. Anchors that
 * are real destination copy ("Open balance", "Receivables", "Net pay") are.
 */
function navLabels(): Set<string> {
  const nav = readFileSync(path.join(ROOT, "src", "lib", "hub", "navigation.ts"), "utf-8")
  return new Set([...nav.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase()))
}

const NAV_LABELS = navLabels()

/**
 * Strip comments before scanning — a comment that names a helper (this file's
 * own explanatory comment mentions `summaryValue()`) must not read as a call.
 * Line numbers are preserved: block comments become the same count of blank
 * lines, line comments are truncated in place. `//` after a `:` (URLs like
 * `http://`) is left alone so it never eats a real line.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n")
}

/**
 * A landing gate: waits for the URL to BECOME a path (arrival), not leave one.
 *
 * `waitForPath()` is the named helper for the same waitForFunction pathname
 * check (defined in e2e-lib.mjs, which this scan excludes). It is NOT a
 * render gate — the blanket `waitFor*` pass used to treat it as one, which
 * hid redirect smokes that read destination content against a loading
 * skeleton. `waitForPathAndText` is a render gate (it also waits on copy)
 * and does not match `\bwaitForPath\(`.
 */
const LANDING_GATE = /waitForFunction\([^\n]*location\.pathname|\bwaitForPath\(/
const LEAVING_GATE = /!location\.pathname|location\.pathname\s*!==/

/** Destination-copy anchors for redirect smokes that land via waitForPath. */
const WAIT_FOR_PATH_COPY: Record<string, string> = {
  "/hub": "Unconfirmed drivers",
  "/hub/driver": "Last pay",
  "/hub/suspended": "Workspace suspended",
}

/**
 * Destination-copy anchors after a hard goto to list pages. `waitUntil:
 * "networkidle2"` still races the streamed body — the nav-bar label is
 * already in the chrome, so waitForText on "Settlements" / "Invoices" /
 * "Planner" / "Advances" / "Expenses" / "Messages" / "Compliance" / "Fuel" /
 * "Drivers" / "Fleet" / "Dispatch" / "Loads" / "Customers" / "Safety" /
 * "Tasks" / "Reports" / "Driver leads" / "Import" / "Load board" is not a
 * render gate. (Fuel's nav label is "Fuel & cards"; waitForText "Fuel"
 * still matches that chrome immediately via substring. Leads' title is the
 * nav label "Driver leads". Load board's title is the nav label.
 * Announcements is not a nav item; its title still isn't a render gate
 * because the composer `#ann-title` can type against the loading skeleton.
 * Sandbox's nav label is "Practice mode"; the picker still isn't a render
 * gate because e2e-sandbox-sim-smoke clicks "Reset sandbox" / a seat against
 * the loading skeleton. Settings users' nav label is "Settings"; packet's is
 * "Carrier packet"; app's is "Phone app"; integrations' is "Integrations".
 * The settings index and pay-rules/pricebook/branding still type or query
 * the DOM after goto against the loading skeleton. Tolls' title is "Tolls";
 * e2e-tolls-smoke then waits on the KPI label "Toll spend" and reads the
 * unassigned inbox against the loading skeleton. Owner Dashboard's title is
 * "Owner Dashboard"; e2e-reports-smoke then waits on that title and reads
 * revenue bars against the loading skeleton.)
 */
const HARD_GOTO_COPY: Record<string, string> = {
  "/hub/money/settlements": "Weekly driver pay",
  // Id-segment invoice path before /hub/money/invoices so the list still
  // maps to its own subtitle. Title is the invoice number and the
  // PageHeader subtitle is customer · load ref — both move. "Open balance"
  // is unique Summary copy that renders for every role (the #pay_amount
  // form is money:write only, so it is not the family gate). Trailing-slash
  // key matches `.goto(\`…/hub/money/invoices/\${id}\`)`.
  "/hub/money/invoices/": "Open balance",
  "/hub/money/invoices": "Every invoice, paid or open",
  "/hub/planner": "A truck's whole week at a glance",
  "/hub/money/advances": "Cash and EFS-code advances",
  "/hub/money/expenses": "Reimbursables flow to settlements",
  // Money index, after all four /hub/money/* children above. Nav label is
  // "Money" and the title is "Money", so neither anchors a render; the
  // subtitle does. Lower-cased here to match the anchor the tenant-isolation
  // smoke already uses — waitForText compares case-insensitively, so it still
  // matches the rendered "Receivables, invoices, and driver pay."
  "/hub/money": "receivables, invoices, and driver pay",
  "/hub/messages/announcements": "proof everyone saw them",
  // Id-segment thread path before /hub/messages so the list still maps to
  // its own subtitle. Title is the driver/load name (moves every thread)
  // and is not a render gate. The thread page had no unique static copy
  // in innerText — composer placeholder is not in document.body.innerText
  // — so the mapping uses the PageHeader subtitle added for this doctrine
  // (same create-route pattern as trailers/new). Trailing-slash key matches
  // `.goto(\`…/hub/messages/\${id}\`)` because after `/hub/messages/` the
  // next source char is `$`, which `(?![/\w])` accepts.
  "/hub/messages/": "Photos and read receipts stay with this thread.",
  "/hub/messages": "Every driver conversation in one place",
  // Nested IFTA path before /hub/compliance so the compliance wall still
  // maps to its own subtitle. Nav label "IFTA" alone is not a render gate;
  // the page title is `IFTA — <quarter>`, so wait for the "IFTA — " prefix
  // that renders for every quarter.
  "/hub/compliance/ifta": "IFTA — ",
  // Nested random-testing path before /hub/compliance for the same reason.
  // The title `Random testing — <quarter>` moves every quarter and the
  // compliance wall already renders the words "Random testing" as its link,
  // so neither anchors a render. The subtitle is unique to this page and
  // arrives with the streamed body — compliance/loading.tsx is pure skeleton
  // with no text of its own.
  "/hub/compliance/random-testing": "Quarterly random-selection pool",
  "/hub/compliance": "CDLs, med cards",
  // Nested tolls path before /hub/fuel so the fuel index still maps to its
  // own subtitle. Title "Tolls" is not a nav label, but the KPI "Toll spend"
  // mounts with the streamed body — wait for the page subtitle.
  "/hub/fuel/tolls": "Last 92 days from every transponder statement.",
  "/hub/fuel": "Last 92 days across every card program.",
  "/hub/drivers": "Roster, pay setup, and qualification files.",
  // Nested /hub/driver/pay before /hub/driver so the PWA home still maps to
  // its own "Last pay" glance. Title "My pay" is not a nav label (nav is
  // "Pay"), so waitForText on it is a real render gate today — still use
  // the unique subtitle, same machinery as list pages. Empty and loaded
  // pay screens both show it. src/app/hub/driver has no loading.tsx; the
  // streamed body is what carries this copy. "Ask for an advance" is a
  // client-component CTA that hydrates after the server subtitle, so it
  // is not the family gate.
  "/hub/driver/pay": "Every settlement, line by line — tap one to see what's in it.",
  // Driver PWA home. Forced-dark surface (AGENTS.md) — DriverNav labels are
  // Home / Messages / Pay / More, so none of those is a render gate. There
  // is no PageHeader; the always-rendered "Last pay" glance card is unique
  // destination copy (same anchor WAIT_FOR_PATH_COPY already uses for the
  // redirect smokes). Empty and loaded homes both show it. src/app/hub/driver
  // has no loading.tsx; the streamed body is what carries this copy. Listed
  // after /hub/drivers so the office roster still maps to its own subtitle.
  "/hub/driver": "Last pay",
  // Nested add-trailer path before /hub/fleet so the fleet list still maps
  // to its own subtitle. Title "Add Trailer" is the nav label "Add trailer"
  // (case-insensitive), so waitForText on it passes against the chrome
  // during the skeleton race. This create form had no subtitle — added
  // one so the mapping can use waitForText (create-route doctrine) rather
  // than rewriting HARD_GOTO_COPY to accept selectors. fleet/loading.tsx
  // is a pure skeleton (aria-label "Loading" only).
  "/hub/fleet/trailers/new": "Unit number and type first — then plate and inspection dates.",
  // Nested add-truck path before /hub/fleet so the fleet list still maps to
  // its own subtitle. Title "Add Truck" is the nav label "Add truck"
  // (case-insensitive), so waitForText on it passes against the chrome
  // during the skeleton race. The subtitle is unique to this create form
  // and arrives with the streamed body.
  "/hub/fleet/trucks/new": "Paste the VIN and decode to fill the specs.",
  "/hub/fleet": "Trucks, trailers, and their paperwork.",
  "/hub/dispatch": "Every active load, booking to POD.",
  "/hub/loadboard": "click any cell to edit",
  // Nested book-a-load path before /hub/loads so the loads list still maps to
  // its own subtitle. Title "Book a Load" is not a nav label (nav is "New
  // load"), so waitForText on it is a real render gate today — create-route
  // doctrine still uses the unique PageHeader subtitle, same machinery as
  // list pages. The subtitle arrives with the streamed body;
  // loads/loading.tsx is pure skeleton with no text of its own.
  "/hub/loads/new": "Rate con in hand? Get it on the board.",
  // Id-segment load path before /hub/loads so the list still maps to its
  // own subtitle. Title is the THD- reference (waitForLoadDetail already
  // anchors on that for soft-nav) and the PageHeader subtitle is the
  // customer name — both move. "Linehaul" is unique Rate-panel copy on
  // every load detail (do NOT use "Rate": the sidebar renders "Paste
  // rate con"). Trailing-slash key matches `.goto(\`…/hub/loads/\${id}\`)`.
  "/hub/loads/": "Linehaul",
  "/hub/loads": "Search, filter, and manage every load.",
  // The one hard-goto target with no office chrome at all, so no nav label
  // can false-pass here — but the wordmark and tagline also render on
  // /hub/signup, so neither of those anchors a render either. The subtitle
  // is unique to this page and ships with the card that owns `#email`,
  // which every login smoke types into on the very next line. page.tsx is
  // `dynamic = "force-dynamic"` and src/app/hub/login has no loading.tsx.
  "/hub/login": "One login for dispatch, drivers, and partners.",
  "/hub/customers": "Brokers and shippers — your book of business.",
  // Nested log-incident path before /hub/safety so the safety wall still
  // maps to its own subtitle. Title "Log an incident" is not a nav label,
  // so waitForText on it is a real render gate today — create-route
  // doctrine still uses the unique PageHeader subtitle. The subtitle
  // arrives with the streamed body; (office)/loading.tsx is a pure
  // skeleton (aria-label "Loading" only) and there is no safety/loading.
  "/hub/safety/new": "Three plain questions decide whether DOT counts it as an accident.",
  // Nested open-a-claim path before /hub/safety/claims so the claims list
  // still maps to its own subtitle. Title "Open a claim" is not a nav
  // label, so waitForText on it is a real render gate today — create-route
  // doctrine still uses the unique PageHeader subtitle, same machinery as
  // list pages. The subtitle arrives with the streamed body;
  // (office)/loading.tsx is a pure skeleton (aria-label "Loading" only)
  // and there is no safety/claims/loading.
  "/hub/safety/claims/new": "Get it on file with a deadline before the paperwork scatters.",
  // Nested claims path before /hub/safety so the safety wall still maps to
  // its own subtitle. Title "Claims" is not a nav label, but it also lives
  // on the Safety rollup heading, so waiting for it would pass against the
  // parent page during the skeleton race. The subtitle is unique to this
  // page and arrives with the streamed body.
  "/hub/safety/claims": "Cargo, property, and injury claims",
  "/hub/safety": "flow to the register automatically",
  "/hub/tasks": "minus the sticky notes",
  // Nested owner-dashboard path before /hub/reports so the reports index
  // still maps to its own subtitle. Title "Owner Dashboard" is not a nav
  // label, but e2e-reports-smoke then waits on it and reads revenue bars
  // against the loading skeleton — wait for the page subtitle.
  "/hub/reports/owner": "an owner checks first",
  "/hub/reports": "Per-truck P&L",
  // Both subtitle variants (fresh vs empty) contain this; title "Driver leads" is the nav label.
  "/hub/leads": "the website",
  // Recruiting board. Nav label is "Recruiting" and the title is
  // "Recruiting", so neither anchors a render; the subtitle does.
  // (office)/loading.tsx is a pure skeleton (aria-label "Loading" only).
  "/hub/recruiting": "Application to dispatch-legal driver, all in one place — drag between stages.",
  // Help centre. Nav label is "Help"; title "How to use LoadOff" is unique
  // to this page (not a nav label), so waitForText on it is a real render
  // gate. Sweep already anchors on the same copy (case-insensitive).
  // (office)/loading.tsx is a pure skeleton (aria-label "Loading" only).
  "/hub/help": "How to use LoadOff",
  // Platform admin. Not a nav item (no office chrome on this surface);
  // title "Platform admin" is unique but the page subtitle is the render
  // gate the tenant-isolation + onboarding smokes should wait on.
  // src/app/hub/admin has no loading.tsx of its own.
  "/hub/admin": "Tenants and operational counts only",
  // Self-serve signup. Not a nav item (no office chrome on this surface);
  // the wordmark/tagline also live on /hub/login, so neither anchors a
  // render. Body copy is unique to this page and arrives with the streamed
  // body. src/app/hub/signup has no loading.tsx of its own.
  "/hub/signup":
    "Create your company's workspace — dispatch, money, compliance, and a driver app, live in an afternoon. No sales call.",
  // Trailing-slash id-segment before /hub/portal (when that family is
  // mapped). Four states (valid / used / expired / unknown) render
  // different body copy; the layout chrome already has "Customer portal"
  // and the wordmark, so neither is a render gate. The card kicker
  // "Portal invitation" is unique, always-on, and arrives with the
  // streamed body — src/app/hub/portal has no loading.tsx. Forced-dark
  // surface: never text-fg*/bg-surface*/border-border*. Trailing-slash
  // key matches `.goto(\`…/hub/portal/accept/\${token}\`)` because after
  // `/hub/portal/accept/` the next source char is `$`, which `(?![/\w])`
  // accepts. Literal token prefixes in source do not match — keep the
  // unknown-token smoke on a ${var} interpolation.
  "/hub/portal/accept/": "Portal invitation",
  "/hub/import": "map columns once, reuse forever",
  // Nav label is "Practice mode"; title "Run the whole company." also lives on the
  // marketing demo. Body copy is unique to the picker.
  "/hub/sandbox": "A real trucking company lives in here",
  // Nested settings paths before /hub/settings so the index still maps to its
  // own subtitle. Users' nav label is "Settings"; packet/app/integrations
  // titles are also nav labels.
  "/hub/settings/users": "alert emails, and who can sign in",
  "/hub/settings/branding": "Your accent color on invoices",
  "/hub/settings/packet": "stored once, sent in one click",
  "/hub/settings/app": "No app store needed",
  "/hub/settings/pay-rules": "Used by every settlement drafted from here on",
  "/hub/settings/pricebook": "Defaults offered when booking",
  "/hub/settings/integrations": "CSV import as the always-working fallback",
  "/hub/settings": "Company configuration, connections, and shared documents.",
}

const HARD_GOTO_PATH_RE =
  /\.goto\([^\n]*(\/hub\/money\/settlements|\/hub\/money\/invoices\/|\/hub\/money\/invoices|\/hub\/planner|\/hub\/money\/advances|\/hub\/money\/expenses|\/hub\/money|\/hub\/messages\/announcements|\/hub\/messages\/|\/hub\/messages|\/hub\/compliance\/ifta|\/hub\/compliance\/random-testing|\/hub\/compliance|\/hub\/fuel\/tolls|\/hub\/fuel|\/hub\/drivers|\/hub\/driver\/pay|\/hub\/driver|\/hub\/fleet\/trailers\/new|\/hub\/fleet\/trucks\/new|\/hub\/fleet|\/hub\/dispatch|\/hub\/loadboard|\/hub\/loads\/new|\/hub\/loads\/|\/hub\/loads|\/hub\/login|\/hub\/customers|\/hub\/safety\/new|\/hub\/safety\/claims\/new|\/hub\/safety\/claims|\/hub\/safety|\/hub\/tasks|\/hub\/reports\/owner|\/hub\/reports|\/hub\/leads|\/hub\/recruiting|\/hub\/help|\/hub\/admin|\/hub\/signup|\/hub\/portal\/accept\/|\/hub\/import|\/hub\/sandbox|\/hub\/settings\/users|\/hub\/settings\/branding|\/hub\/settings\/packet|\/hub\/settings\/app|\/hub\/settings\/pay-rules|\/hub\/settings\/pricebook|\/hub\/settings\/integrations|\/hub\/settings)(?![/\w])/

/** A hard navigation resets the state — page.goto awaits the destination itself. */
const HARD_NAV = /\.goto\(/

/**
 * Reads that pull RENDERED page content — the calls that return null against a
 * loading skeleton. `page.evaluate(() => location.pathname)` reads the URL, not
 * the DOM, so it is deliberately excluded (the location-only guard below).
 */
const CONTENT_READ =
  /summaryValue\(|dtValue\(|totalsValue\(|fetchLinkBytes\(|fetchPdf\(|\.type\(/
const EVALUATE_DOM = /\.evaluate\(/
const READS_DOM = /innerText|querySelector|document\./
const READS_LOCATION_ONLY = /location\.(pathname|href|search)/

/** A gate that actually waits for the destination body to render. */
function isRenderGate(line: string): boolean {
  // Another URL wait is not a render gate — it proves nothing rendered.
  // waitForPath is in LANDING_GATE, so this also rejects the named helper.
  if (LANDING_GATE.test(line) || LEAVING_GATE.test(line)) return false
  if (/waitForSelector\(|waitForNetworkIdle|waitForStableText\(|waitForPathAndText\(/.test(line)) {
    return true
  }
  // A waitForFunction that inspects the DOM (querySelector/innerText) is a
  // content wait, unlike one that only checks location.
  if (/waitForFunction\(/.test(line) && READS_DOM.test(line)) return true
  // waitForText / textAppears with a plain double-quoted anchor: real only if
  // the anchor is destination copy, not an always-present nav label.
  const m = /(?:waitForText|textAppears)\(\s*[\w$]+\s*,\s*"([^"]+)"/.exec(line)
  if (m) return !NAV_LABELS.has(m[1].toLowerCase())
  // Any other waiter — waitForText on a template/variable anchor, or a project
  // helper like waitForLoadDetail() — waits on real content; give it the pass.
  if (/\bwaitFor[A-Za-z]+\(/.test(line)) return true
  return false
}

function isContentRead(line: string): boolean {
  if (CONTENT_READ.test(line)) return true
  if (EVALUATE_DOM.test(line) && READS_DOM.test(line) && !READS_LOCATION_ONLY.test(line)) {
    // Multi-line page.evaluate() bodies read DOM on a later line; this catches
    // only single-line reads, which is where the skeleton race actually lands
    // (summaryValue/fetchLinkBytes are single-line helper calls).
    return true
  }
  return false
}

const scripts = readdirSync(SCRIPTS_DIR).filter(
  (f) => /^e2e-.*\.mjs$/.test(f) && f !== "e2e-lib.mjs"
)

/**
 * Walk each landing gate forward. The first thing that matters wins:
 *   render gate → SAFE, the read that follows sees real content;
 *   hard nav    → SAFE, the gate was for a page we then navigated away from;
 *   content read→ VIOLATION, we read the skeleton.
 */
function violationsIn(file: string): string[] {
  const lines = stripComments(readFileSync(path.join(SCRIPTS_DIR, file), "utf-8")).split("\n")
  const out: string[] = []
  lines.forEach((line, i) => {
    if (!LANDING_GATE.test(line) || LEAVING_GATE.test(line)) return
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j]
      if (isRenderGate(l) || HARD_NAV.test(l)) break
      if (isContentRead(l)) {
        out.push(`${file}:${i + 1} → reads content at :${j + 1} (${l.trim().slice(0, 60)})`)
        break
      }
    }
  })
  return out
}

describe("e2e soft-nav landing gates wait for render before reading", () => {
  it("finds landing gates to check (guard is not silently vacuous)", () => {
    const total = scripts.reduce(
      (n, f) =>
        n +
        readFileSync(path.join(SCRIPTS_DIR, f), "utf-8")
          .split("\n")
          .filter((l) => LANDING_GATE.test(l) && !LEAVING_GATE.test(l)).length,
      0
    )
    expect(total).toBeGreaterThanOrEqual(12)
  })

  it("counts waitForPath as a landing gate (pathname helper, not a render wait)", () => {
    let pathWaits = 0
    let asLanding = 0
    for (const f of scripts) {
      for (const line of readFileSync(path.join(SCRIPTS_DIR, f), "utf-8").split("\n")) {
        if (!/\bwaitForPath\(/.test(line)) continue
        pathWaits += 1
        if (LANDING_GATE.test(line) && !LEAVING_GATE.test(line)) asLanding += 1
        expect(isRenderGate(line), `${f}: waitForPath must not count as a render gate`).toBe(
          false
        )
      }
    }
    expect(pathWaits).toBeGreaterThanOrEqual(8)
    expect(asLanding).toBe(pathWaits)
  })

  it("redirect smokes wait for destination copy after waitForPath", () => {
    const PATH_RE = /waitForPath\(\s*[\w$]+\s*,\s*"([^"]+)"/
    const TEXT_RE = /(?:waitForText|textAppears)\(\s*[\w$]+\s*,\s*"([^"]+)"/
    const misses: string[] = []
    for (const f of scripts) {
      const lines = stripComments(readFileSync(path.join(SCRIPTS_DIR, f), "utf-8")).split("\n")
      lines.forEach((line, i) => {
        const pathMatch = PATH_RE.exec(line)
        if (!pathMatch) return
        const copy = WAIT_FOR_PATH_COPY[pathMatch[1]]
        if (!copy) {
          misses.push(`${f}:${i + 1} waitForPath("${pathMatch[1]}") has no destination-copy mapping`)
          return
        }
        for (let j = i + 1; j < lines.length; j++) {
          const l = lines[j]
          if (HARD_NAV.test(l) || isContentRead(l)) {
            misses.push(
              `${f}:${i + 1} waitForPath("${pathMatch[1]}") has no waitForText("${copy}") before a read`
            )
            return
          }
          const textMatch = TEXT_RE.exec(l)
          if (textMatch?.[1] === copy) return
          if (isRenderGate(l)) {
            misses.push(
              `${f}:${i + 1} waitForPath("${pathMatch[1]}") gated on "${textMatch?.[1] ?? l.trim().slice(0, 40)}" instead of "${copy}"`
            )
            return
          }
        }
        misses.push(`${f}:${i + 1} waitForPath("${pathMatch[1]}") never waits for "${copy}"`)
      })
    }
    expect(misses).toEqual([])
  })

  /**
   * The two halves of the hard-goto guard are separate declarations: a path
   * only gets checked if it is BOTH an alternative in `HARD_GOTO_PATH_RE` and
   * a key in `HARD_GOTO_COPY`. Add one without the other and the guard goes
   * quiet for that route instead of failing — the silent-vacuity mode the
   * `gates` counter exists to catch in aggregate, caught here per route.
   */
  const RE_PATHS = (() => {
    const alternation = /\(([^()]+)\)\(\?!/.exec(HARD_GOTO_PATH_RE.source)
    if (!alternation) throw new Error("HARD_GOTO_PATH_RE no longer exposes its alternation group")
    return alternation[1].split("|").map((p) => p.replace(/\\\//g, "/"))
  })()

  it("every hard-goto path in the regex has a destination-copy mapping", () => {
    expect(RE_PATHS.filter((p) => !HARD_GOTO_COPY[p])).toEqual([])
  })

  it("every destination-copy mapping is reachable from the regex", () => {
    expect(Object.keys(HARD_GOTO_COPY).filter((p) => !RE_PATHS.includes(p))).toEqual([])
  })

  it("id-segment hard-goto keys match template interpolations, not named children", () => {
    // Doctrine (249ef648 TOP PICK): a trailing-slash key matches
    // `.goto(\`…/path/\${id}\`)` because after the slash the next source
    // char is `$`, which `(?![/\w])` accepts. Named children (/new,
    // /announcements) stay their own keys and are listed first so they
    // do not fall into the id family. Literal UUIDs in source are not
    // used by any smoke; do not widen the lookahead to hex.
    const line = (path: string) => `await page.goto(\`\${BASE}${path}\`, { waitUntil: "networkidle2" })`
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/loads/${id}"))?.[1]).toBe("/hub/loads/")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/loads/new"))?.[1]).toBe("/hub/loads/new")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/loads"))?.[1]).toBe("/hub/loads")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/messages/${threadId}"))?.[1]).toBe("/hub/messages/")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/messages/announcements"))?.[1]).toBe(
      "/hub/messages/announcements"
    )
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/messages"))?.[1]).toBe("/hub/messages")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/money/invoices/${invoiceId}"))?.[1]).toBe(
      "/hub/money/invoices/"
    )
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/money/invoices"))?.[1]).toBe("/hub/money/invoices")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/money/invoices?status=paid"))?.[1]).toBe(
      "/hub/money/invoices"
    )
    // /hub/driver is a prefix of /hub/drivers (no extra slash) and of
    // /hub/driver/pay (extra slash). Office roster must keep its own key;
    // /hub/driver/pay is listed first so it maps to the pay subtitle, not
    // the home glance. Remaining nested PWA routes stay uncovered until
    // their own cycle.
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/driver"))?.[1]).toBe("/hub/driver")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/drivers"))?.[1]).toBe("/hub/drivers")
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/driver/pay"))?.[1]).toBe("/hub/driver/pay")
    // Trailing-slash portal-accept matches ${token} interpolations. A
    // literal prefix like /hub/portal/accept/not-a-real-token- does not
    // (next char is \w); keep that smoke on a ${var}. /hub/portal itself
    // is still unmapped — list /hub/portal/accept/ first when it lands.
    expect(HARD_GOTO_PATH_RE.exec(line("/hub/portal/accept/${token}"))?.[1]).toBe(
      "/hub/portal/accept/"
    )
  })

  it("nested hard-goto paths come before their parent in the regex", () => {
    // Alternation is first-match-wins: with "/hub/compliance" listed first,
    // "/hub/compliance/random-testing" would match the parent, fail the
    // `(?![/\w])` lookahead, and drop out of the guard entirely.
    const misordered: string[] = []
    RE_PATHS.forEach((parent, i) => {
      RE_PATHS.forEach((child, j) => {
        if (child.startsWith(`${parent}/`) && j > i) {
          misordered.push(`${child} must precede ${parent}`)
        }
      })
    })
    expect(misordered).toEqual([])
  })

  it("hard-goto list pages wait for destination copy, not the nav label", () => {
    const TEXT_RE = /(?:waitForText|textAppears)\(\s*[\w$]+\s*,\s*"([^"]+)"/
    const misses: string[] = []
    let gates = 0
    for (const f of scripts) {
      const lines = stripComments(readFileSync(path.join(SCRIPTS_DIR, f), "utf-8")).split("\n")
      lines.forEach((line, i) => {
        const pathMatch = HARD_GOTO_PATH_RE.exec(line)
        if (!pathMatch) return
        gates += 1
        const copy = HARD_GOTO_COPY[pathMatch[1]]
        if (!copy) {
          misses.push(`${f}:${i + 1} goto ${pathMatch[1]} has no destination-copy mapping`)
          return
        }
        for (let j = i + 1; j < lines.length; j++) {
          const l = lines[j]
          // Driver-blocked gotos must bounce — they never see office subtitles.
          // A later hard nav, a leaving-path wait, a textGone of office copy,
          // or a waitForPath onto a DIFFERENT path is the bounce, not a missed
          // render gate. (The waitForPath landing then carries its own
          // destination-copy requirement — see the redirect-smokes test above,
          // which is what /hub/reports and /hub/tasks driver blocks rely on.)
          if (HARD_NAV.test(l) || LEAVING_GATE.test(l) || /\btextGone\(/.test(l)) return
          const bounce = /waitForPath\(\s*[\w$]+\s*,\s*"([^"]+)"/.exec(l)
          if (bounce && bounce[1] !== pathMatch[1]) return
          if (isContentRead(l)) {
            misses.push(
              `${f}:${i + 1} goto ${pathMatch[1]} has no waitForText("${copy}") before a read`
            )
            return
          }
          const textMatch = TEXT_RE.exec(l)
          if (textMatch?.[1] === copy) return
          if (isRenderGate(l)) {
            misses.push(
              `${f}:${i + 1} goto ${pathMatch[1]} gated on "${textMatch?.[1] ?? l.trim().slice(0, 40)}" instead of "${copy}"`
            )
            return
          }
        }
        misses.push(`${f}:${i + 1} goto ${pathMatch[1]} never waits for "${copy}"`)
      })
    }
    expect(gates, "guard is not silently vacuous").toBeGreaterThanOrEqual(174)
    expect(misses).toEqual([])
  })

  it("every landing gate is followed by a render gate before a content read", () => {
    const violations = scripts.flatMap(violationsIn)
    expect(
      violations,
      "an e2e script reads destination content after only a location.pathname " +
        "gate — the URL flips before the server component streams in, so the " +
        "read hits the loading skeleton. Add a render gate (waitForSelector on " +
        "a form field, or waitForText on real destination copy) after the " +
        "pathname wait, like the invoices/business-cycle/accounting smokes do."
    ).toEqual([])
  })
})

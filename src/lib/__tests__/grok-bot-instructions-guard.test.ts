import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

/**
 * Grok Bot instruction bodies are capped at 4,000 characters (product limit).
 * Files in docs/grok-bots/ are what the owner pastes into the 14 live Bots
 * (D-015 / D-016: org CoS + venture chiefs + ICs who Fire Cursor). Going over
 * the cap silently truncates a charter; losing the "never git push" or the
 * reopen-the-source memory rule turns a watcher into a liability. D-016 also
 * forbids the TMS product code-name in instruction bodies.
 */

const DIR = path.join(process.cwd(), "docs/grok-bots")
const LIMIT = 4000
const INSTRUCTION_FILES = [
  "gogo-cos.instructions.md",
  "finch-finops.instructions.md",
  "wright-botwright.instructions.md",
  "scout-bookmarks.instructions.md",
  "em-engmgr.instructions.md",
  "dex-ic.instructions.md",
  "rex-ic.instructions.md",
  "steve-deploy-ci.instructions.md",
  "jeff-revops.instructions.md",
  "rav-career-coach.instructions.md",
  "labs-experiments.instructions.md",
  "ridge-research.instructions.md",
  "bee-bls.instructions.md",
  "my-myco.instructions.md",
]

const read = (file: string) => readFileSync(path.join(DIR, file), "utf-8")

describe("grok-bot instruction files (14-seat org, paste-ready, ≤4k)", () => {
  it("ships SETUP.md plus registries, routing, templates, GOGO-START, and the 14 bodies", () => {
    const names = new Set(readdirSync(DIR))
    expect(names.has("SETUP.md")).toBe(true)
    expect(names.has("README.md")).toBe(true)
    expect(names.has("SPAWN.md")).toBe(true)
    expect(names.has("GROUPS.md")).toBe(true)
    expect(names.has("RESEARCH.md")).toBe(true)
    expect(names.has("GOGO-START.md")).toBe(true)
    for (const file of INSTRUCTION_FILES) {
      expect(names.has(file), `missing ${file}`).toBe(true)
    }
    expect(names.has("gogo-tpm.instructions.md")).toBe(false)
    expect(names.has("watcher.instructions.md")).toBe(false)
    expect(names.has("venture-analyst.instructions.md")).toBe(false)
    expect(names.has("eng-comms.instructions.md")).toBe(false)

    const templates = new Set(readdirSync(path.join(DIR, "templates")))
    expect(templates.has("hq-cos.md")).toBe(true)
    expect(templates.has("venture-cos.md")).toBe(true)
    expect(templates.has("eng-ic.md")).toBe(true)
    expect(templates.has("labs-card.md")).toBe(true)
    expect(templates.has("fire-cursor.md")).toBe(true)

    const setup = read("SETUP.md")
    expect(setup).toMatch(/THE FILE/)
    expect(setup).toMatch(/This is that file/)
    expect(setup).toMatch(/D-015/)
    expect(setup).toMatch(/Fire Cursor/)
    expect(setup).toMatch(/Fire Claude/)
    expect(setup).toMatch(/Finch/)
    expect(setup).toMatch(/70/)
    expect(setup).toMatch(/90/)
    expect(setup).toMatch(/gogo-cos\.instructions.md/)
    expect(setup).toMatch(/cursor\.com\/agents/)
    expect(setup).toMatch(/claude\.ai\/code/)
    expect(setup).toMatch(/\bHQ\b/)
    expect(setup).toMatch(/\bHub\b/)
    expect(setup).toMatch(/Money/)
    expect(setup).toMatch(/Career/)
    expect(setup).toMatch(/\bLabs\b/)
    expect(setup).toMatch(/Clients/)
    expect(setup).toMatch(/owner yes|says yes/i)
    expect(setup).toMatch(/Never allowed/)
    expect(setup).toMatch(/Auto-review/)
    expect(setup).toMatch(/Teach a task|teach-a-task/i)
    expect(setup).toMatch(/cannot download PDF bytes/)
    expect(setup).toMatch(/X/)
    expect(setup).toMatch(/retired/)
    expect(setup).toMatch(/thindcarrier/)
    expect(setup).toMatch(/atstransport24/)
    expect(setup).toMatch(/Form 2290/)
    expect(setup).toMatch(/save this method as\s+a skill/i)
    expect(setup).toMatch(/memory is not the record/i)
    expect(setup).toMatch(/\/workspace\/hub\/board\.md/)
    expect(setup).toMatch(/MODEL-ROUTING/)
    expect(setup).toMatch(/GOGO-START/)
    expect(setup).not.toMatch(/needsAuth/)
    expect(setup).not.toMatch(/gogo-tpm/)
    expect(setup).not.toMatch(/LoadOff/)

    const spawn = read("SPAWN.md")
    expect(spawn).toMatch(/after.*yes/i)
    expect(spawn).toMatch(/templates/)
    expect(spawn).toMatch(/hard-stop|90%/)
    expect(spawn).toMatch(/\bHub\b/)

    const groups = read("GROUPS.md")
    expect(groups).toMatch(/\bHQ\b/)
    expect(groups).toMatch(/\bHub\b/)
    expect(groups).toMatch(/Money/)
    expect(groups).toMatch(/Career/)
    expect(groups).toMatch(/\bLabs\b/)
    expect(groups).toMatch(/Clients/)
    expect(groups).toMatch(/JOB/)
    expect(groups).toMatch(/CONNECTIONS/)
    expect(groups).toMatch(/full charter|FULL charter|full charters/i)
    expect(groups).not.toMatch(/LoadOff/)

    const start = read("GOGO-START.md")
    expect(start).toMatch(/Ranvir's yes|owner-yes/i)
    expect(start).toMatch(/14/)
    expect(start).toMatch(/GROUPS\.md/)
    expect(start).toMatch(/\/workspace\/hub\/board\.md/)
    expect(start).toMatch(/Big team/)
    expect(start).toMatch(/New Bot/)
    expect(start).toMatch(/apply-every-2-days/)
    expect(start).toMatch(/rts-payment-recon/)
    expect(start).toMatch(/github-repo-watch/)
    expect(start).not.toMatch(/LoadOff/)
  })

  it("keeps every instruction body under the 4,000-character product cap", () => {
    for (const file of INSTRUCTION_FILES) {
      const body = read(file)
      expect(
        body.length,
        `${file} is ${body.length} chars (cap ${LIMIT})`
      ).toBeLessThanOrEqual(LIMIT)
    }
  })

  it("every body pins never-git, the memory rule, gogo, Frybox, takeover, no SSH tunnel, and no product code-name", () => {
    for (const file of INSTRUCTION_FILES) {
      const body = read(file)
      expect(body, `${file} must pin never git push`).toMatch(/never git push/i)
      expect(body, `${file} must carry the memory rule`).toMatch(/memory is not the record/i)
      expect(body, `${file} must name gogo`).toContain("gogo")
      expect(body, `${file} must keep Frybox out of charter`).toMatch(/Frybox/)
      expect(body, `${file} must hand over the Agent Computer for secrets`).toMatch(/Agent Computer/)
      expect(body, `${file} must refuse SSH tunnels of the shared VM`).toMatch(/SSH-tunnel/)
      expect(body, `${file} must not name the TMS product`).not.toMatch(/LoadOff/)
    }
  })

  it("gogo is org CoS: routes, GOGO-START is yes for 14, does not Fire Cursor herself", () => {
    const gogo = read("gogo-cos.instructions.md")
    expect(gogo).toMatch(/Chief of Staff/)
    expect(gogo).toMatch(/pr-opened, pr-merged, ci-failed/)
    expect(gogo).toMatch(/One in-flight ORG SHOULD/i)
    expect(gogo).toMatch(/\/workspace\/org\/board\.md/)
    expect(gogo).toMatch(/never merge/i)
    expect(gogo).toMatch(/Wright/)
    expect(gogo).toMatch(/yes/)
    expect(gogo).toMatch(/Fire Cursor/)
    expect(gogo).toMatch(/Never start a Cursor or Claude cloud agent yourself/i)
    expect(gogo).toMatch(/should/)
    expect(gogo).toMatch(/Closes #N/)
    expect(gogo).toMatch(/PORTFOLIO\.md/)
    expect(gogo).toMatch(/2026-08-31/)
    expect(gogo).toMatch(/Netlify|BLS|Bee/)
    expect(gogo).toMatch(/GOGO-START/)
    expect(gogo).toMatch(/\bHub\b/)
    expect(gogo).toMatch(/Never clone or grep/)
    expect(gogo).toMatch(/screenshot-scrape/)
  })

  it("Finch owns 70/90 meters and model routing", () => {
    const finch = read("finch-finops.instructions.md")
    expect(finch).toMatch(/70%/)
    expect(finch).toMatch(/90%/)
    expect(finch).toMatch(/Fire Cursor/)
    expect(finch).toMatch(/cursor-grok-4\.6-high-fast|Composer/)
    expect(finch).toMatch(/Opus/)
    expect(finch).toMatch(/Fable/)
    expect(finch).toMatch(/\/workspace\/org\/usage\.md/)
    expect(finch).toMatch(/context bloat/)
    expect(finch).toMatch(/morganlinton/i)
    expect(finch).toMatch(/15th seat is not a token fix/)
  })

  it("Wright stamps the 14 from GOGO-START and a 15th only after owner yes", () => {
    const wright = read("wright-botwright.instructions.md")
    expect(wright).toMatch(/yes/)
    expect(wright).toMatch(/templates/)
    expect(wright).toMatch(/4000/)
    expect(wright).toMatch(/hard-stop|90%/)
    expect(wright).toMatch(/GOGO-START/)
    expect(wright).toMatch(/14/)
  })

  it("Dex and Rex Fire Cursor from a written SOP and never merge", () => {
    for (const file of ["dex-ic.instructions.md", "rex-ic.instructions.md"]) {
      const body = read(file)
      expect(body).toMatch(/Fire Cursor/)
      expect(body).toMatch(/cursor\.com\/agents/)
      expect(body).toMatch(/never merge/i)
      expect(body).toMatch(/Goal \/ Files \/ Done when \/ Verify/)
      expect(body).toMatch(/Closes #N/)
      expect(body).toMatch(/do not wait/i)
      expect(body).toMatch(/\/workspace\/hub\//)
    }
    expect(read("dex-ic.instructions.md")).toMatch(/carrier_id|integer cents/)
    expect(read("rex-ic.instructions.md")).toMatch(/constants\.ts/)
  })

  it("Em is the only writer of the hub board and does not write product code", () => {
    const em = read("em-engmgr.instructions.md")
    expect(em).toMatch(/ONLY writer of \/workspace\/hub\/board\.md/i)
    expect(em).toMatch(/do not write product code/i)
    expect(em).toMatch(/Fire Claude/)
  })

  it("Steve reports platform state and knows bls is on Netlify", () => {
    const steve = read("steve-deploy-ci.instructions.md")
    expect(steve).toMatch(/NETLIFY/i)
    expect(steve).toMatch(/Vercel/)
    expect(steve).toMatch(/drain-integrator\.yml/)
    expect(steve).toMatch(/e2e-suite\.yml/)
    expect(steve).toMatch(/fleet-liveness\.yml/)
    expect(steve).toMatch(/Staff SRE/)
    expect(steve).toMatch(/pinned platform GitHub issue/)
    expect(steve).toMatch(/create-or-comment/)
    expect(steve).toMatch(/No crons/i)
    expect(steve).toMatch(/Goal \/ Files \/ Done when/)
    expect(steve).toMatch(/api\/version/)
    expect(steve).toMatch(/SMTP 535/)
    expect(steve).toMatch(/\/workspace\/platform\/last\.md/)
    expect(steve).toMatch(/Fire Cursor/)
    expect(steve).toMatch(/\/workspace\/hub\/board\.md/)
    expect(steve).toMatch(/rjkind01-gmailcoms-projects/)
  })

  it("Jeff never mixes the two companies and owns the 8:30pm PT loadboard", () => {
    const jeff = read("jeff-revops.instructions.md")
    expect(jeff).toMatch(/thindcarrier/)
    expect(jeff).toMatch(/atstransport24/)
    expect(jeff).toMatch(/NEVER MIXED/i)
    expect(jeff).toMatch(/8:30pm PT/)
    expect(jeff).toMatch(/Excel for the web/)
    expect(jeff).toMatch(/No copies/i)
    expect(jeff).toMatch(/no whole-file Replace/i)
    expect(jeff).toMatch(/Head of RevOps/)
    expect(jeff).toMatch(/Expense Manager analog/)
    expect(jeff).toMatch(/retired/)
    expect(jeff).toMatch(/system of record/)
    expect(jeff).toMatch(/holding\/billing/)
    expect(jeff).not.toMatch(/needsAuth/)
    expect(jeff).not.toMatch(/Highlight/)
    expect(jeff).toMatch(/never invent a rate/i)
    expect(jeff).toMatch(/cannot download PDF bytes/)
    expect(jeff).toMatch(/BROWSER/)
    expect(jeff).toMatch(/\/workspace\/loadboard\/last-scan\.md/)
    expect(jeff).toMatch(/\/workspace\/loadboard\/last-recon\.md/)
    expect(jeff).toMatch(/Loadboard entry/)
    expect(jeff).toMatch(/RTS recon/)
    expect(jeff).toMatch(/one writer/)
    expect(jeff).toMatch(/Idempotent/)
    expect(jeff).toMatch(/RTS/)
    expect(jeff).toMatch(/every other calendar day/)
    expect(jeff).toMatch(/never paste RTS deep links|never paste.*deep links/i)
    expect(jeff).toMatch(/DEPOSIT DATE/)
    expect(jeff).toMatch(/Held\/Denied/)
  })

  it("Rav runs the live standing-approval apply loop; proof-only claims; no product or AI-tool names", () => {
    const rav = read("rav-career-coach.instructions.md")
    expect(rav).toMatch(/proof/i)
    expect(rav).toMatch(/LinkedIn/)
    expect(rav).toMatch(/do not scrape/i)
    expect(rav).toMatch(/FACTS\.md/)
    expect(rav).toMatch(/thindtransport\.com\/hub/)
    expect(rav).toMatch(/bluelandscapingservices\.com/)
    expect(rav).toMatch(/Job-Applications/)
    expect(rav).toMatch(/myco-website/)
    expect(rav).toMatch(/Salesforce/)
    expect(rav).toMatch(/Goldstein/)
    expect(rav).toMatch(/as-AI/)
    expect(rav).toMatch(/Talent Scout/)
    expect(rav).toMatch(/\/workspace\/career\//)
    expect(rav).toMatch(/Apply|apply/)
    expect(rav).toMatch(/Auto Review/)
    expect(rav).toMatch(/6-7/)
    expect(rav).toMatch(/36 hours|36h/)
    expect(rav).toMatch(/4:30am PT/)
    expect(rav).toMatch(/100K/)
    expect(rav).toMatch(/never Postgres RLS/i)
    expect(rav).toMatch(/2,529/)
    expect(rav).toMatch(/Thind_Ranvir_Universal_Resume\.pdf/)
    expect(rav).not.toMatch(/Never post, apply, email/)
    expect(rav).not.toMatch(/No LinkedIn connector/)
  })

  it("Scout / Labs / Ridge run the bookmark → demo → model loop with a seen-file", () => {
    const scout = read("scout-bookmarks.instructions.md")
    expect(scout).toMatch(/16:00 PT/)
    expect(scout).toMatch(/labs\/ideas/)
    expect(scout).toMatch(/Do not post/)
    expect(scout).toMatch(/_seen\.md/)
    const labs = read("labs-experiments.instructions.md")
    expect(labs).toMatch(/disposable/i)
    expect(labs).toMatch(/keep or kill|Keep-or-kill/i)
    const ridge = read("ridge-research.instructions.md")
    expect(ridge).toMatch(/Fable/)
    expect(ridge).toMatch(/Opus/)
    expect(ridge).toMatch(/Grok 4\.6/)
    expect(ridge).toMatch(/Composer/)
    expect(ridge).toMatch(/\/workspace\/org\/models\.md/)
  })

  it("Bee runs BLS on Cursor only and never opens Claude Code", () => {
    const bee = read("bee-bls.instructions.md")
    expect(bee).toMatch(/Fire Cursor/)
    expect(bee).toMatch(/cursor\.com\/agents/)
    expect(bee).toMatch(/bls-website/)
    expect(bee).toMatch(/never (open )?claude\.ai\/code/i)
    expect(bee).toMatch(/NETLIFY/i)
    expect(bee).not.toMatch(/Fire Claude/)
  })

  it("the agent preambles brief future sessions on the 14-seat Grok org", () => {
    const docs = path.join(process.cwd(), "docs")
    const cursorPreamble = readFileSync(path.join(docs, "cursor-agent-preamble.md"), "utf-8")
    expect(cursorPreamble).toMatch(/gogo/)
    expect(cursorPreamble).toMatch(/never writes\s+git/i)
    expect(cursorPreamble).toMatch(/Fire Cursor/)
    expect(cursorPreamble).toMatch(/MODEL-ROUTING/)
    const claudePreamble = readFileSync(path.join(docs, "claude-routine-preamble.md"), "utf-8")
    expect(claudePreamble).toMatch(/gogo/)
    expect(claudePreamble).toMatch(/never pushes/i)
    expect(claudePreamble).toMatch(/Fire Cursor/)
    for (const preamble of [cursorPreamble, claudePreamble]) {
      expect(preamble).not.toMatch(/Engineering Communications Lead/)
      expect(preamble).not.toMatch(/Venture Analyst/)
    }
  })

  it("the README names the platform split, the 14-seat org, and the never-git rule", () => {
    const readme = read("README.md")
    expect(readme).toMatch(/Claude Corps/)
    expect(readme).toMatch(/Cursor cloud agents/)
    expect(readme).toMatch(/Grok Bot/)
    expect(readme).toMatch(/Never/)
    expect(readme).toMatch(/git/)
    expect(readme).toMatch(/D-015/)
    expect(readme).toMatch(/Netlify/)
    expect(readme).toMatch(/SETUP\.md/)
    expect(readme).toMatch(/RESEARCH\.md/)
    expect(readme).toMatch(/9 /)
    expect(readme).toMatch(/PORTFOLIO/)
    expect(readme).toMatch(/retired/)
    expect(readme).toMatch(/Fire Cursor/)
    expect(readme).toMatch(/GOGO-START/)
    expect(readme).not.toMatch(/LoadOff/)
    for (const name of ["gogo", "Finch", "Wright", "Scout", "Em", "Dex", "Rex", "Steve", "Jeff", "Rav", "Labs", "Ridge", "Bee", "My"]) {
      expect(readme).toContain(name)
    }
  })

  it("MODEL-ROUTING.md pins Finch 70/90 and the Ultra/Max split", () => {
    const routing = readFileSync(
      path.join(process.cwd(), "docs/ops/MODEL-ROUTING.md"),
      "utf-8"
    )
    expect(routing).toMatch(/70%/)
    expect(routing).toMatch(/90%/)
    expect(routing).toMatch(/Fire Cursor/)
    expect(routing).toMatch(/cursor-grok-4\.6-high-fast/)
    expect(routing).toMatch(/\$200/)
    expect(routing).toMatch(/\$100/)
  })
})

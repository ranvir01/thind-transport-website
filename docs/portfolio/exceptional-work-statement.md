# Exceptional Work Statement — drafts

xAI's application asks: *"What exceptional work have you done? In 100 words or less, tell
us about a piece of work you are most proud of."* Their screener has said publicly that
most applicants leave it blank or vague, and that individual-contributor work you
personally did is what counts.

**Every claim below is checked against `docs/portfolio/FACTS.md`.** The playbook draft's
version claimed row-level security and an append-only audit trail. Neither exists. Sending
that invites one question — "walk me through your RLS policies" — with no answer.

---

## A · Recommended: the guard, not the feature (98 words)

> I own two FMCSA-authorized trucking companies. Off-the-shelf dispatch software didn't
> fit, so I taught myself to build and shipped LoadOff — a multi-tenant transportation
> management system, 69 tables, 10 vendor integrations, 2,529 tests, running in production.
>
> The work I'm proudest of came from a failure. I found a query that leaked one carrier's
> leads to another. Fixing that query wasn't the fix — nothing stopped the next one. So I
> built a harness that inventories every table, scans every query touching tenant data, and
> proves with a second live tenant that it cannot read the first's rows. It fails the build.

**Why this one.** It leads with a bug he caused, which almost nobody does, and the
resolution is systemic rather than a patch. It is fully defensible: the harness exists at
`src/lib/hub/__tests__/cross-tenant-harness.test.ts` and every number is checkable. It
implicitly answers "would this person be careful with production?" without asserting it.

---

## B · Alternative: the operator angle (97 words)

> I own two FMCSA-authorized trucking companies. Dispatch software for small carriers is
> either $200/month and generic or a spreadsheet, so I taught myself to build and shipped
> LoadOff: a production multi-tenant TMS — dispatch, ELD telematics, IFTA, settlements,
> billing into QuickBooks.
>
> Money is integer cents end to end; no floats, ever. The IFTA tax math exists twice, in
> TypeScript and Rust, with golden fixtures that fail the build if the two ever disagree.
> An hours-of-service engine computes federal duty limits when the ELD feed goes silent.
>
> I'm the operator, the domain expert, and the engineer. I ship what I need at 5 a.m.

**Use when** the audience is product- or domain-leaning. Weaker for a research org: it
describes scope rather than judgment.

---

## C · Alternative: distrusting the instrument (95 words)

> Building LoadOff — a production multi-tenant TMS running my two trucking companies — I
> wrote a gate to measure how much JavaScript each page sends to a driver's phone.
>
> It reported 143KB. Reproducibly, across runs. I nearly shipped that as a win.
>
> It was wrong. A build I'd interrupted left a partial artifact, and the browser was
> measuring a page that never finished loading — no error, just a flattering number. The
> real figure was 236KB. I retracted it in the commit history and made the tool document
> its own failure mode.
>
> Measuring the measurement is the job.

**Use when** applying somewhere that prizes empirical rigor — evals, performance, research
tooling. It is the most unusual of the three and the least about trucking.

---

## Notes for whichever is sent

- Proofread twice. The largest public dataset on résumé screening found typo count the
  single strongest *negative* signal.
- Attribution: "I built," never "we." All of this is individual work.
- Be ready for the obvious follow-up on A: *"Why not row-level security?"* The honest
  answer is that it wasn't designed in from the start, retrofitting it across 69 tables
  is a real project rather than a switch, and the harness was the shortest path to a
  guarantee that holds today. It's on the roadmap. Saying that plainly is stronger than
  claiming a wall that isn't there.

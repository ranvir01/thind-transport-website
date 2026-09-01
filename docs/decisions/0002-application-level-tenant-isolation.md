# 0002. Application-level tenant isolation, with an automated harness instead of RLS

Status: Accepted (with a known gap) · Date: 2026-07-30

## Context and problem statement

LoadOff is a shared-schema multi-tenant system: one PostgreSQL database, 69 tables, every
tenant-owned row keyed by `carrier_id`. The failure that matters most in this shape is a
query that forgets its `WHERE carrier_id = $n` and returns another carrier's data.

This is not hypothetical here. A query in the website-leads path was reachable without
naming the carrier, which meant any office user at any carrier could list another
carrier's driver leads — names, phones, emails — and act on them by guessing IDs.

Fixing that one query was not the decision. The decision was what stops the next one.

## Considered options

### Option A — PostgreSQL row-level security

Enable RLS on every tenant-owned table, write policies keyed on a session variable
(`SET LOCAL app.carrier_id`), and let the database refuse to return foreign rows.

- **Good:** the guarantee lives below the application. A forgotten predicate returns zero
  rows instead of someone else's data. It is the answer an interviewer expects.
- **Good:** correct by default for future tables if the convention is enforced.
- **Bad:** requires the connection to reliably carry tenant identity. This app runs on
  serverless functions over a pooled connection; a `SET LOCAL` that leaks across a reused
  connection is a worse failure than the one being fixed, because it is silent and
  intermittent.
- **Bad:** retrofitting 69 existing tables and 36 server-action modules is a project, not
  a switch — and the leak was live while it was being done.
- **Bad:** `BYPASSRLS` on the migration/owner role quietly voids it; easy to get wrong.

### Option B — application-level scoping, unenforced

Keep `WHERE carrier_id = $n` everywhere and rely on code review.

- **Good:** zero work; it is what already existed.
- **Bad:** it is exactly what produced the leak. Discipline is not a mechanism.

### Option C — application-level scoping, enforced by an automated harness *(chosen)*

Keep the query-level predicate, and make the build prove it holds.

- **Good:** ships immediately and closes the class of bug, not one instance.
- **Good:** the proof is executable and runs on every build, so it cannot rot into a
  comment nobody reads.
- **Bad:** the guarantee lives in the application. A sufficiently creative new code path
  could still evade it. It is a guard against mistakes, not a wall against intent.
- **Bad:** requires an explicit, reviewed exemption list, which is a thing to maintain.

## Decision outcome

**Chosen: Option C**, with Option A on the roadmap and explicitly *not* claimed as done.

`src/lib/hub/__tests__/cross-tenant-harness.test.ts` runs three independent guards:

1. **Schema census.** Parses all 25 migrations — honouring `ALTER TABLE … ADD COLUMN
   carrier_id` and `DROP TABLE` — to build the true list of tenant-owned tables. It fails
   when a new table appears without `carrier_id` and without an entry in
   `CARRIERLESS_TABLES`, where each of the 7 exemptions carries a written isolation story.
2. **Static scan.** Every query touching a table that *has* `carrier_id` must name it.
   Four pre-auth code paths are exempt and annotated in `CROSS_CARRIER_BY_DESIGN`.
3. **Live proof.** Seeds a second carrier and asserts it cannot read or address the first
   carrier's rows by guessing IDs.

The live proof **fails when no database is present** rather than skipping. A silent skip on
the test that proves tenant isolation is worse than not having the test, because everyone
downstream assumes it ran.

## Consequences

- **Good:** the six queries that were reachable without naming the carrier are fixed, and
  a seventh — marking a message thread read — was found by the harness rather than by a
  customer.
- **Good:** adding a tenant-owned table now forces a decision at build time.
- **Bad, and stated plainly:** there is still no database-level wall between carriers.
  Isolation is enforced by every query naming the right carrier, checked automatically.
  That is a guard against mistakes, not a wall. This should land before a carrier the
  owner does not personally know is onboarded, and it must not be described as done.
- **Bad:** the exemption lists are load-bearing. Adding an entry to either must be a
  reviewed decision with a written reason, not a way to make a red build green.

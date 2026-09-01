# 0005 — Inbound rate cons stage as drafts and are always reviewed

**Status:** accepted · 2026-08-30
**Supersedes nothing.** Closes AGENT_TASKS #21 and item (a) of the AI roadmap in #22.

## Context

`pollDocsMailbox` polls the docs mailbox, reads a load reference out of the
subject line, and files attachments onto the matching load. The bug hiding in
that sentence: **the attachment loop is inside `if (load)`**. Mail whose
reference matched nothing — which is every rate con for freight not booked yet —
produced a notification saying "file it by hand" and then **discarded the
attachments**. The office was told to file a document they no longer had.

Everything needed to do better already existed. `parseRateCon` returns a
`ParsedRateCon` whose every field carries a confidence rating,
`analyzeDocumentEnhanced` adds an LLM pass when `ANTHROPIC_API_KEY` is set,
`merge-analysis.ts` merges the two by confidence rank, and `/hub/loads/paste`
already turns a parse into a prefilled `LoadForm`. What was missing was the
bridge: mail → parse → **staged draft** → that same form.

## Decision

**Automation stages; humans book.** An emailed rate con that matches no load
becomes a row in `hub.intake_drafts` and appears at `/hub/inbox`. Nothing enters
the load list until a person opens the draft and accepts it. Manual entry
(`/hub/loads/new`, `/hub/loads/paste`) is unchanged and stays first-class.

Specifically:

- **No auto-accept, at any confidence.** The `confidence` column is written but
  nothing reads it, so a threshold can be introduced later without a migration.
- **One mapping, two entry points.** `lib/hub/rate-con-to-form.ts` holds the
  `ParsedRateCon → LoadFormInitial` translation; paste and Inbox both call it.
- **Nothing is thrown away.** A scanned PDF with no text layer stages anyway,
  marked `unreadable`, with the file saved against the carrier. Losing the
  attachment is the failure this exists to end.
- **The Inbox is a booking queue, not an everything queue.**
  `classifyDocumentKind` vetoes before the generic classifier runs: an unmatched
  POD still falls through to the old notification. Signature logos and inline
  images are skipped outright.
- **Accept and dismiss are both `loads:write` and both audited.** Deciding a
  rate con is not worth booking is a dispatch decision, not a read.

## Why not the alternatives

- **Auto-create the load and let people correct it.** A wrong broker or a wrong
  rate that reaches the load list has already touched dispatch, invoicing and
  the customer's expectations. Review is one tap; unwinding a bad booking is not.
- **Auto-accept above a confidence threshold.** The parser's confidence is a
  heuristic about the DOCUMENT, not about whether this carrier wants the freight.
  A perfectly-parsed rate con at a losing rate is high confidence and a bad load.
- **A separate review UI.** A second booking form would drift from `LoadForm`
  within a release. The review screen renders the real form, prefilled.

## Consequences

- Real mail flows only once the owner supplies a Gmail App Password — the same
  credential the compliance alerts have been failing on since 2026-08-08. Until
  then the path is exercised by seeded drafts and `e2e-inbox-smoke`.
- Setting `ANTHROPIC_API_KEY` upgrades every emailed parse with no code change;
  unset, it falls back to heuristics silently. This is the cheapest, safest rung
  of the AI ladder because a human still confirms every write.
- `hub.intake_drafts` is carrier-scoped with a tenancy test, per the house rule.

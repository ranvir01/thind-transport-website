# hub migrations — rules

- **Append-only.** Never edit or renumber a migration that has been pushed; write a new one.
- **Idempotent.** Every statement guards itself (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `ON CONFLICT DO NOTHING`) — the runner may replay the whole directory.
- **Ordering.** `scripts/hub-migrate.mjs` applies files in lexicographic filename order and
  records each filename in `hub.schema_migrations`, so order is deterministic even when
  numbers collide.
- **Known collision, do not "fix":** two prefixes shipped twice from parallel sessions —
  `024_pay_per_mile_cents.sql` / `024_share_link_expiry.sql`, and `029_intake_drafts.sql` /
  `029_thind_dot_number.sql`. Each pair is independent and idempotent; renumbering a file
  now would make `hub_migrations` re-run it under the new name on some databases and skip
  history on others. Leave them. The vitest guard in
  `src/lib/__tests__/migration-prefix-guard.test.ts` allowlists only these two prefixes.
- **Picking the next number:** take `max(existing prefix) + 1` — as of this note the next
  free number is `033`. If two sessions race to the same number, the later one renames
  BEFORE pushing (the collisions above predate this rule).

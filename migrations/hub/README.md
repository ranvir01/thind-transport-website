# hub migrations — rules

- **Append-only.** Never edit or renumber a migration that has been pushed; write a new one.
- **Idempotent.** Every statement guards itself (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `ON CONFLICT DO NOTHING`) — the runner may replay the whole directory.
- **Ordering.** `scripts/hub-migrate.mjs` applies files in lexicographic filename order and
  records each filename in `hub.schema_migrations`, so order is deterministic even when
  numbers collide.
- **Known collision, do not "fix":** `024_pay_per_mile_cents.sql` and
  `024_share_link_expiry.sql` both shipped with the same number from parallel agent
  sessions. They are independent and idempotent; renumbering either now would make
  `hub.schema_migrations` re-run it under the new name on some databases and skip history
  on others. Leave them.
- **Picking the next number:** take `max(existing prefix) + 1` — as of this note the next
  free number is `027`. If two sessions race to the same number, the later one renames
  BEFORE pushing (the collision above predates this rule).

/**
 * Whether the hub Postgres URL is configured.
 *
 * Lives in its own module so data-layer files can check availability without
 * importing `./db`. Tests mock `../db` with `{ query, queryOne }` only;
 * Vitest 4 throws if a production import then asks that mock for an export
 * the factory never defined.
 */
export function hubDbAvailable(): boolean {
  return Boolean(process.env.POSTGRES_URL)
}

/**
 * Shared `.env.local` reader for this repo's node scripts.
 *
 * Six scripts (hub-migrate, seed-demo, go-live-check, connections-check,
 * fix-legacy-signatures, e2e-lib) each carried a byte-identical copy of this
 * loader, and every copy assigned the raw right-hand side of `KEY=value`
 * without stripping surrounding quotes. Both places that document the file
 * use the quoted form — `docs/getting-started.md` line 42 and the
 * `docker-compose.yml` header both say
 * `POSTGRES_URL="postgresql://hauldesk:hauldesk@localhost:5432/hauldesk"`,
 * and `.env.example` ships `SMTP_FROM="Thind Transport <noreply@…>"`. So
 * following the setup guide verbatim stored a value with a leading `"`, and
 * `npm run db:migrate` died on `getaddrinfo ENOTFOUND base` — pg had parsed
 * the quote as part of the connection string. Next.js loads `.env.local`
 * through dotenv, which does strip quotes, so the app itself worked and only
 * the scripts broke: the failure looked like a broken database, not a broken
 * parser.
 *
 * Behaviour otherwise matches the copies this replaces: a value already in
 * `process.env` always wins, and a missing file is not an error.
 */
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

/**
 * Strip one layer of matching surrounding quotes, the way dotenv does.
 * Unquoted values keep every character except surrounding whitespace and the
 * `\r` a CRLF file leaves behind — that stray `\r` was its own latent bug,
 * since it rides along inside a password or URL and only shows up as a
 * connection failure.
 */
export function unquoteEnvValue(raw) {
  const value = raw.trim()
  const quote = value[0]
  if ((quote === '"' || quote === "'" || quote === "`") && value.length >= 2 && value.endsWith(quote)) {
    return value.slice(1, -1)
  }
  return value
}

/**
 * Load `.env.local` into `process.env` without overwriting anything already set.
 *
 * @param {object} [options]
 * @param {string} [options.skipWhenSet] Bail out entirely when this variable is
 *   already in the environment. Five of the six call sites guarded on
 *   `POSTGRES_URL` this way; keeping the option preserves their behaviour.
 * @param {string} [options.cwd] Directory holding `.env.local` (defaults to the
 *   process working directory).
 */
export function loadEnvLocal({ skipWhenSet, cwd = process.cwd() } = {}) {
  if (skipWhenSet && process.env[skipWhenSet]) return
  const envPath = path.join(cwd, ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = unquoteEnvValue(match[2])
  }
}

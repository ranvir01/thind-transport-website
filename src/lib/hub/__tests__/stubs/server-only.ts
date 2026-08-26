/**
 * `server-only` is injected by the Next.js bundler to make a module fail
 * loudly if it is ever pulled into a client bundle. Vitest has no such
 * bundler, so importing a module that guards itself with it dies on module
 * resolution. Aliased to this no-op in vitest.config.ts so server modules
 * (sandbox-sim, sandbox-shift, sandbox-seed) can be exercised in tests —
 * the real guard still applies to every production build.
 */
export {}

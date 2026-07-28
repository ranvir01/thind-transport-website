/**
 * Typed mocks for the hub's `db` module.
 *
 * The problem this solves is boring and everywhere. The idiomatic-looking
 * fixture in ~30 test files is:
 *
 *     vi.mock("../db", () => ({ query: vi.fn(async () => []) }))
 *
 * That declares a function taking NO arguments, so TypeScript types
 * `queryMock.mock.calls[0]` as the empty tuple `[]`. Every subsequent
 * `const [sql, params] = queryMock.mock.calls[0]` — the standard way this repo
 * asserts carrier scoping — is then a type error: "Tuple type '[]' of length
 * '0' has no element at index '0'". Those errors are the single largest block
 * of the test-suite type debt, and they hide the ones that matter.
 *
 * Declaring the real signature once fixes the whole class. `query` and
 * `queryOne` take `(sql, params?)`, so destructuring is well-typed and
 * `mock.calls[n]` is `[string, unknown[] | undefined]`.
 *
 * USAGE — vi.mock is hoisted above imports, so build the mocks inside
 * `vi.hoisted` and reference them in the factory:
 *
 *     const { queryMock, queryOneMock } = vi.hoisted(() => {
 *       // eslint-disable-next-line @typescript-eslint/no-explicit-any
 *       const { createDbMocks } = require("./helpers/db-mock") as typeof import("./helpers/db-mock")
 *       return createDbMocks()
 *     })
 *
 * …or, more simply, import the TYPES here and keep declaring the mocks
 * inline with an explicit signature:
 *
 *     query: vi.fn<QueryFn>(async () => [])
 *
 * Not named *.test.ts, so vitest's `include: ["src/**\/*.test.ts"]` does not
 * try to run it as a suite.
 */
import { vi, type Mock } from "vitest"

/** The real `query` signature: rows out, sql + optional params in. */
export type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>

/** The real `queryOne` signature: a single row or null. */
export type QueryOneFn = (sql: string, params?: unknown[]) => Promise<unknown>

export type QueryMock = Mock<QueryFn>
export type QueryOneMock = Mock<QueryOneFn>

/**
 * A matched pair of correctly-typed db mocks, defaulting to "no rows" — the
 * same defaults the hand-rolled fixtures use, so this is a drop-in.
 */
export function createDbMocks(): { queryMock: QueryMock; queryOneMock: QueryOneMock } {
  return {
    queryMock: vi.fn<QueryFn>(async () => []),
    queryOneMock: vi.fn<QueryOneFn>(async () => null),
  }
}

/**
 * The (sql, params) pair from a recorded call, with params defaulted to an
 * empty array so callers can index it without a non-null assertion.
 *
 * Prefer this over `const [sql, params] = mock.calls[n]` in new tests: it
 * fails with a readable message when the call simply didn't happen, instead
 * of a TypeError several lines later on `params[0]`.
 */
export function callAt(
  mock: QueryMock | QueryOneMock,
  index: number
): { sql: string; params: unknown[] } {
  const call = mock.mock.calls[index]
  if (!call) {
    throw new Error(
      `Expected a db call at index ${index}, but only ${mock.mock.calls.length} were made.`
    )
  }
  return { sql: String(call[0]), params: call[1] ?? [] }
}

/**
 * Find the first recorded call whose SQL contains `fragment`. Most assertions
 * in this repo want "the INSERT", not "call number three" — matching on the
 * statement keeps a test from breaking when an unrelated read is added ahead
 * of it.
 */
export function callMatching(
  mock: QueryMock | QueryOneMock,
  fragment: string
): { sql: string; params: unknown[] } {
  const call = mock.mock.calls.find(([sql]) => String(sql).includes(fragment))
  if (!call) {
    const seen = mock.mock.calls
      .map(([sql]) => String(sql).replace(/\s+/g, " ").trim().slice(0, 60))
      .join("\n  ")
    throw new Error(`No db call containing ${JSON.stringify(fragment)}. Calls made:\n  ${seen}`)
  }
  return { sql: String(call[0]), params: call[1] ?? [] }
}

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }))

import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
import proxy from "@/proxy"

const mockedGetToken = vi.mocked(getToken)

function run(path: string, token: Record<string, unknown> | null) {
  mockedGetToken.mockResolvedValue(token as never)
  return proxy(new NextRequest(`https://loadoff.test${path}`))
}

function redirectPath(res: Response): string | null {
  const location = res.headers.get("location")
  return location ? new URL(location).pathname : null
}

beforeEach(() => {
  mockedGetToken.mockReset()
})

describe("proxy /hub routing", () => {
  it("sends signed-out visitors to /hub/login", async () => {
    expect(redirectPath(await run("/hub", null))).toBe("/hub/login")
    expect(redirectPath(await run("/hub/loadboard", null))).toBe("/hub/login")
  })

  it("sends legacy roleless tokens to the driver portal instead of the /hub/login bounce loop", async () => {
    expect(redirectPath(await run("/hub", { id: "d1" }))).toBe("/driver/application")
    expect(redirectPath(await run("/hub/login", { id: "d1" }))).toBe("/driver/application")
  })

  it("lets office roles through and routes them off /hub/login", async () => {
    expect(redirectPath(await run("/hub/loadboard", { role: "dispatcher" }))).toBe(null)
    expect(redirectPath(await run("/hub/login", { role: "dispatcher" }))).toBe("/hub/loadboard")
  })

  it("keeps drivers in the driver app and office roles out of it", async () => {
    expect(redirectPath(await run("/hub/loadboard", { role: "driver" }))).toBe("/hub/driver")
    expect(redirectPath(await run("/hub/driver", { role: "driver" }))).toBe(null)
    expect(redirectPath(await run("/hub/driver", { role: "owner" }))).toBe("/hub")
  })
})

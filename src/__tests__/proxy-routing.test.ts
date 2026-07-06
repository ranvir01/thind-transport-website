import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }))

import { getToken } from "next-auth/jwt"
import proxy from "../proxy"

const getTokenMock = vi.mocked(getToken)

function request(pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

async function destination(pathname: string): Promise<string | null> {
  const response = await proxy(request(pathname))
  const location = response.headers.get("location")
  return location ? new URL(location).pathname : null
}

describe("proxy — legacy driver-portal JWT (no hub role)", () => {
  beforeEach(() => {
    getTokenMock.mockResolvedValue({ id: "legacy-1", role: undefined } as never)
  })

  it("redirects /hub to the legacy application, never back to /hub/login", async () => {
    expect(await destination("/hub")).toBe("/driver/application")
  })

  it("redirects deep hub links the same way", async () => {
    expect(await destination("/hub/loadboard")).toBe("/driver/application")
    expect(await destination("/hub/driver")).toBe("/driver/application")
  })

  it("sends an already-authenticated /hub/login visit to the legacy application", async () => {
    expect(await destination("/hub/login")).toBe("/driver/application")
  })

  it("lets the legacy surface itself through", async () => {
    expect(await destination("/driver/application")).toBeNull()
    expect(await destination("/driver/dashboard")).toBeNull()
  })
})

describe("proxy — signed-out visitor", () => {
  beforeEach(() => {
    getTokenMock.mockResolvedValue(null)
  })

  it("sends /hub to /hub/login and /driver/application to /driver/login", async () => {
    expect(await destination("/hub")).toBe("/hub/login")
    expect(await destination("/driver/application")).toBe("/driver/login")
  })
})

describe("proxy — hub roles keep their lanes", () => {
  it("hub driver is confined to the driver app", async () => {
    getTokenMock.mockResolvedValue({ id: "d1", role: "driver" } as never)
    expect(await destination("/hub/loadboard")).toBe("/hub/driver")
    expect(await destination("/hub/driver")).toBeNull()
  })

  it("office role passes through office screens but not the driver app", async () => {
    getTokenMock.mockResolvedValue({ id: "o1", role: "owner" } as never)
    expect(await destination("/hub/loadboard")).toBeNull()
    expect(await destination("/hub/driver")).toBe("/hub")
  })

  it("authenticated /hub/login visit lands on the role home", async () => {
    getTokenMock.mockResolvedValue({ id: "o1", role: "dispatcher" } as never)
    expect(await destination("/hub/login")).toBe("/hub/loadboard")
  })
})

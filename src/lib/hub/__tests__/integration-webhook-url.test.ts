import { afterEach, describe, expect, it, vi } from "vitest"
import { integrationWebhookUrl } from "../integrations/webhooks"

describe("integrationWebhookUrl", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("uses NEXTAUTH_URL until an app host is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "")
    vi.stubEnv("NEXTAUTH_URL", "https://thindtransport.com")
    expect(integrationWebhookUrl("factor", "carrier-1")).toBe(
      "https://thindtransport.com/api/hub/webhooks/factor?carrier=carrier-1"
    )
  })

  it("prefers NEXT_PUBLIC_APP_HOST once the app origin is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_HOST", "app.loadoff.com")
    vi.stubEnv("NEXTAUTH_URL", "https://thindtransport.com")
    expect(integrationWebhookUrl("efs", "carrier-1")).toBe(
      "https://app.loadoff.com/api/hub/webhooks/efs?carrier=carrier-1"
    )
  })
})

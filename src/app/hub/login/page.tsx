import { demoLoginEnabled } from "@/lib/hub/demo"
import { LoginCard } from "./LoginCard"

export const dynamic = "force-dynamic"

/**
 * Server wrapper so HUB_DEMO_LOGIN (server-only env) can gate the demo
 * credentials card. The matching auth-side gate lives in the credentials
 * authorize() — hiding the hint alone would not close the door.
 */
export default function HubLoginPage() {
  return <LoginCard showDemo={demoLoginEnabled()} />
}

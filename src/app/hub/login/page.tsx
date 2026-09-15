import { InstallAppButton } from "@/components/hub/InstallAppButton"
import { LoginCard } from "./LoginCard"

export const dynamic = "force-dynamic"

/**
 * The install button lives HERE and not on the marketing /app page because
 * installability follows the manifest in scope: /hub/* carries the driver
 * app's manifest (start_url /hub), while /app sits under the marketing
 * site's. An install prompted from /app would put the marketing site on the
 * driver's home screen — the exact wrong-app bug the manifest split fixed.
 * This is the first /hub page a driver can reach without a session, so it is
 * the install surface /app links to.
 */
export default function HubLoginPage() {
  return <LoginCard installSlot={<InstallAppButton appearance="office" />} />
}

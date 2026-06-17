import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  const user = session?.user as
    | { carrierId?: string | null; allowedCarrierIds?: string[] | null }
    | undefined
  if (!user?.carrierId) {
    return NextResponse.redirect(new URL("/hub/login", request.url))
  }

  const url = new URL(request.url)
  const carrier = url.searchParams.get("carrier")
  const scope = url.searchParams.get("scope")
  const next = url.searchParams.get("next") || "/hub"
  const allowed = user.allowedCarrierIds?.length ? user.allowedCarrierIds : [user.carrierId]

  const response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/hub", request.url))
  if (scope === "all" && allowed.length > 1) {
    response.cookies.set("hub_company_scope", "all", { path: "/hub", sameSite: "lax" })
    response.cookies.delete("hub_carrier_id")
    return response
  }

  if (carrier && allowed.includes(carrier)) {
    response.cookies.set("hub_company_scope", "single", { path: "/hub", sameSite: "lax" })
    response.cookies.set("hub_carrier_id", carrier, { path: "/hub", sameSite: "lax" })
  }
  return response
}

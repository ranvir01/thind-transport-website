/**
 * Web Push subscription management for the installed PWA.
 * GET    → VAPID public key (empty when push is not configured)
 * POST   → save this device's subscription for the signed-in user
 * DELETE → remove a subscription (sign-out / disable)
 */
import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { pushConfigured, removePushSubscription, savePushSubscription } from "@/lib/hub/notify"

export async function GET() {
  return NextResponse.json({
    publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
  })
}

export async function POST(request: Request) {
  const user = await getHubUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const body = (await request.json()) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }
  await savePushSubscription(
    user.carrierId,
    user.id,
    { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } },
    request.headers.get("user-agent") ?? undefined
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const user = await getHubUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const body = (await request.json()) as { endpoint?: string }
  if (body.endpoint) await removePushSubscription(user.id, body.endpoint)
  return NextResponse.json({ ok: true })
}

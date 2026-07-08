/** In-app notification feed for the signed-in user. */
import { NextResponse } from "next/server"
import { getHubUser } from "@/lib/hub/session"
import { listNotifications, markAllRead, unreadCount } from "@/lib/hub/notify"

export async function GET() {
  const user = await getHubUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const [items, unread] = await Promise.all([
    listNotifications(user.carrierId, user.id),
    unreadCount(user.carrierId, user.id),
  ])
  return NextResponse.json({ items, unread })
}

export async function POST() {
  const user = await getHubUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  await markAllRead(user.carrierId, user.id)
  return NextResponse.json({ ok: true })
}

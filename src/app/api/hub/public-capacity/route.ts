/**
 * Public capacity feed for the marketing /routes page (Phase 5 §8.6).
 * Deliberately public: equipment, market, and date only — no truck numbers,
 * no customer data. Returns [] when the hub database isn't configured.
 */
import { NextResponse } from "next/server"
import { query } from "@/lib/hub/db"
import { hubDbAvailable } from "@/lib/hub/db-available"

const DEFAULT_CARRIER = "11111111-1111-1111-1111-111111111111"

export const revalidate = 300

export async function GET() {
  if (!hubDbAvailable()) return NextResponse.json({ postings: [] })
  try {
    const postings = await query<{
      equipment: string; available_on: string; origin_city: string; origin_state: string
      dest_preference: string | null
    }>(
      `SELECT equipment, available_on, origin_city, origin_state, dest_preference
       FROM hub.capacity_postings
       WHERE carrier_id = $1 AND active AND available_on >= CURRENT_DATE - 1
       ORDER BY available_on LIMIT 12`,
      [DEFAULT_CARRIER]
    )
    return NextResponse.json({ postings })
  } catch {
    return NextResponse.json({ postings: [] })
  }
}

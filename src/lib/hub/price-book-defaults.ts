/**
 * Industry-typical accessorial price book seeded for every new workspace at
 * signup (createWorkspaceAction). Mirrors the Thind seed in
 * migrations/hub/003_money.sql — that INSERT only covers the original carrier
 * row, so self-serve tenants would otherwise start with an empty price book
 * and the load forms' accessorial quick-picks would offer nothing. All
 * entries are editable afterwards at /hub/settings/pricebook.
 */

export interface PriceBookDefault {
  name: string
  defaultAmountCents: number
  unit: "flat" | "per_hour" | "per_day" | "pass_through"
}

export const DEFAULT_PRICE_BOOK: PriceBookDefault[] = [
  { name: "Detention", defaultAmountCents: 6000, unit: "per_hour" },
  { name: "Layover", defaultAmountCents: 25000, unit: "per_day" },
  { name: "TONU", defaultAmountCents: 20000, unit: "flat" },
  { name: "Stop-off", defaultAmountCents: 10000, unit: "flat" },
  { name: "Tarp", defaultAmountCents: 10000, unit: "flat" },
  { name: "Lumper", defaultAmountCents: 0, unit: "pass_through" },
]

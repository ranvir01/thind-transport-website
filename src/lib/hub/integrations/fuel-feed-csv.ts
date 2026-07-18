/**
 * Shared daily-feed CSV parsing for the WEX-family fuel cards (EFS, WEX —
 * both provisioned as a daily batch file over SFTP, see
 * docs/integrations/efs.md + docs/integrations/wex.md). The real column
 * layouts are unverified until a provisioned file lands, so matching is
 * tolerant: headers are lowercased and stripped of separators, then mapped
 * onto the SAME assumed record keys each provider's `normalize*Record`
 * reads — those normalizers stay the single shape-reading point per
 * provider for every transport (cron pull, file drop, future SFTP poller).
 */
import { parseCsv } from "../csv"

const CSV_HEADER_ALIASES: Record<string, string> = {
  transactionid: "TransactionId", transactionnumber: "TransactionId", tranid: "TransactionId", txnid: "TransactionId",
  transactiondatetime: "TransactionDateTime", transactiondate: "TransactionDateTime", trandate: "TransactionDateTime",
  date: "TransactionDateTime", datetime: "TransactionDateTime",
  unitnumber: "UnitNumber", unit: "UnitNumber", truck: "UnitNumber", trucknumber: "UnitNumber", vehicleunit: "UnitNumber",
  merchantname: "MerchantName", merchant: "MerchantName", locationname: "MerchantName", truckstopname: "MerchantName",
  merchantcity: "MerchantCity", city: "MerchantCity", locationcity: "MerchantCity",
  merchantstate: "MerchantState", state: "MerchantState", locationstate: "MerchantState", stprov: "MerchantState",
  quantity: "Quantity", gallons: "Quantity", qty: "Quantity", fuelquantity: "Quantity", numberofgallons: "Quantity",
  pricepergallon: "PricePerGallon", ppg: "PricePerGallon", unitprice: "PricePerGallon", pumpprice: "PricePerGallon",
  totalamount: "TotalAmount", total: "TotalAmount", amount: "TotalAmount", fueltotal: "TotalAmount",
  odometer: "Odometer", odo: "Odometer", odometerreading: "Odometer", hubodometer: "Odometer",
}

/**
 * Pure — parse a daily feed CSV into the assumed record shape. Unknown
 * columns ride along under their original header (they end up in `raw`, so
 * nothing a real file carries is thrown away before the layout is confirmed).
 * Odometer is coerced to a number because the normalizers drop non-numeric
 * odometers by design.
 */
export function parseFuelFeedCsv(text: string): Record<string, unknown>[] {
  const grid = parseCsv(text)
  if (grid.length < 2) return []
  const headers = grid[0].map((h) => {
    const canonical = CSV_HEADER_ALIASES[h.trim().toLowerCase().replace(/[^a-z0-9]/gi, "")]
    return canonical ?? h.trim()
  })
  return grid
    .slice(1)
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => {
      const record: Record<string, unknown> = {}
      headers.forEach((header, i) => {
        const value = (cells[i] ?? "").trim()
        if (!header || value === "") return
        if (header === "Odometer") {
          // Strip thousands separators only — "n/a"-style non-numerics must
          // become NaN and be dropped, not collapse to Number("") === 0.
          const num = Number(value.replace(/,/g, ""))
          if (Number.isFinite(num)) record[header] = num
          return
        }
        record[header] = value
      })
      return record
    })
}

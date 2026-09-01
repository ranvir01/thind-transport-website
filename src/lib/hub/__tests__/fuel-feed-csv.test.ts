import { describe, expect, it } from "vitest"

import { parseFuelFeedCsv } from "../integrations/fuel-feed-csv"

/**
 * `fuel-feed-csv.ts` is shared by EFS, WEX, and Comdata (creds-shopping-list
 * rows 3/3b/4) — a header-alias typo here silently breaks all three daily
 * file drops at once. `efs.test.ts` only exercises one alias per canonical
 * column; this file drives every remaining alias in `CSV_HEADER_ALIASES`
 * plus the thousands-separator odometer case the module's own comment
 * calls out but no test previously proved.
 */
describe("parseFuelFeedCsv header aliases (full CSV_HEADER_ALIASES coverage)", () => {
  it("maps a second group of TransactionId/date/unit/merchant aliases", () => {
    const records = parseFuelFeedCsv(
      "Txn Id,Date Time,Vehicle Unit,Location Name,Merchant City,St Prov,Fuel Quantity,Pump Price,Amount,Hub Odometer\n" +
        "TXN-9,2026-06-05T08:00:00Z,201,Loves 55,Rock Springs,WY,80.2,3.65,292.73,301500\n"
    )
    expect(records).toHaveLength(1)
    const row = records[0]
    expect(row.TransactionId).toBe("TXN-9")
    expect(row.TransactionDateTime).toBe("2026-06-05T08:00:00Z")
    expect(row.UnitNumber).toBe("201")
    expect(row.MerchantName).toBe("Loves 55")
    expect(row.MerchantCity).toBe("Rock Springs")
    expect(row.MerchantState).toBe("WY")
    expect(row.Quantity).toBe("80.2")
    expect(row.PricePerGallon).toBe("3.65")
    expect(row.TotalAmount).toBe("292.73")
    expect(row.Odometer).toBe(301500)
  })

  it("maps a third group of aliases (tranid/qty/ppg/truckstopname/locationcity)", () => {
    const records = parseFuelFeedCsv(
      "Tran Id,Truckstop Name,Location City,Qty,PPG\n" + "TXN-10,Pilot 88,Cheyenne,50.0,3.80\n"
    )
    const row = records[0]
    expect(row.TransactionId).toBe("TXN-10")
    expect(row.MerchantName).toBe("Pilot 88")
    expect(row.MerchantCity).toBe("Cheyenne")
    expect(row.Quantity).toBe("50.0")
    expect(row.PricePerGallon).toBe("3.80")
  })

  it("strips thousands separators from a quoted Odometer value instead of dropping it", () => {
    // Unquoted commas would split into extra CSV cells, so a thousands-separated
    // odometer only reaches parseFuelFeedCsv's Odometer branch when quoted —
    // this proves the `.replace(/,/g, "")` stripping the module comment describes.
    const records = parseFuelFeedCsv('TransactionId,Odometer\nTXN-12,"245,102"\n')
    expect(records[0].Odometer).toBe(245102)
  })
})

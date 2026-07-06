-- 016: per-carrier IFTA tax rates.
-- hub.ifta_tax_rates was the one shared-write table: any tenant's
-- compliance:write user could overwrite the rates every carrier's IFTA
-- math reads. Scope rows by carrier_id like every other hub table.
-- Existing shared rows are copied to each carrier, then removed.

ALTER TABLE hub.ifta_tax_rates
  ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES hub.carriers(id);

-- The old identity was PRIMARY KEY (jurisdiction, quarter); replace it with
-- a per-carrier unique index BEFORE backfilling so the copies can land.
ALTER TABLE hub.ifta_tax_rates DROP CONSTRAINT IF EXISTS ifta_tax_rates_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS ifta_tax_rates_carrier_jur_quarter_key
  ON hub.ifta_tax_rates (carrier_id, jurisdiction, quarter);

INSERT INTO hub.ifta_tax_rates (carrier_id, jurisdiction, quarter, rate, surcharge_rate)
SELECT c.id, r.jurisdiction, r.quarter, r.rate, r.surcharge_rate
FROM hub.ifta_tax_rates r
CROSS JOIN hub.carriers c
WHERE r.carrier_id IS NULL
ON CONFLICT (carrier_id, jurisdiction, quarter) DO NOTHING;

DELETE FROM hub.ifta_tax_rates WHERE carrier_id IS NULL;

ALTER TABLE hub.ifta_tax_rates ALTER COLUMN carrier_id SET NOT NULL;

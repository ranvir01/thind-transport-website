-- Phase 4 completion — DVIRs (49 CFR 396.11 / 396.13) and driver-hub extras.
-- The defect → shop → repair-certification → pre-trip sign-off loop is airtight:
-- an unsafe defect flips the truck to 'shop' and dispatch legality already
-- refuses shop trucks; only certification + the next driver's review releases it.

CREATE TABLE IF NOT EXISTS hub.dvirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  truck_id UUID NOT NULL REFERENCES hub.trucks(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  type TEXT NOT NULL CHECK (type IN ('pre','post')),
  odometer NUMERIC(10,1),
  -- [{ "key": "brakes_service", "label": "Service brakes", "ok": true }]
  checklist JSONB NOT NULL DEFAULT '[]',
  -- [{ "label": "Right rear inner tire flat", "note": "", "photo_document_id": null }]
  defects JSONB NOT NULL DEFAULT '[]',
  safe_to_operate BOOLEAN NOT NULL DEFAULT TRUE,
  signature TEXT NOT NULL,          -- canvas e-sign data URL (396.11(b)(2))
  signed_name TEXT NOT NULL,
  -- 396.13: the pre-trip reviews the prior post-trip + its repair certification.
  prior_dvir_id UUID REFERENCES hub.dvirs(id),
  -- Repair certification (mechanic/office) for defective post-trips.
  repair_certified_by UUID,
  repair_certified_by_name TEXT,
  repair_certified_at TIMESTAMPTZ,
  repair_work_order_id UUID REFERENCES hub.maintenance_records(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dvirs_truck_idx ON hub.dvirs(carrier_id, truck_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dvirs_driver_idx ON hub.dvirs(carrier_id, driver_id, created_at DESC);

-- OS&D / cargo-exception flag on loads (POD upload toggle → draft claim).
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS osd_flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- Advances: track who asked (driver requests land as 'pending' for office approval).
ALTER TABLE hub.advances ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE hub.advances ADD COLUMN IF NOT EXISTS note TEXT;

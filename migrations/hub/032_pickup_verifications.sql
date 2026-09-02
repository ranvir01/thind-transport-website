-- Pickup verification: evidence at the dock that the truck that showed up is
-- the one dispatched (src/lib/hub/pickup-verification.ts).
--
-- One row per verification attempt, so a driver can re-verify after a bad GPS
-- fix and the office sees the history. `result` is the pure evaluation's
-- verdict; `checks` is its per-check detail, kept so the office can see WHY
-- something was a mismatch without recomputing against data that has since
-- changed (a stop re-geocoded, a driver reassigned).

CREATE TABLE IF NOT EXISTS hub.pickup_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id        UUID NOT NULL REFERENCES hub.carriers(id) ON DELETE CASCADE,
  load_id           UUID NOT NULL REFERENCES hub.loads(id) ON DELETE CASCADE,
  stop_id           UUID NOT NULL REFERENCES hub.stops(id) ON DELETE CASCADE,
  driver_id         UUID REFERENCES hub.drivers(id) ON DELETE SET NULL,
  truck_id          UUID REFERENCES hub.trucks(id) ON DELETE SET NULL,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  distance_miles    NUMERIC(8,1),
  photo_document_id UUID REFERENCES hub.documents(id) ON DELETE SET NULL,
  result            TEXT NOT NULL CHECK (result IN ('verified','mismatch','unverified')),
  checks            JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pickup_verifications_load_idx
  ON hub.pickup_verifications (carrier_id, load_id, created_at DESC);

-- The dock photo is its own document kind so it never masquerades as a POD
-- or BOL in the factoring packet. Re-stated in full (append-only rule; 030 is
-- the previous definition).
ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_kind_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN (
    'rate_confirmation','bol','pod','receipt','cdl','medical_card',
    'registration','inspection','insurance','w9','agreement','other',
    'incident_photo','facility_photo','message_photo',
    'psp_report','mvr','offer_letter','drug_test','road_test',
    'authority_letter','noa','insurance_renewal','pickup_photo'
  ));

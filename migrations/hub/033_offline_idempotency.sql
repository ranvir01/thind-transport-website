-- Offline replay idempotency for the two driver filings that must never
-- double-file: a DVIR (an unsafe one grounds the truck and opens a work order)
-- and an incident first report (it pages the office).
--
-- The driver app mints a client_request_id per tap and sends the same id on
-- the online attempt and on any offline-queue replay of that tap. The partial
-- unique index turns the second arrival into ON CONFLICT DO NOTHING, and the
-- writer (src/lib/hub/dvir.ts submitDvir, src/lib/hub/incidents.ts
-- createIncident) re-selects the row the first arrival created.
--
-- NULL for office-entered rows and for rows filed by app versions that
-- predate the id — those keep today's behaviour, the predicate keeps them
-- out of the index.

ALTER TABLE hub.dvirs     ADD COLUMN IF NOT EXISTS client_request_id TEXT;
ALTER TABLE hub.incidents ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS dvirs_client_request_idx
  ON hub.dvirs (carrier_id, client_request_id) WHERE client_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS incidents_client_request_idx
  ON hub.incidents (carrier_id, client_request_id) WHERE client_request_id IS NOT NULL;

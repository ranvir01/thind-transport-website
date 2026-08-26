-- 022: give the cash clock something real to measure from.
--
-- hub.loads carried only created_at / updated_at / deleted_at / acknowledged_at,
-- so the "POD in hand, still not invoiced" alarm (today.ts unbilled panel,
-- tasks.ts automation #5) aged off updated_at. Any edit to the load — a rate
-- correction, a driver swap, a note — bumped updated_at and reset the load's own
-- overdue alarm, so the oldest unbilled loads were the ones least likely to be
-- flagged. Stamp the two transitions that actually start the clock instead.
--
-- The history is not lost: every status change has been writing a
-- hub.load_events row since migration 002, so the backfill below reconstructs
-- both stamps from that audit trail.

ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS pod_received_at TIMESTAMPTZ;

-- Backfill from the event trail. MIN(created_at) per load: the FIRST time the
-- load entered the status starts the clock, so a load bounced back and re-marked
-- keeps its original age instead of resetting (the exact bug being fixed).
-- Joined on carrier_id as well as load_id — cross-table statements guard tenancy
-- on both sides. Guarded by IS NULL so re-running is a no-op and never clobbers
-- a stamp written live by changeLoadStatus.
UPDATE hub.loads l
SET delivered_at = ev.first_at
FROM (
  SELECT carrier_id, load_id, MIN(created_at) AS first_at
  FROM hub.load_events
  WHERE kind = 'status_change' AND payload->>'to' = 'delivered'
  GROUP BY carrier_id, load_id
) ev
WHERE ev.load_id = l.id AND ev.carrier_id = l.carrier_id AND l.delivered_at IS NULL;

UPDATE hub.loads l
SET pod_received_at = ev.first_at
FROM (
  SELECT carrier_id, load_id, MIN(created_at) AS first_at
  FROM hub.load_events
  WHERE kind = 'status_change' AND payload->>'to' = 'pod_received'
  GROUP BY carrier_id, load_id
) ev
WHERE ev.load_id = l.id AND ev.carrier_id = l.carrier_id AND l.pod_received_at IS NULL;

-- Index for the unbilled-POD reads. Both callers filter
-- (carrier_id, deleted_at IS NULL, status = 'pod_received') and then
-- order/compare on the clock anchor, so the index leads with carrier_id and
-- carries the same COALESCE expression. loads_status_idx (001) is
-- btree(status) WHERE deleted_at IS NULL — not carrier-scoped, so it makes every
-- tenant read every tenant's pod_received rows; it is left alone here (other
-- status filters still use it) and superseded for this query by the index below.
CREATE INDEX IF NOT EXISTS loads_unbilled_pod_idx
  ON hub.loads (carrier_id, (COALESCE(pod_received_at, delivered_at, updated_at)))
  WHERE deleted_at IS NULL AND status = 'pod_received';

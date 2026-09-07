-- Owner-supplied USDOT is the 8-digit form 02523064 (same digits as the
-- previously stored 2523064, with the leading zero IRP / MCS-150 docs use).
-- Public copy reads COMPANY_INFO.dot; the Hub tenant row is the office
-- source of truth and must not drift. Idempotent: once the row is 02523064
-- the WHERE clause matches nothing on re-run.
UPDATE hub.carriers
SET dot_number = '02523064',
    updated_at = NOW()
WHERE id = '11111111-1111-1111-1111-111111111111'
  AND dot_number IS DISTINCT FROM '02523064';

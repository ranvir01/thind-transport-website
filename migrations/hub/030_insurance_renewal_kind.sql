-- `insurance_renewal` was missing from the documents kind constraint.
--
-- renewal-packet.ts inserts hub.documents rows with kind = 'insurance_renewal'
-- (buildRenewalPacket, renewal-packet.ts:351) but the constraint last set in
-- 009_carrier_packet.sql never listed it, so every packet build would have died
-- on documents_kind_check at runtime. The unit test asserted on the SQL string,
-- not on a live insert, which is why it went unnoticed.
--
-- Re-stating the whole list (rather than a bare ADD) keeps the append-only rule:
-- 009 stays untouched and this file is the current definition.

ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_kind_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN (
    'rate_confirmation','bol','pod','receipt','cdl','medical_card',
    'registration','inspection','insurance','w9','agreement','other',
    'incident_photo','facility_photo','message_photo',
    'psp_report','mvr','offer_letter','drug_test','road_test',
    'authority_letter','noa','insurance_renewal'
  ));

-- Phase 5 — carrier packet vault: company-level documents (W-9, COI, authority
-- letter, factoring NOA, signed agreements) live on the carrier itself.

ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_entity_type_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_entity_type_check
  CHECK (entity_type IN (
    'load','truck','trailer','driver','customer','incident','facility','applicant','message','carrier'
  ));

ALTER TABLE hub.documents DROP CONSTRAINT IF EXISTS documents_kind_check;
ALTER TABLE hub.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN (
    'rate_confirmation','bol','pod','receipt','cdl','medical_card',
    'registration','inspection','insurance','w9','agreement','other',
    'incident_photo','facility_photo','message_photo',
    'psp_report','mvr','offer_letter','drug_test','road_test',
    'authority_letter','noa'
  ));

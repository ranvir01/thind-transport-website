-- Documents are always read tenant-first: every hub/driver/portal query filters
-- carrier_id (+ entity_type, entity_id) — see src/lib/hub/documents.ts,
-- driver-app.ts, portal.ts, packet.ts. The 001-era index starts at entity_type,
-- so those lookups scan across tenants. Replace it with a tenant-leading index;
-- (carrier_id, entity_type) prefix also serves the carrier-packet counts.

CREATE INDEX IF NOT EXISTS documents_tenant_entity_idx
  ON hub.documents(carrier_id, entity_type, entity_id);

DROP INDEX IF EXISTS hub.documents_entity_idx;

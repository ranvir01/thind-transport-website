-- Per-tenant custom fields (Twenty-style): every carrier shapes its own data
-- model. Definitions live here; values live in a `custom` JSONB column on the
-- entity tables so reads stay one-table and carrier-scoped like everything
-- else. Archived definitions keep their values (rehydrate on unarchive).
CREATE TABLE IF NOT EXISTS hub.custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id  UUID NOT NULL REFERENCES hub.carriers(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('load','driver','truck','customer')),
  key         TEXT NOT NULL,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('text','number','date','select')),
  -- select options as a JSON array of strings; empty for other kinds
  options     JSONB NOT NULL DEFAULT '[]',
  position    INT  NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, entity_type, key)
);
CREATE INDEX IF NOT EXISTS custom_fields_carrier_entity_idx
  ON hub.custom_fields (carrier_id, entity_type) WHERE archived_at IS NULL;

ALTER TABLE hub.loads     ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}';
ALTER TABLE hub.drivers   ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}';
ALTER TABLE hub.trucks    ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}';
ALTER TABLE hub.customers ADD COLUMN IF NOT EXISTS custom JSONB NOT NULL DEFAULT '{}';

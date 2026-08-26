-- Feature flags + user preferences (2026-08 customization-engine research).
-- Flag DEFINITIONS live in code (src/lib/hub/flags.ts registry — same house
-- pattern as navigation.ts/workbench.ts); this table stores only OVERRIDES,
-- so an empty table means "code defaults everywhere" and a missing row can
-- never break the app. Resolution: user > carrier+role > role > carrier >
-- global > code default (most specific wins).
-- First real flag: nav.small_carrier_mode — previously a GLOBAL env var that
-- trimmed every tenant's nav at once, which breaks the moment carrier #2
-- wants the full surface.

CREATE TABLE IF NOT EXISTS hub.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    TEXT NOT NULL,
  flag_type   TEXT NOT NULL DEFAULT 'permission'
              CHECK (flag_type IN ('release','ops','permission','experiment')),
  scope       TEXT NOT NULL CHECK (scope IN ('global','carrier','role','user')),
  carrier_id  UUID REFERENCES hub.carriers(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('owner','dispatcher','accountant','driver','broker','shipper')),
  user_id     UUID REFERENCES hub.users(id) ON DELETE CASCADE,
  value       JSONB NOT NULL DEFAULT 'true'::jsonb,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  note        TEXT NOT NULL DEFAULT '',
  expires_at  TIMESTAMPTZ,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_flags_target_shape CHECK (
    (scope = 'global'  AND carrier_id IS NULL     AND role IS NULL     AND user_id IS NULL) OR
    (scope = 'carrier' AND carrier_id IS NOT NULL AND role IS NULL     AND user_id IS NULL) OR
    (scope = 'role'    AND role IS NOT NULL       AND user_id IS NULL) OR
    (scope = 'user'    AND user_id IS NOT NULL    AND role IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_target_uq
  ON hub.feature_flags (flag_key, scope, carrier_id, role, user_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS feature_flags_carrier_idx
  ON hub.feature_flags (carrier_id) WHERE carrier_id IS NOT NULL;

-- User-owned preferences are NOT flags (flags are operator-owned; mixing the
-- two rots audit trails). Mirrors the carrier_settings JSONB pattern.
CREATE TABLE IF NOT EXISTS hub.user_preferences (
  user_id    UUID PRIMARY KEY REFERENCES hub.users(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES hub.carriers(id) ON DELETE CASCADE,
  prefs      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

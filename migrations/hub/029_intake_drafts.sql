-- Email → load intake staging (Inbox).
--
-- pollDocsMailbox files attachments onto loads that ALREADY exist, matched by a
-- reference in the subject line. Mail for a load that has not been booked yet
-- hit the `if (load)` guard and its attachments were discarded outright — an
-- emailed rate con for new freight was thrown away with a "file it by hand"
-- notification.
--
-- This table is where such mail lands instead: parsed, kept, and waiting for a
-- human. Nothing here is a load. A draft becomes a load only when someone opens
-- it, reviews the prefilled form and accepts, at which point created_load_id
-- records what it became. `confidence` is stored (not acted on) so an
-- auto-accept threshold can be added later without another migration.

CREATE TABLE IF NOT EXISTS hub.intake_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id      UUID NOT NULL REFERENCES hub.carriers(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'mailbox' CHECK (source IN ('mailbox','upload')),
  subject         TEXT,
  from_address    TEXT,
  raw_text        TEXT,
  -- The ParsedRateCon as produced by parser.ts / analyzeDocumentEnhanced.
  parsed          JSONB NOT NULL DEFAULT '{}',
  -- Lowest field confidence in `parsed` ('high'|'medium'|'low'), or 'unreadable'
  -- when the attachment carried no extractable text (a scanned PDF).
  confidence      TEXT NOT NULL DEFAULT 'low',
  document_id     UUID REFERENCES hub.documents(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed')),
  created_load_id UUID REFERENCES hub.loads(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID
);

CREATE INDEX IF NOT EXISTS intake_drafts_queue_idx
  ON hub.intake_drafts (carrier_id, status, created_at DESC);

-- Outbound outreach — the company-side complement to hub.website_leads.
-- website_leads is INBOUND (people who raised their hand). This is OUTBOUND:
-- prospects WE choose to contact — freight brokers to haul for, shippers to
-- haul direct, and drivers to recruit — with Claude-drafted, on-brand messages
-- that a human approves before anything is sent.
--
-- Carrier-scoped (unlike website_leads): a prospect list belongs to the carrier
-- running the outreach (Thind is tenant #1). Every read/write must filter by
-- carrier_id, matching the rest of hub.*.

CREATE TABLE IF NOT EXISTS hub.outreach_prospects (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id) ON DELETE CASCADE,

  -- Who we're talking to and how to pitch them.
  audience TEXT NOT NULL CHECK (audience IN ('broker', 'shipper', 'driver')),
  company TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,

  -- Audience-specific context that sharpens the draft.
  mc_number TEXT,        -- brokers/carriers
  dot_number TEXT,
  lane TEXT,             -- e.g. "PNW ↔ CA", "I-5 reefer"
  equipment TEXT,        -- flatbed / reefer / dry van
  notes TEXT,            -- freeform: anything a human or importer knows

  source TEXT,           -- 'csv', 'fmcsa', 'inbound', 'manual', ...

  -- Lifecycle. 'unsubscribed'/'bounced' are terminal suppression states the
  -- send path must never contact again.
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'drafted', 'approved', 'sent', 'replied', 'converted', 'unsubscribed', 'bounced')),

  -- The current draft awaiting human review (regenerated freely until sent).
  draft_channel TEXT,    -- 'email' | 'sms'
  draft_subject TEXT,
  draft_body TEXT,

  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Soft dedupe: one row per (carrier, email) when an email is present. Imports
-- upsert on this so re-importing a list doesn't fan out duplicates. Rows with
-- no email (phone-only driver leads) are allowed to repeat — harmless.
CREATE UNIQUE INDEX IF NOT EXISTS outreach_prospects_carrier_email_idx
  ON hub.outreach_prospects (carrier_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- The queue view asks "what needs attention?" constantly.
CREATE INDEX IF NOT EXISTS outreach_prospects_carrier_status_idx
  ON hub.outreach_prospects (carrier_id, status, created_at DESC);

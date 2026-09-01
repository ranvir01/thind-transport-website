-- Website driver leads: the recruitment site's captureLead used to be
-- email-or-nothing — with SMTP unset in production, every interested
-- driver's name+phone vanished into a serverless log. Leads now land here
-- first (email stays as a bonus notification).
--
-- Deliberately NOT carrier-scoped: a lead is pre-tenant marketing-site data
-- for the site's operator (Thind, tenant #1). The hub surface that reads
-- this table is owner/office-gated; revisit scoping if the marketing site
-- ever serves multiple carriers.

CREATE TABLE IF NOT EXISTS hub.website_leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  driver_type TEXT,
  experience_years TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ
);

-- The Today card and leads page both ask "how many new?" constantly.
CREATE INDEX IF NOT EXISTS website_leads_new_idx
  ON hub.website_leads (created_at DESC)
  WHERE status = 'new';

-- Same driver re-submitting within a session shouldn't double the list;
-- dedupe softly on email+source per day is left to the insert path (an
-- exact-duplicate row is harmless — recruiters see the repeat interest).

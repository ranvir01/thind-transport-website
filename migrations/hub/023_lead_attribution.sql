-- Lead attribution: where a website lead actually came from.
--
-- hub.website_leads.source records which FORM was submitted ("Shipper/Broker
-- quote request"), which says what someone filled in and nothing about what
-- brought them there. So the only marketing question that matters — which
-- page, search, or campaign produces people who call back — has been
-- unanswerable.
--
-- JSONB rather than a column per UTM parameter: the shape is genuinely open
-- (gclid today, some other click id next year), the data is written once and
-- read rarely, and adding a column per ad platform would mean a migration
-- every time a channel is tried.
--
-- Contains campaign tags, the referring HOST, and the landing path. No
-- personal data and deliberately not the full referrer URL, which can carry a
-- search query the visitor typed.
ALTER TABLE hub.website_leads
  ADD COLUMN IF NOT EXISTS attribution JSONB;

-- Partial index on utm_source, not on the whole column. Nearly every lead
-- carries SOMETHING (the landing path is recorded even for a direct visit,
-- because which page people arrive on directly is itself a useful signal), so
-- an index over "attribution IS NOT NULL" would index almost every row. The
-- reporting question is always "which campaign produced this", and only
-- campaign traffic has utm_source set.
CREATE INDEX IF NOT EXISTS website_leads_attribution_idx
  ON hub.website_leads ((attribution ->> 'utm_source'))
  WHERE attribution ->> 'utm_source' IS NOT NULL;

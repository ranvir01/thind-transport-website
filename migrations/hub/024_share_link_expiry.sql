-- Share links (public /track/<token> pages) never expired — only manual
-- revoke, per RELEASE_READINESS.md §"Customer portal". A link minted for one
-- shipment and forwarded into a broker's inbox stays live and unauthenticated
-- forever unless someone remembers to click revoke.
--
-- New links get a 30-day expiry stamped at creation (renewShareLink extends
-- it another 30 days from the point of renewal). Existing links predate the
-- column entirely — backfilled to now() + 30 days rather than left NULL
-- (which would mean "never expires"), so the same policy applies retroactively
-- instead of quietly grandfathering every link minted before this migration.
ALTER TABLE hub.share_links
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE hub.share_links
  SET expires_at = created_at + INTERVAL '30 days'
  WHERE expires_at IS NULL;

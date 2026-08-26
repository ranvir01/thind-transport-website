-- 017: allow Truckstop.com as a load source (load-board booking).
-- Prerequisite for truckstopPostingToLoadDraft → createLoad().

ALTER TABLE hub.loads DROP CONSTRAINT IF EXISTS loads_source_check;
ALTER TABLE hub.loads ADD CONSTRAINT loads_source_check
  CHECK (source IN ('dat','direct','import','quote','truckstop'));

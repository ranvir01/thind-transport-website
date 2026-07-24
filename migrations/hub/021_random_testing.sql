-- Random drug & alcohol testing pool (49 CFR Part 382.305). Carrier settings
-- already carry randomTesting.drugPct/alcoholPct (default 50%/10%) but nothing
-- reads them yet — this table is the selection pool + result log that closes
-- that gap.
CREATE TABLE IF NOT EXISTS hub.random_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('drug', 'alcohol')),
  period TEXT NOT NULL, -- e.g. '2026Q3'
  status TEXT NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected', 'notified', 'completed', 'refused', 'no_show')),
  result TEXT CHECK (result IN ('negative', 'positive', 'refused')),
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  completed_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, driver_id, period, test_type)
);

CREATE INDEX IF NOT EXISTS random_test_events_carrier_period_idx
  ON hub.random_test_events (carrier_id, period);

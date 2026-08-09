-- Telematics-style safety events (Motive/Samsara class): speeding, hard
-- brakes, phone distraction, preventable crashes. Feeds the fleet safety
-- score (50–100, trailing 4-week window, events per 1,000 mi — see
-- src/lib/hub/safety-score.ts). Sources: manual coaching entries today,
-- ELD/camera sync later — the table is the sync target either way.
CREATE TABLE IF NOT EXISTS hub.safety_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id  UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id   UUID REFERENCES hub.drivers(id) ON DELETE SET NULL,
  truck_id    UUID REFERENCES hub.trucks(id) ON DELETE SET NULL,
  load_id     UUID REFERENCES hub.loads(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL CHECK (kind IN (
    'speeding','hard_brake','hard_accel','sharp_turn',
    'phone_distraction','seatbelt','following_distance','preventable_crash'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  location    TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','eld','camera')),
  notes       TEXT,
  -- coaching loop: an event is open until someone reviews it with the driver
  coached_at  TIMESTAMPTZ,
  coached_by  UUID REFERENCES hub.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS safety_events_carrier_time_idx
  ON hub.safety_events (carrier_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS safety_events_driver_idx
  ON hub.safety_events (carrier_id, driver_id, occurred_at DESC);

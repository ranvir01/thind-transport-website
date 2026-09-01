-- Phase 2 — fuel card: link a fuel transaction to the load it fueled.
-- Lets the owner reconcile card spend against dispatched work and see the
-- all-in economics of a load (linehaul − fuel). Nullable and optional: most
-- historical fuel stays unassigned. ON DELETE SET NULL keeps the financial
-- record if a load is later removed — fuel spend is not owned by the load.

ALTER TABLE hub.fuel_transactions
  ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES hub.loads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fuel_load_idx ON hub.fuel_transactions(load_id)
  WHERE load_id IS NOT NULL;

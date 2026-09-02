-- Broker status updates: opt-in, per customer.
--
-- When a load moves to at_pickup / in_transit / delivered, the carrier can
-- email the customer a one-line update with the ETA and the tracking link
-- (src/lib/hub/broker-updates.ts). NULL here means OFF — nothing is ever sent
-- to billing_email as a fallback. An AR inbox at a brokerage is the wrong
-- place for tracking mail, and the cost of a wrong default is the carrier's
-- reputation with its brokers. Owner decision 2026-08-30.

ALTER TABLE hub.customers ADD COLUMN IF NOT EXISTS status_updates_email TEXT;

-- Factoring expected-net fields. Amounts are integer cents.

ALTER TABLE hub.invoices ADD COLUMN IF NOT EXISTS factoring_fee_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub.invoices ADD COLUMN IF NOT EXISTS factoring_reserve_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub.invoices ADD COLUMN IF NOT EXISTS expected_net_cents INTEGER NOT NULL DEFAULT 0;

UPDATE hub.invoices
SET expected_net_cents = amount_cents - factoring_fee_cents - factoring_reserve_cents
WHERE expected_net_cents = 0;

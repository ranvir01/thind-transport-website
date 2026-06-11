-- Phase 2 — Money: invoices, payments, settlements, advances, escrow, expenses,
-- accessorial price book. All amounts are integer cents.

CREATE TABLE IF NOT EXISTS hub.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES hub.customers(id),
  load_id UUID NOT NULL REFERENCES hub.loads(id),
  amount_cents INTEGER NOT NULL,
  issued_on DATE NOT NULL,
  due_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','paid','overdue','disputed')),
  factored BOOLEAN NOT NULL DEFAULT FALSE,
  remit_to TEXT,
  pdf_url TEXT,
  sent_log JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, number)
);

CREATE INDEX IF NOT EXISTS invoices_customer_idx ON hub.invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON hub.invoices(carrier_id, status);

CREATE TABLE IF NOT EXISTS hub.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  invoice_id UUID NOT NULL REFERENCES hub.invoices(id),
  amount_cents INTEGER NOT NULL,
  paid_on DATE NOT NULL,
  method TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  gross_cents INTEGER NOT NULL DEFAULT 0,
  deductions_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  statement_url TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub.settlement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES hub.settlements(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('earning','reimbursement','deduction')),
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  source_type TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hub.loads ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES hub.settlements(id);

CREATE TABLE IF NOT EXISTS hub.advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  amount_cents INTEGER NOT NULL,
  issued_on DATE NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('pending','outstanding','applied','cancelled')),
  applied_settlement_id UUID REFERENCES hub.settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only escrow ledger with explicit running balance.
CREATE TABLE IF NOT EXISTS hub.escrow_ledger (
  id BIGSERIAL PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  driver_id UUID NOT NULL REFERENCES hub.drivers(id),
  amount_cents INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,
  note TEXT,
  settlement_id UUID REFERENCES hub.settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS escrow_driver_idx ON hub.escrow_ledger(driver_id, id);

CREATE TABLE IF NOT EXISTS hub.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  category TEXT NOT NULL CHECK (category IN ('fuel','tolls','maintenance','insurance','permits','parking','lumper','other')),
  amount_cents INTEGER NOT NULL,
  incurred_on DATE NOT NULL,
  truck_id UUID REFERENCES hub.trucks(id),
  driver_id UUID REFERENCES hub.drivers(id),
  load_id UUID REFERENCES hub.loads(id),
  reimbursable BOOLEAN NOT NULL DEFAULT FALSE,
  billable BOOLEAN NOT NULL DEFAULT FALSE,
  settled_line_id UUID REFERENCES hub.settlement_lines(id),
  receipt_document_id UUID REFERENCES hub.documents(id),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_truck_idx ON hub.expenses(truck_id);
CREATE INDEX IF NOT EXISTS expenses_driver_idx ON hub.expenses(driver_id);

-- Per-carrier accessorial price book
CREATE TABLE IF NOT EXISTS hub.accessorial_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES hub.carriers(id),
  name TEXT NOT NULL,
  default_amount_cents INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'flat' CHECK (unit IN ('flat','per_hour','per_day','pass_through')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (carrier_id, name)
);

-- Thind price book defaults (industry-typical, all editable)
INSERT INTO hub.accessorial_types (carrier_id, name, default_amount_cents, unit) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Detention', 6000, 'per_hour'),
  ('11111111-1111-1111-1111-111111111111', 'Layover', 25000, 'per_day'),
  ('11111111-1111-1111-1111-111111111111', 'TONU', 20000, 'flat'),
  ('11111111-1111-1111-1111-111111111111', 'Stop-off', 10000, 'flat'),
  ('11111111-1111-1111-1111-111111111111', 'Tarp', 10000, 'flat'),
  ('11111111-1111-1111-1111-111111111111', 'Lumper', 0, 'pass_through')
ON CONFLICT (carrier_id, name) DO NOTHING;

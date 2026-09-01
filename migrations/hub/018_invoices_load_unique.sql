-- 018: prevent double-invoicing a load. createInvoiceFromLoad's existing-invoice
-- check (getInvoiceForLoad) was a pre-check, not atomic with the INSERT — a
-- double-click or two concurrent requests could both pass the check and each
-- insert an invoice for the same load. No status (draft/sent/partial/paid/
-- overdue/disputed) represents a voided/reissued invoice, so one invoice per
-- load is a hard invariant.

CREATE UNIQUE INDEX IF NOT EXISTS invoices_carrier_load_unique
  ON hub.invoices(carrier_id, load_id);

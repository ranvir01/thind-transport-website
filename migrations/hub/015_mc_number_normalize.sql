-- Customers' mc_number is stored bare ("784512"): UI templates and FMCSA
-- QCMobile docket URLs prepend their own "MC " prefix, so rows seeded or
-- typed as "MC-784512" rendered doubled ("MC MC-784512") and broke lookups.
-- Strip a leading "MC" plus separators from existing rows. Idempotent: once
-- stripped (and with writes normalized in createCustomer/updateCustomer),
-- no rows match the WHERE clause on re-run.
UPDATE hub.customers
SET mc_number = NULLIF(regexp_replace(btrim(mc_number), '^[Mm][Cc][[:space:]#:.-]*', ''), ''),
    updated_at = NOW()
WHERE mc_number ~* '^[[:space:]]*MC';

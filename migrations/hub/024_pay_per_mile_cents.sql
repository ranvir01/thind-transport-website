-- 024: carrier_settings.pay.companyDriverPerMile -> companyDriverPerMileCents.
--
-- AGENTS.md: "Money is integer cents everywhere." This one setting was stored
-- as fractional dollars (0.6), and was the single most-carried item in the
-- backlog. pay-rules.ts absorbed it with Math.round(rate * 100) so nothing
-- mis-paid in practice, but a half-cent rate had no representation and every
-- new consumer had to remember which unit it was in.
--
-- Idempotent and append-only in spirit: it only fires on rows that still carry
-- the old key, and drops the old key in the same statement so a re-run is a
-- no-op. settings.ts also converts on read, so a row written by an older deploy
-- mid-rollout is handled either way.
UPDATE hub.carrier_settings
SET settings = jsonb_set(
      settings #- '{pay,companyDriverPerMile}',
      '{pay,companyDriverPerMileCents}',
      to_jsonb(ROUND(((settings #>> '{pay,companyDriverPerMile}')::numeric) * 100)::int)
    ),
    updated_at = NOW()
WHERE settings #>> '{pay,companyDriverPerMile}' IS NOT NULL
  AND settings #>> '{pay,companyDriverPerMileCents}' IS NULL;

-- Second pass: a row that already carries the cents key but still has the old
-- one beside it (half-migrated by a mid-rollout write) keeps the cents value —
-- never overwritten by the stale dollars — and loses the dead key. Separate
-- statement because the UPDATE above deliberately skips these rows.
UPDATE hub.carrier_settings
SET settings = settings #- '{pay,companyDriverPerMile}',
    updated_at = NOW()
WHERE settings #>> '{pay,companyDriverPerMile}' IS NOT NULL
  AND settings #>> '{pay,companyDriverPerMileCents}' IS NOT NULL;

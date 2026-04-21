-- 1. Add plan columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS plan_status text,
  ADD COLUMN IF NOT EXISTS plan_source text,
  ADD COLUMN IF NOT EXISTS subscription_end timestamptz;

-- Constraint for plan_tier values
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_plan_tier_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_plan_tier_check
  CHECK (plan_tier IS NULL OR plan_tier IN ('bronze', 'prata', 'ouro'));

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_plan_source_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_plan_source_check
  CHECK (plan_source IS NULL OR plan_source IN ('stripe', 'manual'));

-- 2. Sync function: update companies.plan_* when subscriptions changes
CREATE OR REPLACE FUNCTION public.sync_company_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_source text;
BEGIN
  SELECT plan_source INTO current_source
  FROM public.companies WHERE id = NEW.company_id;

  -- Don't overwrite manual assignments
  IF current_source = 'manual' THEN
    RETURN NEW;
  END IF;

  UPDATE public.companies
  SET
    plan_tier = NEW.plan_tier,
    plan_status = NEW.status,
    plan_source = 'stripe',
    subscription_end = NEW.current_period_end,
    updated_at = now()
  WHERE id = NEW.company_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_company_plan_trigger ON public.subscriptions;
CREATE TRIGGER sync_company_plan_trigger
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_plan_from_subscription();

-- 3. Backfill: bring existing subscription data into companies
UPDATE public.companies c
SET
  plan_tier = s.plan_tier,
  plan_status = s.status,
  plan_source = COALESCE(c.plan_source, 'stripe'),
  subscription_end = s.current_period_end
FROM public.subscriptions s
WHERE s.company_id = c.id
  AND c.plan_tier IS NULL;
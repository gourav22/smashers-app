ALTER TABLE public.subscription_templates
ADD COLUMN IF NOT EXISTS period_start_date DATE,
ADD COLUMN IF NOT EXISTS period_end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_template_period_check'
  ) THEN
    ALTER TABLE public.subscription_templates
    ADD CONSTRAINT subscription_template_period_check CHECK (
      (period_start_date IS NULL AND period_end_date IS NULL)
      OR (
        period_start_date IS NOT NULL
        AND period_end_date IS NOT NULL
        AND period_end_date >= period_start_date
      )
    );
  END IF;
END $$;
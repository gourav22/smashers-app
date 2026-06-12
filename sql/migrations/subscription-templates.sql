-- Subscription Templates System
-- Admin creates available subscription templates, users subscribe to them

-- Create subscription templates table (admin-managed)
CREATE TABLE IF NOT EXISTS public.subscription_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_time TIME NOT NULL,
  location TEXT NOT NULL,
  max_subscribers INTEGER DEFAULT 10 CHECK (max_subscribers > 0),
  current_subscribers INTEGER DEFAULT 0,
  price_per_week NUMERIC(10, 2) DEFAULT 4.00,
  available_durations INTEGER[] DEFAULT ARRAY[3, 6, 12], -- Available months
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'full', 'cancelled')),
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport, day_of_week, slot_time, location)
);

-- Update subscriptions table to reference template
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.subscription_templates(id) ON DELETE SET NULL;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscription_templates_active ON public.subscription_templates(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_templates_sport_day ON public.subscription_templates(sport, day_of_week, status);

-- RLS for subscription templates
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view active templates
CREATE POLICY "Anyone can view active templates" ON public.subscription_templates
  FOR SELECT USING (status = 'active');

-- Admins can view all templates
CREATE POLICY "Admins can view all templates" ON public.subscription_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
  );

-- Admins can create templates
CREATE POLICY "Admins can create templates" ON public.subscription_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
  );

-- Admins can update templates
CREATE POLICY "Admins can update templates" ON public.subscription_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete templates" ON public.subscription_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
  );

-- Function to update subscriber count
CREATE OR REPLACE FUNCTION update_template_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    -- Increment count
    UPDATE subscription_templates
    SET current_subscribers = current_subscribers + 1,
        status = CASE
          WHEN current_subscribers + 1 >= max_subscribers THEN 'full'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.template_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('active', 'expired') THEN
    -- Decrement count
    UPDATE subscription_templates
    SET current_subscribers = GREATEST(0, current_subscribers - 1),
        status = CASE
          WHEN current_subscribers - 1 < max_subscribers AND status = 'full' THEN 'active'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = OLD.template_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    -- Subscription cancelled
    UPDATE subscription_templates
    SET current_subscribers = GREATEST(0, current_subscribers - 1),
        status = CASE
          WHEN current_subscribers - 1 < max_subscribers AND status = 'full' THEN 'active'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update counts
CREATE TRIGGER trigger_update_template_subscriber_count
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_template_subscriber_count();

-- Function to get available subscription templates with details
CREATE OR REPLACE FUNCTION get_available_subscription_templates()
RETURNS TABLE (
  id UUID,
  sport TEXT,
  day_of_week INTEGER,
  slot_time TIME,
  location TEXT,
  max_subscribers INTEGER,
  current_subscribers INTEGER,
  available_spots INTEGER,
  price_per_week NUMERIC,
  available_durations INTEGER[],
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.sport,
    st.day_of_week,
    st.slot_time,
    st.location,
    st.max_subscribers,
    st.current_subscribers,
    st.max_subscribers - st.current_subscribers as available_spots,
    st.price_per_week,
    st.available_durations,
    st.description
  FROM subscription_templates st
  WHERE st.status = 'active'
  ORDER BY st.sport, st.day_of_week, st.slot_time;
END;
$$;

-- Sample subscription templates (for testing)
-- Run these after creating the table
/*
INSERT INTO public.subscription_templates (sport, day_of_week, slot_time, location, max_subscribers, price_per_week, description, created_by)
VALUES
  ('badminton', 2, '18:00:00', 'Court A', 10, 4.00, 'Tuesday evening badminton - Intermediate level', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ('badminton', 4, '19:00:00', 'Court A', 10, 4.00, 'Thursday evening badminton - Advanced level', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ('badminton', 6, '10:00:00', 'Court B', 12, 4.00, 'Saturday morning badminton - All levels', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ('cricket', 0, '09:00:00', 'Main Ground', 20, 4.00, 'Sunday morning cricket - Match practice', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  ('cricket', 3, '18:30:00', 'Practice Nets', 15, 4.00, 'Wednesday evening cricket - Nets session', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));
*/

-- Add comments
COMMENT ON TABLE public.subscription_templates IS 'Admin-created subscription templates that members can subscribe to';
COMMENT ON COLUMN public.subscription_templates.max_subscribers IS 'Maximum number of members who can subscribe to this template';
COMMENT ON COLUMN public.subscription_templates.current_subscribers IS 'Current number of active subscribers';
COMMENT ON COLUMN public.subscription_templates.available_durations IS 'Available subscription durations in months (e.g., [3, 6, 12])';

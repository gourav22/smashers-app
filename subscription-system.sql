-- Member Subscription System Database Schema
-- Run this in your Supabase SQL Editor

-- Add new columns to users table for subscription management
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'adhoc' CHECK (membership_type IN ('regular', 'adhoc')),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS subscription_sport TEXT CHECK (subscription_sport IN ('badminton', 'cricket', NULL)),
ADD COLUMN IF NOT EXISTS subscription_day_of_week INTEGER CHECK (subscription_day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
ADD COLUMN IF NOT EXISTS subscription_slot_time TIME,
ADD COLUMN IF NOT EXISTS auto_booking_enabled BOOLEAN DEFAULT TRUE;

-- Create subscriptions table for detailed tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  slot_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  auto_booking_enabled BOOLEAN DEFAULT TRUE,
  price_per_week NUMERIC(10, 2) DEFAULT 4.00,
  total_paid NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport, day_of_week, slot_time, start_date)
);

-- Create subscription cancellations table
CREATE TABLE IF NOT EXISTS public.subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  cancelled_at TIMESTAMPTZ DEFAULT NOW(),
  refund_amount NUMERIC(10, 2) DEFAULT 0,
  reason TEXT,
  CONSTRAINT cancellation_advance_notice CHECK (original_date >= (CURRENT_DATE + INTERVAL '7 days'))
);

-- Create auto-booking logs table
CREATE TABLE IF NOT EXISTS public.auto_booking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  slot_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'slot_not_found', 'slot_full', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(status, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_user ON public.subscription_cancellations(user_id, original_date);
CREATE INDEX IF NOT EXISTS idx_auto_booking_logs_subscription ON public.auto_booking_logs(subscription_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_booking_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own subscriptions (or admin)
CREATE POLICY "Users can create subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
  );

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
  );

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
  );

-- Users can view their own cancellations
CREATE POLICY "Users can view own cancellations" ON public.subscription_cancellations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own cancellations (with 7-day notice)
CREATE POLICY "Users can cancel with notice" ON public.subscription_cancellations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    original_date >= (CURRENT_DATE + INTERVAL '7 days')
  );

-- Users can view their own auto-booking logs
CREATE POLICY "Users can view own logs" ON public.auto_booking_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs" ON public.auto_booking_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
  );

-- Helper function to get weeks remaining (call this instead of computed column)
CREATE OR REPLACE FUNCTION get_weeks_remaining(p_end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM p_end_date)::INTEGER - EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;
END;
$$;

-- Function to auto-expire subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$;

-- Function to check if user can cancel a slot
CREATE OR REPLACE FUNCTION can_cancel_subscription_slot(
  p_user_id UUID,
  p_slot_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if date is at least 7 days in future
  RETURN p_slot_date >= (CURRENT_DATE + INTERVAL '7 days');
END;
$$;

-- Function to get user's next subscription slot
CREATE OR REPLACE FUNCTION get_next_subscription_slots(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  sport TEXT,
  day_of_week INTEGER,
  slot_time TIME,
  next_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sport,
    s.day_of_week,
    s.slot_time,
    (CURRENT_DATE + ((s.day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7) % 7)::INTEGER)::DATE as next_date
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.auto_booking_enabled = TRUE
    AND s.end_date >= CURRENT_DATE;
END;
$$;

-- Trigger to update subscription status when user updates
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_subscription_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscription_timestamp();

-- Add comment explaining the system
COMMENT ON TABLE public.subscriptions IS 'Manages regular member subscriptions with auto-booking for specific time slots';
COMMENT ON TABLE public.subscription_cancellations IS 'Tracks cancellations with 7-day advance notice requirement';
COMMENT ON TABLE public.auto_booking_logs IS 'Logs all auto-booking attempts for regular members';

-- Sample data insert (optional - for testing)
-- INSERT INTO public.subscriptions (user_id, sport, day_of_week, slot_time, start_date, end_date, total_paid)
-- VALUES (
--   'YOUR_USER_ID',
--   'badminton',
--   2, -- Tuesday
--   '18:00:00',
--   CURRENT_DATE,
--   CURRENT_DATE + INTERVAL '6 months',
--   96.00 -- 24 weeks * €4
-- );

-- ============================================================================
-- SPORTS CLUB MANAGEMENT SYSTEM - CONSOLIDATED DATABASE SCHEMA
-- ============================================================================
-- This file consolidates all migrations with the latest versions of policies
-- Run this in your Supabase SQL Editor for a fresh setup
-- Last updated: 2026-06-12
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'super_admin', 'slot_manager', 'finance_manager')),
  balance NUMERIC(10, 2) DEFAULT 0 CHECK (balance >= 0),
  sports_played TEXT[] DEFAULT ARRAY['badminton', 'cricket'],
  push_subscription JSONB DEFAULT NULL,

  -- Badminton stats
  badminton_elo INTEGER DEFAULT 1200,
  badminton_grade TEXT DEFAULT 'D' CHECK (badminton_grade IN ('A', 'B', 'C', 'D')),
  badminton_games_played INTEGER DEFAULT 0,
  badminton_wins INTEGER DEFAULT 0,
  badminton_losses INTEGER DEFAULT 0,

  -- Cricket stats
  cricket_elo INTEGER DEFAULT 1200,
  cricket_grade TEXT DEFAULT 'D' CHECK (cricket_grade IN ('A', 'B', 'C', 'D')),
  cricket_games_played INTEGER DEFAULT 0,
  cricket_wins INTEGER DEFAULT 0,
  cricket_losses INTEGER DEFAULT 0,

  -- Gamification
  current_win_streak INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slots table
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  total_spots INTEGER NOT NULL CHECK (total_spots > 0),
  booked_user_ids UUID[] DEFAULT '{}',
  waitlist JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  refunded BOOLEAN DEFAULT FALSE,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- Partial unique index for bookings (allows rebooking after cancellation)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_slot_active_unique
ON bookings (user_id, slot_id)
WHERE status != 'cancelled';

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'booking', 'refund', 'registration_fee')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID REFERENCES public.slots(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  match_type TEXT NOT NULL CHECK (match_type IN ('singles', 'doubles')),
  team1_user_ids UUID[] NOT NULL,
  team2_user_ids UUID[] NOT NULL,
  team1_score INTEGER NOT NULL CHECK (team1_score >= 0),
  team2_score INTEGER NOT NULL CHECK (team2_score >= 0),
  status TEXT DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected', 'disputed')),
  confirmed_by UUID[] DEFAULT '{}',
  pending_confirmation UUID[] DEFAULT '{}',
  elo_updated BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES public.users(id),
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  changes JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending refunds table
CREATE TABLE IF NOT EXISTS public.pending_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTION SYSTEM TABLES
-- ============================================================================

-- Subscription templates (admin-managed)
CREATE TABLE IF NOT EXISTS public.subscription_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_time TIME NOT NULL,
  location TEXT NOT NULL,
  max_subscribers INTEGER DEFAULT 10 CHECK (max_subscribers > 0),
  current_subscribers INTEGER DEFAULT 0,
  price_per_week NUMERIC(10, 2) DEFAULT 4.00,
  available_durations INTEGER[] DEFAULT ARRAY[3, 6, 12],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'full', 'cancelled')),
  description TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport, day_of_week, slot_time, location)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.subscription_templates(id) ON DELETE SET NULL,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
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

-- Subscription cancellations
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

-- Auto-booking logs
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

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_badminton_elo ON public.users(badminton_elo DESC);
CREATE INDEX IF NOT EXISTS idx_users_cricket_elo ON public.users(cricket_elo DESC);
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_push_subscription ON public.users(id) WHERE push_subscription IS NOT NULL;

-- Slots indexes
CREATE INDEX IF NOT EXISTS idx_slots_date_sport ON public.slots(date, sport, status);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_user_ids ON public.matches USING GIN((team1_user_ids || team2_user_ids));

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Pending refunds indexes
CREATE INDEX IF NOT EXISTS idx_pending_refunds_user ON public.pending_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_refunds_slot ON public.pending_refunds(slot_id);
CREATE INDEX IF NOT EXISTS idx_pending_refunds_status ON public.pending_refunds(status) WHERE status = 'pending';

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(status, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_user ON public.subscription_cancellations(user_id, original_date);
CREATE INDEX IF NOT EXISTS idx_auto_booking_logs_subscription ON public.auto_booking_logs(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_templates_active ON public.subscription_templates(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_templates_sport_day ON public.subscription_templates(sport, day_of_week, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_booking_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can do anything" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users
FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin helper function (SECURITY DEFINER avoids circular reference)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'slot_manager', 'finance_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can insert users" ON public.users
FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update any user" ON public.users
FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE USING (public.is_admin());

-- ============================================================================
-- SLOTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can manage slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can create slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can update slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can delete slots" ON public.slots;

CREATE POLICY "Anyone can view slots" ON public.slots
FOR SELECT USING (true);

CREATE POLICY "Admins can create slots" ON public.slots
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can update slots" ON public.slots
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can delete slots" ON public.slots
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

-- ============================================================================
-- BOOKINGS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" ON public.bookings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

CREATE POLICY "Users can create bookings" ON public.bookings
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own bookings" ON public.bookings
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions for any user" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.transactions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager', 'slot_manager'))
);

CREATE POLICY "Users can insert own transactions" ON public.transactions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert transactions for any user" ON public.transactions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

-- ============================================================================
-- MATCHES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;

CREATE POLICY "Anyone can view matches" ON public.matches
FOR SELECT USING (true);

CREATE POLICY "Users can create matches" ON public.matches
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own matches" ON public.matches
FOR UPDATE USING (created_by = auth.uid());

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

-- ============================================================================
-- PENDING REFUNDS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own pending refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Admins can view all pending refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Service can insert pending refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Service can update pending refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Service can delete pending refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Users can update own refunds" ON public.pending_refunds;
DROP POLICY IF EXISTS "Users can delete own refunds" ON public.pending_refunds;

CREATE POLICY "Users can view own pending refunds" ON public.pending_refunds
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all pending refunds" ON public.pending_refunds
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

CREATE POLICY "Service can insert pending refunds" ON public.pending_refunds
FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update pending refunds" ON public.pending_refunds
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete pending refunds" ON public.pending_refunds
FOR DELETE USING (true);

CREATE POLICY "Users can update own refunds" ON public.pending_refunds
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own refunds" ON public.pending_refunds
FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- SUBSCRIPTION TEMPLATES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view active templates" ON public.subscription_templates;
DROP POLICY IF EXISTS "Admins can view all templates" ON public.subscription_templates;
DROP POLICY IF EXISTS "Admins can create templates" ON public.subscription_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.subscription_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.subscription_templates;

CREATE POLICY "Anyone can view active templates" ON public.subscription_templates
FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can view all templates" ON public.subscription_templates
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can create templates" ON public.subscription_templates
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can update templates" ON public.subscription_templates
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can delete templates" ON public.subscription_templates
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

-- ============================================================================
-- SUBSCRIPTION CANCELLATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own cancellations" ON public.subscription_cancellations;
DROP POLICY IF EXISTS "Users can cancel with notice" ON public.subscription_cancellations;

CREATE POLICY "Users can view own cancellations" ON public.subscription_cancellations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel with notice" ON public.subscription_cancellations
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  original_date >= (CURRENT_DATE + INTERVAL '7 days')
);

-- ============================================================================
-- AUTO BOOKING LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own logs" ON public.auto_booking_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.auto_booking_logs;

CREATE POLICY "Users can view own logs" ON public.auto_booking_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.auto_booking_logs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update subscription template subscriber count
CREATE OR REPLACE FUNCTION update_template_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE subscription_templates
    SET current_subscribers = current_subscribers + 1,
        status = CASE
          WHEN current_subscribers + 1 >= max_subscribers THEN 'full'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.template_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status IN ('active', 'expired') THEN
    UPDATE subscription_templates
    SET current_subscribers = GREATEST(0, current_subscribers - 1),
        status = CASE
          WHEN current_subscribers - 1 < max_subscribers AND status = 'full' THEN 'active'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = OLD.template_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'cancelled' THEN
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

-- Trigger to update subscriber counts
DROP TRIGGER IF EXISTS trigger_update_template_subscriber_count ON public.subscriptions;
CREATE TRIGGER trigger_update_template_subscriber_count
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_template_subscriber_count();

-- Function to update subscription timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_subscription_timestamp ON public.subscriptions;
CREATE TRIGGER trigger_update_subscription_timestamp
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscription_timestamp();

-- Function to expire subscriptions
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

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can cancel subscription slot
CREATE OR REPLACE FUNCTION can_cancel_subscription_slot(
  p_user_id UUID,
  p_slot_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_slot_date >= (CURRENT_DATE + INTERVAL '7 days');
END;
$$;

-- Function to get next subscription slots
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

-- Function to get available subscription templates
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

-- Function to get weeks remaining in subscription
CREATE OR REPLACE FUNCTION get_weeks_remaining(p_end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM p_end_date)::INTEGER - EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;
END;
$$;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'Core user profiles with stats and gamification';
COMMENT ON TABLE public.slots IS 'Available time slots for sports activities';
COMMENT ON TABLE public.bookings IS 'User bookings for slots';
COMMENT ON TABLE public.transactions IS 'Financial transaction history';
COMMENT ON TABLE public.matches IS 'Match results and ELO tracking';
COMMENT ON TABLE public.notifications IS 'User notifications system';
COMMENT ON TABLE public.audit_logs IS 'Admin action audit trail';
COMMENT ON TABLE public.pending_refunds IS 'Holds refunds pending until a replacement books the cancelled slot';
COMMENT ON TABLE public.subscription_templates IS 'Admin-created subscription templates that members can subscribe to';
COMMENT ON TABLE public.subscriptions IS 'Manages regular member subscriptions with auto-booking for specific time slots';
COMMENT ON TABLE public.subscription_cancellations IS 'Tracks cancellations with 7-day advance notice requirement';
COMMENT ON TABLE public.auto_booking_logs IS 'Logs all auto-booking attempts for regular members';

COMMENT ON COLUMN public.users.sports_played IS 'Array of sports user plays: badminton, cricket, or both';
COMMENT ON COLUMN public.matches.approved_by IS 'Admin who approved the match score';
COMMENT ON COLUMN public.matches.approved_at IS 'Timestamp when match was approved';
COMMENT ON COLUMN public.subscription_templates.max_subscribers IS 'Maximum number of members who can subscribe to this template';
COMMENT ON COLUMN public.subscription_templates.current_subscribers IS 'Current number of active subscribers';
COMMENT ON COLUMN public.subscription_templates.available_durations IS 'Available subscription durations in months (e.g., [3, 6, 12])';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Sports Club Management System database schema created successfully!' AS message,
       'All tables, indexes, policies, and functions have been set up.' AS details,
       '🔒 Row Level Security (RLS) is enabled on all tables.' AS security_status;

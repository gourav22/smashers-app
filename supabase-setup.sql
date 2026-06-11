-- Sports Club Management System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'super_admin', 'slot_manager', 'finance_manager')),
  is_long_term_player BOOLEAN DEFAULT FALSE,
  balance NUMERIC(10, 2) DEFAULT 0 CHECK (balance >= 0),

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
CREATE TABLE public.slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('badminton', 'cricket')),
  total_spots INTEGER NOT NULL CHECK (total_spots > 0),
  booked_user_ids UUID[] DEFAULT '{}',
  waitlist JSONB DEFAULT '[]', -- [{user_id, added_at}]
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  refunded BOOLEAN DEFAULT FALSE,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(user_id, slot_id)
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'booking', 'refund', 'registration_fee')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE public.matches (
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
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
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
CREATE TABLE public.audit_logs (
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

-- Indexes for performance
CREATE INDEX idx_users_badminton_elo ON public.users(badminton_elo DESC);
CREATE INDEX idx_users_cricket_elo ON public.users(cricket_elo DESC);
CREATE INDEX idx_users_name ON public.users(name);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_slots_date_sport ON public.slots(date, sport, status);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id, status);
CREATE INDEX idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_matches_user_ids ON public.matches USING GIN((team1_user_ids || team2_user_ids));
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can do anything" ON public.users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

-- Slots policies
CREATE POLICY "Anyone can view slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Admins can manage slots" ON public.slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Finance admins can view all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'finance_manager'))
);

-- Matches policies
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Users can create matches" ON public.matches FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own matches" ON public.matches FOR UPDATE USING (created_by = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'Database schema created successfully!' AS message;

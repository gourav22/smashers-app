-- Create pending_refunds table to hold refunds until replacement is found
-- This implements the business rule: refunds are only processed when a replacement books the slot

CREATE TABLE IF NOT EXISTS pending_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_pending_refunds_user ON pending_refunds(user_id);
CREATE INDEX idx_pending_refunds_slot ON pending_refunds(slot_id);
CREATE INDEX idx_pending_refunds_status ON pending_refunds(status) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE pending_refunds ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending refunds
CREATE POLICY "Users can view own pending refunds"
ON pending_refunds
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all pending refunds
CREATE POLICY "Admins can view all pending refunds"
ON pending_refunds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'finance_manager')
  )
);

-- Comment
COMMENT ON TABLE pending_refunds IS 'Holds refunds pending until a replacement books the cancelled slot';

SELECT 'pending_refunds table created successfully!' AS message;

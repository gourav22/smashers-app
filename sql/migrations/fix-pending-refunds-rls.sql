-- Fix RLS policies for pending_refunds table
-- Add missing INSERT, UPDATE, and DELETE policies to allow proper refund management

-- Service role can insert pending refunds during cancellation
CREATE POLICY "Service can insert pending refunds"
ON pending_refunds
FOR INSERT
WITH CHECK (true);

-- Service role can update refund status during processing
CREATE POLICY "Service can update pending refunds"
ON pending_refunds
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Service role can delete refunds
CREATE POLICY "Service can delete pending refunds"
ON pending_refunds
FOR DELETE
USING (true);

-- Users can update their own refunds (for future use)
CREATE POLICY "Users can update own refunds"
ON pending_refunds
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own refunds (for undo scenarios)
CREATE POLICY "Users can delete own refunds"
ON pending_refunds
FOR DELETE
USING (user_id = auth.uid());

SELECT 'pending_refunds RLS policies fixed!' AS message;

-- Fix: Allow admins to insert transactions when manually adjusting member balances
-- This is needed when admin updates a member's balance in the admin panel

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'finance_manager', 'slot_manager')
  )
);

-- Allow authenticated users to insert their own transactions
-- (Needed for booking/refund operations)
CREATE POLICY "Users can insert own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow admins to insert transactions for any user
-- (Needed for manual balance adjustments)
CREATE POLICY "Admins can insert transactions for any user"
ON public.transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'finance_manager')
  )
);

SELECT 'Transactions RLS policies updated! Admins can now create transactions.' AS message;

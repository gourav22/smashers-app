-- Fix: Admin users update policy
-- The previous "Admins can do anything" policy had a circular reference issue
-- This creates a more specific UPDATE policy for admins

-- Drop the existing broad admin policy
DROP POLICY IF EXISTS "Admins can do anything" ON public.users;

-- Create separate policies for different operations

-- INSERT: Admins can insert any user (for admin-created accounts)
CREATE POLICY "Admins can insert users" ON public.users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'slot_manager', 'finance_manager')
  )
);

-- UPDATE: Admins can update any user
-- Use a function to avoid circular reference issues
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

CREATE POLICY "Admins can update any user" ON public.users
FOR UPDATE
USING (public.is_admin());

-- DELETE: Admins can delete any user (use with caution)
CREATE POLICY "Admins can delete users" ON public.users
FOR DELETE
USING (public.is_admin());

SELECT 'Admin user update policies fixed successfully!' AS message;

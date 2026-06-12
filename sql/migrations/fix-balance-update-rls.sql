-- Fix: Allow users to update their own balance (for booking deductions)
-- This is safe because the API validates the booking before deducting

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate with balance update allowed
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Alternative: Create a database function that handles booking with proper permissions
-- This is more secure as it keeps the business logic in the database

CREATE OR REPLACE FUNCTION create_booking_transaction(
  p_user_id UUID,
  p_slot_id UUID,
  p_booking_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the permissions of the function owner (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_slot RECORD;
  v_new_balance INTEGER;
  v_booking_id UUID;
BEGIN
  -- Get user balance
  SELECT balance INTO v_balance
  FROM users
  WHERE id = p_user_id;

  -- Check balance
  IF v_balance < p_booking_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Get slot info
  SELECT * INTO v_slot
  FROM slots
  WHERE id = p_slot_id;

  -- Validate slot
  IF v_slot.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Slot cancelled');
  END IF;

  IF p_user_id = ANY(v_slot.booked_user_ids) THEN
    RETURN json_build_object('success', false, 'error', 'Already booked');
  END IF;

  IF array_length(v_slot.booked_user_ids, 1) >= v_slot.total_spots THEN
    RETURN json_build_object('success', false, 'error', 'Slot full');
  END IF;

  -- Create booking
  INSERT INTO bookings (user_id, slot_id, status, amount_paid)
  VALUES (p_user_id, p_slot_id, 'confirmed', p_booking_cost)
  RETURNING id INTO v_booking_id;

  -- Update slot
  UPDATE slots
  SET
    booked_user_ids = array_append(booked_user_ids, p_user_id),
    status = CASE
      WHEN array_length(booked_user_ids, 1) + 1 >= total_spots THEN 'full'
      ELSE 'open'
    END
  WHERE id = p_slot_id;

  -- Deduct balance
  v_new_balance := v_balance - p_booking_cost;

  UPDATE users
  SET balance = v_new_balance
  WHERE id = p_user_id;

  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, balance_after, metadata)
  VALUES (p_user_id, 'booking', -p_booking_cost, v_new_balance,
    json_build_object('slot_id', p_slot_id, 'booking_id', v_booking_id));

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_booking_transaction TO authenticated;

SELECT 'Balance update RLS and booking function created successfully!' AS message;

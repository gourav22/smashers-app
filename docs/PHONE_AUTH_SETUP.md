# Phone Authentication with OTP Setup

This guide shows how to implement phone number authentication with SMS OTP instead of email verification.

## Benefits of Phone Auth

✅ **Instant verification** - OTP arrives in seconds
✅ **No email rate limits** - SMS providers have higher limits
✅ **Better for mobile** - Users already have phone number
✅ **More secure** - Hard to fake phone numbers
✅ **Better deliverability** - SMS rarely goes to spam

## Required: Supabase SMS Provider

Supabase supports these SMS providers:
- **Twilio** (Recommended - most reliable)
- **MessageBird**
- **Textlocal**
- **Vonage**

### Step 1: Configure SMS Provider in Supabase

1. Go to **Supabase Dashboard → Authentication → Providers**
2. Find **Phone** provider
3. **Enable** Phone authentication
4. Choose your SMS provider (Twilio recommended)
5. Add your provider credentials:

**For Twilio:**
```
Account SID: your-account-sid
Auth Token: your-auth-token
From Number: +1234567890 (your Twilio phone number)
```

6. Click **Save**

### Step 2: Get Twilio Credentials

1. Sign up at https://www.twilio.com/try-twilio
2. Get $15 free credit for testing
3. Go to Twilio Console
4. Copy:
   - Account SID
   - Auth Token
5. Get a phone number from Twilio

### Step 3: Implementation Options

We have **two approaches**:

## Option A: Phone Only (No Password)

**Registration Flow:**
1. User enters: Name, Phone, Sports
2. Click "Send OTP"
3. Receives 6-digit code via SMS
4. Enters code
5. Account created → Logged in immediately

**Login Flow:**
1. User enters phone number
2. Click "Send OTP"
3. Receives 6-digit code
4. Enters code → Logged in

**Pros:**
- ✅ Simplest UX - no passwords to remember
- ✅ Most secure - phone = identity
- ✅ Fast onboarding

**Cons:**
- ❌ Requires SMS every login (costs money)
- ❌ Won't work if phone is lost/no signal

## Option B: Phone + Password (OTP for verification only)

**Registration Flow:**
1. User enters: Name, Phone, Password, Sports
2. Click "Register"
3. Receives 6-digit OTP via SMS
4. Enters code to verify phone
5. Account created and verified

**Login Flow:**
1. User enters phone + password
2. Logged in immediately
3. (Optional: Send OTP for 2FA on suspicious login)

**Pros:**
- ✅ Works offline (after initial verification)
- ✅ No SMS cost on every login
- ✅ Can still recover account via SMS OTP

**Cons:**
- ❌ Users have to remember password
- ❌ Slightly more complex flow

## Recommended: Option B (Phone + Password)

This gives the best balance of security, cost, and user experience.

## Implementation Code

### Update Registration Page

Replace the current email-based registration with phone-based:

```typescript
// src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [sportsPlayed, setSportsPlayed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Check if name is unique
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('name', formData.name)
        .single();

      if (existingUser) {
        throw new Error('This name is already taken.');
      }

      // Sign up with phone and password
      const { data, error } = await supabase.auth.signUp({
        phone: formData.phone,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (error) throw error;

      // Move to OTP verification step
      setStep('verify');
      alert('OTP sent to your phone! Check your messages.');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formData.phone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        // Update user profile with sports
        await supabase
          .from('users')
          .update({ sports_played: sportsPlayed })
          .eq('id', data.user.id);

        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Render form or OTP verification based on step
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4">Verify Phone Number</h1>
          <p className="text-gray-600 mb-6">
            Enter the 6-digit code sent to {formData.phone}
          </p>
          
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-2 border rounded-lg text-center text-2xl tracking-widest"
              required
            />

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Verifying...' : 'Verify & Complete Registration'}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-gray-600 hover:text-gray-800"
            >
              ← Back to form
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    // ... existing registration form ...
    // Just replace supabase.auth.signUp with the phone version above
  );
}
```

### Update Login Page

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Testing Phone Auth

### Test with Real Phone Numbers

1. Use your own phone number for testing
2. You'll receive real SMS messages
3. Enter the 6-digit code
4. Twilio free credit ($15) allows ~150 SMS for testing

### Test with Twilio Test Credentials (No Real SMS)

Twilio provides test phone numbers:
- Use: `+15005550006` (valid test number)
- OTP will always be: `123456`
- No actual SMS sent
- Free for testing

Configure in Supabase for testing:
```
Test Phone Numbers: +15005550006
Test OTP: 123456
```

## Cost Considerations

**SMS Pricing (Twilio):**
- US/Canada: ~$0.0075 per SMS
- International: $0.05 - $0.15 per SMS

**For 1000 users:**
- Registration: 1 SMS = $7.50
- Login (if OTP-only): 10 logins/month = $75/month

**Recommendation:**
- Use Phone + Password (Option B)
- Only send SMS for registration verification
- Login with password (no SMS cost)
- Optional: 2FA SMS for suspicious logins

## Migration from Email to Phone

If you already have email-based users:

```sql
-- Allow both email and phone users temporarily
-- Update users table to make email nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add phone column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
```

Then:
1. Let new users register with phone
2. Let existing users add phone number to their profile
3. Eventually deprecate email auth

## Important Phone Number Format

Phone numbers must be in **E.164 format**:
- ✅ `+14155552671` (US)
- ✅ `+442071234567` (UK)
- ✅ `+919876543210` (India)
- ❌ `4155552671` (missing country code)
- ❌ `(415) 555-2671` (has formatting)

Your `PhoneInput` component should handle this automatically.

## Summary

**Quick Setup:**
1. Configure Twilio in Supabase Dashboard
2. Update registration to use `signUp({ phone, password })`
3. Add OTP verification step
4. Update login to use `signInWithPassword({ phone, password })`
5. Test with your phone number

**No more:**
- ❌ Email verification delays
- ❌ Email rate limits
- ❌ Spam folder issues
- ❌ Email delivery problems

**Instead:**
- ✅ Instant SMS delivery
- ✅ Higher success rate
- ✅ Better mobile UX
- ✅ Phone number is verified identity

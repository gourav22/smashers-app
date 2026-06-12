'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/PhoneInput';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [sportsPlayed, setSportsPlayed] = useState<string[]>([]);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/register');
        return;
      }

      // Check if user profile already exists
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Profile exists, check if phone is set
        if (profile.phone) {
          // Profile complete, redirect to dashboard
          router.push('/dashboard');
          return;
        }

        // Profile exists but phone missing, pre-fill name
        setFormData({
          name: profile.name || user.user_metadata.full_name || user.email?.split('@')[0] || '',
          phone: '',
        });
        setSportsPlayed(profile.sports_played || []);
      } else {
        // No profile, pre-fill from OAuth data
        setFormData({
          name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || '',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleSportToggle = (sport: string) => {
    setSportsPlayed((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if name is unique (only if it's different from current)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name')
        .eq('name', formData.name)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        throw new Error('This name is already taken. Please choose another.');
      }

      // Upsert user profile (insert or update)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: formData.name,
          phone: formData.phone,
          sports_played: sportsPlayed,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) throw upsertError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">Just a few more details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name (must be unique) *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Raj Kumar"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be your display name in the club
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for club communications and notifications
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which sports do you play? *
            </label>
            <div className="space-y-2">
              {['badminton', 'cricket'].map((sport) => (
                <label key={sport} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sportsPlayed.includes(sport)}
                    onChange={() => handleSportToggle(sport)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 capitalize">
                    {sport === 'badminton' ? '🏸 Badminton' : '🏏 Cricket'}
                  </span>
                </label>
              ))}
            </div>
            {sportsPlayed.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Please select at least one sport</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !formData.phone || sportsPlayed.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Saving...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Your phone number will be kept private and used only for club communications
        </div>
      </div>
    </div>
  );
}

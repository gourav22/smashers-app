'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InstallButton } from '@/components/InstallButton';
import { NotificationSettings } from '@/components/NotificationSettings';
import PhoneInput from '@/components/PhoneInput';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sportsPlayed, setSportsPlayed] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUser();

    const params = new URLSearchParams(window.location.search);
    const msg = params.get('message');
    if (msg) {
      setMessage(msg);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUser(profile);
        setSportsPlayed(profile.sports_played || ['badminton', 'cricket']);
        setPhone(profile.phone || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSport = (sport: string) => {
    if (sportsPlayed.includes(sport)) {
      // Don't allow removing if it's the last sport
      if (sportsPlayed.length === 1) {
        alert('You must play at least one sport!');
        return;
      }
      setSportsPlayed(sportsPlayed.filter((s) => s !== sport));
    } else {
      setSportsPlayed([...sportsPlayed, sport]);
    }
  };

  const handleSave = async () => {
    if (sportsPlayed.length === 0) {
      alert('Please select at least one sport');
      return;
    }

    if (!phone) {
      alert('Phone number is required');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          sports_played: sportsPlayed,
          phone: phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Settings saved successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      alert(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Required Phone Number Message */}
        {message && (
          <div className="bg-orange-50 border-2 border-orange-400 text-orange-800 px-4 py-4 rounded-lg mb-6">
            <p className="font-semibold">⚠️ {message}</p>
          </div>
        )}
        {/* PWA Install Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📱</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Install Smashers Club App</h2>
              <p className="text-sm text-blue-50 mb-4">
                Get the best experience with our mobile app! Install it on your device for:
              </p>
              <ul className="text-sm text-blue-50 space-y-1 mb-4">
                <li>✓ Faster loading and offline access</li>
                <li>✓ Add to home screen - launch like a native app</li>
                <li>✓ Push notifications for bookings and updates</li>
                <li>✓ Works on iOS and Android</li>
              </ul>
              <InstallButton className="bg-white text-blue-600 hover:bg-blue-50" />
              <p className="text-xs text-blue-100 mt-3">
                💡 Not available? Try "Add to Home Screen" from your browser menu
              </p>
            </div>
          </div>
        </div>

        {/* Push Notifications Section */}
        {user && (
          <div className="mb-6">
            <NotificationSettings userId={user.id} />
          </div>
        )}

        {/* Phone Number Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <PhoneInput
                value={phone}
                onChange={(value) => setPhone(value)}
                required={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for club communications and notifications
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sports Preferences</h2>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-600">
              Select which sports you play. Your dashboard will only show stats for the selected sports.
            </p>

            {/* Badminton Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏸</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Badminton</h3>
                  <p className="text-sm text-gray-600">Track badminton matches and ELO</p>
                </div>
              </div>
              <button
                onClick={() => toggleSport('badminton')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  sportsPlayed.includes('badminton') ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sportsPlayed.includes('badminton') ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Cricket Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏏</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Cricket</h3>
                  <p className="text-sm text-gray-600">Track cricket matches and ELO</p>
                </div>
              </div>
              <button
                onClick={() => toggleSport('cricket')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  sportsPlayed.includes('cricket') ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sportsPlayed.includes('cricket') ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You must select at least one sport. This setting only affects what you see
              on your dashboard. You can still play and create matches for any sport.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || sportsPlayed.length === 0 || !phone}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

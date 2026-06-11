'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Haptics } from '@/lib/haptics';

interface Subscription {
  id: string;
  sport: string;
  day_of_week: number;
  slot_time: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_booking_enabled: boolean;
  price_per_week: number;
  total_paid: number;
  cancellations: any[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [sport, setSport] = useState<'badminton' | 'cricket'>('badminton');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [time, setTime] = useState('18:00');
  const [durationMonths, setDurationMonths] = useState(6);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      // Get user balance
      const { data: profile } = await supabase
        .from('users')
        .select('balance')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserBalance(profile.balance);
      }

      // Get subscriptions (with weeks remaining calculated)
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });

      if (subsError) {
        console.error('Error loading subscriptions:', subsError);
      } else if (subsData) {
        // Get cancellations for each subscription
        const subsWithCancellations = await Promise.all(
          subsData.map(async (sub) => {
            const { data: cancellations } = await supabase
              .from('subscription_cancellations')
              .select('*')
              .eq('subscription_id', sub.id)
              .order('cancelled_at', { ascending: false });

            return {
              ...sub,
              cancellations: cancellations || [],
            };
          })
        );
        setSubscriptions(subsWithCancellations);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const weeks = Math.ceil(durationMonths * 4.33);
      const totalCost = weeks * 4;

      if (userBalance < totalCost) {
        alert(`Insufficient balance. You need €${totalCost.toFixed(2)} for a ${durationMonths}-month subscription.`);
        return;
      }

      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          dayOfWeek,
          time,
          startDate: new Date().toISOString().split('T')[0],
          durationMonths,
          pricePerWeek: 4,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      Haptics.success();
      alert(`Subscription created! €${result.totalCost.toFixed(2)} paid for ${result.weeks} weeks.`);
      setShowCreateForm(false);
      loadData();
    } catch (error: any) {
      Haptics.error();
      alert(error.message || 'Failed to create subscription');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAutoBooking = async (subscriptionId: string, currentState: boolean) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ auto_booking_enabled: !currentState })
        .eq('id', subscriptionId);

      Haptics.tap();
      loadData();
    } catch (error) {
      console.error('Error toggling auto-booking:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Subscriptions</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Balance Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Your Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">€{userBalance.toFixed(2)}</p>
            </div>
            <Link
              href="/topup"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Top Up
            </Link>
          </div>
        </div>

        {/* Create Subscription Button */}
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition mb-6"
          >
            + Create Regular Membership
          </button>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              New Regular Membership
            </h2>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as 'badminton' | 'cricket')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="badminton">🏸 Badminton</option>
                  <option value="cricket">🏏 Cricket</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {DAYS.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (months)
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value={3}>3 months (€52)</option>
                  <option value={6}>6 months (€104)</option>
                  <option value={12}>12 months (€208)</option>
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Total Cost:</strong> €{(Math.ceil(durationMonths * 4.33) * 4).toFixed(2)}
                  <br />
                  <strong>Auto-booking:</strong> Your slot will be automatically booked every week
                  <br />
                  <strong>Cancellation:</strong> Cancel any week with 7 days advance notice for full refund
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {creating ? 'Creating...' : 'Create Subscription'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active Subscriptions */}
        {activeSubscriptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Active Memberships
            </h2>
            <div className="space-y-4">
              {activeSubscriptions.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {sub.sport === 'badminton' ? '🏸' : '🏏'} {sub.sport}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {DAYS[sub.day_of_week]} at {sub.slot_time}
                      </p>
                    </div>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(sub.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(sub.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Auto-booking</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sub.auto_booking_enabled ? 'Enabled ✓' : 'Disabled'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAutoBooking(sub.id, sub.auto_booking_enabled)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {sub.auto_booking_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>

                  {sub.cancellations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Cancelled Dates: {sub.cancellations.length}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Subscriptions */}
        {subscriptions.length === 0 && !showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">No subscriptions yet</p>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create a regular membership to automatically book your weekly slot and save time!
            </p>
          </div>
        )}

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            How Regular Memberships Work
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>✓ Your slot is automatically booked every week</li>
            <li>✓ Cancel any week with 7 days advance notice for full refund</li>
            <li>✓ No need to book manually each time</li>
            <li>✓ Guaranteed spot at your preferred time</li>
            <li>✓ €4 per week - same as adhoc booking</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

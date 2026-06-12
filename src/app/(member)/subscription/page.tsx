'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Haptics } from '@/lib/haptics';

interface SubscriptionTemplate {
  id: string;
  sport: string;
  day_of_week: number;
  slot_time: string;
  location: string;
  max_subscribers: number;
  current_subscribers: number;
  price_per_week: number;
  available_durations: number[];
  description: string;
}

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
  template_id: string;
  cancellations: any[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SubscriptionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SubscriptionTemplate[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(6);

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

      setUserId(authData.user.id);

      // Get user balance
      const { data: profile } = await supabase
        .from('users')
        .select('balance')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserBalance(profile.balance);
      }

      // Get available templates
      const templatesResponse = await fetch('/api/subscriptions/templates');
      const templatesData = await templatesResponse.json();
      setTemplates(templatesData.templates || []);

      // Get user's subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });

      if (subsData) {
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

  const handleSubscribe = async (templateId: string) => {
    if (!selectedDuration) {
      alert('Please select a duration');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const weeks = Math.ceil(selectedDuration * 4.33);
    const totalCost = weeks * template.price_per_week;

    if (userBalance < totalCost) {
      alert(`Insufficient balance. You need €${totalCost.toFixed(2)} for a ${selectedDuration}-month subscription.`);
      return;
    }

    setSubscribing(templateId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId,
          durationMonths: selectedDuration,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      Haptics.success();
      alert(`Subscription created! €${result.totalCost.toFixed(2)} paid for ${result.weeks} weeks.`);
      setSelectedTemplate(null);
      await loadData();
    } catch (error: any) {
      Haptics.error();
      alert(error.message || 'Failed to create subscription');
    } finally {
      setSubscribing(null);
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
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.sport]) acc[template.sport] = [];
    acc[template.sport].push(template);
    return acc;
  }, {} as Record<string, SubscriptionTemplate[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regular Memberships</h1>
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

        {/* Active Subscriptions */}
        {activeSubscriptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Active Memberships
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Templates */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Available Regular Memberships
        </h2>

        {templates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">No memberships available yet</p>
            <p className="text-gray-500 dark:text-gray-400">
              Contact admin to create membership slots
            </p>
          </div>
        ) : (
          Object.entries(groupedTemplates).map(([sport, sportTemplates]) => (
            <div key={sport} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                {sport === 'badminton' ? '🏸' : '🏏'} {sport}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sportTemplates.map((template) => {
                  const available = template.max_subscribers - template.current_subscribers;
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <div
                      key={template.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6 ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-2xl">{template.sport === 'badminton' ? '🏸' : '🏏'}</div>
                        {available <= 2 && available > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold">
                            Only {available} left!
                          </span>
                        )}
                        {available === 0 && (
                          <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-semibold">
                            Full
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {DAYS[template.day_of_week]} at {template.slot_time}
                      </h4>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📍 {template.location}
                      </p>

                      {template.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {template.description}
                        </p>
                      )}

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Spots</span>
                          <span className={`font-semibold ${available === 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {template.current_subscribers}/{template.max_subscribers}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              available === 0 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${(template.current_subscribers / template.max_subscribers) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        💰 €{template.price_per_week}/week
                      </p>

                      {available > 0 && (
                        <>
                          {isSelected ? (
                            <div className="space-y-3">
                              <select
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                              >
                                {template.available_durations.map((months) => {
                                  const weeks = Math.ceil(months * 4.33);
                                  const cost = weeks * template.price_per_week;
                                  return (
                                    <option key={months} value={months}>
                                      {months} months (€{cost.toFixed(2)})
                                    </option>
                                  );
                                })}
                              </select>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSubscribe(template.id)}
                                  disabled={subscribing === template.id}
                                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                  {subscribing === template.id ? 'Subscribing...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setSelectedTemplate(null)}
                                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTemplate(template.id);
                                setSelectedDuration(template.available_durations[0] || 6);
                              }}
                              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                              Subscribe
                            </button>
                          )}
                        </>
                      )}

                      {available === 0 && (
                        <button
                          disabled
                          className="w-full bg-gray-300 text-gray-600 py-2 rounded-lg font-semibold cursor-not-allowed"
                        >
                          Fully Booked
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            How Regular Memberships Work
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>✓ Choose from available slots created by admin</li>
            <li>✓ Your slot is automatically booked every week</li>
            <li>✓ Cancel any week with 7 days advance notice for full refund</li>
            <li>✓ Limited spots available - subscribe before it's full!</li>
            <li>✓ Pay upfront for 3, 6, or 12 months</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
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
  status: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SubscriptionTemplatesAdmin() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [sport, setSport] = useState<'badminton' | 'cricket'>('badminton');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [maxSubscribers, setMaxSubscribers] = useState(10);
  const [pricePerWeek, setPricePerWeek] = useState(4);
  const [description, setDescription] = useState('');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (!profile || !['super_admin', 'slot_manager'].includes(profile.role)) {
        alert('Access denied - Admin only');
        router.push('/dashboard');
        return;
      }

      await loadTemplates();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('subscription_templates')
      .select('*')
      .order('sport')
      .order('day_of_week')
      .order('slot_time');

    setTemplates(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/subscriptions/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sport,
          dayOfWeek,
          time,
          location,
          maxSubscribers,
          pricePerWeek,
          availableDurations: [3, 6, 12],
          description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create template');
      }

      alert('Subscription template created!');
      setShowForm(false);
      resetForm();
      await loadTemplates();
    } catch (error: any) {
      alert(error.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSport('badminton');
    setDayOfWeek(1);
    setTime('18:00');
    setLocation('');
    setMaxSubscribers(10);
    setPricePerWeek(4);
    setDescription('');
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    const { error } = await supabase
      .from('subscription_templates')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      await loadTemplates();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manage Subscription Templates
            </h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          {showForm ? 'Cancel' : '+ Create New Template'}
        </button>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              New Subscription Template
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder="e.g., Court A"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Subscribers
                  </label>
                  <input
                    type="number"
                    value={maxSubscribers}
                    onChange={(e) => setMaxSubscribers(parseInt(e.target.value))}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price per Week (€)
                  </label>
                  <input
                    type="number"
                    value={pricePerWeek}
                    onChange={(e) => setPricePerWeek(parseFloat(e.target.value))}
                    step="0.01"
                    min="0"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g., Intermediate level, all welcome"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                {creating ? 'Creating...' : 'Create Template'}
              </button>
            </form>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {template.sport === 'badminton' ? '🏸' : '🏏'} {template.sport}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        template.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : template.status === 'full'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300">
                    {DAYS[template.day_of_week]} at {template.slot_time} • 📍 {template.location}
                  </p>

                  {template.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                  )}

                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Subscribers: {template.current_subscribers}/{template.max_subscribers}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      €{template.price_per_week}/week
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(template.id, template.status)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      template.status === 'active'
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {template.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                No templates created yet. Click "Create New Template" to add one.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

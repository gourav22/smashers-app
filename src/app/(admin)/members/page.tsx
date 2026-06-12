'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGradeEmoji, getGradeColor } from '@/lib/elo';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  balance: number;
  badminton_elo: number;
  badminton_grade: 'A' | 'B' | 'C' | 'D';
  cricket_elo: number;
  cricket_grade: 'A' | 'B' | 'C' | 'D';
  created_at: string;
  subscription_count?: number;
  member_type?: string;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    balance: 0,
    role: 'member',
  });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    checkAdminAndLoadMembers();
  }, []);

  const checkAdminAndLoadMembers = async () => {
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
        router.push('/dashboard');
        return;
      }

      await loadMembers();
    } catch (error) {
      console.error('Error:', error);
      router.push('/dashboard');
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, balance, badminton_elo, badminton_grade, cricket_elo, cricket_grade, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get subscription counts for all users
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id, status')
        .eq('status', 'active');

      // Map subscription counts to members
      const membersWithType = (data || []).map(member => {
        const activeSubscriptions = subscriptions?.filter(s => s.user_id === member.id).length || 0;
        return {
          ...member,
          subscription_count: activeSubscriptions,
          member_type: activeSubscriptions > 0 ? 'Regular' : 'Adhoc'
        };
      });

      setMembers(membersWithType);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditForm({
      name: member.name,
      balance: member.balance,
      role: member.role,
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    try {
      if (!selectedMember) return;

      // Check if name is being changed and if it's unique
      if (editForm.name !== selectedMember.name) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('name', editForm.name)
          .single();

        if (existingUser) {
          throw new Error('Name already taken by another user');
        }
      }

      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          balance: editForm.balance,
          role: editForm.role,
        })
        .eq('id', selectedMember.id);

      if (updateError) throw updateError;

      // If balance changed, create transaction record
      if (editForm.balance !== selectedMember.balance) {
        const { data: authData } = await supabase.auth.getUser();
        const balanceDiff = editForm.balance - selectedMember.balance;

        await supabase.from('transactions').insert({
          user_id: selectedMember.id,
          type: balanceDiff > 0 ? 'topup' : 'refund',
          amount: balanceDiff,
          balance_after: editForm.balance,
          metadata: {
            admin_id: authData.user?.id,
            reason: 'Manual balance adjustment by admin',
          },
        });
      }

      // Reload members
      await loadMembers();
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{members.length}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {members.filter((m) => m.member_type === 'Regular').length}
            </div>
            <div className="text-sm text-gray-600">Regular (Subscribers)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-amber-600">
              {members.filter((m) => m.member_type === 'Adhoc').length}
            </div>
            <div className="text-sm text-gray-600">Adhoc Members</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              €{members.reduce((sum, m) => sum + m.balance, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Balance</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {members.filter((m) => m.role === 'super_admin' || m.role === 'slot_manager').length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Badminton</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cricket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          member.member_type === 'Regular'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.member_type === 'Regular' ? '📅 Regular' : '👤 Adhoc'}
                      </span>
                      {member.subscription_count! > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {member.subscription_count} active
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          member.role === 'super_admin'
                            ? 'bg-red-100 text-red-800'
                            : member.role === 'slot_manager'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-semibold ${
                          member.balance >= 20 ? 'text-green-600' : member.balance >= 4 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                      >
                        €{member.balance.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-1">{getGradeEmoji(member.badminton_grade)}</span>
                        <span className="text-sm font-medium" style={{ color: getGradeColor(member.badminton_grade) }}>
                          {member.badminton_elo}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-1">{getGradeEmoji(member.cricket_grade)}</span>
                        <span className="text-sm font-medium" style={{ color: getGradeColor(member.cricket_grade) }}>
                          {member.cricket_elo}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(member)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Member: {selectedMember.name}</h2>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {editError}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Balance (Current: €{selectedMember.balance.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.balance}
                  onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Change: {editForm.balance - selectedMember.balance > 0 ? '+' : ''}€
                  {(editForm.balance - selectedMember.balance).toFixed(2)}
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="member">Member</option>
                  <option value="slot_manager">Slot Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

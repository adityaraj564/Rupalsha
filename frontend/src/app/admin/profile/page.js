'use client';

import { useState } from 'react';
import { FiUser, FiLock, FiEdit2 } from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  if (!user) return null;

  const handleUpdateProfile = async () => {
    try {
      const { user: updated } = await authAPI.updateProfile(profileForm);
      updateUser(updated);
      setEditingProfile(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await authAPI.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'password', label: 'Password', icon: FiLock },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-2xl font-bold text-brand-charcoal mb-6">Admin Profile</h1>

      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-brand-green text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl font-semibold">Personal Information</h2>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="text-brand-green text-sm hover:underline flex items-center gap-1"
            >
              <FiEdit2 size={14} /> Edit
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="input-field"
                  placeholder="9876543210"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleUpdateProfile} className="btn-primary text-sm py-2">Save</button>
                <button onClick={() => setEditingProfile(false)} className="text-sm text-gray-500">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name</span>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone</span>
                <p className="font-medium">{user.phone || 'Not set'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Member since</span>
                <p className="font-medium">{new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-lg">
          <h2 className="font-serif text-xl font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input-field"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn-primary text-sm py-2">Update Password</button>
          </form>
        </div>
      )}
    </div>
  );
}

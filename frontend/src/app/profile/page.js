'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiLock, FiLogOut, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone || '' });
    }
  }, [isAuthenticated, router, user]);

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

  const handleDeleteAddress = async (id) => {
    try {
      const { addresses } = await authAPI.deleteAddress(id);
      updateUser({ addresses });
      toast.success('Address deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Logged out');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'addresses', label: 'Addresses', icon: FiMapPin },
    { id: 'password', label: 'Password', icon: FiLock },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-fade-in">
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal mb-8">My Account</h1>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/orders" className="card p-4 text-center hover:shadow-md transition-shadow">
          <FiPackage className="mx-auto mb-2 text-brand-green" size={24} />
          <span className="text-sm font-medium">My Orders</span>
        </Link>
        <Link href="/wishlist" className="card p-4 text-center hover:shadow-md transition-shadow">
          <FiHeart className="mx-auto mb-2 text-brand-green" size={24} />
          <span className="text-sm font-medium">Wishlist</span>
        </Link>
        <button onClick={handleLogout} className="card p-4 text-center hover:shadow-md transition-shadow">
          <FiLogOut className="mx-auto mb-2 text-red-500" size={24} />
          <span className="text-sm font-medium text-red-500">Logout</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1">
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

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6">
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

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold mb-4">Saved Addresses</h2>
          {user.addresses?.length === 0 ? (
            <p className="text-gray-500">No addresses saved. Add one during checkout.</p>
          ) : (
            <div className="space-y-4">
              {user.addresses?.map((addr) => (
                <div key={addr._id} className="border border-gray-200 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{addr.fullName} {addr.isDefault && <span className="text-xs bg-brand-green text-white px-2 py-0.5 rounded-full ml-2">Default</span>}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                  </div>
                  <button onClick={() => handleDeleteAddress(addr._id)} className="text-gray-400 hover:text-red-500">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card p-6">
          <h2 className="font-serif text-xl font-semibold mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
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

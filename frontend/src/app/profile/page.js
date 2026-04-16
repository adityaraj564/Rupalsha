'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiLock, FiLogOut, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [editingAddress, setEditingAddress] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  });
  const [fetchingPincode, setFetchingPincode] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone || '' });
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading || !user) return null;

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
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await authAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
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

  const handleAddAddress = async () => {
    if (!addressForm.fullName || !addressForm.phone || !addressForm.addressLine1 || !addressForm.city || !addressForm.state || !addressForm.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const { addresses } = await authAPI.addAddress(addressForm);
      updateUser({ addresses });
      setAddingAddress(false);
      setAddressForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
      toast.success('Address added');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr._id);
    setAddressForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
    });
  };

  const handleUpdateAddress = async () => {
    try {
      const { addresses } = await authAPI.updateAddress(editingAddress, addressForm);
      updateUser({ addresses });
      setEditingAddress(null);
      toast.success('Address updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddressPincode = async (value) => {
    const pin = value.replace(/\D/g, '').slice(0, 6);
    setAddressForm((prev) => ({ ...prev, pincode: pin }));
    if (pin.length === 6) {
      setFetchingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setAddressForm((prev) => ({ ...prev, city: po.District, state: po.State }));
        }
      } catch {}
      setFetchingPincode(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold">Saved Addresses</h2>
            {!addingAddress && (
              <button
                onClick={() => {
                  setAddingAddress(true);
                  setEditingAddress(null);
                  setAddressForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
                }}
                className="btn-primary text-sm py-2 px-4"
              >
                + Add Address
              </button>
            )}
          </div>

          {/* Add New Address Form */}
          {addingAddress && (
            <div className="border border-brand-green rounded-xl p-4 mb-4 bg-green-50/30">
              <h3 className="font-medium text-sm mb-3">New Address</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Full Name *" value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })} className="input-field" />
                  <input type="tel" placeholder="Phone *" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className="input-field" />
                </div>
                <input type="text" placeholder="Address Line 1 *" value={addressForm.addressLine1} onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })} className="input-field" />
                <input type="text" placeholder="Address Line 2 (optional)" value={addressForm.addressLine2} onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })} className="input-field" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Pincode *" value={addressForm.pincode} onChange={(e) => handleAddressPincode(e.target.value)} className="input-field" maxLength={6} />
                  <div className="relative">
                    <input type="text" placeholder="City *" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="input-field" />
                    {fetchingPincode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>}
                  </div>
                  <input type="text" placeholder="State *" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} className="input-field" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddAddress} className="btn-primary text-sm py-2">Save Address</button>
                  <button onClick={() => setAddingAddress(false)} className="text-sm text-gray-500">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {user.addresses?.length === 0 && !addingAddress ? (
            <p className="text-gray-500">No addresses saved yet. Click &quot;Add Address&quot; to add one.</p>
          ) : (
            <div className="space-y-4">
              {user.addresses?.map((addr) => (
                <div key={addr._id} className="border border-gray-200 rounded-xl p-4">
                  {editingAddress === addr._id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          className="input-field"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={addressForm.addressLine1}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                        className="input-field"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 2 (optional)"
                        value={addressForm.addressLine2}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                        className="input-field"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={addressForm.pincode}
                          onChange={(e) => handleAddressPincode(e.target.value)}
                          className="input-field"
                          maxLength={6}
                        />
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="City"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="input-field"
                          />
                          {fetchingPincode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>}
                        </div>
                        <input
                          type="text"
                          placeholder="State"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleUpdateAddress} className="btn-primary text-sm py-2">Save</button>
                        <button onClick={() => setEditingAddress(null)} className="text-sm text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{addr.fullName} {addr.isDefault && <span className="text-xs bg-brand-green text-white px-2 py-0.5 rounded-full ml-2">Default</span>}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{addr.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditAddress(addr)} className="text-gray-400 hover:text-brand-green">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteAddress(addr._id)} className="text-gray-400 hover:text-red-500">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
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
              {passwordForm.newPassword && passwordForm.currentPassword && passwordForm.newPassword === passwordForm.currentPassword && (
                <p className="text-red-500 text-xs mt-1">New password must be different from current password</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input-field"
                required
                minLength={6}
              />
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              className="btn-primary text-sm py-2"
              disabled={!passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword === passwordForm.currentPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
            >Update Password</button>
          </form>
        </div>
      )}
    </div>
  );
}

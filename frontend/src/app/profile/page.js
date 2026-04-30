'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUser, FiPackage, FiHeart, FiMapPin, FiLock, FiLogOut, FiEdit2, FiTrash2,
  FiCreditCard, FiMail, FiPhone, FiCalendar, FiShield, FiChevronRight, FiPlus,
  FiCheckCircle, FiCheck, FiHome, FiSmartphone, FiBell,
} from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { authAPI, walletAPI, ordersAPI, wishlistAPI, notificationsAPI } from '@/lib/api';
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
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  });
  const [fetchingPincode, setFetchingPincode] = useState(false);
  // Hydrate stats from localStorage so the dashboard cards never show "—" on refresh.
  const [stats, setStats] = useState(() => {
    if (typeof window === 'undefined') return { orders: null, wallet: null, wishlist: null, notifications: null };
    try {
      const raw = localStorage.getItem('rupalsha_profile_stats');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { orders: null, wallet: null, wishlist: null, notifications: null };
  });

  // Sync the editable form whenever the cached/fresh user data changes.
  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', phone: user.phone || '' });
  }, [user?._id, user?.name, user?.phone]);

  useEffect(() => {
    if (isLoading && !user) return; // wait only if we have no cached user
    if (!isAuthenticated && !isLoading) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthenticated) return;

    // Background refresh of user (addresses, etc.) — never blocks render.
    authAPI.getMe().then(({ user: fresh }) => {
      updateUser(fresh);
    }).catch(() => {});

    // Fetch dashboard stats in parallel (silently fail). Cache the result so
    // the next visit / refresh shows numbers immediately.
    Promise.allSettled([
      ordersAPI.getAll({ limit: 1 }),
      walletAPI.get(),
      wishlistAPI.get(),
      notificationsAPI.unreadCount(),
    ]).then(([oRes, wRes, wlRes, nRes]) => {
      const next = {
        orders: oRes.status === 'fulfilled' ? (oRes.value?.total ?? oRes.value?.orders?.length ?? 0) : 0,
        wallet: wRes.status === 'fulfilled' ? (wRes.value?.balance ?? 0) : 0,
        wishlist: wlRes.status === 'fulfilled'
          ? (Array.isArray(wlRes.value?.wishlist) ? wlRes.value.wishlist.length : (wlRes.value?.items?.length ?? 0))
          : 0,
        notifications: nRes.status === 'fulfilled' ? (nRes.value?.unreadCount ?? 0) : 0,
      };
      setStats(next);
      try { localStorage.setItem('rupalsha_profile_stats', JSON.stringify(next)); } catch {}
    });
  }, [isAuthenticated, isLoading, router]);

  // Render with cached user immediately; only hide the page if we truly have nothing.
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
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const needsCurrent = !!user?.hasPassword;
    if (needsCurrent && passwordForm.newPassword === passwordForm.currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }
    try {
      await authAPI.changePassword({
        currentPassword: needsCurrent ? passwordForm.currentPassword : undefined,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      updateUser({ hasPassword: true, authProvider: user?.googleLinked ? 'hybrid' : 'local' });
      toast.success(needsCurrent ? 'Password changed' : 'Password set successfully');
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
    setAddingAddress(false);
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

  const handleSetDefaultAddress = async (addr) => {
    if (addr.isDefault) return;
    try {
      const { addresses } = await authAPI.updateAddress(addr._id, {
        fullName: addr.fullName,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || '',
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        isDefault: true,
      });
      updateUser({ addresses });
      toast.success('Default address updated');
    } catch (err) {
      toast.error(err.message || 'Failed to set default');
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
    { id: 'profile', label: 'Personal Info', icon: FiUser, desc: 'Name, email & phone' },
    { id: 'addresses', label: 'Addresses', icon: FiMapPin, desc: 'Saved delivery addresses' },
    { id: 'password', label: user?.hasPassword ? 'Password' : 'Set Password', icon: FiLock, desc: 'Security & sign-in' },
  ];

  // Initials for avatar
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Deterministic colorful gradient (each user gets their own consistent palette)
  const avatarGradients = [
    'from-pink-500 via-rose-500 to-orange-400',
    'from-fuchsia-500 via-purple-500 to-indigo-500',
    'from-blue-500 via-cyan-500 to-teal-400',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-amber-500 via-orange-500 to-rose-500',
    'from-violet-500 via-purple-500 to-pink-500',
    'from-sky-500 via-blue-500 to-indigo-600',
    'from-lime-500 via-green-500 to-emerald-600',
    'from-red-500 via-pink-500 to-fuchsia-500',
    'from-indigo-500 via-blue-500 to-cyan-500',
  ];
  const seed = (user._id || user.email || user.name || 'U').toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const avatarGradient = avatarGradients[hash % avatarGradients.length];

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      {/* ===== Clean Header ===== */}
      <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
        <div className="flex items-center gap-4 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-lg md:text-xl font-bold text-white shadow-md ring-2 ring-white dark:ring-gray-900`}>
              {initials}
            </div>
            {user?.googleLinked && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-900 rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
                <FiCheckCircle size={12} className="text-emerald-500" />
              </span>
            )}
          </div>

          {/* Name + email */}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-gray-100 truncate">
              {user.name || 'My Account'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <FiLogOut size={16} /> Sign out
        </button>
      </div>

      {/* ===== Stat Cards (clean, flat, monochrome accents) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard
          href="/orders"
          icon={FiPackage}
          label="Orders"
          value={stats.orders === null ? '—' : stats.orders}
        />
        <StatCard
          href="/wallet"
          icon={FiCreditCard}
          label="Wallet balance"
          value={stats.wallet === null ? '—' : `₹${Number(stats.wallet).toLocaleString('en-IN')}`}
          accent
        />
        <StatCard
          href="/wishlist"
          icon={FiHeart}
          label="Wishlist"
          value={stats.wishlist === null ? '—' : stats.wishlist}
        />
        <StatCard
          href="/notifications"
          icon={FiBell}
          label={stats.notifications > 0 ? 'Unread alerts' : 'Notifications'}
          value={stats.notifications === null ? '—' : stats.notifications}
        />
      </div>

      {/* ===== Layout: Sidebar + Content ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar nav */}
        <aside className="lg:col-span-4 xl:col-span-3">
          {/* ===== Mobile: modern segmented pill (no scroll, fits 3 tabs) ===== */}
          <div className="lg:hidden relative p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="grid grid-cols-3 gap-1 relative">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                // Shorter label for narrow mobile screens
                const shortLabel = tab.id === 'profile' ? 'Profile' : tab.id === 'addresses' ? 'Address' : 'Password';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-lg shadow-brand-green/30 ring-1 ring-white/20 dark:from-gray-900 dark:to-black dark:!text-white dark:shadow-black/40 dark:ring-white/10 scale-[1.04]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95'
                    }`}
                  >
                    <span
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-white/25 text-white dark:bg-white/15 dark:!text-white'
                          : 'bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <tab.icon size={15} />
                    </span>
                    <span className={`text-[11px] font-semibold tracking-tight ${isActive ? 'dark:!text-white' : ''}`}>
                      {shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== Desktop: vertical sidebar ===== */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 lg:sticky lg:top-24">
            <div className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-brand-green text-white shadow-md dark:bg-gray-900 dark:!text-white dark:ring-1 dark:ring-white/10'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-white/15 dark:!text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-gray-600'
                    }`}>
                      <tab.icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${isActive ? 'dark:!text-white' : ''}`}>{tab.label}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-white/70 dark:!text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                        {tab.desc}
                      </p>
                    </div>
                    <FiChevronRight className={`flex-shrink-0 transition-transform ${isActive ? 'translate-x-0.5 dark:!text-white' : 'opacity-0 group-hover:opacity-100'}`} size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* ===== Profile Tab ===== */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-gray-100">Personal Information</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage how your account appears across Rupalsha</p>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green dark:text-[#F8F0E8] hover:bg-brand-green/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FiEdit2 size={14} /> Edit
                  </button>
                )}
              </div>

              <div className="p-6">
                {editingProfile ? (
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="input-field"
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={handleUpdateProfile} className="btn-primary text-sm py-2.5 px-6">Save changes</button>
                      <button onClick={() => setEditingProfile(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={FiUser} label="Full name" value={user.name} />
                    <InfoRow icon={FiMail} label="Email" value={user.email} />
                    <InfoRow icon={FiSmartphone} label="Phone" value={user.phone || 'Not set'} muted={!user.phone} />
                    <InfoRow icon={FiCalendar} label="Member since" value={memberSince} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Addresses Tab ===== */}
          {activeTab === 'addresses' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-gray-100">Saved Addresses</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Faster checkout with pre-filled delivery details</p>
                </div>
                {!addingAddress && (
                  <button
                    onClick={() => {
                      setAddingAddress(true);
                      setEditingAddress(null);
                      setAddressForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
                    }}
                    className="inline-flex items-center gap-1.5 bg-brand-green text-white text-sm font-medium px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                  >
                    <FiPlus size={14} /> Add new
                  </button>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Add New Address Form */}
                {addingAddress && (
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-brand-green/5 to-brand-gold/5 dark:from-brand-green/10 dark:to-brand-gold/10 border border-brand-green/20 dark:border-brand-green/30">
                    <h3 className="font-serif text-base font-semibold text-brand-charcoal dark:text-gray-100 mb-4">New address</h3>
                    <AddressFields form={addressForm} setForm={setAddressForm} fetchingPincode={fetchingPincode} onPincode={handleAddressPincode} />
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleAddAddress} className="btn-primary text-sm py-2.5">Save address</button>
                      <button onClick={() => setAddingAddress(false)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2">Cancel</button>
                    </div>
                  </div>
                )}

                {user.addresses?.length === 0 && !addingAddress ? (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                      <FiMapPin size={28} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="font-medium text-brand-charcoal dark:text-gray-100">No addresses yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a delivery address for faster checkout.</p>
                  </div>
                ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(showAllAddresses ? user.addresses : user.addresses?.slice(0, 2))?.map((addr) => (
                      <div
                        key={addr._id}
                        className={`relative rounded-2xl p-5 border transition-all ${
                          addr.isDefault
                            ? 'border-brand-green/40 bg-brand-green/5 dark:bg-brand-green/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {editingAddress === addr._id ? (
                          <>
                            <h3 className="font-serif text-base font-semibold text-brand-charcoal dark:text-gray-100 mb-4">Edit address</h3>
                            <AddressFields form={addressForm} setForm={setAddressForm} fetchingPincode={fetchingPincode} onPincode={handleAddressPincode} />
                            <div className="flex gap-3 mt-4">
                              <button onClick={handleUpdateAddress} className="btn-primary text-sm py-2.5">Save</button>
                              <button onClick={() => setEditingAddress(null)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2">Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-[#F8F0E8] flex items-center justify-center flex-shrink-0">
                                  <FiHome size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-brand-charcoal dark:text-gray-100 truncate">{addr.fullName}</p>
                                    {addr.isDefault && (
                                      <span className="text-[10px] uppercase tracking-wider font-bold bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950 px-2 py-0.5 rounded-full shadow-sm">Default</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                                    {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                                    {addr.city}, {addr.state} - <span className="font-medium">{addr.pincode}</span>
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 inline-flex items-center gap-1.5">
                                    <FiPhone size={12} /> {addr.phone}
                                  </p>
                                  {!addr.isDefault && (
                                    <button
                                      onClick={() => handleSetDefaultAddress(addr)}
                                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-green dark:text-[#F8F0E8] hover:text-brand-gold dark:hover:text-brand-gold transition-colors"
                                    >
                                      <FiCheck size={12} /> Set as default
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button onClick={() => handleEditAddress(addr)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-green hover:bg-brand-green/10 dark:hover:text-[#F8F0E8] dark:hover:bg-white/5 transition-colors">
                                  <FiEdit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteAddress(addr._id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {user.addresses?.length > 2 && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAllAddresses((v) => !v)}
                        className="text-brand-green dark:text-[#F8F0E8] font-medium text-sm hover:underline"
                      >
                        {showAllAddresses ? 'Show less' : `View all (${user.addresses.length})`}
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ===== Password Tab ===== */}
          {activeTab === 'password' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-serif text-xl font-semibold text-brand-charcoal dark:text-gray-100">
                  {user?.hasPassword ? 'Change Password' : 'Set a Password'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use a strong password with at least 6 characters</p>
              </div>

              <div className="p-6">
                {user?.googleLinked && (
                  <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/40 text-sm text-gray-700 dark:text-gray-300 flex gap-3">
                    <FiShield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p>
                      {user?.hasPassword
                        ? 'Your account is linked to Google. You can sign in with Google or with this password.'
                        : 'You are signed in via Google. Setting a password is optional — useful for devices where Google is unavailable.'}
                    </p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  {user?.hasPassword && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {user?.hasPassword ? 'New password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="input-field"
                      required
                      minLength={6}
                    />
                    {user?.hasPassword && passwordForm.newPassword && passwordForm.currentPassword && passwordForm.newPassword === passwordForm.currentPassword && (
                      <p className="text-red-500 text-xs mt-1.5">New password must be different from current password</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="input-field"
                      required
                      minLength={6}
                    />
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1.5">Passwords do not match</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn-primary text-sm py-2.5 px-6"
                    disabled={
                      !passwordForm.newPassword ||
                      passwordForm.newPassword !== passwordForm.confirmPassword ||
                      (user?.hasPassword && (!passwordForm.currentPassword || passwordForm.newPassword === passwordForm.currentPassword))
                    }
                  >
                    {user?.hasPassword ? 'Update password' : 'Set password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile sign-out — pinned to bottom of page */}
      <div className="sm:hidden mt-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <FiLogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ---------------- Helper components ---------------- */

function StatCard({ href, icon: Icon, label, value, accent }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium tracking-wide ${accent ? 'text-amber-900/80' : 'text-gray-500 dark:text-gray-400'}`}>
          {label}
        </span>
        <Icon size={16} className={accent ? 'text-amber-900/70' : 'text-gray-400 dark:text-gray-500'} />
      </div>
      <p className={`mt-3 text-2xl md:text-[26px] font-semibold tracking-tight ${
        accent ? 'text-amber-950' : 'text-brand-charcoal dark:text-gray-100'
      }`}>
        {value}
      </p>
    </>
  );

  const baseClass = `relative rounded-2xl p-4 md:p-5 transition-all ${
    accent
      ? 'bg-gradient-to-br from-amber-300 to-amber-400 dark:from-amber-300 dark:to-amber-500 hover:shadow-md'
      : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/70 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'
  }`;

  if (href) {
    return (
      <Link href={href} className={`${baseClass} block group`}>
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}

function InfoRow({ icon: Icon, label, value, muted }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
      <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-800 text-brand-green dark:text-[#F8F0E8] flex items-center justify-center flex-shrink-0 shadow-sm">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`font-medium mt-0.5 truncate ${muted ? 'text-gray-400 dark:text-gray-500' : 'text-brand-charcoal dark:text-gray-100'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function AddressFields({ form, setForm, fetchingPincode, onPincode }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="text" placeholder="Full Name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field" />
        <input type="tel" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
      </div>
      <input type="text" placeholder="Address Line 1 *" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className="input-field" />
      <input type="text" placeholder="Address Line 2 (optional)" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} className="input-field" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="text" placeholder="Pincode *" value={form.pincode} onChange={(e) => onPincode(e.target.value)} className="input-field" maxLength={6} />
        <div className="relative">
          <input type="text" placeholder="City *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
          {fetchingPincode && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>}
        </div>
        <input type="text" placeholder="State *" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field" />
      </div>
    </div>
  );
}

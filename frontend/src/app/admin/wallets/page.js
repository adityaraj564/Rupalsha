'use client';

import { useEffect, useState } from 'react';
import { FiSearch, FiPlus, FiMinus, FiUser } from 'react-icons/fi';
import { adminAPI, walletAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const SOURCE_LABELS = {
  recharge: 'Recharge',
  refund: 'Refund',
  order_payment: 'Order payment',
  order_refund: 'Order refund',
  admin_credit: 'Admin credit',
  admin_debit: 'Admin debit',
};

export default function AdminWalletsPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const [adjustType, setAdjustType] = useState('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      const data = await adminAPI.getUsers(params);
      setUsers(data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const loadWallet = async (user) => {
    setSelectedUser(user);
    setLoadingWallet(true);
    setWalletData(null);
    try {
      const data = await walletAPI.adminGetUser(user._id);
      setWalletData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load wallet');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (!adjustDesc.trim()) return toast.error('Add a reason / description');
    if (!selectedUser) return;

    setAdjusting(true);
    try {
      await walletAPI.adminAdjust({
        userId: selectedUser._id,
        type: adjustType,
        amount,
        description: adjustDesc.trim(),
      });
      toast.success(`Wallet ${adjustType === 'credit' ? 'credited' : 'debited'} by ₹${amount}`);
      setAdjustAmount('');
      setAdjustDesc('');
      await loadWallet(selectedUser);
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-brand-charcoal mb-6">Wallet Management</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 lg:col-span-1">
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              placeholder="Search by name or email..."
              className="input-field pl-9 text-sm"
            />
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y dark:divide-gray-800">
            {loadingUsers ? (
              <p className="p-4 text-sm text-gray-500">Loading...</p>
            ) : users.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No users found.</p>
            ) : (
              users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => loadWallet(u)}
                  className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedUser?._id === u._id ? 'bg-green-50/60 dark:bg-green-900/20' : ''
                  }`}
                >
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Wallet details */}
        <div className="lg:col-span-2">
          {!selectedUser ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-10 text-center text-gray-500">
              <FiUser size={32} className="mx-auto mb-3" />
              <p>Select a user to view and manage their wallet.</p>
            </div>
          ) : loadingWallet ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
              <p className="text-sm text-gray-500">Loading wallet...</p>
            </div>
          ) : walletData ? (
            <div className="space-y-6">
              {/* Balance */}
              <div className="bg-gradient-to-br from-brand-green to-green-800 text-white rounded-2xl p-6 shadow">
                <p className="text-xs text-white/80">Wallet balance</p>
                <p className="font-serif text-3xl font-bold mt-1">
                  ₹{walletData.balance.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-white/80 mt-2">
                  {selectedUser.name} • {selectedUser.email}
                </p>
              </div>

              {/* Adjust */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5">
                <h3 className="font-serif text-lg font-semibold mb-3">Manual adjustment</h3>
                <form onSubmit={handleAdjust} className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border ${
                        adjustType === 'credit'
                          ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/30'
                          : 'dark:border-gray-700'
                      }`}
                    >
                      <FiPlus size={14} /> Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border ${
                        adjustType === 'debit'
                          ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-900/30'
                          : 'dark:border-gray-700'
                      }`}
                    >
                      <FiMinus size={14} /> Debit
                    </button>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="Amount (₹)"
                    className="input-field text-sm"
                    required
                  />
                  <input
                    type="text"
                    maxLength={500}
                    value={adjustDesc}
                    onChange={(e) => setAdjustDesc(e.target.value)}
                    placeholder="Reason / description (required)"
                    className="input-field text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={adjusting}
                    className="btn-primary w-full text-sm py-2"
                  >
                    {adjusting ? 'Processing...' : `Apply ${adjustType}`}
                  </button>
                </form>
              </div>

              {/* Transactions */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5">
                <h3 className="font-serif text-lg font-semibold mb-3">Recent transactions</h3>
                {walletData.transactions?.length === 0 ? (
                  <p className="text-sm text-gray-500">No transactions yet.</p>
                ) : (
                  <ul className="divide-y dark:divide-gray-800 text-sm">
                    {walletData.transactions.map((tx) => (
                      <li key={tx._id} className="py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {tx.description || SOURCE_LABELS[tx.source] || tx.source}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.createdAt).toLocaleString('en-IN')}
                            {' • '}
                            {SOURCE_LABELS[tx.source] || tx.source}
                            {tx.status !== 'completed' && ` • ${tx.status}`}
                          </p>
                        </div>
                        <div
                          className={`font-semibold ${
                            tx.type === 'credit'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
